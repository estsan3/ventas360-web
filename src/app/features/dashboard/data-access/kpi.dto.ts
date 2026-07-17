export interface ArticuloTopDto {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  monto: number;
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
}
