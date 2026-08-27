import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Icon } from '../../shared/ui/icon/icon';
import { CuentaCorrienteService } from './data-access/cuenta-corriente.service';
import { CuentaCorrienteStore } from './data-access/cuenta-corriente.store';
import { BANCOS_EMISORES_AR } from './data-access/bancos-argentina';
import {
  ClienteRef,
  ComprobanteCxc,
  MedioCobro,
  MovimientoCxc,
  SaldoCliente,
} from './data-access/cxc.model';

export type TipoMov = 'FAC' | 'REM' | 'REC' | 'NC' | 'AJU' | 'MOV';
export type PlazoFiltro = '30' | '60' | '90' | 'mas90' | 'todo';
export type TipoMovFiltro = 'todos' | 'debe' | 'haber' | 'factura' | 'recibo' | 'ajuste';
export type SituacionFiltro = 'todos' | 'debe' | 'favor' | 'al_dia';
export type BloqueoFiltro = 'todos' | 'bloqueados' | 'habilitados';
export type PanelDetalle = 'comprobantes' | 'movimientos';
export type TabCxc = 'cuenta' | 'informes';
export type OrdenLista = 'mora' | 'saldo' | 'nombre';
export type FiltroMovCta = 'todos' | 'deudas' | 'pagos' | 'comprobantes';
export type PresetInforme = 'todos' | 'debe' | 'mora90' | 'al_dia';

const MIN_CHARS_BUSQUEDA = 3;
const MAX_CHEQUES_COBRO = 3;

export interface LineaMedioUi {
  key: string;
  medio: MedioCobro;
  montoTxt: string;
  chequeNumero: string;
  chequeLibrador: string;
  chequeBanco: string;
  chequeFecha: string;
  chequeVto: string;
}

export interface LineaImputUi {
  id: string;
  label: string;
  venceTxt: string;
  deuda: number;
  deudaFmt: string;
  selected: boolean;
  montoTxt: string;
}

export interface FilaClienteCxc {
  cliente: ClienteRef;
  saldo: SaldoCliente;
  saldoFmt: string;
  debeFmt: string;
  haberFmt: string;
  situacion: 'debe' | 'favor' | 'al_dia';
  situacionLabel: string;
  antiguedadDias: number | null;
  antiguedadLabel: string;
  ultimoMovFmt: string;
  zonaNombre: string;
  limiteFmt: string;
  disponibleFmt: string;
}

export interface FilaMovimiento {
  id: string;
  fecha: string;
  tipo: TipoMov;
  comprobante: string;
  referenciaTipo: string;
  referenciaId: string;
  debe: string;
  haber: string;
  saldo: string;
  debeNum: number;
  haberNum: number;
}

export interface LineaDetalleVista {
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  precioUnitarioFmt: string;
  neto: number;
  netoFmt: string;
  ivaPorcentaje: number;
  ivaPorcentajeFmt: string;
  iva: number;
  ivaFmt: string;
  total: number;
  totalFmt: string;
  precioLista: number;
  precioListaFmt: string;
  netoLista: number;
  netoListaFmt: string;
  ivaLista: number;
  ivaListaFmt: string;
  totalLista: number;
  totalListaFmt: string;
  cambioPct: number | null;
}

export interface FilaComprobanteVista {
  comprobante: ComprobanteCxc;
  tipoLabel: string;
  numero: string;
  fechaFmt: string;
  estado: string;
  items: number;
  netoOriginal: number;
  ivaOriginal: number;
  ivaPorcentaje: number;
  totalOriginal: number;
  totalLista: number;
  netoOriginalFmt: string;
  ivaOriginalFmt: string;
  ivaPorcentajeFmt: string;
  totalOriginalFmt: string;
  totalListaFmt: string;
  deuda: number;
  deudaLabel: string;
  deudaFmt: string;
  pendiente: boolean;
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function parseMontoInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function diasDesde(iso: string | null, hoy: Date): number | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const ms = hoy.getTime() - d.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function tipoDesdeMov(m: MovimientoCxc): TipoMov {
  const ref = (m.referenciaTipo || m.concepto || '').toLowerCase();
  if (ref.includes('ajuste')) {
    return 'AJU';
  }
  if (ref.includes('nc') || ref.includes('nota')) {
    return 'NC';
  }
  if (ref.includes('recibo') || ref.includes('cobro') || ref.includes('anticipo')) {
    return 'REC';
  }
  if (ref.includes('remito')) {
    return 'REM';
  }
  if (ref.includes('fac') || ref.includes('factura')) {
    return 'FAC';
  }
  return m.tipo === 'debe' ? 'FAC' : 'REC';
}

function armarFilasMovimientos(
  movimientos: MovimientoCxc[],
  tipoFiltro: TipoMovFiltro = 'todos',
): FilaMovimiento[] {
  let saldoCorrido = 0;
  const rows: FilaMovimiento[] = [];
  const ordenados = [...movimientos].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );
  for (const m of ordenados) {
    const tipoMov = tipoDesdeMov(m);
    const ref = (m.referenciaTipo || '').toLowerCase();
    if (tipoFiltro === 'debe' && m.tipo !== 'debe') {
      continue;
    }
    if (tipoFiltro === 'haber' && m.tipo !== 'haber') {
      continue;
    }
    if (
      tipoFiltro === 'factura' &&
      !(ref.includes('factura') || ref.includes('remito') || tipoMov === 'FAC' || tipoMov === 'REM')
    ) {
      continue;
    }
    if (tipoFiltro === 'recibo' && !(ref.includes('recibo') || tipoMov === 'REC')) {
      continue;
    }
    if (tipoFiltro === 'ajuste' && !(ref.includes('ajuste') || tipoMov === 'AJU')) {
      continue;
    }
    if (m.tipo === 'debe') {
      saldoCorrido += m.monto;
    } else {
      saldoCorrido -= m.monto;
    }
    rows.push({
      id: m.id,
      fecha: formatearFecha(m.fecha),
      tipo: tipoMov,
      comprobante: m.concepto || m.referenciaId.slice(0, 12),
      referenciaTipo: m.referenciaTipo || '—',
      referenciaId: m.referenciaId,
      debe: m.tipo === 'debe' ? formatearMoneda(m.monto) : '—',
      haber: m.tipo === 'haber' ? formatearMoneda(m.monto) : '—',
      saldo: formatearMoneda(saldoCorrido),
      debeNum: m.tipo === 'debe' ? m.monto : 0,
      haberNum: m.tipo === 'haber' ? m.monto : 0,
    });
  }
  return rows.reverse();
}

