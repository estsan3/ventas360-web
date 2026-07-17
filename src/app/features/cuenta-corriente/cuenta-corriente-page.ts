import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationStore } from '../../notifications/state/notification.store';
import { CuentaCorrienteStore } from './data-access/cuenta-corriente.store';
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

export interface FilaClienteCxc {
  cliente: ClienteRef;
  saldo: SaldoCliente;
  saldoFmt: string;
  situacion: 'debe' | 'favor' | 'al_dia';
  situacionLabel: string;
  antiguedadDias: number | null;
  zonaNombre: string;
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

@Component({
  selector: 'app-cuenta-corriente-page',
  imports: [FormsModule],
  templateUrl: './cuenta-corriente-page.html',
  styleUrl: './cuenta-corriente-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaCorrientePage {
  private readonly store = inject(CuentaCorrienteStore);
  private readonly notifications = inject(NotificationStore);

  protected readonly qCliente = signal('');
  protected readonly plazo = signal<PlazoFiltro>('todo');
  protected readonly montoMin = signal('');
  protected readonly montoMax = signal('');
  protected readonly situacion = signal<SituacionFiltro>('todos');
  protected readonly tipoMov = signal<TipoMovFiltro>('todos');
  protected readonly zonaId = signal('');
  protected readonly bloqueo = signal<BloqueoFiltro>('todos');
  protected readonly clienteId = signal<string>('');
  protected readonly panel = signal<PanelDetalle>('comprobantes');
  protected readonly detalleOpen = signal(false);
  protected readonly detalleComprobante = signal<ComprobanteCxc | null>(null);

  protected readonly cobroOpen = signal(false);
  protected readonly cobroClienteId = signal('');
  protected readonly cobroMonto = signal('');
  protected readonly cobroMedio = signal<MedioCobro>('efectivo');
  protected readonly cobroObs = signal('');
  protected readonly cobroGuardando = signal(false);

  protected readonly clientes = computed(() => this.store.clientesRef());
  protected readonly zonas = computed(() => this.store.zonasRef());
  protected readonly saldos = computed(() => this.store.saldos().data ?? []);
  protected readonly estadoCuenta = this.store.estadoCuenta;
  protected readonly listaPrecio = this.store.listaPrecio;
  protected readonly preciosActuales = this.store.preciosActuales;

  protected readonly zonaNombre = computed(() => {
    const map = new Map(this.zonas().map((z) => [z.id, z.nombre]));
    return map;
  });

  protected readonly clientesFiltrados = computed((): FilaClienteCxc[] => {
    const hoy = new Date();
    const q = this.qCliente().trim().toLowerCase();
    const plazo = this.plazo();
    const min = parseMontoInput(this.montoMin());
    const max = parseMontoInput(this.montoMax());
    const situacion = this.situacion();
    const zona = this.zonaId();
    const bloqueo = this.bloqueo();
    const porId = new Map(this.clientes().map((c) => [c.id, c]));

    const filas: FilaClienteCxc[] = [];
    for (const saldo of this.saldos()) {
      const cliente = porId.get(saldo.clienteId);
      if (!cliente) {
        continue;
      }
      if (q) {
        const hay =
          cliente.nombre.toLowerCase().includes(q) ||
          cliente.cuit.toLowerCase().includes(q) ||
          cliente.email.toLowerCase().includes(q) ||
          cliente.telefono.toLowerCase().includes(q);
        if (!hay) {
          continue;
        }
      }
      if (zona && cliente.zonaId !== zona) {
        continue;
      }
      if (bloqueo === 'bloqueados' && !cliente.bloqueado) {
        continue;
      }
      if (bloqueo === 'habilitados' && cliente.bloqueado) {
        continue;
      }

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

      // Aging: clientes con deuda usan fecha_debe_mas_antigua; a favor/al día usan último mov.
      const refFecha = sit === 'debe' ? saldo.fechaDebeMasAntigua : saldo.fechaUltimoMovimiento;
      const antiguedad = diasDesde(refFecha, hoy);
      if (!coincidePlazo(antiguedad, plazo)) {
        continue;
      }

      filas.push({
        cliente,
        saldo,
        saldoFmt: formatearMoneda(saldo.saldo),
        situacion: sit,
        situacionLabel: sit === 'debe' ? 'Debe' : sit === 'favor' ? 'A favor' : 'Al día',
        antiguedadDias: antiguedad,
        zonaNombre: cliente.zonaId ? (this.zonaNombre().get(cliente.zonaId) ?? '—') : '—',
      });
    }

    return filas.sort((a, b) => Math.abs(b.saldo.saldo) - Math.abs(a.saldo.saldo));
  });

  protected readonly clienteActual = computed(() => {
    const id = this.clienteId();
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

  protected readonly clientesConDeuda = computed(() => {
    const porId = new Map(this.clientes().map((c) => [c.id, c]));
    return this.saldos()
      .filter((s) => s.saldo > 0)
      .map((s) => {
        const cliente = porId.get(s.clienteId);
        if (!cliente) {
          return null;
        }
        return {
          cliente,
          saldo: s,
          saldoFmt: formatearMoneda(s.saldo),
        };
      })
      .filter((f): f is { cliente: ClienteRef; saldo: SaldoCliente; saldoFmt: string } => !!f)
      .sort((a, b) => b.saldo.saldo - a.saldo.saldo);
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
    const plazo = this.plazo();
    const min = parseMontoInput(this.montoMin());
    const max = parseMontoInput(this.montoMax());
    if (!estado) {
      return [] as FilaMovimiento[];
    }

    const ahora = new Date();
    let saldoCorrido = 0;
    const rows: FilaMovimiento[] = [];

    const ordenados = [...estado.movimientos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    for (const m of ordenados) {
      const dias = diasDesde(m.fecha, ahora);
      if (!coincidePlazo(dias, plazo)) {
        continue;
      }

      if (min !== null && m.monto < min) {
        continue;
      }
      if (max !== null && m.monto > max) {
        continue;
      }

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
    this.store.cargarSaldos();
    this.store.cargarReferencias();

    effect(() => {
      const filtrados = this.clientesFiltrados();
      const actual = this.clienteId();
      if (!actual && filtrados[0]) {
        this.clienteId.set(filtrados[0].cliente.id);
        return;
      }
      if (actual && filtrados.length > 0 && !filtrados.some((f) => f.cliente.id === actual)) {
        this.clienteId.set(filtrados[0].cliente.id);
      }
    });

    effect(() => {
      const id = this.clienteId();
      if (id) {
        this.store.cargarEstado(id);
      }
    });
  }

  protected elegirCliente(id: string): void {
    this.clienteId.set(id);
    this.detalleOpen.set(false);
    this.detalleComprobante.set(null);
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

  protected limpiarFiltros(): void {
    this.qCliente.set('');
    this.plazo.set('todo');
    this.montoMin.set('');
    this.montoMax.set('');
    this.situacion.set('todos');
    this.tipoMov.set('todos');
    this.zonaId.set('');
    this.bloqueo.set('todos');
  }

  protected abrirCobro(clienteId?: string): void {
    const id =
      clienteId ||
      (this.saldoCliente()?.saldo && this.saldoCliente()!.saldo > 0
        ? this.clienteId()
        : this.clientesConDeuda()[0]?.cliente.id) ||
      this.clienteId() ||
      '';
    if (!id) {
      this.notifications.error('Sin cliente', 'Seleccioná un cliente con saldo deudor');
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
    this.cobroOpen.set(true);
  }

  protected onCobroClienteChange(id: string): void {
    this.cobroClienteId.set(id);
    const saldo = this.saldos().find((s) => s.clienteId === id);
    this.cobroMonto.set(saldo && saldo.saldo > 0 ? this.montoInputDesdeNumero(saldo.saldo) : '');
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
    this.cobroGuardando.set(true);
    this.store
      .registrarCobro({
        clienteId,
        monto,
        medio: this.cobroMedio(),
        observacion: this.cobroObs().trim() || undefined,
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
