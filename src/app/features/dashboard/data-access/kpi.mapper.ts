import { KpisDto } from './kpi.dto';
import { Kpis } from './kpi.model';

export function kpisToModel(dto: KpisDto): Kpis {
  return {
    clientesActivos: dto.clientes_activos,
    productosActivos: dto.productos_activos,
    ventasDia: dto.ventas_dia,
    montoVentasDia: dto.monto_ventas_dia,
    ventasMes: dto.ventas_mes,
    montoVentasMes: dto.monto_ventas_mes,
    ticketPromedio: dto.ticket_promedio,
    pedidosPendientes: dto.pedidos_pendientes,
    remitosPendientes: dto.remitos_pendientes,
    remitosPorFacturar: dto.remitos_por_facturar,
    moneda: dto.moneda,
    topArticulos: dto.top_articulos.map((a) => ({
      productoId: a.producto_id,
      descripcion: a.descripcion,
      cantidad: a.cantidad,
      monto: a.monto,
    })),
  };
}
