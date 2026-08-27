import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
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
import {
  ClienteRef,
  ComprobanteCxc,
  DatosCheque,
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

const MIN_CHARS_BUSQUEDA = 3;

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
  debe: string;
  haber: string;
  saldo: string;
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

function formatearMonto(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
})
export class CuentaCorrientePage {
  private readonly store = inject(CuentaCorrienteStore);
  private readonly api = inject(CuentaCorrienteService);
  private readonly notifications = inject(NotificationStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly comboAutocomplete$ = new Subject<string>();

  protected readonly tab = signal<TabCxc>('cuenta');
  protected readonly qCliente = signal('');
  protected readonly comboOpen = signal(false);
  protected readonly comboBuscando = signal(false);
  protected readonly sugerencias = signal<ClienteRef[]>([]);

  protected readonly infQ = signal('');
  protected readonly informeEjecutado = signal(false);
  protected readonly plazo = signal<PlazoFiltro>('todo');
  protected readonly montoMin = signal('');
  protected readonly montoMax = signal('');
  protected readonly situacion = signal<SituacionFiltro>('todos');
  protected readonly zonaId = signal('');
  protected readonly bloqueo = signal<BloqueoFiltro>('todos');

  protected readonly clienteId = signal('');
  protected readonly panel = signal<PanelDetalle>('comprobantes');
  protected readonly tipoMov = signal<TipoMovFiltro>('todos');
  protected readonly detalleOpen = signal(false);
  protected readonly detalleComprobante = signal<ComprobanteCxc | null>(null);

  protected readonly cobroOpen = signal(false);
  protected readonly cobroClienteId = signal('');
  protected readonly cobroMonto = signal('');
  protected readonly cobroMedio = signal<MedioCobro>('efectivo');
  protected readonly cobroObs = signal('');
  protected readonly cobroGuardando = signal(false);
  protected readonly cobroChequeNumero = signal('');
  protected readonly cobroChequeBanco = signal('');
  protected readonly cobroChequeLibrador = signal('');
  protected readonly cobroChequeFecha = signal('');
  protected readonly cobroChequeVto = signal('');

  protected readonly minChars = MIN_CHARS_BUSQUEDA;

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
    return this.clientes().find((c) => c.id === id) ?? null;
  });

  protected readonly saldoCliente = computed(() => {
    const id = this.clienteId();
    return this.saldos().find((s) => s.clienteId === id) ?? null;
  });

  protected readonly inicialesCliente = computed(() =>
    iniciales(this.clienteActual()?.nombre ?? ''),
  );

  protected readonly kpiSaldo = computed(() => formatearMoneda(this.saldoCliente()?.saldo ?? 0));
  protected readonly kpiDebe = computed(() => formatearMoneda(this.saldoCliente()?.debeTotal ?? 0));
  protected readonly kpiHaber = computed(() =>
    formatearMoneda(this.saldoCliente()?.haberTotal ?? 0),
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

  protected readonly cobroSaldoFmt = computed(() => {
    const id = this.cobroClienteId();
    const s = this.saldos().find((x) => x.clienteId === id);
    if (!s || s.saldo <= 0) {
      return '—';
    }
    return formatearMoneda(s.saldo);
  });

  protected readonly filas = computed(() => {
    const estado = this.estadoCuenta();
    const tipoFiltro = this.tipoMov();
    if (!estado) {
      return [] as FilaMovimiento[];
    }

    let saldoCorrido = 0;
    const rows: FilaMovimiento[] = [];

    const ordenados = [...estado.movimientos].sort(
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
        !(
          ref.includes('factura') ||
          ref.includes('remito') ||
          tipoMov === 'FAC' ||
          tipoMov === 'REM'
        )
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
        debe: m.tipo === 'debe' ? formatearMonto(m.monto) : '—',
        haber: m.tipo === 'haber' ? formatearMonto(m.monto) : '—',
        saldo: formatearMonto(saldoCorrido),
      });
    }

    return rows.reverse();
  });

  constructor() {
    this.comboAutocomplete$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < MIN_CHARS_BUSQUEDA) {
            this.sugerencias.set([]);
            this.comboBuscando.set(false);
            return EMPTY;
          }
          this.comboBuscando.set(true);
          return this.api.listarClientesRef({ q, pageSize: 12 }).pipe(
            catchError(() => of([] as ClienteRef[])),
            finalize(() => this.comboBuscando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.sugerencias.set(items);
        this.comboOpen.set(true);
      });
  }

  protected setTab(next: TabCxc): void {
    this.tab.set(next);
    if (next === 'informes') {
      this.store.cargarZonasSiHaceFalta();
    }
  }

  protected onComboInput(valor: string): void {
    this.qCliente.set(valor);
    this.comboOpen.set(true);
    this.comboAutocomplete$.next(valor);
    if (!valor.trim()) {
      this.limpiarSeleccionCliente();
    }
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
    this.limpiarSeleccionCliente();
  }

  protected onComboBlur(): void {
    setTimeout(() => this.comboOpen.set(false), 180);
  }

  protected elegirSugerencia(c: ClienteRef): void {
    this.qCliente.set(c.nombre);
    this.comboOpen.set(false);
    this.sugerencias.set([]);
    this.clienteId.set(c.id);
    this.panel.set('comprobantes');
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
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
    this.informeEjecutado.set(false);
    this.store.limpiarInformeBusqueda();
  }

  protected abrirClienteDesdeInforme(id: string): void {
    const cliente = this.clientes().find((c) => c.id === id);
    if (!cliente) {
      return;
    }
    this.tab.set('cuenta');
    this.qCliente.set(cliente.nombre);
    this.clienteId.set(id);
    this.panel.set('comprobantes');
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
    this.store.seleccionarCliente(cliente);
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

  protected abrirCobro(clienteId?: string): void {
    const id = clienteId || this.clienteId();
    if (!id) {
      this.notifications.error('Sin cliente', 'Seleccioná un cliente para registrar el cobro');
      return;
    }
    const saldo = this.saldos().find((s) => s.clienteId === id);
    if (!saldo || saldo.saldo <= 0) {
      this.notifications.error('Sin deuda', 'El cliente no tiene saldo deudor para cobrar');
      return;
    }
    this.cobroClienteId.set(id);
    this.cobroMonto.set(this.montoInputDesdeNumero(saldo.saldo));
    this.cobroMedio.set('efectivo');
    this.cobroObs.set('');
    this.cobroChequeNumero.set('');
    this.cobroChequeBanco.set('');
    this.cobroChequeLibrador.set(this.clienteActual()?.nombre ?? '');
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
    const clienteId = this.cobroClienteId();
    const monto = parseMontoInput(this.cobroMonto());
    if (!clienteId) {
      this.notifications.error('Sin cliente', 'Elegí el cliente del cobro');
      return;
    }
    if (monto === null || monto <= 0) {
      this.notifications.error('Monto inválido', 'Ingresá un monto mayor a cero');
      return;
    }
    if (this.cobroMedio() === 'cheque' && !this.datosChequeCobro()) {
      this.notifications.error('Cheque', 'Completá número y banco del cheque');
      return;
    }
    this.cobroGuardando.set(true);
    this.store
      .registrarCobro({
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
          this.clienteId.set(clienteId);
          this.notifications.success(
            'Cobro registrado',
            `${formatearMoneda(recibo.monto)} · ${recibo.medio}`,
          );
        },
        error: (err: Error) => {
          this.cobroGuardando.set(false);
          this.notifications.error('No se pudo registrar el cobro', err.message || 'Error');
        },
      });
  }

  private filasDesdeClientes(clientes: ClienteRef[], saldos: SaldoCliente[]): FilaClienteCxc[] {
    const hoy = new Date();
    const plazo = this.plazo();
    const min = parseMontoInput(this.montoMin());
    const max = parseMontoInput(this.montoMax());
    const situacion = this.situacion();
    const zona = this.zonaId();
    const bloqueo = this.bloqueo();
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

  private datosChequeCobro(): DatosCheque | null {
    if (this.cobroMedio() !== 'cheque') {
      return null;
    }
    const numero = this.cobroChequeNumero().trim();
    const banco = this.cobroChequeBanco().trim();
    if (!numero || !banco) {
      return null;
    }
    return {
      numero,
      bancoEmisor: banco,
      librador: this.cobroChequeLibrador().trim(),
      fecha: this.cobroChequeFecha() || undefined,
      fechaVto: this.cobroChequeVto() || undefined,
      recibidoDe: this.clienteActual()?.nombre ?? this.cobroChequeLibrador().trim(),
    };
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
      deudaFmt: formatearMoneda(deuda),
      pendiente: deuda > 0,
    };
  }
}
