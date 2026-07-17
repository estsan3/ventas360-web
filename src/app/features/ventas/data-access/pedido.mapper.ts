import { ClienteRefDto, CrearPedidoDto, PedidoDto, ProductoRefDto } from './pedido.dto';
import { ClienteRef, CrearPedido, Pedido, ProductoRef } from './pedido.model';

export function pedidoToModel(dto: PedidoDto): Pedido {
  return {
    id: dto.id,
    clienteId: dto.cliente_id,
    estado: dto.estado,
    total: dto.total,
    fecha: dto.fecha,
    lineas: dto.lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  };
}

export function crearPedidoToDto(model: CrearPedido): CrearPedidoDto {
  return {
    cliente_id: model.clienteId,
    fecha: model.fecha,
    lineas: model.lineas.map((l) => ({
      producto_id: l.productoId,
      cantidad: l.cantidad,
    })),
  };
}

export function clienteRefToModel(dto: ClienteRefDto): ClienteRef {
  return { id: dto.id, nombre: dto.nombre, activo: dto.activo };
}

export function productoRefToModel(dto: ProductoRefDto): ProductoRef {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    activo: dto.activo,
    precio: dto.precio,
  };
}