function iniciales(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '—';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function coincidePlazo(dias: number | null, plazo: PlazoFiltro): boolean {
  if (plazo === 'todo') {
    return true;
  }
  if (dias === null) {
    return false;
  }
  if (plazo === '30') {
    return dias <= 30;
  }
  if (plazo === '60') {
    return dias > 30 && dias <= 60;
  }
  if (plazo === '90') {
    return dias > 60 && dias <= 90;
  }
  return dias > 90;
}

function saldoVacio(clienteId: string): SaldoCliente {
  return {
    clienteId,
    saldo: 0,
    debeTotal: 0,
    haberTotal: 0,
    fechaUltimoMovimiento: null,
    fechaDebeMasAntigua: null,
  };
}

@Component({
  selector: 'app-cuenta-corriente-page',
  imports: [FormsModule, Icon],
  templateUrl: './cuenta-corriente-page.html',
  styleUrl: './cuenta-corriente-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onAtajo($event)',
  },
})
export class CuentaCorrientePage {
  private readonly store = inject(CuentaCorrienteStore);
  private readonly api = inject(CuentaCorrienteService);
  private readonly notifications = inject(NotificationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly comboAutocomplete$ = new Subject<string>();
  private medioSeq = 0;

  protected readonly buscaInput = viewChild<ElementRef<HTMLInputElement>>('buscaInput');

  protected readonly tab = signal<TabCxc>('cuenta');
  protected readonly qCliente = signal('');
  protected readonly comboOpen = signal(false);
  protected readonly comboBuscando = signal(false);
  protected readonly sugerencias = signal<ClienteRef[]>([]);
  protected readonly ordenLista = signal<OrdenLista>('mora');
  protected readonly movVista = signal<FiltroMovCta>('todos');

  protected readonly infQ = signal('');
  protected readonly informeEjecutado = signal(false);
  protected readonly plazo = signal<PlazoFiltro>('todo');
  protected readonly montoMin = signal('');
  protected readonly montoMax = signal('');
  protected readonly situacion = signal<SituacionFiltro>('todos');
  protected readonly zonaId = signal('');
  protected readonly bloqueo = signal<BloqueoFiltro>('todos');
  protected readonly infPreset = signal<PresetInforme>('todos');
  protected readonly infDrawerId = signal('');
  protected readonly infDrawerEstado = signal<{
    saldo: number;
    movimientos: MovimientoCxc[];
  } | null>(null);

  protected readonly clienteId = signal('');
  protected readonly panel = signal<PanelDetalle>('comprobantes');
  protected readonly tipoMov = signal<TipoMovFiltro>('todos');
  protected readonly detalleOpen = signal(false);
  protected readonly detalleComprobante = signal<ComprobanteCxc | null>(null);

  protected readonly cobroObs = signal('');
  protected readonly cobroGuardando = signal(false);
  protected readonly cobroMedios = signal<LineaMedioUi[]>([this.nuevoMedio('efectivo')]);
  protected readonly imputSel = signal<Record<string, { selected: boolean; montoTxt: string }>>({});
  protected readonly clientesLista = signal<ClienteRef[]>([]);
  protected readonly saldosLista = signal<SaldoCliente[]>([]);
  protected readonly resumenOpen = signal(false);
  protected readonly recordatorioOpen = signal(false);
  protected readonly recordatorioCuerpo = signal('');
  protected readonly bancosEmisores = BANCOS_EMISORES_AR;

  protected readonly minChars = MIN_CHARS_BUSQUEDA;
  protected readonly maxCheques = MAX_CHEQUES_COBRO;

  protected readonly clientes = computed(() => this.store.clientesRef());
  protected readonly zonas = computed(() => this.store.zonasRef());
  protected readonly saldos = computed(() => this.store.saldos().data ?? []);
  protected readonly estadoCuenta = this.store.estadoCuenta;
  protected readonly listaPrecio = this.store.listaPrecio;
  protected readonly preciosActuales = this.store.preciosActuales;

  protected readonly informeStatus = computed(() => this.store.busqueda().status);
  protected readonly informeError = computed(() =>
    this.store.busqueda().status === 'error' ? this.store.busqueda().error : null,
  );

  protected readonly zonaNombre = computed(() => {
    const map = new Map(this.zonas().map((z) => [z.id, z.nombre]));
    return map;
  });

  protected readonly filtrosActivosCount = computed(() => {
    let n = 0;
    if (this.infQ().trim()) n++;
    if (this.plazo() !== 'todo') n++;
    if (this.situacion() !== 'todos') n++;
    if (this.montoMin().trim()) n++;
    if (this.montoMax().trim()) n++;
    if (this.zonaId()) n++;
    if (this.bloqueo() !== 'todos') n++;
    return n;
  });

  protected readonly informesFiltrados = computed((): FilaClienteCxc[] => {
    if (!this.informeEjecutado() || this.informeStatus() !== 'success') {
      return [];
    }
    return this.filasDesdeClientes(this.clientes(), this.saldos());
  });

  protected readonly clienteActual = computed(() => {
    const id = this.clienteId();
    if (!id) {
      return null;
    }
    const sel = this.store.seleccionado();
    if (sel?.id === id) {
      return sel;
    }
    const cartera = this.store.cartera().data?.clientes ?? [];
    return cartera.find((c) => c.id === id) ?? this.clientes().find((c) => c.id === id) ?? null;
  });

  protected readonly saldoCliente = computed(() => {
    const id = this.clienteId();
    if (!id) {
      return null;
    }
    const sel = this.store.saldoSeleccionado();
    if (sel?.clienteId === id) {
      return sel;
    }
    const cartera = this.store.cartera().data?.saldos ?? [];
    return (
      cartera.find((s) => s.clienteId === id) ??
      this.saldos().find((s) => s.clienteId === id) ??
      null
    );
  });

  protected readonly inicialesCliente = computed(() =>
    iniciales(this.clienteActual()?.nombre ?? ''),
  );

  protected readonly kpiSaldo = computed(() => formatearMoneda(this.saldoCliente()?.saldo ?? 0));
  protected readonly kpiDebe = computed(() => formatearMoneda(this.saldoCliente()?.debeTotal ?? 0));
  protected readonly kpiHaber = computed(() =>
    formatearMoneda(this.saldoCliente()?.haberTotal ?? 0),
  );
  protected readonly kpiMora = computed(() => {
    const dias = diasDesde(this.saldoCliente()?.fechaDebeMasAntigua ?? null, new Date());
    if (dias === null || (this.saldoCliente()?.saldo ?? 0) <= 0) {
      return 'Al día';
    }
    return `${dias}d`;
  });
  protected readonly kpiVencido = computed(() => {
    const saldo = this.saldoCliente()?.saldo ?? 0;
    const dias = diasDesde(this.saldoCliente()?.fechaDebeMasAntigua ?? null, new Date());
    if (saldo <= 0 || dias === null || dias <= 0) {
      return formatearMoneda(0);
    }
    return formatearMoneda(saldo);
  });
  protected readonly kpiUltimoPago = computed(() => {
    const haberes = (this.estadoCuenta()?.movimientos ?? [])
      .filter((m) => m.tipo === 'haber')
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (haberes.length === 0) {
      return '—';
    }
    return formatearFecha(haberes[0].fecha);
  });
  protected readonly kpiDisponible = computed(() => {
    const limite = this.clienteActual()?.limiteCredito ?? 0;
    const saldo = Math.max(0, this.saldoCliente()?.saldo ?? 0);
    return formatearMoneda(limite - saldo);
  });
  protected readonly estadoClienteLabel = computed(() => {
    const c = this.clienteActual();
    const saldo = this.saldoCliente()?.saldo ?? 0;
    if (c?.bloqueado) {
      return 'Bloqueado';
    }
    if (saldo > 0) {
      return 'Debe';
    }
    if (saldo < 0) {
      return 'A favor';
    }
    return 'Al día';
  });

  protected readonly listaLateral = computed((): FilaClienteCxc[] => {
    const clientes = this.clientesLista();
    if (clientes.length === 0) {
      return [];
    }
    const q = this.qCliente().trim().toLowerCase();
    const filas = this.filasDesdeClientes(clientes, this.saldosLista(), false).filter((f) => {
      if (Math.abs(f.saldo.saldo) < 0.01 && f.cliente.id !== this.clienteId() && !q) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        f.cliente.nombre.toLowerCase().includes(q) ||
        (f.cliente.cuit || '').toLowerCase().includes(q)
      );
    });
    const orden = this.ordenLista();
    return filas.sort((a, b) => {
      if (orden === 'nombre') {
        return a.cliente.nombre.localeCompare(b.cliente.nombre, 'es');
      }
      if (orden === 'saldo') {
        return Math.abs(b.saldo.saldo) - Math.abs(a.saldo.saldo);
      }
      return (b.antiguedadDias ?? -1) - (a.antiguedadDias ?? -1);
    });
  });

