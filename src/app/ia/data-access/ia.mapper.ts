import {
  AccionesDiaResponseDto,
  InterpretarMostradorResponseDto,
  ResumenDiaResponseDto,
} from './ia.dto';
import { AccionesDia, InterpretarMostradorResultado, ResumenDia } from './ia.model';

export function interpretarMostradorToModel(
  dto: InterpretarMostradorResponseDto,
): InterpretarMostradorResultado {
  return {
    intencion: dto.intencion,
    tipo: dto.tipo,
    clienteId: dto.cliente_id,
    clienteNombre: dto.cliente_nombre,
    depositoId: dto.deposito_id,
    lineas: dto.lineas.map((l) => ({
      productoId: l.producto_id,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
      productoNombre: l.producto_nombre,
      productoSku: l.producto_sku,
      matchTipo: l.match_tipo,
    })),
    confianza: dto.confianza,
    advertencias: dto.advertencias ?? [],
    preguntas: dto.preguntas ?? [],
    modoParser: dto.modo_parser,
  };
}

export function accionesDiaToModel(dto: AccionesDiaResponseDto): AccionesDia {
  return {
    generadoEn: dto.generado_en,
    acciones: dto.acciones.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      prioridad: a.prioridad,
      titulo: a.titulo,
      detalle: a.detalle,
      cantidad: a.cantidad,
      monto: a.monto,
      rutaWeb: a.ruta_web,
    })),
  };
}

export function resumenDiaToModel(dto: ResumenDiaResponseDto): ResumenDia {
  return {
    metricas: {
      ventasDia: dto.metricas.ventas_dia,
      montoVentasDia: dto.metricas.monto_ventas_dia,
      pedidosPendientes: dto.metricas.pedidos_pendientes,
      remitosPorFacturar: dto.metricas.remitos_por_facturar,
      saldoCobrar: dto.metricas.saldo_cobrar,
      saldoVencido: dto.metricas.saldo_vencido,
      articulosBajoStock: dto.metricas.articulos_bajo_stock,
      articulosSinStock: dto.metricas.articulos_sin_stock,
      moneda: dto.metricas.moneda,
    },
    narrativa: dto.narrativa,
    modoNarrativa: dto.modo_narrativa,
    accionesDestacadas: dto.acciones_destacadas ?? [],
    acciones: (dto.acciones ?? []).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      prioridad: a.prioridad,
      titulo: a.titulo,
      detalle: a.detalle,
      cantidad: a.cantidad,
      monto: a.monto,
      rutaWeb: a.ruta_web,
    })),
    generadoEn: dto.generado_en ?? null,
  };
}
