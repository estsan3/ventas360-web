import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { DashboardStore } from './data-access/dashboard.store';

export interface BarraSemana {
  label: string;
  altura: number;
  tono: 'light' | 'mid' | 'today';
}

export interface ComprobanteDash {
  numero: string;
  cliente: string;
  total: string;
  estado: string;
  badge: 'success' | 'warning' | 'neutral';
}

export interface StockUrgente {
  nombre: string;
  detalle: string;
  stock: string;
  tono: 'danger' | 'warning';
}

export interface VencimientoDash {
  cliente: string;
  fecha: string;
  monto: string;
  vencido: boolean;
}

/** Contenido del mock DC — distribución y copy 1:1. */
const BARRAS: BarraSemana[] = [
  { label: 'Sáb', altura: 52, tono: 'light' },
  { label: 'Dom', altura: 30, tono: 'light' },
  { label: 'Lun', altura: 66, tono: 'mid' },
  { label: 'Mar', altura: 58, tono: 'mid' },
  { label: 'Mié', altura: 74, tono: 'mid' },
  { label: 'Jue', altura: 62, tono: 'mid' },
  { label: 'Hoy', altura: 88, tono: 'today' },
];

const COMPROBANTES: ComprobanteDash[] = [
  {
    numero: 'FAC A 0003-00014582',
    cliente: 'Constructora Delta SRL',
    total: '$ 148.900,00',
    estado: 'Cobrada',
    badge: 'success',
  },
  {
    numero: 'FAC B 0003-00014581',
    cliente: 'Rodríguez, Aníbal',
    total: '$ 23.450,00',
    estado: 'Cobrada',
    badge: 'success',
  },
  {
    numero: 'FAC A 0003-00014580',
    cliente: 'Agropecuaria El Ceibo',
    total: '$ 86.200,00',
    estado: 'Cta. cte.',
    badge: 'warning',
  },
  {
    numero: 'REM 0002-00003401',
    cliente: 'Constructora Delta SRL',
    total: '$ 61.780,00',
    estado: 'Remito',
    badge: 'neutral',
  },
  {
    numero: 'FAC B 0003-00014579',
    cliente: 'Pintado Fácil (M. Suárez)',
    total: '$ 12.300,00',
    estado: 'Cobrada',
    badge: 'success',
  },
];

const STOCK_URGENTE: StockUrgente[] = [
  { nombre: 'Disco corte 115mm', detalle: 'DIS-115 · Tyrolit', stock: '0 un.', tono: 'danger' },
  { nombre: 'Guante nitrilo T9', detalle: 'GUA-N09 · Libus', stock: '0 un.', tono: 'danger' },
  {
    nombre: 'Tornillo fix 8×50 ×100',
    detalle: 'TOR-850 · Fischer',
    stock: '4 un.',
    tono: 'warning',
  },
  { nombre: 'Cinta papel 24mm', detalle: 'CIN-P24 · Doble A', stock: '6 un.', tono: 'warning' },
];

const VENCIMIENTOS: VencimientoDash[] = [
  { cliente: 'Corralón Mitre SA', fecha: 'Venció el 10/07', monto: '$ 187.400', vencido: true },
  {
    cliente: 'Agropecuaria El Ceibo',
    fecha: 'Vence el 21/07',
    monto: '$ 96.800',
    vencido: false,
  },
  {
    cliente: 'Constructora Delta SRL',
    fecha: 'Vence el 28/07',
    monto: '$ 148.900',
    vencido: false,
  },
];

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly barras = BARRAS;
  protected readonly comprobantes = COMPROBANTES;
  protected readonly stockUrgente = STOCK_URGENTE;
  protected readonly vencimientos = VENCIMIENTOS;

  protected readonly saludo = computed(() => {
    const nombre = this.auth.user()?.nombre?.trim() ?? 'Marcos';
    return nombre.split(/\s+/)[0] || 'Marcos';
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

  /** KPIs del mock; si la API responde, mezcla ventas/pedidos reales. */
  protected readonly kpisVista = computed(() => {
    const k = this.store.kpis().data;
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      })
        .format(n)
        .replace(/\u00a0/g, ' ');

    return {
      ventasHoy: k ? fmt(k.montoVentasDia) : '$ 486.320',
      ventasHoyFoot: k
        ? `▲ 12% vs. ayer · ${k.ventasDia} comprobantes`
        : '▲ 12% vs. ayer · 23 comprobantes',
      pedidos: k ? String(k.pedidosPendientes) : '14',
      pedidosFoot: '5 para entregar hoy',
      saldoCobrar: '$ 1.284.900',
      saldoFoot: '$ 312.400 vencido',
      bajoStock: '9 artículos',
      bajoStockFoot: '2 sin stock',
      totalSemana: k ? fmt(k.montoVentasMes) : '$ 2.914.200',
    };
  });

  constructor() {
    this.store.cargar();
  }

  protected irAFacturacion(): void {
    this.router.navigate(['/ventas']);
  }

  protected irAVentas(): void {
    this.router.navigate(['/ventas']);
  }

  protected irAArticulos(): void {
    this.router.navigate(['/productos']);
  }

  protected irACtacte(): void {
    this.router.navigate(['/cuenta-corriente']);
  }
}