  protected readonly carteraCargando = computed(() => this.comboBuscando());

  protected readonly pendientesCobro = computed((): LineaImputUi[] => {
    const estado = this.estadoCuenta();
    const sel = this.imputSel();
    const deudas = (estado?.movimientos ?? [])
      .filter((m) => m.tipo === 'debe' && !!m.referenciaId)
      .slice()
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return deudas.map((m) => {
      const id = m.referenciaId;
      const estadoSel = sel[id];
      return {
        id,
        label: m.concepto || `${tipoDesdeMov(m)} ${id.slice(0, 8)}`,
        venceTxt: formatearFecha(m.fecha),
        deuda: m.monto,
        deudaFmt: formatearMoneda(m.monto),
        selected: estadoSel?.selected ?? false,
        montoTxt: estadoSel?.montoTxt ?? this.montoInputDesdeNumero(m.monto),
      };
    });
  });

  protected readonly cobroHabilitado = computed(() => {
    const saldo = this.saldoCliente()?.saldo ?? 0;
    return !!this.clienteId() && saldo > 0;
  });

  protected readonly totalCobroNum = computed(() => {
    let suma = 0;
    for (const m of this.cobroMedios()) {
      const n = parseMontoInput(m.montoTxt);
      if (n && n > 0) {
        suma += n;
      }
    }
    return Math.round(suma * 100) / 100;
  });

