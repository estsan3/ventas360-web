import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { CajaService, SaldoCajaDto } from '../caja/data-access/caja.service';
import { ComprasService } from '../compras/data-access/compras.service';
import { Pedido } from '../ventas/data-access/pedido.model';
import { VentasService } from '../ventas/data-access/ventas.service';
import {
  BadgeTone,
  diasDesde,
  formatearCorto,
  formatearFechaCorta,
  formatearMoney,
  pctBar,
} from './dashboard-vista';
import { DashboardService, RemitoCompraDash } from './data-access/dashboard.service';
import { DashboardStore } from './data-access/dashboard.store';
import { KPIS_VACIOS } from './data-access/kpi.model';

type FocoDash = 'cobranzas' | 'remitos' | 'stock' | 'pedido' | 'ventas';

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);
  private readonly dashboardApi = inject(DashboardService);
  private readonly cajaApi = inject(CajaService);
  private readonly comprasApi = inject(ComprasService);
  private readonly ventasApi = inject(VentasService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly foco = signal<FocoDash>('cobranzas');
  protected readonly remitosCompra = signal<RemitoCompraDash[]>([]);
  protected readonly caja = signal<SaldoCajaDto | null>(null);
  protected readonly cxpTotal = signal(0);
  protected readonly presupuestos = signal<Pedido[]>([]);

  protected readonly kpis = computed(() => this.store.kpis().data ?? KPIS_VACIOS);
  protected readonly error = computed(() =>
    this.store.kpis().status === 'error' ? this.store.kpis().error : null,
  );

  protected readonly analisisTxt = computed(() => {
    const s = this.store.kpis();
    if (s.status === 'loading') {
      return 'cargando datos…';
    }
    return 'datos del comercio';
  });

  protected readonly titular = computed(() => {
    const k = this.kpis();
    if (k.saldoVencido > 0) {
      return `Lo más urgente son ${formatearMoney(k.saldoVencido)} de cobranzas vencidas. Después, ${k.remitosPorFacturar} remitos entregados sin facturar.`;
    }
    if (k.remitosPorFacturar > 0) {
      return `Hay ${k.remitosPorFacturar} remitos entregados sin facturar. Conviene cerrarlos para que entre el IVA y la deuda del cliente.`;
    }
    if (k.articulosBajoStock > 0) {
      return `Hay ${k.articulosBajoStock} artículos bajo el mínimo. El resto del día está al día.`;
    }
    return 'El día está al día: sin cobranzas vencidas ni alertas fuertes de stock.';
  });

  protected readonly subtitular = computed(() => {
    const k = this.kpis();
    const bits: string[] = [];
    if (k.ventasDia === 0) {
      bits.push('Todavía no hay ventas cargadas hoy');
    } else {
      bits.push(`${k.ventasDia === 1 ? '1 comprobante' : k.ventasDia + ' comprobantes'} hoy`);
    }
    if (k.pedidosPendientes) {
      bits.push(
        `${k.pedidosPendientes} pedido${k.pedidosPendientes === 1 ? '' : 's'} por confirmar`,
      );
    }
    if (k.articulosSinStock) {
      bits.push(`${k.articulosSinStock} artículo${k.articulosSinStock === 1 ? '' : 's'} en cero`);
    }
    return bits.join('. ') + (bits.length ? '.' : '');
  });

  protected readonly enJuegoFmt = computed(() => formatearCorto(this.kpis().saldoVencido));
  protected readonly enJuegoHint = computed(() =>
    this.kpis().saldoVencido > 0 ? 'cobranzas vencidas' : 'sin deuda vencida',
  );

  protected readonly acciones = computed(() => {
    const k = this.kpis();
    const foco = this.foco();
    const vencidas = this.ccRows().filter((r) => r.vencidoFlag);
    const moraMax = vencidas.reduce((n, r) => Math.max(n, r.moraDias), 0);
    return [
      {
        id: 'cobranzas' as FocoDash,
        prioridad: 'Primero',
        tone: 'danger' as BadgeTone,
        value: formatearCorto(k.saldoVencido),
        titulo: 'Cobranzas vencidas',
        detalle:
          k.saldoVencido > 0
            ? `${vencidas.length} cliente${vencidas.length === 1 ? '' : 's'} en cartera${moraMax ? `, el más atrasado con ${moraMax} días` : ''}`
            : 'Nadie con deuda vencida',
        accion: 'Ver quién debe →',
        ruta: '/cuenta-corriente',
        on: foco === 'cobranzas',
      },
      {
        id: 'remitos' as FocoDash,
        prioridad: 'Hoy',
        tone: 'warn' as BadgeTone,
        value: String(k.remitosPorFacturar),
        titulo: 'Remitos esperan facturación',
        detalle:
          k.remitosPorFacturar > 0
            ? 'Entregados sin factura: el IVA y la cuenta del cliente quedan abiertos'
            : 'No hay remitos de venta pendientes de facturar',
        accion: 'Facturar →',
        ruta: '/comprobantes/remitos',
        on: foco === 'remitos',
      },
      {
        id: 'stock' as FocoDash,
        prioridad: 'Hoy',
        tone: 'warn' as BadgeTone,
        value: String(k.articulosBajoStock),
        titulo: 'Artículos bajo mínimo',
        detalle:
          k.articulosSinStock > 0
            ? `${k.articulosSinStock} en cero y ${k.articulosBajoStock} bajo el umbral`
            : k.articulosBajoStock
              ? 'Conviene armar la reposición'
              : 'Ninguno bajo el mínimo',
        accion: 'Armar reposición →',
        ruta: '/compras',
        on: foco === 'stock',
      },
      {
        id: 'pedido' as FocoDash,
        prioridad: 'Rápido',
        tone: 'accent' as BadgeTone,
        value: String(k.pedidosPendientes),
        titulo: 'Pedido por confirmar',
        detalle:
          k.pedidosPendientes > 0
            ? 'Borradores de venta esperando confirmación'
            : 'No hay pedidos en borrador',
        accion: 'Confirmar →',
        ruta: '/comprobantes/pedidos',
        on: foco === 'pedido',
      },
      {
        id: 'ventas' as FocoDash,
        prioridad: 'Contexto',
        tone: (k.montoVentasDia ? 'ink' : 'muted') as BadgeTone,
        value: formatearMoney(k.montoVentasDia),
        titulo: 'Facturado hoy',
        detalle:
          k.ventasDia === 0
            ? 'Sin comprobantes emitidos todavía'
            : k.ventasDia === 1
              ? '1 comprobante'
              : `${k.ventasDia} comprobantes`,
        accion: 'Abrir mostrador →',
        ruta: '/ventas',
        on: foco === 'ventas',
      },
    ];
  });

  protected readonly ventasHoyFmt = computed(() => formatearMoney(this.kpis().montoVentasDia));
  protected readonly ventasHoyHint = computed(() => {
    const n = this.kpis().ventasDia;
    if (n === 0) {
      return 'sin comprobantes emitidos todavía';
    }
    return n === 1 ? '1 comprobante' : `${n} comprobantes`;
  });
  protected readonly ventasHoyTone = computed((): BadgeTone =>
    this.kpis().montoVentasDia ? 'ink' : 'warn',
  );

  protected readonly semana = computed(() => {
    const serie = this.kpis().serieSemana;
    const max = Math.max(1, ...serie.map((d) => d.monto));
    return serie.map((d) => ({
      dia: d.esHoy ? 'hoy' : d.label.toLowerCase().slice(0, 3),
      monto: d.monto ? formatearCorto(d.monto) : '—',
      h: pctBar(d.monto, max),
      hoy: d.esHoy,
      vacio: d.monto <= 0,
    }));
  });

  protected readonly ventasKpis = computed(() => {
    const k = this.kpis();
    const prev = k.serieSemana.filter((d) => !d.esHoy);
    const avg = prev.length ? prev.reduce((n, d) => n + d.monto, 0) / prev.length : 0;
    const pres = this.presupuestos().filter(
      (p) => p.estado === 'vigente' || p.estado === 'borrador' || p.estado === 'aceptado',
    );
    const presMonto = pres.reduce((n, p) => n + p.total, 0);
    const caja = this.caja();
    const cajaTxt =
      caja?.estado === 'abierta' ? '1 turno' : caja?.estado === 'cerrada' ? 'cerrada' : 'sin abrir';
    const cajaHint =
      caja?.estado === 'abierta' && caja.abierta_en
        ? `desde ${new Date(caja.abierta_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
        : caja?.estado === 'cerrada'
          ? 'cerrá y abrí para el mostrador'
          : 'abrí caja para vender';
    return [
      {
        label: 'Promedio diario',
        value: avg ? formatearCorto(avg) : '—',
        hint: 'días previos de la semana',
        tone: 'ink' as BadgeTone,
      },
      {
        label: 'Mes en curso',
        value: formatearCorto(k.montoVentasMes),
        hint: k.ventasMes ? `${k.ventasMes} comprobantes` : 'sin movimiento',
        tone: (k.montoVentasMes ? 'ok' : 'muted') as BadgeTone,
      },
      {
        label: 'Presupuestos abiertos',
        value: pres.length ? `${pres.length} · ${formatearCorto(presMonto)}` : '0',
        hint: pres.length ? 'vigentes o en borrador' : 'ninguno abierto',
        tone: 'accent' as BadgeTone,
      },
      {
        label: 'Caja abierta',
        value: cajaTxt,
        hint: cajaHint,
        tone: 'ink' as BadgeTone,
      },
    ];
  });

  protected readonly repoSub = computed(() => {
    const k = this.kpis();
    return `${k.articulosBajoStock} bajo mínimo · ${k.articulosSinStock} en cero`;
  });
  protected readonly repoRows = computed(() =>
    this.kpis().reposicion.map((r) => {
      const cero = r.stock <= 0;
      const urgente = r.stock > 0 && r.stock <= 2;
      return {
        nom: r.nombre,
        sub: r.detalle || '—',
        stock: `${r.stock} u`,
        stockTone: (cero ? 'danger' : urgente ? 'warn' : 'ink') as BadgeTone,
        min: '—',
        sug: '—',
        dias: cero ? 'sin stock' : '—',
        diasTone: (cero ? 'danger' : 'muted') as BadgeTone,
        estado: cero ? 'Quiebre' : urgente ? 'Urgente' : 'Reponer',
        estTone: (cero ? 'danger' : urgente ? 'warn' : 'muted') as BadgeTone,
        alerta: cero,
      };
    }),
  );

  protected readonly remKpis = computed(() => {
    const items = this.remitosCompra();
    const validar = items.filter((r) => r.pendienteStock);
    const valorizado = validar.reduce((n, r) => n + r.total, 0);
    const ingresados = items.filter((r) => !r.pendienteStock);
    return [
      {
        value: String(validar.length),
        label: 'por validar en depósito',
        tone: (validar.length ? 'warn' : 'ok') as BadgeTone,
      },
      {
        value: valorizado ? formatearCorto(valorizado) : '$ 0',
        label: 'valorizado pendiente',
        tone: (valorizado ? 'danger' : 'muted') as BadgeTone,
      },
      {
        value: String(ingresados.length),
        label: 'ya ingresados',
        tone: 'ink' as BadgeTone,
      },
    ];
  });

  protected readonly remRows = computed(() =>
    this.remitosCompra()
      .slice(0, 8)
      .map((r) => {
        const dias = diasDesde(r.fecha);
        return {
          id: r.id,
          num: r.comprobante,
          prov: r.proveedor,
          sub:
            formatearFechaCorta(r.fecha) +
            ' · ' +
            (dias === 0 ? 'llegó hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`),
          lineas: String(r.renglones),
          total: formatearMoney(r.total),
          estado: r.pendienteStock
            ? 'Pendiente de validar'
            : r.estado === 'confirmado'
              ? 'Ingresado, sin factura'
              : r.estado === 'facturado'
                ? 'Facturado'
                : r.estado,
          estTone: (r.pendienteStock
            ? 'warn'
            : r.estado === 'confirmado'
              ? 'accent'
              : 'ok') as BadgeTone,
          alerta: r.pendienteStock && dias >= 3,
        };
      }),
  );

  protected readonly ccSub = 'cobrar y pagar';
  protected readonly vencidoFmt = computed(() => formatearMoney(this.kpis().saldoVencido));
  protected readonly ccTotalFmt = computed(() => formatearMoney(this.kpis().saldoCobrar));
  protected readonly pagarFmt = computed(() => formatearMoney(this.cxpTotal()));

  protected readonly tramos = computed(() => {
    const alDia = Math.max(0, this.kpis().saldoCobrar - this.kpis().saldoVencido);
    const venc = this.kpis().saldoVencido;
    const tot = alDia + venc || 1;
    return [
      { w: `${Math.round((alDia / tot) * 100)}%`, tone: 'ok' as const, on: alDia > 0 },
      { w: `${Math.round((venc / tot) * 100)}%`, tone: 'danger' as const, on: venc > 0 },
    ].filter((t) => t.on);
  });

  protected readonly ccRows = computed(() =>
    [...this.kpis().vencimientos]
      .sort((a, b) => b.monto - a.monto)
      .map((v) => {
        const mora = diasDesde(v.fecha);
        return {
          nom: v.cliente,
          sub: v.vencido
            ? mora > 60
              ? 'para gestión de cobro'
              : 'llamar hoy'
            : 'al día en el corte de 30 días',
          mora: mora ? `${mora} d` : '—',
          moraDias: mora,
          moraTone: (mora > 60 ? 'danger' : mora > 30 ? 'warn' : 'muted') as BadgeTone,
          vencido: v.vencido ? formatearMoney(v.monto) : '—',
          vencidoFlag: v.vencido,
          saldo: formatearMoney(v.monto),
          accion: 'Ver cuenta',
          alerta: mora > 60,
        };
      }),
  );

  private secundariosCargados = false;

  constructor() {
    this.store.cargar();
    afterNextRender(() => {
      const cargar = () => this.cargarDatosSecundarios();
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(cargar, { timeout: 1500 });
      } else {
        setTimeout(cargar, 150);
      }
    });
  }

  private cargarDatosSecundarios(): void {
    if (this.secundariosCargados) {
      return;
    }
    this.secundariosCargados = true;

    this.dashboardApi.listarRemitosCompra().subscribe({
      next: (items) => this.remitosCompra.set(items),
      error: () => this.remitosCompra.set([]),
    });
    this.cajaApi.saldo().subscribe({
      next: (s) => this.caja.set(s),
      error: () => this.caja.set(null),
    });
    this.comprasApi.listarSaldosCxp().subscribe({
      next: (map) => this.cxpTotal.set(Object.values(map).reduce((n, s) => n + Math.max(0, s), 0)),
      error: () => this.cxpTotal.set(0),
    });
    this.ventasApi.listar('presupuesto').subscribe({
      next: (items) => this.presupuestos.set(items),
      error: () => this.presupuestos.set([]),
    });
  }

  protected pickAccion(id: FocoDash, ruta: string): void {
    this.foco.set(id);
    void this.router.navigateByUrl(ruta);
  }

  protected irMostrador(): void {
    void this.router.navigate(['/ventas']);
  }

  protected irCompras(tab?: string): void {
    void this.router.navigate(['/compras'], tab ? { queryParams: { tab } } : {});
  }

  protected irCtaCte(): void {
    void this.router.navigate(['/cuenta-corriente']);
  }

  protected irStock(): void {
    if (this.auth.puedeRuta('inventario')) {
      void this.router.navigate(['/inventario']);
      return;
    }
    void this.router.navigate(['/productos']);
  }
}
