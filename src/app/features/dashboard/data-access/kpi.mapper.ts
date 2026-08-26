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
    topArticulos: (dto.top_articulos ?? []).map((a) => ({
      productoId: a.producto_id,
      descripcion: a.descripcion,
      cantidad: a.cantidad,
      monto: a.monto,
    })),
    saldoCobrar: dto.saldo_cobrar ?? 0,
    saldoVencido: dto.saldo_vencido ?? 0,
    articulosBajoStock: dto.articulos_bajo_stock ?? 0,
    articulosSinStock: dto.articulos_sin_stock ?? 0,
    serieSemana: (dto.serie_semana ?? []).map((p) => ({
      fecha: p.fecha,
      label: p.label,
      monto: p.monto,
      cantidad: p.cantidad,
      esHoy: p.es_hoy,
    })),
    ultimosComprobantes: (dto.ultimos_comprobantes ?? []).map((c) => ({
      id: c.id,
      numero: c.numero,
      cliente: c.cliente,
      total: c.total,
      estado: c.estado,
      tipo: c.tipo,
    })),
    reposicion: (dto.reposicion ?? []).map((a) => ({
      nombre: a.nombre,
      detalle: a.detalle,
      stock: a.stock,
    })),
    vencimientos: (dto.vencimientos ?? []).map((v) => ({
      cliente: v.cliente,
      fecha: v.fecha,
      monto: v.monto,
      vencido: v.vencido,
    })),
  };
}
