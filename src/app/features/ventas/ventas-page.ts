import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  finalize,
  forkJoin,
  map,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { NotificationStore } from '../../notifications/state/notification.store';
import { IaService } from '../../ia/data-access/ia.service';
import { InterpretarMostradorResultado } from '../../ia/data-access/ia.model';
import { BANCOS_EMISORES_AR } from '../cuenta-corriente/data-access/bancos-argentina';
import { BancosService, CuentaBancariaDto } from '../bancos/data-access/bancos.service';
import { ConfiguracionService } from '../configuracion/data-access/configuracion.service';
import { ParametrosAfip } from '../configuracion/data-access/parametros.model';
import {
  ClienteRef,
  DatosCheque,
  MedioCobro,
  ProductoRef,
  SaldoClienteRef,
  TipoComprobante,
  UsuarioRef,
  ZonaRef,
} from './data-access/pedido.model';
import { VentasService } from './data-access/ventas.service';
import { VentasStore } from './data-access/ventas.store';
import {
  AcreditacionMp,
  BILLETES_MOS,
  CompMos,
  CUOTAS_MOS,
  MEDIOS_MOS,
  PagoMos,
  TARJETAS_MOS,
  TicketMos,
  TipoMedioMos,
  TonoCc,
  acreditacionesMpDemo,
  compDesdeLetra,
  dtoPct,
  labelMedio,
  letraFiscal,
  medioCobroDesdeTipo,
  moneyMos,
  nuevoPagoMos,
  parseNumMos,
} from './mostrador.model';

type CondicionVenta = 'ctacte' | 'contado' | 'tarjeta' | 'cheque';
type ModoEmisionMostrador = 'remito_ctacte' | 'remito_pago' | 'factura_fiscal';

export interface LineaFactura {
  productoId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  dto: string;
  stockDisponible: number;
  ivaPct: number;
}

function etiquetaStock(stock: number): { label: string; tono: 'ok' | 'warn' | 'danger' } {
  if (stock <= 0) {
    return { label: 'Sin stock', tono: 'danger' };
  }
  if (stock <= 5) {
    return { label: `${stock} disp.`, tono: 'warn' };
  }
  return { label: `${stock} disp.`, tono: 'ok' };
}

const TITULOS: Record<TipoComprobante, string> = {
  factura: 'Mostrador',
  presupuesto: 'Nuevo presupuesto',
  pedido: 'Nuevo pedido',
  remito: 'Nuevo remito',
};

const PREFIJOS: Record<TipoComprobante, string> = {
  factura: 'FAC A',
  presupuesto: 'PRE',
  pedido: 'PED',
  remito: 'REM',
};

const IVA_LABEL: Record<string, string> = {
  responsable_inscripto: 'RI',
  monotributo: 'Monotributo',
  exento: 'Exento',
  consumidor_final: 'Consumidor final',
};

