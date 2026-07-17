import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  of,
  Subject,
  switchMap,
} from 'rxjs';
import { NotificationStore } from '../../notifications/state/notification.store';
import {
  ClienteRef,
  MedioCobro,
  ProductoRef,
  SaldoClienteRef,
  TipoComprobante,
  UsuarioRef,
  ZonaRef,
} from './data-access/pedido.model';
import { VentasService } from './data-access/ventas.service';
import { VentasStore } from './data-access/ventas.store';

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
  imports: [RouterLink],
  templateUrl: './ventas-page.html',
  styleUrl: './ventas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(VentasStore);
  private readonly api = inject(VentasService);
  private readonly notifications = inject(NotificationStore);
  private readonly destroyRef = inject(DestroyRef);

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
  protected readonly guardando = signal(false);
  protected readonly emitirOpcionesOpen = signal(false);

  protected readonly clienteId = signal<string | null>(null);
  protected readonly clienteNombre = signal('Consumidor final');
  protected readonly clienteMeta = signal('Sin CUIT · Consumidor final · Lista 1');
  protected readonly clienteBloqueado = signal(false);
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

  protected readonly buscarClienteOpen = signal(false);
  protected readonly buscarArticuloOpen = signal(false);
  protected readonly modalQ = signal('');
  protected readonly modalZonaId = signal('');
  protected readonly modalEstado = signal<'activos' | 'todos' | 'bloqueados'>('activos');
  protected readonly modalVendedorId = signal('');
  protected readonly modalBuscando = signal(false);
  protected readonly modalResultados = signal<ClienteRef[]>([]);
  protected readonly zonasRef = signal<ZonaRef[]>([]);
  protected readonly usuariosRef = signal<UsuarioRef[]>([]);

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
  protected readonly isPagoInmediato = computed(() => this.condicion() !== 'ctacte');
  protected readonly isEfectivo = computed(
    () => this.condicion() === 'contado' && this.medioPago() === 'efectivo',
  );

  protected readonly subtotal = computed(() =>
    this.lineas().reduce((acc, l) => {
      const bruto = l.cantidad * l.precioUnitario;
      const dto = l.dto.endsWith('%') ? Number(l.dto.replace('%', '')) || 0 : 0;
      return acc + bruto * (1 - dto / 100);
    }, 0),
  );

  protected readonly neto = computed(() => this.subtotal() / 1.21);
  protected readonly iva = computed(() => this.subtotal() - this.neto());
  protected readonly total = computed(() => this.subtotal());

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
        return '/presupuestos';
      case 'pedido':
        return '/pedidos';
      case 'remito':
        return '/remitos';
      default:
        return '/ventas';
    }
  });

  constructor() {
    this.store.cargarReferencias();
    this.api
      .listarZonasRef()
      .pipe(catchError(() => of([] as ZonaRef[])))
      .subscribe((z) => this.zonasRef.set(z));
    this.api
      .listarUsuariosRef()
      .pipe(catchError(() => of([] as UsuarioRef[])))
      .subscribe((u) => this.usuariosRef.set(u));

    this.clienteAutocomplete$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < 3) {
            this.clientesAutocomplete.set([]);
            this.clienteBuscando.set(false);
            return EMPTY;
          }
          this.clienteBuscando.set(true);
          return this.api.buscarClientes(q, { activo: true, pageSize: 12 }).pipe(
            catchError(() => of([] as ClienteRef[])),
            finalize(() => this.clienteBuscando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.clientesAutocomplete.set(items);
        this.clienteQuickOpen.set(true);
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
    const dto = l.dto.endsWith('%') ? Number(l.dto.replace('%', '')) || 0 : 0;
    return formatearMonto(bruto * (1 - dto / 100));
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
      this.clienteId.set(null);
      this.clienteNombre.set(nombre);
      this.clienteInput.set(nombre);
      this.clienteMeta.set(meta ?? 'Sin CUIT · Consumidor final · Lista 1');
      this.clienteBloqueado.set(false);
      this.clienteSaldo.set(null);
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
    this.clienteId.set(c.id);
    this.clienteNombre.set(c.nombre);
    this.clienteInput.set(c.nombre);
    this.clienteMeta.set(this.metaDeCliente(c));
    this.clienteBloqueado.set(c.bloqueado);
    this.clienteQuickOpen.set(false);
    this.buscarClienteOpen.set(false);
    this.clientesAutocomplete.set([]);
    this.cargarSaldo(c.id);
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
          dto: '—',
          stockDisponible: p.stock,
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

  /** En Mostrador: guarda un presupuesto con las líneas actuales. */
  protected guardarPresupuesto(): void {
    this.persistir('presupuesto', '/presupuestos');
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
    this.cobroGuardando.set(true);
    this.api
      .registrarCobroACuenta({
        clienteId,
        monto,
        medio: this.cobroMedio(),
        observacion: this.cobroObs().trim() || undefined,
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

    const esRemito = modo === 'remito_ctacte' || modo === 'remito_pago';
    const conCobro = modo === 'remito_pago' || modo === 'factura_fiscal';
    const dep = this.depositosRef().find((d) => d.activo) ?? this.depositosRef()[0];
    if (esRemito && !dep) {
      this.notifications.error('Sin depósito', 'Configurá un depósito para emitir remitos');
      return;
    }

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
          return this.api
            .registrarCobroACuenta({
              clienteId,
              monto: confirmado.total,
              medio: this.medioCobroDesdeCondicion(),
              observacion: this.obsCobroDesdeCondicion(),
            })
            .pipe(map(() => confirmado));
        }),
      )
      .subscribe({
        next: () => {
          const titulo =
            modo === 'factura_fiscal'
              ? 'Factura fiscal emitida'
              : modo === 'remito_ctacte'
                ? 'Remito a cuenta corriente'
                : 'Remito emitido (sin factura fiscal)';
          const detalle = conCobro
            ? `${lineas.length} artículo(s) · cobrado · ${this.clienteNombre()}`
            : `${lineas.length} artículo(s) · saldo en cta. cte. · ${this.clienteNombre()}`;
          this.notifications.success(titulo, detalle);
          this.guardando.set(false);
          this.lineas.set([]);
          this.montoRecibido.set('');
          this.cargarSaldo(clienteId);
        },
        error: () => this.guardando.set(false),
      });
  }

  private medioCobroDesdeCondicion(): MedioCobro {
    const cond = this.condicion();
    if (cond === 'tarjeta') {
      return 'tarjeta';
    }
    if (cond === 'contado' && this.medioPago() === 'transferencia') {
      return 'transferencia';
    }
    if (cond === 'contado' && this.medioPago() === 'debito') {
      return 'tarjeta';
    }
    // efectivo, cheque u otros → caja efectivo (cheque se aclara en observación)
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

  private resolverClienteId(): string | null {
    const clienteId = this.clienteId();
    if (clienteId) {
      return clienteId;
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