  protected readonly imputadoNum = computed(() => {
    let suma = 0;
    for (const p of this.pendientesCobro()) {
      if (!p.selected) {
        continue;
      }
      const n = parseMontoInput(p.montoTxt);
      if (n && n > 0) {
        suma += n;
      }
    }
    return Math.round(suma * 100) / 100;
  });

  protected readonly totalCobroFmt = computed(() => formatearMoneda(this.totalCobroNum()));
  protected readonly imputadoFmt = computed(() => formatearMoneda(this.imputadoNum()));

  protected readonly cobroDiff = computed(() => {
    const cobro = this.totalCobroNum();
    const imputado = this.imputadoNum();
    const delta = Math.round((cobro - imputado) * 100) / 100;
    if (cobro <= 0 && imputado <= 0) {
      return { kind: 'idle' as const, txt: 'Cargá medios e imputá comprobantes' };
    }
    if (delta === 0) {
      return { kind: 'ok' as const, txt: 'Balanceado: lo cobrado cubre lo imputado' };
    }
    if (delta > 0) {
      return {
        kind: 'cuenta' as const,
        txt: `${formatearMoneda(delta)} queda a cuenta del cliente`,
      };
    }
    return {
      kind: 'faltan' as const,
      txt: `Faltan ${formatearMoneda(-delta)} para cubrir lo imputado`,
    };
  });

  protected readonly cantCheques = computed(
    () => this.cobroMedios().filter((m) => m.medio === 'cheque').length,
  );

  protected readonly informesKpis = computed(() => {
    const filas = this.informesFiltrados();
    const debe = filas.filter((f) => f.situacion === 'debe');
    const favor = filas.filter((f) => f.situacion === 'favor');
    const mora90 = debe.filter((f) => (f.antiguedadDias ?? 0) > 90);
    const sumaDebe = debe.reduce((a, f) => a + f.saldo.saldo, 0);
    return {
      cuentas: String(filas.length),
      deudaFmt: formatearMoneda(sumaDebe),
      favorN: String(favor.length),
      mora90: String(mora90.length),
    };
  });

  protected readonly infDrawerCliente = computed(() => {
    const id = this.infDrawerId();
    return this.informesFiltrados().find((f) => f.cliente.id === id) ?? null;
  });

  protected readonly infDrawerMovs = computed(() =>
    armarFilasMovimientos(this.infDrawerEstado()?.movimientos ?? []).slice(0, 12),
  );

  protected readonly filasResumen = computed(() =>
    armarFilasMovimientos(this.estadoCuenta()?.movimientos ?? []),
  );

  protected readonly metaCliente = computed(() => {
    const c = this.clienteActual();
    if (!c) {
      return '';
    }
    const zona = c.zonaId ? this.zonaNombre().get(c.zonaId) : null;
    const limite = formatearMoneda(c.limiteCredito);
    const lista = this.listaPrecio();
    const parts = [c.cuit || 'Sin CUIT', zona ?? 'Sin zona', `Límite ${limite}`];
    if (lista) {
      parts.push(`Lista ${lista.nombre}`);
    }
    if (c.bloqueado) {
      parts.push('Bloqueado');
    }
    return parts.join(' · ');
  });