function formatearMonto(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseTipo(raw: unknown): TipoComprobante {
  if (raw === 'presupuesto' || raw === 'pedido' || raw === 'remito' || raw === 'factura') {
    return raw;
  }
  return 'factura';
}

function metaCliente(c: ClienteRef, zonaNombre?: string | null): string {
  const cuit = c.cuit?.trim() || 'Sin CUIT';
  const iva = IVA_LABEL[c.condicionIva] ?? c.condicionIva;
  const zona = zonaNombre?.trim() || null;
  return zona ? `${cuit} · ${iva} · ${zona}` : `${cuit} · ${iva}`;
}

/**
 * Alta de comprobantes (factura / presupuesto / pedido / remito).
 * El tipo viene de la ruta (`/ventas`, `/ventas/presupuesto`, …).
 */
@Component({
  selector: 'app-ventas-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './ventas-page.html',
  styleUrl: './ventas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.page-scroll]': 'hostPageScroll',
    '(document:keydown)': 'onAtajo($event)',
  },
})
export class VentasPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(VentasStore);
  private readonly api = inject(VentasService);
  private readonly bancosApi = inject(BancosService);
  private readonly configApi = inject(ConfiguracionService);
  private readonly ia = inject(IaService);
  private readonly notifications = inject(NotificationStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly inputIa = viewChild<ElementRef<HTMLInputElement>>('inputIa');
  protected readonly inputCli = viewChild<ElementRef<HTMLInputElement>>('inputCli');
  protected readonly inputProd = viewChild<ElementRef<HTMLInputElement>>('inputProd');

  protected get hostPageScroll(): boolean {
    return this.tipo() !== 'factura';
  }

  private readonly clienteAutocomplete$ = new Subject<string>();
  private readonly modalBusqueda$ = new Subject<void>();

  protected readonly tipo = toSignal(this.route.data.pipe(map((d) => parseTipo(d['tipo']))), {
    initialValue: parseTipo(this.route.snapshot.data['tipo']),
  });

  protected readonly titulo = computed(() => TITULOS[this.tipo()]);
  protected readonly esFactura = computed(() => this.tipo() === 'factura');

  protected readonly buscando = signal(false);
  protected readonly busqueda = signal('');
  protected readonly cantidadAgregar = signal(1);
  protected readonly condicion = signal<CondicionVenta>('ctacte');
  protected readonly medioPago = signal<'efectivo' | 'debito' | 'transferencia'>('efectivo');
  protected readonly montoRecibido = signal('');
  protected readonly lineas = signal<LineaFactura[]>([]);
  protected readonly hayLineas = computed(() => this.lineas().some((l) => l.cantidad > 0));
  protected readonly guardando = signal(false);
  protected readonly emitirOpcionesOpen = signal(false);

  protected readonly clienteId = signal<string | null>(null);
  protected readonly clienteNombre = signal('Consumidor final');
  protected readonly clienteMeta = signal('Sin CUIT · Consumidor final · Lista 1');
  protected readonly clienteBloqueado = signal(false);
  protected readonly clienteLimite = signal(0);
  protected readonly clienteInput = signal('');
  protected readonly clienteQuickOpen = signal(false);
  protected readonly clienteBuscando = signal(false);
  protected readonly clientesAutocomplete = signal<ClienteRef[]>([]);
  protected readonly clienteSaldo = signal<SaldoClienteRef | null>(null);
  protected readonly clienteSaldoCargando = signal(false);

  protected readonly cobroOpen = signal(false);
  protected readonly cobroMonto = signal('');
  protected readonly cobroMedio = signal<MedioCobro>('efectivo');
  protected readonly cobroObs = signal('');
  protected readonly cobroGuardando = signal(false);
  protected readonly cobroChequeNumero = signal('');
  protected readonly cobroChequeBanco = signal('');
  protected readonly cobroChequeLibrador = signal('');
  protected readonly cobroChequeFecha = signal('');
  protected readonly cobroChequeVto = signal('');

  protected readonly chequeNumero = signal('');
  protected readonly chequeBanco = signal('');
  protected readonly chequeLibrador = signal('');
  protected readonly chequeFecha = signal('');
  protected readonly chequeVto = signal('');

  protected readonly buscarClienteOpen = signal(false);
  protected readonly buscarArticuloOpen = signal(false);
  protected readonly modalQ = signal('');
  protected readonly modalZonaId = signal('');
  protected readonly modalEstado = signal<'activos' | 'todos' | 'bloqueados'>('activos');
  protected readonly modalVendedorId = signal('');
  protected readonly modalBuscando = signal(false);
  protected readonly modalResultados = signal<ClienteRef[]>([]);
  protected readonly textoIa = signal('');
  protected readonly interpretandoIa = signal(false);
  protected readonly previewIa = signal<InterpretarMostradorResultado | null>(null);
  protected readonly zonasRef = signal<ZonaRef[]>([]);
  protected readonly usuariosRef = signal<UsuarioRef[]>([]);

  protected readonly cfMode = signal(true);
  protected readonly consumidorFinal = signal<ClienteRef | null>(null);
  protected readonly descGlobalTxt = signal('0');
  protected readonly pagosMos = signal<PagoMos[]>([nuevoPagoMos('efectivo', 1)]);
  protected readonly compMos = signal<CompMos>('factura_b');
  protected readonly ticketMos = signal<TicketMos | null>(null);
  protected readonly afip = signal<ParametrosAfip | null>(null);
  protected readonly clienteCondicionIva = signal('consumidor_final');
  protected readonly letraFiscalActual = computed(() => {
    const emisor = this.afip()?.condicionIva ?? 'responsable_inscripto';
    const receptor = this.cfMode() ? 'consumidor_final' : this.clienteCondicionIva();
    return letraFiscal(emisor, receptor);
  });
  protected readonly aiCliSel = signal<string | null>(null);
  protected readonly aiProdSel = signal<string | null>(null);
  protected readonly cuentasBanco = signal<CuentaBancariaDto[]>([]);
  protected readonly mpPool = signal<AcreditacionMp[]>(acreditacionesMpDemo());
  protected readonly mpConsumidas = signal<string[]>([]);
  protected readonly saldosSug = signal<Map<string, SaldoClienteRef>>(new Map());
  protected readonly bancosEmisores = BANCOS_EMISORES_AR;
  protected readonly mediosMos = MEDIOS_MOS;
  protected readonly tarjetasMos = TARJETAS_MOS;
  protected readonly cuotasMos = CUOTAS_MOS;
  protected readonly billetesMos = BILLETES_MOS;
  private pagoSeq = 1;

  protected readonly clientesRef = this.store.clientesRef;
  protected readonly productosRef = this.store.productosRef;
  protected readonly depositosRef = this.store.depositosRef;

  protected readonly zonaPorId = computed(() => {
    const mapZ = new Map<string, string>();
    for (const z of this.zonasRef()) {
      mapZ.set(z.id, z.nombre);
    }
    return mapZ;
  });

  protected readonly resultados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const items = this.productosRef().filter((p) => p.activo);
    const filtrados = q
      ? items.filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      : items;
    return filtrados.slice(0, 8).map((p) => {
      const enTicket = this.lineas().find((l) => l.productoId === p.id)?.cantidad ?? 0;
      const disponible = Math.max(0, p.stock - enTicket);
      const stock = etiquetaStock(disponible);
      return {
        producto: p,
        nombre: p.nombre,
        detalle: p.sku,
        precio: `$ ${formatearMonto(p.precio)}`,
        stockLabel: stock.label,
        stockTono: stock.tono,
      };
    });
  });

  protected readonly resultadosMos = computed(() =>
    this.busqueda().trim().length >= 2 ? this.resultados() : [],
  );

  protected readonly articulosModal = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.productosRef()
      .filter((p) => p.activo)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 40)
      .map((p) => {
        const enTicket = this.lineas().find((l) => l.productoId === p.id)?.cantidad ?? 0;
        const disponible = Math.max(0, p.stock - enTicket);
        const stock = etiquetaStock(disponible);
        return {
          producto: p,
          nombre: p.nombre,
          detalle: p.sku,
          precio: `$ ${formatearMonto(p.precio)}`,
          stockLabel: stock.label,
          stockTono: stock.tono,
          stockDisponible: disponible,
        };
      });
  });

  protected readonly clienteSaldoVista = computed(() => {
    const s = this.clienteSaldo();
    if (!this.clienteId() || !s) {
      return null;
    }
    if (s.saldo > 0) {
      return {
        tono: 'debe' as const,
        label: 'Debe',
        monto: `$ ${formatearMonto(s.saldo)}`,
        flecha: '↓' as const,
      };
    }
    if (s.saldo < 0) {
      return {
        tono: 'favor' as const,
        label: 'A favor',
        monto: `$ ${formatearMonto(Math.abs(s.saldo))}`,
        flecha: '↑' as const,
      };
    }
    return {
      tono: 'ok' as const,
      label: 'Al día',
      monto: '$ 0,00',
      flecha: null,
    };
  });

  protected readonly isContado = computed(() => this.condicion() === 'contado');
  protected readonly isCtaCte = computed(() => this.condicion() === 'ctacte');
  protected readonly isCheque = computed(() => this.condicion() === 'cheque');
  protected readonly isPagoInmediato = computed(() => this.condicion() !== 'ctacte');
  protected readonly isEfectivo = computed(
    () => this.condicion() === 'contado' && this.medioPago() === 'efectivo',
  );

  protected readonly subtotal = computed(() =>
    this.lineas().reduce((acc, l) => {
      const bruto = l.cantidad * l.precioUnitario;
      return acc + bruto * (1 - dtoPct(l.dto) / 100);
    }, 0),
  );

  protected readonly descPct = computed(() => Math.min(100, parseNumMos(this.descGlobalTxt())));
  protected readonly descMonto = computed(() => this.subtotal() * (this.descPct() / 100));
  protected readonly factorDesc = computed(() => 1 - this.descPct() / 100);

  protected readonly neto = computed(() => this.subtotal() / 1.21);
  protected readonly iva = computed(() => this.subtotal() - this.neto());
  protected readonly total = computed(() => this.subtotal() * this.factorDesc());

  protected readonly subtotalFmt = computed(() => formatearMonto(this.subtotal()));
  protected readonly netoFmt = computed(() => formatearMonto(this.neto()));
  protected readonly ivaFmt = computed(() => formatearMonto(this.iva()));
  protected readonly totalFmt = computed(() => formatearMonto(this.total()));

  protected readonly montoNum = computed(() => {
    const raw = this.montoRecibido().replace(/\./g, '').replace(',', '.');
    return parseFloat(raw) || 0;
  });

  protected readonly vuelto = computed(() => this.montoNum() - this.total());
  protected readonly montoRecibidoFmt = computed(() => formatearMonto(this.montoNum()));
  protected readonly vueltoFmt = computed(() => formatearMonto(Math.abs(this.vuelto())));
  protected readonly vueltoLabel = computed(() => (this.vuelto() >= 0 ? 'Vuelto' : 'Falta'));
  protected readonly vueltoOk = computed(() => this.vuelto() >= 0);

  protected readonly metaComprobante = computed(() => {
    const hoy = new Date();
    const d = String(hoy.getDate()).padStart(2, '0');
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const y = hoy.getFullYear();
    return `${PREFIJOS[this.tipo()]} · ${d}/${m}/${y}`;
  });

  protected readonly ctaPrincipal = computed(() => {
    switch (this.tipo()) {
      case 'presupuesto':
        return 'Guardar presupuesto';
      case 'pedido':
        return 'Guardar pedido';
      case 'remito':
        return 'Guardar remito';
      default:
        return this.isCtaCte() ? 'Generar remito' : 'Emitir comprobante';
    }
  });

  protected readonly listadoTrasGuardar = computed(() => {
    switch (this.tipo()) {
      case 'presupuesto':
        return '/comprobantes/presupuestos';
      case 'pedido':
        return '/comprobantes/pedidos';
      case 'remito':
        return '/comprobantes/remitos';
      default:
        return '/ventas';
    }
  });

  protected readonly eanDesconocido = computed(() => {
    const q = this.busqueda().trim();
    return /^\d{6,}$/.test(q) && this.resultados().length === 0;
  });

  protected readonly cliCorto = computed(() => {
    const q = this.clienteInput().trim();
    if (!q) {
      return 'Escribí al menos 3 caracteres (o «cf» para Consumidor Final)';
    }
    const gate = q.toLowerCase() === 'cf' ? 2 : 3;
    if (q.length < gate) {
      return 'Escribí al menos 3 caracteres para buscar';
    }
    return '';
  });

  protected readonly fichaMos = computed(() => {
    const cf = this.cfMode();
    const saldo = this.clienteSaldo();
    const limite = this.clienteLimite();
    const nombre = this.clienteNombre();
    if (cf || !this.clienteId()) {
      return {
        nombre: 'Consumidor Final',
        estado: 'CF',
        tono: 'cf' as TonoCc,
        meta: 'Sin identificar · Contado · Lista Mostrador',
        datos: [
          { label: 'Saldo', value: '—', tono: 'muted' as TonoCc },
          { label: 'Límite', value: '—', tono: 'muted' as TonoCc },
          { label: 'Disponible', value: '—', tono: 'muted' as TonoCc },
          { label: 'Vence', value: '—', tono: 'muted' as TonoCc },
        ],
        verCuenta: false,
      };
    }
    const s = saldo?.saldo ?? 0;
    const tono: TonoCc = this.clienteBloqueado()
      ? 'warn'
      : s > 0.5
        ? 'debe'
        : s < -0.5
          ? 'favor'
          : 'ok';
    const estado = this.clienteBloqueado()
      ? 'Bloqueado'
      : tono === 'debe'
        ? 'Debe'
        : tono === 'favor'
          ? 'A favor'
          : 'Al día';
    const disponible = limite - Math.max(s, 0);
    return {
      nombre,
      estado,
      tono,
      meta: this.clienteMeta(),
      datos: [
        { label: 'Saldo', value: moneyMos(s), tono },
        { label: 'Límite', value: moneyMos(limite), tono: 'muted' as TonoCc },
        {
          label: 'Disponible',
          value: moneyMos(Math.max(disponible, 0)),
          tono: disponible < 0 ? ('debe' as TonoCc) : ('ok' as TonoCc),
        },
        { label: 'Vence', value: '—', tono: 'muted' as TonoCc },
      ],
      verCuenta: true,
    };
  });

  protected readonly ivasMos = computed(() => {
    const factor = this.factorDesc();
    const porAlicuota = new Map<number, number>();
    for (const l of this.lineas()) {
      const sub = l.cantidad * l.precioUnitario * (1 - dtoPct(l.dto) / 100);
      const ivaPct = l.ivaPct || 21;
      porAlicuota.set(ivaPct, (porAlicuota.get(ivaPct) ?? 0) + sub * factor);
    }
    const rows: { label: string; value: string }[] = [];
    for (const [pct, bruto] of [...porAlicuota.entries()].sort((a, b) => b[0] - a[0])) {
      if (bruto <= 0) {
        continue;
      }
      const neto = bruto / (1 + pct / 100);
      const iva = bruto - neto;
      rows.push({
        label: `IVA ${String(pct).replace('.', ',')} %`,
        value: moneyMos(iva),
      });
    }
    return rows;
  });

  protected readonly netoMosFmt = computed(() => {
    const factor = this.factorDesc();
    let neto = 0;
    for (const l of this.lineas()) {
      const sub = l.cantidad * l.precioUnitario * (1 - dtoPct(l.dto) / 100) * factor;
      const ivaPct = l.ivaPct || 21;
      neto += sub / (1 + ivaPct / 100);
    }
    return moneyMos(neto);
  });

  protected readonly permiteCuenta = computed(
    () => this.compMos() !== 'ticket' && !this.cfMode() && !!this.clienteId(),
  );

  protected readonly pagosVista = computed(() => {
    const total = this.total();
    const permite = this.permiteCuenta();
    const activos = this.pagosMos().filter((p) => permite || p.tipo !== 'ctacte');
    const explicitos = activos.map((p) =>
      p.montoTxt.trim() === '' ? null : parseNumMos(p.montoTxt),
    );
    let sumaExplicita = 0;
    for (const v of explicitos) {
      sumaExplicita += v ?? 0;
    }
    const autoIdx = explicitos.indexOf(null);
    const montos = explicitos.map((v, i) =>
      v !== null ? v : i === autoIdx ? Math.max(Math.round(total - sumaExplicita), 0) : 0,
    );
    const pagado = montos.reduce((a, v) => a + v, 0);
    const enCuenta = activos.reduce((a, p, i) => a + (p.tipo === 'ctacte' ? montos[i] : 0), 0);
    const falta = total - pagado;
    const aAcreditar = activos.reduce(
      (a, p, i) => a + (p.tipo === 'transferencia' && !p.mpId ? montos[i] : 0),
      0,
    );
    return { activos, montos, pagado, enCuenta, falta, aAcreditar };
  });

  protected readonly cobradoFmt = computed(() => moneyMos(this.pagosVista().pagado));
  protected readonly aAcreditarFmt = computed(() => moneyMos(this.pagosVista().aAcreditar));
  protected readonly descMontoFmt = computed(() =>
    this.descMonto() > 0 ? `− ${moneyMos(this.descMonto())}` : moneyMos(0),
  );

  protected readonly estadoPago = computed(() => {
    const total = this.total();
    const { falta, aAcreditar } = this.pagosVista();
    const comp = this.compMos();
    const permite = this.permiteCuenta();
    if (total === 0) {
      return {
        txt: 'Cargá productos para poder cobrar.',
        tono: 'muted' as const,
      };
    }
    if (Math.abs(falta) < 1 && aAcreditar > 0) {
      return {
        txt: `Pago completo, con ${moneyMos(aAcreditar)} de transferencia a acreditar.`,
        tono: 'warn' as const,
      };
    }
    if (Math.abs(falta) < 1) {
      const nombre =
        comp === 'ticket' ? 'el ticket' : comp === 'remito' ? 'el remito' : 'la factura';
      return { txt: `Pago completo. Listo para emitir ${nombre}.`, tono: 'ok' as const };
    }
    if (falta > 0 && this.cfMode()) {
      return {
        txt: `Faltan ${moneyMos(falta)}. Consumidor Final no opera en cuenta corriente: identificá al cliente.`,
        tono: 'danger' as const,
      };
    }
    if (falta > 0 && !permite) {
      return {
        txt: `Faltan ${moneyMos(falta)}. Con ticket interno no se puede cargar a cuenta: elegí factura o remito.`,
        tono: 'danger' as const,
      };
    }
    if (falta > 0) {
      return {
        txt: `Faltan ${moneyMos(falta)}. Se cargan a cuenta corriente si confirmás así.`,
        tono: 'warn' as const,
      };
    }
    return {
      txt: `Cobraste ${moneyMos(-falta)} de más: queda a favor del cliente.`,
      tono: 'ok' as const,
    };
  });

  protected readonly ctaMos = computed(() => {
    const total = this.total();
    const { falta, enCuenta } = this.pagosVista();
    const permite = this.permiteCuenta();
    const sinCliente = !this.cfMode() && !this.clienteId();
    const aCuenta = permite && (enCuenta > 0 || falta > 0.5);
    const bloqueado = total === 0 || sinCliente || (falta > 0.5 && !permite) || this.guardando();
    let label = 'Cobrar';
    if (total > 0) {
      if (sinCliente) {
        label = 'Elegí el cliente';
      } else if (falta > 0.5 && !permite) {
        label = `Falta cobrar ${moneyMos(falta)}`;
      } else if (aCuenta) {
        label = 'Cargar a cuenta y emitir';
      } else if (this.compMos() === 'remito') {
        label = 'Cobrar y emitir remito';
      } else if (this.compMos() === 'ticket') {
        label = 'Cobrar y emitir ticket';
      } else {
        label = 'Cobrar y facturar · F12';
      }
    }
    return { label, bloqueado, aCuenta };
  });

  protected readonly iaVista = computed(() => {
    const preview = this.previewIa();
    if (!preview && !this.interpretandoIa()) {
      return null;
    }
    const items = (preview?.lineas ?? [])
      .filter((l) => l.productoId)
      .map((l) => ({
        rol: 'Ítem',
        nombre: l.productoNombre || l.descripcion,
        meta: `${l.cantidad} u.${l.productoSku ? ` · ${l.productoSku}` : ''}`,
        importe: l.precioUnitario != null ? moneyMos(l.precioUnitario * l.cantidad) : '—',
      }));
    const ambiguos = (preview?.lineas ?? []).filter((l) => !l.productoId);
    const prodOpciones = ambiguos.flatMap((l) => {
      const q = (l.descripcion || '').toLowerCase();
      const tokens = q.split(/\s+/).filter((t) => t.length > 2);
      return this.productosRef()
        .filter((p) => p.activo)
        .filter((p) => {
          const blob = `${p.nombre} ${p.sku}`.toLowerCase();
          return tokens.some((t) => blob.includes(t));
        })
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          codigo: p.sku,
          nombre: p.nombre,
          stockTxt: p.stock <= 0 ? 'Sin stock' : `Stock ${p.stock} u`,
          stockTono: p.stock <= 0 ? 'danger' : p.stock <= 5 ? 'warn' : 'ok',
          importe: moneyMos(p.precio * (l.cantidad || 1)),
          unitario: moneyMos(p.precio),
          cantidad: l.cantidad || 1,
        }));
    });
    const nota =
      preview?.advertencias?.[0] ||
      preview?.preguntas?.[0] ||
      (this.interpretandoIa()
        ? 'Interpretando el pedido…'
        : 'Revisá y aceptá para cargar el detalle.');
    return {
      titulo: this.interpretandoIa() ? 'Interpretando…' : 'Pedido interpretado',
      sub: preview ? `${Math.round(preview.confianza * 100)}%` : '',
      clienteNombre: preview?.clienteNombre ?? '',
      clienteId: preview?.clienteId ?? null,
      items,
      prodOpciones,
      nota,
      puedeAceptar: items.length > 0 || !!this.aiProdSel(),
    };
  });

  constructor() {
    const clienteId = this.route.snapshot.queryParamMap.get('clienteId');
    if (clienteId) {
      this.api.obtenerCliente(clienteId).subscribe({
        next: (c) => this.elegirClienteRef(c),
      });
    } else {
      this.cargarConsumidorFinal(true);
    }
    this.mpConsumidas.set(this.leerMpConsumidas());
    this.store.cargarReferencias();
    this.configApi
      .obtenerAfip()
      .pipe(catchError(() => of(null)))
      .subscribe((a) => {
        this.afip.set(a);
        this.aplicarLetraFiscal();
      });
    this.api
      .listarZonasRef()
      .pipe(catchError(() => of([] as ZonaRef[])))
      .subscribe((z) => this.zonasRef.set(z));
    this.api
      .listarUsuariosRef()
      .pipe(catchError(() => of([] as UsuarioRef[])))
      .subscribe((u) => this.usuariosRef.set(u));
    this.bancosApi
      .cuentas()
      .pipe(catchError(() => of([] as CuentaBancariaDto[])))
      .subscribe((c) => this.cuentasBanco.set(c.filter((x) => x.activo)));

    this.clienteAutocomplete$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          const gate = q.toLowerCase() === 'cf' ? 2 : 3;
          if (q.length < gate) {
            this.clientesAutocomplete.set([]);
            this.clienteBuscando.set(false);
            return EMPTY;
          }
          this.clienteBuscando.set(true);
          const termino = q.toLowerCase() === 'cf' ? 'Consumidor Final' : q;
          return this.api.buscarClientes(termino, { activo: true, pageSize: 12 }).pipe(
            catchError(() => of([] as ClienteRef[])),
            finalize(() => this.clienteBuscando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.clientesAutocomplete.set(items);
        this.clienteQuickOpen.set(true);
        this.cargarSaldosSug(items);
      });

    this.modalBusqueda$
      .pipe(
        debounceTime(280),
        switchMap(() => {
          if (!this.buscarClienteOpen()) {
            return EMPTY;
          }
          this.modalBuscando.set(true);
          const estado = this.modalEstado();
          const activo = estado === 'activos' ? true : estado === 'todos' ? null : true;
          return this.api.buscarClientes(this.modalQ(), { activo, pageSize: 100 }).pipe(
            catchError(() => of([] as ClienteRef[])),
            finalize(() => this.modalBuscando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.modalResultados.set(this.filtrarModalLocal(items));
      });
  }

  protected formatearPrecio(n: number): string {
    return formatearMonto(n);
  }

  protected importeLinea(l: LineaFactura): string {
    const bruto = l.cantidad * l.precioUnitario;
    return formatearMonto(bruto * (1 - dtoPct(l.dto) / 100));
  }

  protected metaDeCliente(c: ClienteRef): string {
    const zona = c.zonaId ? this.zonaPorId().get(c.zonaId) : null;
    return metaCliente(c, zona);
  }

  protected setCondicion(c: CondicionVenta): void {
    this.condicion.set(c);
    this.medioPago.set('efectivo');
    this.montoRecibido.set('');
  }

  protected abrirBusqueda(): void {
    this.buscando.set(true);
  }

  protected cerrarBusqueda(): void {
    setTimeout(() => this.buscando.set(false), 150);
  }

  protected elegirProducto(p: ProductoRef): void {
    this.agregarProducto(p, this.cantidadAgregar());
    this.buscando.set(false);
    this.busqueda.set('');
  }

  protected onClienteInput(value: string): void {
    this.clienteInput.set(value);
    this.clienteQuickOpen.set(true);
    this.clienteAutocomplete$.next(value);
  }

  protected onClienteFocus(): void {
    this.clienteQuickOpen.set(true);
  }

  protected cerrarClienteQuick(): void {
    setTimeout(() => this.clienteQuickOpen.set(false), 180);
  }

  protected elegirCliente(id: string | null, nombre: string, meta?: string): void {
    if (!id) {
      this.aplicarConsumidorFinal();
      this.clienteNombre.set(nombre);
      this.clienteInput.set('');
      if (meta) {
        this.clienteMeta.set(meta);
      }
      this.clienteQuickOpen.set(false);
      this.buscarClienteOpen.set(false);
      this.clientesAutocomplete.set([]);
      return;
    }
    const ref =
      this.clientesAutocomplete().find((c) => c.id === id) ??
      this.modalResultados().find((c) => c.id === id) ??
      this.clientesRef().find((c) => c.id === id);
    if (ref) {
      this.elegirClienteRef(ref);
      return;
    }
    this.clienteId.set(id);
    this.clienteNombre.set(nombre);
    this.clienteInput.set(nombre);
    this.clienteMeta.set(meta ?? `Cliente · ${nombre}`);
    this.clienteBloqueado.set(false);
    this.clienteQuickOpen.set(false);
    this.buscarClienteOpen.set(false);
    this.cargarSaldo(id);
  }

  protected elegirClienteRef(c: ClienteRef): void {
    const esCf =
      c.condicionIva === 'consumidor_final' &&
      (c.id === this.consumidorFinal()?.id || /consumidor\s*final/i.test(c.nombre));
    this.cfMode.set(esCf);
    this.clienteId.set(c.id);
    this.clienteNombre.set(c.nombre);
    this.clienteInput.set(esCf ? '' : c.nombre);
    this.clienteMeta.set(this.metaDeCliente(c));
    this.clienteBloqueado.set(c.bloqueado);
    this.clienteLimite.set(c.limiteCredito);
    this.clienteCondicionIva.set(c.condicionIva);
    this.aplicarLetraFiscal();
    this.clienteQuickOpen.set(false);
    this.buscarClienteOpen.set(false);
    this.clientesAutocomplete.set([]);
    if (esCf) {
      this.consumidorFinal.set(c);
      this.clienteSaldo.set(null);
      return;
    }
    this.cargarSaldo(c.id);
  }

  protected interpretarIa(): void {
    const texto = this.textoIa().trim();
    if (texto.length < 3) {
      this.notifications.warning('Escribí un pedido', 'Ej: 2 mouse para García');
      return;
    }
    this.interpretandoIa.set(true);
    this.previewIa.set(null);
    this.ia.interpretarMostrador(texto).subscribe({
      next: (resultado) => {
        this.interpretandoIa.set(false);
        this.previewIa.set(resultado);
        this.notifications.success(
          'Pedido interpretado',
          resultado.modoParser === 'anthropic' ? 'Claude Haiku' : 'Modo demo',
        );
      },
      error: () => {
        this.interpretandoIa.set(false);
      },
    });
  }

  protected aplicarPreviewIa(): void {
    const preview = this.previewIa();
    if (!preview) {
      return;
    }
    if (preview.clienteId && preview.clienteNombre) {
      this.elegirCliente(preview.clienteId, preview.clienteNombre);
    }
    let agregados = 0;
    for (const linea of preview.lineas) {
      if (!linea.productoId) {
        continue;
      }
      const producto = this.productosRef().find((p) => p.id === linea.productoId);
      if (producto) {
        this.agregarProducto(producto, linea.cantidad);
        agregados += 1;
      }
    }
    if (agregados === 0) {
      this.notifications.warning(
        'Sin artículos',
        'Ninguna línea matcheó productos del catálogo. Revisá el texto.',
      );
      return;
    }
    this.previewIa.set(null);
    this.textoIa.set('');
    this.notifications.success('Ticket actualizado', `Se agregaron ${agregados} línea(s).`);
  }

  protected descartarPreviewIa(): void {
    this.previewIa.set(null);
  }

  protected abrirBuscarCliente(): void {
    this.clienteQuickOpen.set(false);
    this.modalQ.set(this.clienteInput().trim().length >= 3 ? this.clienteInput().trim() : '');
    this.modalZonaId.set('');
    this.modalEstado.set('activos');
    this.modalVendedorId.set('');
    this.buscarClienteOpen.set(true);
    this.modalBusqueda$.next();
  }

  protected cerrarBuscarCliente(): void {
    this.buscarClienteOpen.set(false);
  }

  protected onModalQ(value: string): void {
    this.modalQ.set(value);
    this.modalBusqueda$.next();
  }

  protected onModalZona(value: string): void {
    this.modalZonaId.set(value);
    this.modalBusqueda$.next();
  }

  protected onModalEstado(value: string): void {
    if (value === 'activos' || value === 'todos' || value === 'bloqueados') {
      this.modalEstado.set(value);
      this.modalBusqueda$.next();
    }
  }

  protected onModalVendedor(value: string): void {
    this.modalVendedorId.set(value);
    this.modalBusqueda$.next();
  }

  protected abrirBuscarArticulo(): void {
    this.buscarArticuloOpen.set(true);
  }

  protected clearInput(event: Event): void {
    const wrap = (event.currentTarget as HTMLElement).parentElement;
    const input = wrap?.querySelector('input');
    if (input) {
      input.value = '';
      input.focus();
      if (input.classList.contains('fact__search--cliente')) {
        this.clienteInput.set('');
        this.clientesAutocomplete.set([]);
        this.clienteAutocomplete$.next('');
      } else if (input.classList.contains('fact-modal__input')) {
        this.onModalQ('');
      } else {
        this.busqueda.set('');
      }
    }
  }

  protected agregarProducto(p: ProductoRef, cantidad = 1): void {
    const qty = Math.max(1, cantidad);
    const enTicket = this.lineas().find((l) => l.productoId === p.id)?.cantidad ?? 0;
    const disponible = Math.max(0, p.stock - enTicket);
    if (disponible <= 0) {
      this.notifications.warning('Sin stock', `${p.nombre}: no hay unidades disponibles`);
      return;
    }
    if (qty > disponible) {
      this.notifications.warning(
        'Stock insuficiente',
        `${p.nombre}: solo hay ${disponible} disponible(s)`,
      );
    }
    const qtyFinal = Math.min(qty, Math.max(1, disponible));
    this.lineas.update((rows) => {
      const existente = rows.find((r) => r.productoId === p.id);
      if (existente) {
        return rows.map((r) =>
          r.productoId === p.id
            ? { ...r, cantidad: r.cantidad + qtyFinal, stockDisponible: p.stock }
            : r,
        );
      }
      return [
        ...rows,
        {
          productoId: p.id,
          codigo: p.sku,
          descripcion: p.nombre,
          cantidad: qtyFinal,
          precioUnitario: p.precio,
          dto: '',
          stockDisponible: p.stock,
          ivaPct: 21,
        },
      ];
    });
    this.buscarArticuloOpen.set(false);
  }

  protected eliminarLinea(productoId: string): void {
    this.lineas.update((rows) => rows.filter((r) => r.productoId !== productoId));
  }

  protected setCantidad(productoId: string, value: string): void {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      return;
    }
    this.lineas.update((rows) =>
      rows.map((r) => (r.productoId === productoId ? { ...r, cantidad: n } : r)),
    );
  }

  protected cambiarCant(productoId: string, delta: number): void {
    this.lineas.update((rows) =>
      rows
        .map((r) => {
          if (r.productoId !== productoId) {
            return r;
          }
          const next = r.cantidad + delta;
          if (next <= 0) {
            return null;
          }
          const max = Math.max(1, r.stockDisponible);
          return { ...r, cantidad: Math.min(next, max) };
        })
        .filter((r): r is LineaFactura => r !== null),
    );
  }

  protected setBonif(productoId: string, value: string): void {
    const pct = dtoPct(value);
    this.lineas.update((rows) =>
      rows.map((r) => (r.productoId === productoId ? { ...r, dto: pct ? String(pct) : '' } : r)),
    );
  }

  protected vaciarDetalle(): void {
    this.lineas.set([]);
  }

  protected cancelarVenta(): void {
    this.resetMostrador();
  }

  protected nuevaVenta(): void {
    this.ticketMos.set(null);
    this.resetMostrador();
    queueMicrotask(() => this.inputProd()?.nativeElement.focus());
  }

  protected toggleCF(): void {
    if (this.cfMode()) {
      this.cfMode.set(false);
      this.clienteId.set(null);
      this.clienteNombre.set('');
      this.clienteMeta.set('');
      this.clienteLimite.set(0);
      this.clienteSaldo.set(null);
      this.clienteInput.set('');
      this.clienteQuickOpen.set(true);
      queueMicrotask(() => this.inputCli()?.nativeElement.focus());
      return;
    }
    this.aplicarConsumidorFinal();
  }

  protected verCuenta(): void {
    const id = this.clienteId();
    if (!id || this.cfMode()) {
      return;
    }
    void this.router.navigate(['/cuenta-corriente'], { queryParams: { clienteId: id } });
  }

  protected setDescGlobal(value: string): void {
    this.descGlobalTxt.set(value);
  }

  protected pickDescRapido(pct: number): void {
    this.descGlobalTxt.set(String(pct));
  }

  protected toggleMedio(tipo: TipoMedioMos): void {
    if (tipo === 'ctacte' && !this.permiteCuenta()) {
      return;
    }
    const actuales = this.pagosMos();
    const idx = actuales.findIndex((p) => p.tipo === tipo);
    if (idx >= 0) {
      if (actuales.length === 1) {
        return;
      }
      this.pagosMos.set(actuales.filter((p) => p.tipo !== tipo));
      return;
    }
    this.pagoSeq += 1;
    this.pagosMos.set([...actuales, nuevoPagoMos(tipo, this.pagoSeq, this.clienteNombre())]);
  }

  protected agregarMedio(): void {
    const usados = new Set(this.pagosMos().map((p) => p.tipo));
    const next = MEDIOS_MOS.find((m) => {
      if (usados.has(m.tipo)) {
        return false;
      }
      if (m.tipo === 'ctacte' && !this.permiteCuenta()) {
        return false;
      }
      return true;
    });
    if (!next) {
      return;
    }
    this.toggleMedio(next.tipo);
  }

  protected setPagoCampo(id: string, campo: keyof PagoMos, value: string | boolean): void {
    if ((campo === 'montoTxt' || campo === 'recibidoTxt') && !this.hayLineas()) {
      return;
    }
    this.pagosMos.update((list) => list.map((p) => (p.id === id ? { ...p, [campo]: value } : p)));
  }

  protected quitarPago(id: string): void {
    this.pagosMos.update((list) => (list.length <= 1 ? list : list.filter((p) => p.id !== id)));
  }

  protected usarResto(id: string): void {
    if (!this.hayLineas()) {
      return;
    }
    const { falta, activos, montos } = this.pagosVista();
    if (falta <= 0.5) {
      return;
    }
    const idx = activos.findIndex((p) => p.id === id);
    const actual = idx >= 0 ? montos[idx] : 0;
    this.setPagoCampo(id, 'montoTxt', String(Math.round(actual + falta)));
  }

  protected pickBillete(id: string, valor: number): void {
    if (!this.hayLineas()) {
      return;
    }
    const pago = this.pagosMos().find((p) => p.id === id);
    if (!pago) {
      return;
    }
    const next = parseNumMos(pago.recibidoTxt) + valor;
    this.setPagoCampo(id, 'recibidoTxt', String(next));
  }

  protected montoPagoNum(id: string): number {
    const { activos, montos } = this.pagosVista();
    const idx = activos.findIndex((p) => p.id === id);
    return idx >= 0 ? (montos[idx] ?? 0) : 0;
  }

  protected mpChipTono(p: PagoMos): TonoCc {
    if (p.mpId) {
      return 'ok';
    }
    if (p.mpPendiente) {
      return 'warn';
    }
    return 'muted';
  }

  protected mpChipTxt(p: PagoMos): string {
    if (p.mpId) {
      return 'Acreditado';
    }
    if (p.mpPendiente) {
      return 'Pendiente de acreditación';
    }
    return 'Sin asociar';
  }

  protected acreditacionDe(mpId: string): AcreditacionMp | null {
    if (!mpId) {
      return null;
    }
    return this.mpPool().find((a) => a.id === mpId) ?? null;
  }

  protected mpAsociadaVista(p: PagoMos): { pagador: string; ref: string; importe: string } | null {
    const a = this.acreditacionDe(p.mpId);
    if (!a) {
      return null;
    }
    return {
      pagador: a.pagador,
      ref: `${a.hora} · ${a.ref}`,
      importe: moneyMos(a.importe),
    };
  }

  protected mpCandidatos(
    pagoId: string,
    monto: number,
  ): { a: AcreditacionMp; coincide: boolean; importeFmt: string }[] {
    const usadas = new Set(
      this.pagosMos()
        .filter((p) => p.id !== pagoId && p.mpId)
        .map((p) => p.mpId),
    );
    const consumidas = new Set(this.mpConsumidas());
    return this.mpPool()
      .filter((a) => !usadas.has(a.id) && !consumidas.has(a.id))
      .slice()
      .sort((x, y) => Math.abs(x.importe - monto) - Math.abs(y.importe - monto))
      .map((a) => ({
        a,
        coincide: monto > 0 && Math.abs(a.importe - monto) < 1,
        importeFmt: moneyMos(a.importe),
      }));
  }

  protected asociarMp(pagoId: string, mpId: string): void {
    if (!this.hayLineas()) {
      return;
    }
    const a = this.acreditacionDe(mpId);
    if (!a) {
      return;
    }
    this.pagosMos.update((list) =>
      list.map((p) =>
        p.id === pagoId ? { ...p, mpId, mpPendiente: false, montoTxt: String(a.importe) } : p,
      ),
    );
  }

  protected soltarMp(pagoId: string): void {
    this.pagosMos.update((list) =>
      list.map((p) => (p.id === pagoId ? { ...p, mpId: '', mpPendiente: false } : p)),
    );
  }

  protected marcarMpPendiente(pagoId: string): void {
    this.pagosMos.update((list) =>
      list.map((p) => (p.id === pagoId ? { ...p, mpId: '', mpPendiente: true } : p)),
    );
  }

  private leerMpConsumidas(): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem('ventas360.mp.consumidas');
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private consumirMpDePagos(): void {
    const ids = this.pagosMos()
      .map((p) => p.mpId)
      .filter(Boolean);
    if (ids.length === 0) {
      return;
    }
    const next = [...new Set([...this.mpConsumidas(), ...ids])];
    this.mpConsumidas.set(next);
    try {
      localStorage.setItem('ventas360.mp.consumidas', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  protected facturaHabilitada(letra: 'A' | 'B' | 'C'): boolean {
    return this.letraFiscalActual() === letra;
  }

  protected tituloCompOff(letra: 'A' | 'B' | 'C'): string {
    if (this.facturaHabilitada(letra)) {
      return '';
    }
    if (letra === 'A') {
      return 'Factura A no aplica a consumidor final ni a monotributo/exento.';
    }
    if (letra === 'C') {
      return 'Factura C solo aplica si el emisor es monotributo o exento.';
    }
    return 'Factura B no aplica a responsable inscripto (corresponde Factura A).';
  }

  protected setCompMos(comp: CompMos): void {
    if (comp === 'factura_a' && !this.facturaHabilitada('A')) {
      return;
    }
    if (comp === 'factura_b' && !this.facturaHabilitada('B')) {
      return;
    }
    if (comp === 'factura_c' && !this.facturaHabilitada('C')) {
      return;
    }
    this.compMos.set(comp);
    if (comp === 'ticket') {
      this.pagosMos.update((list) => list.filter((p) => p.tipo !== 'ctacte'));
    }
  }

  private aplicarLetraFiscal(): void {
    const actual = this.compMos();
    if (actual === 'remito' || actual === 'ticket') {
      return;
    }
    this.compMos.set(compDesdeLetra(this.letraFiscalActual()));
  }

  protected confirmarMostrador(): void {
    if (this.ctaMos().bloqueado) {
      return;
    }
    this.emitirMostrador(this.modoDesdeCompYPago());
  }

  protected asociarCodigo(): void {
    const q = this.busqueda().trim();
    this.buscarArticuloOpen.set(true);
    if (q) {
      this.busqueda.set(q);
    }
    this.notifications.warning(
      'Asociar código',
      'Buscá el producto y cargá el código en el catálogo de artículos.',
    );
  }

  protected chipCcCliente(c: ClienteRef): { txt: string; tono: TonoCc } {
    if (c.bloqueado) {
      return { txt: 'Bloqueado', tono: 'warn' };
    }
    const s = this.saldosSug().get(c.id);
    if (!s) {
      return {
        txt: c.limiteCredito > 0 ? 'Cta. cte.' : 'Contado',
        tono: 'muted',
      };
    }
    if (s.saldo > 0.5) {
      return { txt: `Debe · ${moneyMos(s.saldo)}`, tono: 'debe' };
    }
    if (s.saldo < -0.5) {
      return { txt: `A favor · ${moneyMos(Math.abs(s.saldo))}`, tono: 'favor' };
    }
    return { txt: 'Al día', tono: 'ok' };
  }

  protected onAtajo(event: KeyboardEvent): void {
    if (!this.esFactura()) {
      return;
    }
    if (event.key === 'F2') {
      event.preventDefault();
      this.inputCli()?.nativeElement.focus();
      this.clienteQuickOpen.set(true);
      return;
    }
    if (event.key === 'F3') {
      event.preventDefault();
      this.inputProd()?.nativeElement.focus();
      this.buscando.set(true);
      return;
    }
    if (event.key === 'F4') {
      event.preventDefault();
      this.inputIa()?.nativeElement.focus();
      if (this.textoIa().trim().length >= 3) {
        this.interpretarIa();
      }
      return;
    }
    if (event.key === 'F12') {
      event.preventDefault();
      if (this.ticketMos()) {
        this.nuevaVenta();
        return;
      }
      this.confirmarMostrador();
      return;
    }
    if (event.key === 'Escape') {
      if (this.ticketMos()) {
        event.preventDefault();
        this.nuevaVenta();
        return;
      }
      if (this.previewIa() || this.interpretandoIa()) {
        event.preventDefault();
        this.descartarPreviewIa();
        return;
      }
      if (this.clienteQuickOpen() || this.buscando()) {
        event.preventDefault();
        this.clienteQuickOpen.set(false);
        this.buscando.set(false);
        return;
      }
      event.preventDefault();
      this.cancelarVenta();
    }
  }

  protected elegirProductoMos(p: ProductoRef): void {
    this.agregarProducto(p, 1);
    this.busqueda.set('');
    this.buscando.set(false);
    queueMicrotask(() => this.inputProd()?.nativeElement.focus());
  }

  protected onProdInput(value: string): void {
    this.busqueda.set(value);
    this.buscando.set(true);
  }

  protected onProdEnter(): void {
    const q = this.busqueda().trim();
    if (!q) {
      return;
    }
    const exact = this.productosRef().find(
      (p) => p.activo && p.sku.toLowerCase() === q.toLowerCase(),
    );
    if (exact) {
      this.elegirProductoMos(exact);
      return;
    }
    const first = this.resultados()[0];
    if (first) {
      this.elegirProductoMos(first.producto);
    }
  }

  protected aplicarPreviewIaMos(): void {
    const sel = this.aiProdSel();
    if (sel) {
      const p = this.productosRef().find((x) => x.id === sel);
      const opt = this.iaVista()?.prodOpciones.find((o) => o.id === sel);
      if (p) {
        this.agregarProducto(p, opt?.cantidad ?? 1);
      }
    }
    this.aplicarPreviewIa();
    this.aiProdSel.set(null);
    this.aiCliSel.set(null);
  }

  protected money(n: number): string {
    return moneyMos(n);
  }

  protected medioOn(tipo: TipoMedioMos): boolean {
    return this.pagosMos().some((p) => p.tipo === tipo);
  }

  protected etiquetaMedio(tipo: TipoMedioMos): string {
    return labelMedio(tipo);
  }

  protected notaComp(): string {
    switch (this.compMos()) {
      case 'remito':
        return 'El remito no factura IVA. Si hay saldo en cuenta corriente, el remito queda asociado al movimiento y se puede facturar después.';
      case 'ticket':
        return 'Ticket interno sin validez fiscal. No se puede cargar a cuenta corriente.';
      case 'factura_a':
        return 'Factura A: IVA discriminado. Requiere CUIT y responsable inscripto.';
      case 'factura_c':
        return 'Factura C: emisor monotributo o exento. Sin IVA discriminado.';
      default:
        if (!this.facturaHabilitada('A')) {
          return 'Factura B: IVA incluido. Factura A no aplica a este cliente.';
        }
        return 'Factura B: IVA incluido en el precio de venta al público.';
    }
  }

  protected vueltoPago(id: string): { fmt: string; tono: 'ok' | 'warn' | 'muted' } {
    const { activos, montos } = this.pagosVista();
    const idx = activos.findIndex((p) => p.id === id);
    const pago = this.pagosMos().find((p) => p.id === id);
    if (idx < 0 || !pago) {
      return { fmt: moneyMos(0), tono: 'muted' };
    }
    const vuelto = parseNumMos(pago.recibidoTxt) - montos[idx];
    return {
      fmt: moneyMos(Math.max(vuelto, 0)),
      tono: vuelto < 0 ? 'warn' : vuelto > 0 ? 'ok' : 'muted',
    };
  }

  protected montoPagoTxt(id: string): string {
    const { activos, montos } = this.pagosVista();
    const idx = activos.findIndex((p) => p.id === id);
    const pago = activos[idx];
    if (!pago) {
      return '';
    }
    if (pago.montoTxt.trim() !== '') {
      return pago.montoTxt;
    }
    const m = montos[idx] ?? 0;
    return m > 0 ? String(m) : '';
  }

  protected restoLabel(): string {
    const { falta } = this.pagosVista();
    if (falta <= 0.5) {
      return '';
    }
    return `Usar el resto (${moneyMos(falta)})`;
  }

  protected ccNuevoSaldoFmt(): string {
    const actual = this.clienteSaldo()?.saldo ?? 0;
    const { enCuenta, falta } = this.pagosVista();
    const extra = enCuenta > 0 ? enCuenta : Math.max(falta, 0);
    return moneyMos(actual + extra);
  }

  private aplicarConsumidorFinal(): void {
    const c = this.consumidorFinal();
    this.cfMode.set(true);
    this.clienteId.set(c?.id ?? null);
    this.clienteNombre.set(c?.nombre ?? 'Consumidor Final');
    this.clienteMeta.set(
      c ? this.metaDeCliente(c) : 'Sin CUIT · Consumidor final · Lista Mostrador',
    );
    this.clienteInput.set('');
    this.clienteBloqueado.set(false);
    this.clienteLimite.set(0);
    this.clienteCondicionIva.set('consumidor_final');
    this.clienteSaldo.set(null);
    this.clienteQuickOpen.set(false);
    this.clientesAutocomplete.set([]);
    this.aplicarLetraFiscal();
  }

  private cargarConsumidorFinal(aplicar: boolean): void {
    this.api
      .obtenerCliente('cli-cf')
      .pipe(
        catchError(() => of(null as ClienteRef | null)),
        switchMap((c) => {
          if (c) {
            return of(c);
          }
          return this.api
            .buscarClientes('Consumidor Final', { activo: true, pageSize: 5 })
            .pipe(
              map(
                (items) =>
                  items.find((x) => x.condicionIva === 'consumidor_final') ?? items[0] ?? null,
              ),
            );
        }),
      )
      .subscribe((c) => {
        if (c) {
          this.consumidorFinal.set(c);
        }
        if (aplicar) {
          this.aplicarConsumidorFinal();
        }
      });
  }

  private cargarSaldosSug(items: ClienteRef[]): void {
    if (items.length === 0) {
      this.saldosSug.set(new Map());
      return;
    }
    forkJoin(
      items.map((c) =>
        this.api
          .obtenerSaldoCliente(c.id)
          .pipe(catchError(() => of(null as SaldoClienteRef | null))),
      ),
    ).subscribe((saldos) => {
      const m = new Map<string, SaldoClienteRef>();
      items.forEach((c, i) => {
        const s = saldos[i];
        if (s) {
          m.set(c.id, s);
        }
      });
      this.saldosSug.set(m);
    });
  }

  private resetMostrador(): void {
    this.lineas.set([]);
    this.pagoSeq += 1;
    this.pagosMos.set([nuevoPagoMos('efectivo', this.pagoSeq)]);
    this.descGlobalTxt.set('0');
    this.compMos.set('factura_b');
    this.previewIa.set(null);
    this.textoIa.set('');
    this.busqueda.set('');
    this.buscando.set(false);
    this.ticketMos.set(null);
    this.montoRecibido.set('');
    this.aplicarConsumidorFinal();
  }

  private modoDesdeCompYPago(): ModoEmisionMostrador {
    const { falta, enCuenta } = this.pagosVista();
    const aCuenta = this.permiteCuenta() && (enCuenta > 0 || falta > 0.5);
    if (aCuenta) {
      return 'remito_ctacte';
    }
    const comp = this.compMos();
    if (comp === 'remito' || comp === 'ticket') {
      return 'remito_pago';
    }
    return 'factura_fiscal';
  }

  private cobroDesdePagos(): {
    medio: MedioCobro;
    monto: number;
    obs: string;
    cheque?: DatosCheque;
  } | null {
    const { activos, montos, pagado, enCuenta } = this.pagosVista();
    const cobradoContado = pagado - enCuenta;
    if (cobradoContado <= 0.5) {
      return null;
    }
    let bestIdx = -1;
    let bestMonto = 0;
    activos.forEach((p, i) => {
      if (p.tipo === 'ctacte') {
        return;
      }
      if (montos[i] > bestMonto) {
        bestMonto = montos[i];
        bestIdx = i;
      }
    });
    const principal = bestIdx >= 0 ? activos[bestIdx] : null;
    const medio = principal ? medioCobroDesdeTipo(principal.tipo) : 'efectivo';
    const obs = activos
      .map((p, i) => {
        if (montos[i] <= 0) {
          return '';
        }
        let s = `${labelMedio(p.tipo)} ${moneyMos(montos[i])}`;
        if (p.tipo === 'tarjeta') {
          s += ` · ${p.tarjeta} ${p.cuotas} cuota(s)`;
          if (p.lote.trim()) {
            s += ` · lote ${p.lote}`;
          }
        }
        if (p.tipo === 'transferencia' && p.mpId) {
          const a = this.acreditacionDe(p.mpId);
          s += a ? ` · MP ${a.ref.split(' · ')[0]} · ${a.pagador}` : ' · MP asociada';
        } else if (p.tipo === 'transferencia' && !p.mpId) {
          s += ' (pendiente de acreditación)';
        }
        if (p.tipo === 'transferencia' && p.cuentaDestino) {
          s += ` · ${p.cuentaDestino}`;
        }
        return s;
      })
      .filter(Boolean)
      .join(' · ');
    const chequePago = activos.find((p, i) => p.tipo === 'cheque' && montos[i] > 0);
    const cheque = chequePago
      ? this.armarCheque(
          chequePago.chequeNumero,
          chequePago.chequeBanco,
          chequePago.chequeLibrador || this.clienteNombre(),
          chequePago.chequeFecha,
          chequePago.chequeFecha,
          this.clienteNombre(),
        )
      : undefined;
    return {
      medio,
      monto: cobradoContado,
      obs: obs || 'Cobro mostrador',
      cheque: cheque ?? undefined,
    };
  }

  /** En Mostrador: guarda un presupuesto con las líneas actuales. */
  protected guardarPresupuesto(): void {
    this.persistir('presupuesto', '/comprobantes/presupuestos');
  }

  /** CTA principal según el tipo de pantalla. */
  protected guardarPrincipal(): void {
    const tipo = this.tipo();
    if (tipo === 'factura') {
      if (this.isCtaCte()) {
        this.emitirMostrador('remito_ctacte');
        return;
      }
      this.emitirOpcionesOpen.set(true);
      return;
    }
    this.persistir(tipo, this.listadoTrasGuardar());
  }

  protected cerrarEmitirOpciones(): void {
    if (this.guardando()) {
      return;
    }
    this.emitirOpcionesOpen.set(false);
  }

  protected elegirEmision(modo: 'factura_fiscal' | 'remito_pago'): void {
    this.emitirOpcionesOpen.set(false);
    this.emitirMostrador(modo);
  }

  private filtrarModalLocal(items: ClienteRef[]): ClienteRef[] {
    let out = items;
    if (this.modalEstado() === 'bloqueados') {
      out = out.filter((c) => c.bloqueado);
    }
    const zona = this.modalZonaId();
    if (zona) {
      out = out.filter((c) => c.zonaId === zona);
    }
    const vend = this.modalVendedorId();
    if (vend) {
      out = out.filter((c) => c.vendedorId === vend);
    }
    return out;
  }

  protected abrirCobro(): void {
    const id = this.clienteId();
    const saldo = this.clienteSaldo();
    if (!id || !saldo || saldo.saldo <= 0) {
      this.notifications.error('Sin deuda', 'El cliente no tiene saldo deudor para cobrar');
      return;
    }
    this.cobroMonto.set(
      saldo.saldo.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    this.cobroMedio.set('efectivo');
    this.cobroObs.set('');
    this.cobroChequeNumero.set('');
    this.cobroChequeBanco.set('');
    this.cobroChequeLibrador.set(this.clienteNombre());
    this.cobroChequeFecha.set('');
    this.cobroChequeVto.set('');
    this.cobroOpen.set(true);
  }

  protected cerrarCobro(): void {
    if (this.cobroGuardando()) {
      return;
    }
    this.cobroOpen.set(false);
  }

  protected confirmarCobro(): void {
    if (this.cobroGuardando()) {
      return;
    }
    const clienteId = this.clienteId();
    if (!clienteId) {
      return;
    }
    const raw = this.cobroMonto().trim();
    const monto = Number(raw.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(monto) || monto <= 0) {
      this.notifications.error('Monto inválido', 'Ingresá un monto mayor a cero');
      return;
    }
    if (this.cobroMedio() === 'cheque' && !this.datosChequeCobro()) {
      this.notifications.error('Cheque', 'Completá número y banco del cheque');
      return;
    }
    this.cobroGuardando.set(true);
    this.api
      .registrarCobroACuenta({
        clienteId,
        monto,
        medio: this.cobroMedio(),
        observacion: this.cobroObs().trim() || undefined,
        cheque: this.datosChequeCobro() ?? undefined,
      })
      .subscribe({
        next: (recibo) => {
          this.cobroGuardando.set(false);
          this.cobroOpen.set(false);
          this.notifications.success(
            'Cobro registrado',
            `$ ${formatearMonto(recibo.monto)} · ${recibo.medio}`,
          );
          this.cargarSaldo(clienteId);
        },
        error: (err: Error) => {
          this.cobroGuardando.set(false);
          this.notifications.error('No se pudo registrar el cobro', err.message || 'Error');
        },
      });
  }

  private cargarSaldo(clienteId: string): void {
    this.clienteSaldoCargando.set(true);
    this.clienteSaldo.set(null);
    this.api.obtenerSaldoCliente(clienteId).subscribe({
      next: (s) => {
        this.clienteSaldo.set(s);
        this.clienteSaldoCargando.set(false);
      },
      error: () => {
        this.clienteSaldo.set(null);
        this.clienteSaldoCargando.set(false);
      },
    });
  }

  private emitirMostrador(modo: ModoEmisionMostrador): void {
    if (this.guardando()) {
      return;
    }
    const lineas = this.lineas().filter((l) => l.cantidad > 0 && l.productoId);
    if (lineas.length === 0) {
      this.notifications.error('Sin artículos', 'Agregá al menos un artículo a la lista');
      return;
    }

    const clienteId = this.resolverClienteId();
    if (!clienteId) {
      return;
    }

    const cobro = this.esFactura() ? this.cobroDesdePagos() : null;
    const esRemito = modo === 'remito_ctacte' || modo === 'remito_pago';
    const conCobro =
      modo === 'remito_pago' || modo === 'factura_fiscal' || (modo === 'remito_ctacte' && !!cobro);
    const dep = this.depositosRef().find((d) => d.activo) ?? this.depositosRef()[0];
    if (esRemito && !dep) {
      this.notifications.error('Sin depósito', 'Configurá un depósito para emitir remitos');
      return;
    }
    if (this.esFactura()) {
      const chequePago = this.pagosVista().activos.find(
        (p, i) => p.tipo === 'cheque' && this.pagosVista().montos[i] > 0,
      );
      if (
        chequePago &&
        !this.armarCheque(
          chequePago.chequeNumero,
          chequePago.chequeBanco,
          chequePago.chequeLibrador || this.clienteNombre(),
          chequePago.chequeFecha,
          chequePago.chequeFecha,
          this.clienteNombre(),
        )
      ) {
        this.notifications.error('Cheque', 'Completá número y banco del cheque');
        return;
      }
    } else if (conCobro && this.condicion() === 'cheque' && !this.datosChequeMostrador()) {
      this.notifications.error('Cheque', 'Completá número y banco del cheque');
      return;
    }

    const snapshotTicket = this.armarTicket(modo, conCobro, lineas.length);
    this.guardando.set(true);
    const tipo: TipoComprobante = esRemito ? 'remito' : 'factura';
    this.store
      .crear({
        clienteId,
        tipo,
        depositoId: dep?.id ?? null,
        lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      })
      .pipe(
        switchMap((creado) =>
          esRemito
            ? this.store.confirmarRemito(creado.id)
            : this.store.cambiarEstado(creado.id, 'confirmado'),
        ),
        switchMap((confirmado) => {
          if (!conCobro) {
            return of(confirmado);
          }
          const medio = cobro?.medio ?? this.medioCobroDesdeCondicion();
          const obs = cobro?.obs ?? this.obsCobroDesdeCondicion();
          const cheque = cobro?.cheque ?? this.datosChequeMostrador() ?? undefined;
          const monto = cobro ? Math.min(cobro.monto, confirmado.total) : confirmado.total;
          if (monto <= 0) {
            return of(confirmado);
          }
          return this.api
            .registrarCobroACuenta({
              clienteId,
              monto,
              medio,
              observacion: obs,
              cheque,
            })
            .pipe(map(() => confirmado));
        }),
      )
      .subscribe({
        next: (confirmado) => {
          const ticket = snapshotTicket;
          if (confirmado.cae) {
            ticket.lineas = [
              {
                label: 'Comprobante',
                value: confirmado.numero || `Factura ${confirmado.letra ?? ''}`.trim(),
                tono: 'ok',
              },
              { label: 'CAE', value: confirmado.cae, tono: 'ok' },
              ...ticket.lineas,
            ];
          }
          this.notifications.success(ticket.titulo, ticket.sub);
          this.guardando.set(false);
          this.consumirMpDePagos();
          this.lineas.set([]);
          this.montoRecibido.set('');
          this.pagoSeq += 1;
          this.pagosMos.set([nuevoPagoMos('efectivo', this.pagoSeq)]);
          this.descGlobalTxt.set('0');
          if (this.esFactura()) {
            this.ticketMos.set(ticket);
          }
          this.cargarSaldo(clienteId);
        },
        error: () => this.guardando.set(false),
      });
  }

  private armarTicket(modo: ModoEmisionMostrador, conCobro: boolean, nLineas: number): TicketMos {
    const { pagado, falta, aAcreditar, enCuenta } = this.pagosVista();
    const comp = this.compMos();
    const titulo =
      modo === 'factura_fiscal'
        ? 'Factura emitida'
        : modo === 'remito_ctacte'
          ? 'Remito a cuenta corriente'
          : comp === 'ticket'
            ? 'Ticket emitido'
            : 'Remito emitido';
    const sub = `${nLineas} artículo(s) · ${this.clienteNombre()}`;
    const lineas: TicketMos['lineas'] = [
      { label: 'Total', value: moneyMos(this.total()) },
      { label: 'Cobrado', value: moneyMos(pagado) },
    ];
    if (aAcreditar > 0) {
      lineas.push({ label: 'A acreditar', value: moneyMos(aAcreditar), tono: 'warn' });
    }
    if (enCuenta > 0 || falta > 0.5) {
      lineas.push({
        label: 'A cuenta corriente',
        value: moneyMos(enCuenta > 0 ? enCuenta : Math.max(falta, 0)),
        tono: 'warn',
      });
    }
    if (!conCobro) {
      lineas.push({ label: 'Estado', value: 'Saldo en cta. cte.', tono: 'muted' });
    }
    return { titulo, sub, lineas };
  }

  private medioCobroDesdeCondicion(): MedioCobro {
    const cond = this.condicion();
    if (cond === 'tarjeta') {
      return 'tarjeta';
    }
    if (cond === 'cheque') {
      return 'cheque';
    }
    if (cond === 'contado' && this.medioPago() === 'transferencia') {
      return 'transferencia';
    }
    if (cond === 'contado' && this.medioPago() === 'debito') {
      return 'tarjeta';
    }
    return 'efectivo';
  }

  private obsCobroDesdeCondicion(): string {
    const cond = this.condicion();
    if (cond === 'cheque') {
      return 'Cobro con cheque (mostrador)';
    }
    if (cond === 'tarjeta') {
      return 'Cobro con tarjeta (mostrador)';
    }
    if (cond === 'contado') {
      const medio = this.medioPago();
      if (medio === 'transferencia') {
        return 'Cobro por transferencia (mostrador)';
      }
      if (medio === 'debito') {
        return 'Cobro con débito (mostrador)';
      }
      return 'Cobro en efectivo (mostrador)';
    }
    return 'Cobro mostrador';
  }

  private datosChequeMostrador(): DatosCheque | null {
    if (this.condicion() !== 'cheque') {
      return null;
    }
    return this.armarCheque(
      this.chequeNumero(),
      this.chequeBanco(),
      this.chequeLibrador() || this.clienteNombre(),
      this.chequeFecha(),
      this.chequeVto(),
      this.clienteNombre(),
    );
  }

  private datosChequeCobro(): DatosCheque | null {
    if (this.cobroMedio() !== 'cheque') {
      return null;
    }
    return this.armarCheque(
      this.cobroChequeNumero(),
      this.cobroChequeBanco(),
      this.cobroChequeLibrador() || this.clienteNombre(),
      this.cobroChequeFecha(),
      this.cobroChequeVto(),
      this.clienteNombre(),
    );
  }

  private armarCheque(
    numero: string,
    banco: string,
    librador: string,
    fecha: string,
    fechaVto: string,
    recibidoDe: string,
  ): DatosCheque | null {
    if (!numero.trim() || !banco.trim()) {
      return null;
    }
    return {
      numero: numero.trim(),
      bancoEmisor: banco.trim(),
      librador: librador.trim(),
      fecha: fecha || undefined,
      fechaVto: fechaVto || undefined,
      recibidoDe: recibidoDe.trim(),
    };
  }

  private resolverClienteId(): string | null {
    const clienteId = this.clienteId();
    if (clienteId) {
      return clienteId;
    }
    if (this.esFactura() && this.cfMode()) {
      const cf = this.consumidorFinal();
      if (cf) {
        this.clienteId.set(cf.id);
        return cf.id;
      }
      this.notifications.error(
        'Sin cliente',
        'No está cargado Consumidor Final. Elegí un cliente o crealo en el padrón.',
      );
      return null;
    }
    if (this.esFactura()) {
      this.notifications.error('Sin cliente', 'Elegí el cliente o marcá Consumidor Final.');
      return null;
    }
    const primero = this.clientesRef().find((c) => c.activo);
    if (!primero) {
      this.notifications.error(
        'Sin cliente',
        'No hay clientes cargados. Creá un cliente o elegí uno de la lista.',
      );
      return null;
    }
    this.clienteId.set(primero.id);
    this.clienteNombre.set(primero.nombre);
    return primero.id;
  }

  private persistir(tipo: TipoComprobante, destino: string): void {
    if (this.guardando()) {
      return;
    }
    const lineas = this.lineas().filter((l) => l.cantidad > 0 && l.productoId);
    if (lineas.length === 0) {
      this.notifications.error('Sin artículos', 'Agregá al menos un artículo a la lista');
      return;
    }

    const clienteId = this.resolverClienteId();
    if (!clienteId) {
      return;
    }

    let depositoId: string | null = null;
    if (tipo === 'remito' || tipo === 'factura' || tipo === 'pedido') {
      const dep = this.depositosRef().find((d) => d.activo) ?? this.depositosRef()[0];
      if (tipo === 'remito' && !dep) {
        this.notifications.error('Sin depósito', 'Configurá un depósito para emitir remitos');
        return;
      }
      depositoId = dep?.id ?? null;
    }

    this.guardando.set(true);
    this.store
      .crear({
        clienteId,
        tipo,
        depositoId,
        lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      })
      .subscribe({
        next: () => {
          const labels: Record<TipoComprobante, string> = {
            factura: 'Factura creada',
            presupuesto: 'Presupuesto guardado',
            pedido: 'Pedido guardado',
            remito: 'Remito guardado',
          };
          this.notifications.success(
            labels[tipo],
            `${lineas.length} artículo(s) · ${this.clienteNombre()}`,
          );
          this.guardando.set(false);
          this.lineas.set([]);
          if (destino !== '/ventas') {
            this.router.navigate([destino]);
          }
        },
        error: () => this.guardando.set(false),
      });
  }
}
