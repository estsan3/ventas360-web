export interface ArticuloTopDto {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  monto: number;
}

export interface PuntoSerieDto {
  fecha: string;
  label: string;
  monto: number;
  cantidad: number;
  es_hoy: boolean;
}

export interface ComprobanteDashDto {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  estado: string;
  tipo: string;
}

export interface ArticuloStockDashDto {
  nombre: string;
  detalle: string;
  stock: number;
}

export interface VencimientoDashDto {
  cliente: string;
  fecha: string | null;
  monto: number;
  vencido: boolean;
}

export interface KpisDto {
  clientes_activos: number;
  productos_activos: number;
  ventas_dia: number;
  monto_ventas_dia: number;
  ventas_mes: number;
  monto_ventas_mes: number;
  ticket_promedio: number;
  pedidos_pendientes: number;
  remitos_pendientes: number;
  remitos_por_facturar: number;
  moneda: string;
  top_articulos: ArticuloTopDto[];
  saldo_cobrar?: number;
  saldo_vencido?: number;
  articulos_bajo_stock?: number;
  articulos_sin_stock?: number;
  serie_semana?: PuntoSerieDto[];
  ultimos_comprobantes?: ComprobanteDashDto[];
  reposicion?: ArticuloStockDashDto[];
  vencimientos?: VencimientoDashDto[];
}