  protected readonly comprobantesVista = computed((): FilaComprobanteVista[] => {
    const precios = this.preciosActuales();
    const todos = [...this.store.remitos(), ...this.store.facturas()].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );
    return todos.map((c) => this.valuarComprobante(c, precios));
  });

  protected readonly detalleLineas = computed((): LineaDetalleVista[] => {
    const c = this.detalleComprobante();
    if (!c) {
      return [];
    }
    const precios = this.preciosActuales();
    const ivaPct = c.ivaPorcentaje || 21;
    return c.lineas.map((l) => {
      const precioLista = precios.get(l.productoId) ?? l.precioUnitario;
      const neto = Math.round(l.cantidad * l.precioUnitario * 100) / 100;
      const iva = Math.round(neto * (ivaPct / 100) * 100) / 100;
      const total = Math.round((neto + iva) * 100) / 100;
      const netoLista = Math.round(l.cantidad * precioLista * 100) / 100;
      const ivaLista = Math.round(netoLista * (ivaPct / 100) * 100) / 100;
      const totalLista = Math.round((netoLista + ivaLista) * 100) / 100;
      const cambio =
        l.precioUnitario > 0 ? ((precioLista - l.precioUnitario) / l.precioUnitario) * 100 : null;
      return {
        productoId: l.productoId,
        descripcion: l.descripcion || l.productoId,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        precioUnitarioFmt: formatearMoneda(l.precioUnitario),
        neto,
        netoFmt: formatearMoneda(neto),
        ivaPorcentaje: ivaPct,
        ivaPorcentajeFmt: `${ivaPct}%`,
        iva,
        ivaFmt: formatearMoneda(iva),
        total,
        totalFmt: formatearMoneda(total),
        precioLista,
        precioListaFmt: formatearMoneda(precioLista),
        netoLista,
        netoListaFmt: formatearMoneda(netoLista),
        ivaLista,
        ivaListaFmt: formatearMoneda(ivaLista),
        totalLista,
        totalListaFmt: formatearMoneda(totalLista),
        cambioPct: cambio === null ? null : Math.round(cambio * 10) / 10,
      };
    });
  });

  protected readonly detalleTotales = computed(() => {
    const c = this.detalleComprobante();
    if (!c) {
      return null;
    }
    const vista = this.valuarComprobante(c, this.preciosActuales());
    const lineas = this.detalleLineas();
    const netoLista = Math.round(lineas.reduce((a, l) => a + l.netoLista, 0) * 100) / 100;
    const ivaLista = Math.round(lineas.reduce((a, l) => a + l.ivaLista, 0) * 100) / 100;
    return {
      fechaFmt: vista.fechaFmt,
      numero: vista.numero,
      tipoLabel: vista.tipoLabel,
      estado: vista.estado,
      listaNombre: this.listaPrecio()?.nombre ?? 'Catálogo',
      netoOriginalFmt: vista.netoOriginalFmt,
      ivaOriginalFmt: vista.ivaOriginalFmt,
      ivaPorcentajeFmt: vista.ivaPorcentajeFmt,
      totalOriginalFmt: vista.totalOriginalFmt,
      netoListaFmt: formatearMoneda(netoLista),
      ivaListaFmt: formatearMoneda(ivaLista),
      totalListaFmt: vista.totalListaFmt,
      deudaFmt: vista.deudaFmt,
      pendiente: vista.pendiente,
    };
  });

  protected readonly filas = computed(() => {
    const estado = this.estadoCuenta();
    if (!estado) {
      return [] as FilaMovimiento[];
    }
    const tipoFiltro =
      this.movVista() === 'deudas'
        ? 'debe'
        : this.movVista() === 'pagos'
          ? 'haber'
          : this.tipoMov();
    return armarFilasMovimientos(estado.movimientos, tipoFiltro);
  });

  constructor() {
    this.store.cargarZonasSiHaceFalta();
    this.comboAutocomplete$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < MIN_CHARS_BUSQUEDA) {
            this.sugerencias.set([]);
            this.clientesLista.set([]);
            this.saldosLista.set([]);
            this.comboBuscando.set(false);
            return EMPTY;
          }
          this.comboBuscando.set(true);
          return this.api.listarClientesRef({ q, pageSize: 50 }).pipe(
            catchError(() => of([] as ClienteRef[])),
            finalize(() => this.comboBuscando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.sugerencias.set(items);
        this.clientesLista.set(items);
        this.comboOpen.set(true);
        this.api.listarSaldosDeClientes(items.map((c) => c.id)).subscribe({
          next: (saldos) => this.saldosLista.set(saldos),
          error: () => this.saldosLista.set([]),
        });
      });
  }

  protected setTab(next: TabCxc): void {
    this.tab.set(next);
    if (next === 'informes') {
      this.store.cargarZonasSiHaceFalta();
    }
  }

  protected onAtajo(event: KeyboardEvent): void {
    if (event.key === 'F3') {
      event.preventDefault();
      this.tab.set('cuenta');
      this.buscaInput()?.nativeElement.focus();
      this.comboOpen.set(true);
      return;
    }
    if (event.key === 'F9') {
      event.preventDefault();
      this.tab.set('cuenta');
      if (this.cobroHabilitado()) {
        const first = document.querySelector('.ctc-cobro-panel input, .ctc-cobro-panel select');
        if (first instanceof HTMLElement) {
          first.focus();
        }
      }
    }
  }

  protected onComboInput(valor: string): void {
    this.qCliente.set(valor);
    this.comboOpen.set(true);
    this.comboAutocomplete$.next(valor);
  }

  protected onComboFocus(): void {
    this.comboOpen.set(true);
  }

  protected limpiarCombo(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.qCliente.set('');
    this.sugerencias.set([]);
    this.comboOpen.set(false);
  }

  protected onComboBlur(): void {
    setTimeout(() => this.comboOpen.set(false), 180);
  }

  protected elegirSugerencia(c: ClienteRef): void {
    this.comboOpen.set(false);
    this.sugerencias.set([]);
    this.activarCliente(c);
  }

  protected elegirDeLista(fila: FilaClienteCxc): void {
    this.activarCliente(fila.cliente);
  }

  private activarCliente(c: ClienteRef): void {
    this.clienteId.set(c.id);
    this.movVista.set('todos');
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
    this.resetCobroForm();
    this.clientesLista.update((list) => (list.some((x) => x.id === c.id) ? list : [c, ...list]));
    this.store.seleccionarCliente(c);
  }

  protected limpiarSeleccionCliente(): void {
    this.clienteId.set('');
    this.panel.set('comprobantes');
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
    this.store.limpiarSeleccion();
  }

  protected metaDeCliente(c: ClienteRef): string {
    const cuit = c.cuit?.trim() || 'Sin CUIT';
    const zona = c.zonaId ? this.zonaNombre().get(c.zonaId) : null;
    return zona ? `${cuit} · ${zona}` : cuit;
  }

  protected ejecutarInforme(): void {
    this.informeEjecutado.set(true);
    this.store.buscarInforme(this.infQ());
  }

  protected limpiarInforme(): void {
    this.infQ.set('');
    this.plazo.set('todo');
    this.montoMin.set('');
    this.montoMax.set('');
    this.situacion.set('todos');
    this.zonaId.set('');
    this.bloqueo.set('todos');
    this.infPreset.set('todos');
    this.informeEjecutado.set(false);
    this.store.limpiarInformeBusqueda();
  }

  protected abrirClienteDesdeInforme(id: string): void {
    const cliente = this.clientes().find((c) => c.id === id);
    if (!cliente) {
      return;
    }
    this.tab.set('cuenta');
    this.qCliente.set('');
    this.activarCliente(cliente);
  }

  protected aplicarPreset(preset: PresetInforme): void {
    this.infPreset.set(preset);
    if (preset === 'todos') {
      this.situacion.set('todos');
      this.plazo.set('todo');
    } else if (preset === 'debe') {
      this.situacion.set('debe');
      this.plazo.set('todo');
    } else if (preset === 'mora90') {
      this.situacion.set('debe');
      this.plazo.set('mas90');
    } else {
      this.situacion.set('al_dia');
      this.plazo.set('todo');
    }
  }

  protected abrirDrawerInforme(id: string): void {
    this.infDrawerId.set(id);
    this.infDrawerEstado.set(null);
    this.api.estadoCuenta(id).subscribe({
      next: (estado) => this.infDrawerEstado.set(estado),
      error: () => this.infDrawerEstado.set(null),
    });
  }

  protected cerrarDrawerInforme(): void {
    this.infDrawerId.set('');
    this.infDrawerEstado.set(null);
  }

  protected cobrarDesdeInforme(id: string): void {
    this.cerrarDrawerInforme();
    this.abrirClienteDesdeInforme(id);
  }

  protected setPanel(p: PanelDetalle): void {
    this.panel.set(p);
  }

  protected abrirDetalle(c: ComprobanteCxc): void {
    this.detalleComprobante.set(c);
    this.detalleOpen.set(true);
  }

  protected cerrarDetalle(): void {
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
  }

  protected abrirDetalleMov(row: FilaMovimiento): void {
    const todos = [...this.store.remitos(), ...this.store.facturas()];
    const match = todos.find(
      (c) =>
        c.id === row.id ||
        (c.numero && row.comprobante.includes(c.numero)) ||
        row.referenciaTipo.toLowerCase().includes(c.tipo),
    );
    if (match) {
      this.abrirDetalle(match);
    }
  }

  protected ciclarOrden(): void {
    const actual = this.ordenLista();
    this.ordenLista.set(actual === 'mora' ? 'saldo' : actual === 'saldo' ? 'nombre' : 'mora');
  }

  protected ordenLabel(): string {
    const o = this.ordenLista();
    if (o === 'saldo') {
      return 'Ordenar: saldo ↓';
    }
    if (o === 'nombre') {
      return 'Ordenar: nombre';
    }
    return 'Ordenar: mora ↓';
  }

  protected nuevaVenta(): void {
    const id = this.clienteId();
    if (!id) {
      this.notifications.error('Sin cliente', 'Seleccioná un cliente para cargar la venta');
      return;
    }
    void this.router.navigate(['/ventas'], { queryParams: { clienteId: id } });
  }

  protected enviarRecordatorio(): void {
    const c = this.clienteActual();
    if (!c) {
      this.notifications.error('Sin cliente', 'Seleccioná un cliente para enviar el recordatorio');
      return;
    }
    const saldo = this.kpiSaldo();
    const cuerpo = `Hola ${c.nombre}, te recordamos que tu saldo en cuenta corriente es ${saldo}.`;
    this.recordatorioCuerpo.set(cuerpo);
    this.recordatorioOpen.set(true);
  }

  protected cerrarRecordatorio(): void {
    this.recordatorioOpen.set(false);
  }

  protected copiarRecordatorio(): void {
    const cuerpo = this.recordatorioCuerpo();
    void navigator.clipboard.writeText(cuerpo).then(
      () =>
        this.notifications.success('Copiado', 'El texto del recordatorio quedó en el portapapeles'),
      () => this.notifications.warning('Recordatorio', cuerpo),
    );
  }

  protected mailRecordatorio(): void {
    const c = this.clienteActual();
    const cuerpo = this.recordatorioCuerpo();
    const asunto = `Recordatorio de cuenta corriente — ${c?.nombre ?? ''}`;
    const to = c?.email?.trim() ?? '';
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.location.href = href;
  }

  protected imprimirResumen(): void {
    const c = this.clienteActual();
    if (!c) {
      this.notifications.error('Sin cliente', 'Seleccioná un cliente para ver el resumen');
      return;
    }
    this.resumenOpen.set(true);
  }

  protected cerrarResumen(): void {
    this.resumenOpen.set(false);
  }

  protected imprimirResumenAhora(): void {
    window.print();
  }

  protected setMovVista(v: FiltroMovCta): void {
    this.movVista.set(v);
  }

  protected toggleImput(id: string): void {
    const p = this.pendientesCobro().find((x) => x.id === id);
    if (!p) {
      return;
    }
    this.imputSel.update((m) => ({
      ...m,
      [id]: {
        selected: !p.selected,
        montoTxt: p.montoTxt || this.montoInputDesdeNumero(p.deuda),
      },
    }));
  }

  protected setImputMonto(id: string, valor: string): void {
    const p = this.pendientesCobro().find((x) => x.id === id);
    this.imputSel.update((m) => ({
      ...m,
      [id]: { selected: p?.selected ?? true, montoTxt: valor },
    }));
  }

  protected autoImputar(): void {
    const pendientes = this.pendientesCobro();
    const cupo = this.totalCobroNum() > 0 ? this.totalCobroNum() : Number.POSITIVE_INFINITY;
    let rest = cupo;
    const next: Record<string, { selected: boolean; montoTxt: string }> = {};
    for (const p of pendientes) {
      if (rest <= 0.009) {
        next[p.id] = { selected: false, montoTxt: this.montoInputDesdeNumero(p.deuda) };
        continue;
      }
      const toma = Math.min(p.deuda, rest);
      next[p.id] = { selected: true, montoTxt: this.montoInputDesdeNumero(toma) };
      rest = Math.round((rest - toma) * 100) / 100;
    }
    this.imputSel.set(next);
  }

  protected agregarMedio(): void {
    this.cobroMedios.update((list) => [...list, this.nuevoMedio('efectivo')]);
  }

  protected quitarMedio(key: string): void {
    this.cobroMedios.update((list) =>
      list.length <= 1 ? list : list.filter((m) => m.key !== key),
    );
  }

  protected setMedioTipo(key: string, medio: MedioCobro): void {
    if (medio === 'cheque') {
      const actuales = this.cobroMedios().filter(
        (m) => m.medio === 'cheque' && m.key !== key,
      ).length;
      if (actuales >= MAX_CHEQUES_COBRO) {
        this.notifications.error('Cheques', `Como máximo ${MAX_CHEQUES_COBRO} cheques por cobro`);
        return;
      }
    }
    this.cobroMedios.update((list) =>
      list.map((m) => {
        if (m.key !== key) {
          return m;
        }
        const next = { ...m, medio };
        if (medio === 'cheque' && !next.chequeLibrador) {
          next.chequeLibrador = this.clienteActual()?.nombre ?? '';
        }
        return next;
      }),
    );
  }

  protected setMedioMonto(key: string, valor: string): void {
    this.cobroMedios.update((list) =>
      list.map((m) => (m.key === key ? { ...m, montoTxt: valor } : m)),
    );
  }

  protected setChequeCampo(
    key: string,
    campo: 'chequeNumero' | 'chequeBanco' | 'chequeLibrador' | 'chequeFecha' | 'chequeVto',
    valor: string,
  ): void {
    this.cobroMedios.update((list) =>
      list.map((m) => (m.key === key ? { ...m, [campo]: valor } : m)),
    );
  }

  protected confirmarCobro(): void {
    if (this.cobroGuardando() || !this.cobroHabilitado()) {
      return;
    }
    const clienteId = this.clienteId();
    const cobro = this.totalCobroNum();
    const imputado = this.imputadoNum();
    if (!clienteId) {
      this.notifications.error('Sin cliente', 'Elegí el cliente del cobro');
      return;
    }
    if (cobro <= 0) {
      this.notifications.error('Monto inválido', 'Cargá al menos un medio con monto mayor a cero');
      return;
    }
    if (imputado > cobro) {
      this.notifications.error(
        'Imputación',
        'Lo imputado no puede ser mayor que el total a cobrar',
      );
      return;
    }
    const medios = this.mediosParaApi();
    if (!medios) {
      return;
    }
    const imputaciones = this.pendientesCobro()
      .filter((p) => p.selected)
      .map((p) => ({ facturaId: p.id, monto: parseMontoInput(p.montoTxt) ?? 0 }))
      .filter((i) => i.monto > 0);
    this.cobroGuardando.set(true);
    this.store
      .crearRecibo({
        clienteId,
        monto: cobro,
        observacion: this.cobroObs().trim() || undefined,
        imputaciones,
        medios,
      })
      .subscribe({
        next: (recibo) => {
          this.cobroGuardando.set(false);
          this.resetCobroForm();
          this.notifications.success(
            'Cobro registrado',
            `${formatearMoneda(recibo.monto)} · ${recibo.medio}`,
          );
          const saldo = this.store.saldoSeleccionado();
          if (saldo) {
            this.saldosLista.update((list) => [
              ...list.filter((s) => s.clienteId !== saldo.clienteId),
              saldo,
            ]);
          }
        },
        error: (err: Error) => {
          this.cobroGuardando.set(false);
          this.notifications.error('No se pudo registrar el cobro', err.message || 'Error');
        },
      });
  }

  private nuevoMedio(medio: MedioCobro): LineaMedioUi {
    this.medioSeq += 1;
    return {
      key: `m-${this.medioSeq}`,
      medio,
      montoTxt: '',
      chequeNumero: '',
      chequeBanco: '',
      chequeLibrador: this.clienteActual?.()?.nombre ?? '',
      chequeFecha: '',
      chequeVto: '',
    };
  }

  private resetCobroForm(): void {
    this.medioSeq = 0;
    this.cobroObs.set('');
    this.cobroMedios.set([this.nuevoMedio('efectivo')]);
    this.imputSel.set({});
  }

  private mediosParaApi() {
    const medios = [];
    for (const m of this.cobroMedios()) {
      const monto = parseMontoInput(m.montoTxt);
      if (monto === null || monto <= 0) {
        continue;
      }
      if (m.medio === 'cheque') {
        const numero = m.chequeNumero.trim();
        const banco = m.chequeBanco.trim();
        if (!numero || !banco) {
          this.notifications.error('Cheque', 'Completá número y banco de cada cheque');
          return null;
        }
        medios.push({
          medio: m.medio,
          monto,
          cheque: {
            numero,
            bancoEmisor: banco,
            librador: m.chequeLibrador.trim(),
            fecha: m.chequeFecha || undefined,
            fechaVto: m.chequeVto || undefined,
            recibidoDe: this.clienteActual()?.nombre ?? m.chequeLibrador.trim(),
          },
        });
        continue;
      }
      medios.push({ medio: m.medio, monto });
    }
    if (medios.length === 0) {
      this.notifications.error('Medios', 'Cargá al menos un medio de cobro');
      return null;
    }
    const nCheques = medios.filter((m) => m.medio === 'cheque').length;
    if (nCheques > MAX_CHEQUES_COBRO) {
      this.notifications.error('Cheques', `Como máximo ${MAX_CHEQUES_COBRO} cheques por cobro`);
      return null;
    }
    return medios;
  }

  private filasDesdeClientes(
    clientes: ClienteRef[],
    saldos: SaldoCliente[],
    aplicarFiltros = true,
  ): FilaClienteCxc[] {
    const hoy = new Date();
    const plazo = aplicarFiltros ? this.plazo() : 'todo';
    const min = aplicarFiltros ? parseMontoInput(this.montoMin()) : null;
    const max = aplicarFiltros ? parseMontoInput(this.montoMax()) : null;
    const situacion = aplicarFiltros ? this.situacion() : 'todos';
    const zona = aplicarFiltros ? this.zonaId() : '';
    const bloqueo = aplicarFiltros ? this.bloqueo() : 'todos';
    const saldosPorId = new Map(saldos.map((s) => [s.clienteId, s]));

    const filas: FilaClienteCxc[] = [];
    for (const cliente of clientes) {
      if (zona && cliente.zonaId !== zona) {
        continue;
      }
      if (bloqueo === 'bloqueados' && !cliente.bloqueado) {
        continue;
      }
      if (bloqueo === 'habilitados' && cliente.bloqueado) {
        continue;
      }

      const saldo = saldosPorId.get(cliente.id) ?? saldoVacio(cliente.id);
      const sit: 'debe' | 'favor' | 'al_dia' =
        saldo.saldo > 0 ? 'debe' : saldo.saldo < 0 ? 'favor' : 'al_dia';
      if (situacion !== 'todos' && sit !== situacion) {
        continue;
      }

      const absSaldo = Math.abs(saldo.saldo);
      if (min !== null && absSaldo < min) {
        continue;
      }
      if (max !== null && absSaldo > max) {
        continue;
      }

      const refFecha = sit === 'debe' ? saldo.fechaDebeMasAntigua : saldo.fechaUltimoMovimiento;
      const antiguedad = diasDesde(refFecha, hoy);
      if (!coincidePlazo(antiguedad, plazo)) {
        continue;
      }

      const disponible = cliente.limiteCredito - Math.max(0, saldo.saldo);
      filas.push({
        cliente,
        saldo,
        saldoFmt: formatearMoneda(saldo.saldo),
        debeFmt: formatearMoneda(saldo.debeTotal),
        haberFmt: formatearMoneda(saldo.haberTotal),
        situacion: sit,
        situacionLabel: sit === 'debe' ? 'Debe' : sit === 'favor' ? 'A favor' : 'Al día',
        antiguedadDias: antiguedad,
        antiguedadLabel: antiguedad === null ? '—' : `${antiguedad}d`,
        ultimoMovFmt: saldo.fechaUltimoMovimiento
          ? formatearFecha(saldo.fechaUltimoMovimiento)
          : 'Sin mov.',
        zonaNombre: cliente.zonaId ? (this.zonaNombre().get(cliente.zonaId) ?? '—') : '—',
        limiteFmt: formatearMoneda(cliente.limiteCredito),
        disponibleFmt: formatearMoneda(disponible),
      });
    }

    return filas.sort((a, b) => Math.abs(b.saldo.saldo) - Math.abs(a.saldo.saldo));
  }

  private montoInputDesdeNumero(valor: number): string {
    return valor.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private valuarComprobante(c: ComprobanteCxc, precios: Map<string, number>): FilaComprobanteVista {
    const ivaPct = c.ivaPorcentaje || 21;
    const netoLista = c.lineas.reduce((acc, l) => {
      const p = precios.get(l.productoId) ?? l.precioUnitario;
      return acc + l.cantidad * p;
    }, 0);
    const totalLista = Math.round(netoLista * (1 + ivaPct / 100) * 100) / 100;
    const pendiente =
      c.tipo === 'remito'
        ? c.estado === 'confirmado' || c.estado === 'borrador'
        : c.estado === 'confirmado' || c.estado === 'borrador';
    const deuda = c.tipo === 'remito' && c.estado === 'facturado' ? 0 : pendiente ? c.total : 0;

    return {
      comprobante: c,
      tipoLabel: c.tipo === 'factura' ? 'Factura' : 'Remito',
      numero: c.numero || c.id.slice(0, 8),
      fechaFmt: formatearFecha(c.fecha),
      estado: c.estado,
      items: c.lineas.length,
      netoOriginal: c.neto,
      ivaOriginal: c.iva,
      ivaPorcentaje: ivaPct,
      totalOriginal: c.total,
      totalLista,
      netoOriginalFmt: formatearMoneda(c.neto),
      ivaOriginalFmt: formatearMoneda(c.iva),
      ivaPorcentajeFmt: `${ivaPct}%`,
      totalOriginalFmt: formatearMoneda(c.total),
      totalListaFmt: formatearMoneda(totalLista),
      deudaLabel:
        c.tipo === 'remito' && c.estado === 'facturado'
          ? 'Facturado'
          : pendiente
            ? 'Pendiente'
            : '—',
      deuda,
      deudaFmt: formatearMoneda(deuda),
      pendiente: deuda > 0,
    };
  }
}
