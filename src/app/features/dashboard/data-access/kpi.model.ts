export interface ArticuloTop {
  productoId: string;
  descripcion: string;
  cantidad: number;
  monto: number;
}

export interface PuntoSerie {
  fecha: string;
  label: string;
  monto: number;
  cantidad: number;
  esHoy: boolean;
}

export interface ComprobanteDash {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  estado: string;
  tipo: string;
}

export interface ArticuloStockDash {
  nombre: string;
  detalle: string;
  stock: number;
}

export interface VencimientoDash {
  cliente: string;
  fecha: string | null;
  monto: number;
  vencido: boolean;
}

export interface Kpis {
  clientesActivos: number;
  productosActivos: number;
  ventasDia: number;
  montoVentasDia: number;
  ventasMes: number;
  montoVentasMes: number;
  ticketPromedio: number;
  pedidosPendientes: number;
  remitosPendientes: number;
  remitosPorFacturar: number;
  moneda: string;
  topArticulos: ArticuloTop[];
  saldoCobrar: number;
  saldoVencido: number;
  articulosBajoStock: number;
  articulosSinStock: number;
  serieSemana: PuntoSerie[];
  ultimosComprobantes: ComprobanteDash[];
  reposicion: ArticuloStockDash[];
  vencimientos: VencimientoDash[];
}

export const KPIS_VACIOS: Kpis = {
  clientesActivos: 0,
  productosActivos: 0,
  ventasDia: 0,
  montoVentasDia: 0,
  ventasMes: 0,
  montoVentasMes: 0,
  ticketPromedio: 0,
  pedidosPendientes: 0,
  remitosPendientes: 0,
  remitosPorFacturar: 0,
  moneda: 'ARS',
  topArticulos: [],
  saldoCobrar: 0,
  saldoVencido: 0,
  articulosBajoStock: 0,
  articulosSinStock: 0,
  serieSemana: [],
  ultimosComprobantes: [],
  reposicion: [],
  vencimientos: [],
};
