import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { IaStore } from '../../ia/state/ia.store';
import { DashboardStore } from './data-access/dashboard.store';
import { KPIS_VACIOS } from './data-access/kpi.model';

function formatearMoneda(valor: number, moneda = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda || 'ARS',
    maximumFractionDigits: 0,
  })
    .format(valor)
    .replace(/\u00a0/g, ' ');
}

function badgeEstado(estado: string): 'success' | 'warning' | 'neutral' {
  const e = estado.toLowerCase();
  if (e.includes('confirm') || e.includes('entreg') || e.includes('factur')) {
    return 'success';
  }
  if (e.includes('borrador') || e.includes('vigente') || e.includes('acept')) {
    return 'warning';
  }
  return 'neutral';
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
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);
  private readonly iaStore = inject(IaStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly accionesIa = computed(() => this.iaStore.acciones());
  protected readonly resumenIa = computed(() => this.iaStore.resumen());

  protected readonly accionesList = computed(() => {
    const s = this.accionesIa();
    return s.status === 'ready' ? s.data.acciones : [];
  });

  protected readonly resumenNarrativa = computed(() => {
    const s = this.resumenIa();
    return s.status === 'ready' ? (s.data.narrativa ?? null) : null;
  });

  protected readonly cargando = computed(() => {
    const s = this.store.kpis().status;
    return s === 'idle' || s === 'loading';
  });

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
      ventasHoyFoot: k.ventasDia === 0 ? 'Sin ventas hoy' : comprobantesHoy,
      ventasHoyOk: k.ventasDia > 0,
      pedidos: String(k.pedidosPendientes),
      pedidosFoot: pendientesRemitos,
      saldoCobrar: formatearMoneda(k.saldoCobrar, moneda),
      saldoFoot:
        k.saldoCobrar === 0
          ? 'Sin deuda'
          : k.saldoVencido > 0
            ? `${formatearMoneda(k.saldoVencido, moneda)} vencido`
            : 'Sin deuda vencida',
      saldoAlerta: k.saldoVencido > 0,
      bajoStock: k.articulosBajoStock === 1 ? '1 artículo' : `${k.articulosBajoStock} artículos`,
      bajoStockFoot:
        k.productosActivos === 0
          ? 'Todavía no hay artículos'
          : k.articulosSinStock === 0
            ? 'Ninguno sin stock'
            : k.articulosSinStock === 1
              ? '1 sin stock'
              : `${k.articulosSinStock} sin stock`,
      totalSemana: formatearMoneda(
        k.serieSemana.reduce((acc, p) => acc + p.monto, 0),
        moneda,
      ),
    };
  });

  protected readonly comprobantes = computed(() =>
    this.kpis().ultimosComprobantes.map((c) => ({
      ...c,
      totalFmt: formatearMoneda(c.total, this.kpis().moneda),
      badge: badgeEstado(c.estado),
    })),
  );

  protected readonly stockUrgente = computed(() =>
    this.kpis().reposicion.map((item) => ({
      ...item,
      stockFmt: `${item.stock} un.`,
      tono: item.stock <= 0 ? ('danger' as const) : ('warning' as const),
    })),
  );

  protected readonly vencimientos = computed(() =>
    this.kpis().vencimientos.map((v) => ({
      ...v,
      fechaFmt: formatearVencimiento(v.fecha, v.vencido),
      montoFmt: formatearMoneda(v.monto, this.kpis().moneda),
    })),
  );

  constructor() {
    this.store.cargar();
    this.iaStore.cargarDashboard();
  }

  protected irAFacturacion(): void {
    this.router.navigate(['/ventas']);
  }

  protected irAComprobantes(): void {
    if (this.auth.puedeRuta('remitos')) {
      this.router.navigate(['/remitos']);
      return;
    }
    if (this.auth.puedeRuta('pedidos')) {
      this.router.navigate(['/pedidos']);
      return;
    }
    this.router.navigate(['/ventas']);
  }

  protected irAComprobante(tipo: string): void {
    if (tipo === 'pedido' && this.auth.puedeRuta('pedidos')) {
      this.router.navigate(['/pedidos']);
      return;
    }
    if (tipo === 'presupuesto' && this.auth.puedeRuta('presupuestos')) {
      this.router.navigate(['/presupuestos']);
      return;
    }
    this.irAComprobantes();
  }

  protected irAStock(): void {
    if (this.auth.puedeRuta('inventario')) {
      this.router.navigate(['/inventario'], { queryParams: { tab: 'alertas' } });
      return;
    }
    this.router.navigate(['/productos']);
  }

  protected irACtacte(): void {
    this.router.navigate(['/cuenta-corriente']);
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
