import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { IaStore } from '../../ia/state/ia.store';
import { Icon } from '../../shared/ui/icon/icon';
import { DashboardService, RemitoCompraDash } from './data-access/dashboard.service';
import { DashboardStore } from './data-access/dashboard.store';
import { KPIS_VACIOS } from './data-access/kpi.model';

type SeccionDash = 'asistente' | 'remitos' | 'reposicion' | 'cxc';

function formatearMoneda(valor: number, moneda = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda || 'ARS',
    maximumFractionDigits: 0,
  })
    .format(valor)
    .replace(/\u00a0/g, ' ');
}

function formatearFechaCorta(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatearVencimiento(fecha: string | null, vencido: boolean): string {
  if (!fecha) {
    return 'Sin fecha de cargo';
  }
  const txt = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
  return vencido ? `Venció el ${txt}` : `Desde el ${txt}`;
}

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);
  private readonly dashboardApi = inject(DashboardService);
  private readonly iaStore = inject(IaStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly remitosCompra = signal<RemitoCompraDash[]>([]);
  protected readonly remitosStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly seccionesAbiertas = signal<ReadonlySet<SeccionDash>>(new Set());

  private iaPedida = false;
  private remitosPedidos = false;

  protected readonly accionesList = computed(() => {
    const s = this.iaStore.acciones();
    return s.status === 'ready' ? s.data.acciones : [];
  });

  protected readonly resumenNarrativa = computed(() => {
    const s = this.iaStore.resumen();
    return s.status === 'ready' ? (s.data.narrativa ?? null) : null;
  });

  protected readonly iaCargando = computed(() => {
    const a = this.iaStore.acciones().status;
    const r = this.iaStore.resumen().status;
    return a === 'loading' || r === 'loading';
  });

  protected readonly cargando = computed(() => this.store.kpis().status === 'loading');

  protected readonly kpisListos = computed(() => this.store.kpis().status === 'success');

  protected readonly error = computed(() =>
    this.store.kpis().status === 'error' ? this.store.kpis().error : null,
  );

  protected readonly kpis = computed(() => this.store.kpis().data ?? KPIS_VACIOS);

  protected readonly saludo = computed(() => {
    const nombre = this.auth.user()?.nombre?.trim();
    if (!nombre) {
      return '';
    }
    return nombre.split(/\s+/)[0] || '';
  });

  protected readonly fechaHoy = (() => {
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MESES = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    const hoy = new Date();
    return `${DIAS[hoy.getDay()]} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;
  })();

  protected readonly kpisVista = computed(() => {
    const status = this.store.kpis().status;
    if (status === 'idle') {
      return {
        ventasHoy: '—',
        ventasHoyFoot: 'Expandí una sección para cargar',
        ventasHoyOk: false,
        pedidos: '—',
        pedidosFoot: 'Sin cargar',
        saldoCobrar: '—',
        saldoFoot: 'Sin cargar',
        saldoAlerta: false,
        bajoStock: '—',
        bajoStockFoot: 'Sin cargar',
      };
    }
    const k = this.kpis();
    const moneda = k.moneda || 'ARS';
    const ventasHoy = formatearMoneda(k.montoVentasDia, moneda);
    const comprobantesHoy = k.ventasDia === 1 ? '1 comprobante' : `${k.ventasDia} comprobantes`;
    const pendientesRemitos =
      k.remitosPorFacturar === 0
        ? 'Sin remitos por facturar'
        : k.remitosPorFacturar === 1
          ? '1 remito por facturar'
          : `${k.remitosPorFacturar} remitos por facturar`;
    return {
      ventasHoy,
      ventasHoyFoot:
        status === 'loading' ? 'Cargando…' : k.ventasDia === 0 ? 'Sin ventas hoy' : comprobantesHoy,
      ventasHoyOk: k.ventasDia > 0,
      pedidos: status === 'loading' ? '—' : String(k.pedidosPendientes),
      pedidosFoot: status === 'loading' ? 'Cargando…' : pendientesRemitos,
      saldoCobrar: status === 'loading' ? '—' : formatearMoneda(k.saldoCobrar, moneda),
      saldoFoot:
        status === 'loading'
          ? 'Cargando…'
          : k.saldoCobrar === 0
            ? 'Sin deuda'
            : k.saldoVencido > 0
              ? `${formatearMoneda(k.saldoVencido, moneda)} vencido`
              : 'Sin deuda vencida',
      saldoAlerta: k.saldoVencido > 0,
      bajoStock:
        status === 'loading'
          ? '—'
          : k.articulosBajoStock === 1
            ? '1 artículo'
            : `${k.articulosBajoStock} artículos`,
      bajoStockFoot:
        status === 'loading'
          ? 'Cargando…'
          : k.productosActivos === 0
            ? 'Todavía no hay artículos'
            : k.articulosSinStock === 0
              ? 'Ninguno sin stock'
              : k.articulosSinStock === 1
                ? '1 sin stock'
                : `${k.articulosSinStock} sin stock`,
    };
  });

  protected readonly remitosVista = computed(() => {
    const moneda = this.kpis().moneda || 'ARS';
    return this.remitosCompra()
      .slice(0, 8)
      .map((r) => ({
        ...r,
        fechaFmt: formatearFechaCorta(r.fecha),
        totalFmt: formatearMoneda(r.total, moneda),
        estadoLabel: r.pendienteStock
          ? 'Pendiente de stock'
          : r.estado === 'confirmado'
            ? 'Stock actualizado'
            : r.estado === 'facturado'
              ? 'Facturado'
              : r.estado,
        badge: r.pendienteStock ? ('warning' as const) : ('success' as const),
      }));
  });

  protected readonly remitosPendientesCount = computed(
    () => this.remitosCompra().filter((r) => r.pendienteStock).length,
  );

  protected readonly stockUrgente = computed(() =>
    this.kpis().reposicion.map((item) => ({
      ...item,
      stockFmt: `${item.stock} un.`,
      tono: item.stock <= 0 ? ('danger' as const) : ('warning' as const),
    })),
  );

  /** CxC de mayor a menor importe */
  protected readonly cuentasCorrientes = computed(() =>
    [...this.kpis().vencimientos]
      .sort((a, b) => b.monto - a.monto)
      .map((v) => ({
        ...v,
        fechaFmt: formatearVencimiento(v.fecha, v.vencido),
        montoFmt: formatearMoneda(v.monto, this.kpis().moneda),
      })),
  );

  protected abierta(id: SeccionDash): boolean {
    return this.seccionAbierta() === id;
  }

  protected toggleSeccion(id: SeccionDash): void {
    if (this.seccionAbierta() === id) {
      this.seccionAbierta.set(null);
      return;
    }
    this.seccionAbierta.set(id);
    this.cargarSeccion(id);
  }

  private cargarSeccion(id: SeccionDash): void {
    if (id === 'asistente') {
      this.asegurarIa();
      return;
    }
    if (id === 'remitos') {
      this.asegurarRemitos();
      return;
    }
    // Reposición y CxC salen de /reporteria/kpis
    this.asegurarKpis();
  }

  private asegurarKpis(): void {
    const status = this.store.kpis().status;
    if (status === 'success' || status === 'loading') {
      return;
    }
    this.store.cargar();
  }

  /** Cabecera de KPIs: se pide al tocar las cards o al abrir reposición/CxC. */
  protected cargarKpisCabecera(): void {
    this.asegurarKpis();
  }

  private asegurarIa(): void {
    if (this.iaPedida) {
      return;
    }
    this.iaPedida = true;
    this.iaStore.cargarDashboard();
  }

  private asegurarRemitos(): void {
    if (this.remitosPedidos) {
      return;
    }
    this.remitosPedidos = true;
    this.remitosStatus.set('loading');
    this.dashboardApi.listarRemitosCompra().subscribe({
      next: (items) => {
        this.remitosCompra.set(items);
        this.remitosStatus.set('ready');
      },
      error: () => {
        this.remitosCompra.set([]);
        this.remitosStatus.set('error');
      },
    });
  }

  protected irAFacturacion(): void {
    this.router.navigate(['/ventas']);
  }

  protected irARecepcion(): void {
    if (this.auth.puedeRuta('inventario')) {
      void this.router.navigate(['/inventario'], { queryParams: { tab: 'recepcion' } });
      return;
    }
    void this.router.navigate(['/compras']);
  }

  protected irAStock(): void {
    if (this.auth.puedeRuta('inventario')) {
      void this.router.navigate(['/inventario'], { queryParams: { tab: 'alertas' } });
      return;
    }
    void this.router.navigate(['/productos']);
  }

  protected irACtacte(): void {
    void this.router.navigate(['/cuenta-corriente']);
  }

  protected irAccion(ruta: string): void {
    const [path, query] = ruta.split('?');
    if (query) {
      const params = Object.fromEntries(new URLSearchParams(query).entries());
      void this.router.navigate([path], { queryParams: params });
      return;
    }
    void this.router.navigateByUrl(ruta.startsWith('/') ? ruta : `/${ruta}`);
  }

  protected prioridadLabel(prioridad: string): string {
    if (prioridad === 'alta') {
      return 'Alta';
    }
    if (prioridad === 'media') {
      return 'Media';
    }
    return 'Baja';
  }
}
