export interface ArticuloTop {
  productoId: string;
  descripcion: string;
  cantidad: number;
  monto: number;
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
}
