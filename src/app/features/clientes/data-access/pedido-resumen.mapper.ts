import { PedidoResumenDto } from './pedido-resumen.dto';
import { PedidoResumen } from './pedido-resumen.model';

export function pedidoResumenToModel(dto: PedidoResumenDto): PedidoResumen {
  return {
    id: dto.id,
    clienteId: dto.cliente_id,
    estado: dto.estado,
    total: dto.total,
    fecha: dto.fecha,
    lineasCount: Array.isArray(dto.lineas) ? dto.lineas.length : 0,
  };
}
