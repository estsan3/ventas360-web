import {
  ClienteRefDto,
  CrearPedidoDto,
  DepositoRefDto,
  PedidoDto,
  ProductoRefDto,
} from './pedido.dto';
import { ClienteRef, CrearPedido, DepositoRef, Pedido, ProductoRef } from './pedido.model';

export function pedidoToModel(dto: PedidoDto): Pedido {
  return {
    id: dto.id,
    tipo: dto.tipo,
    clienteId: dto.cliente_id,
    estado: dto.estado,
    depositoId: dto.deposito_id,
    origenId: dto.origen_id,
    neto: dto.neto,
    iva: dto.iva,
    ivaPorcentaje: dto.iva_porcentaje,
    total: dto.total,
    cae: dto.cae,
    fecha: dto.fecha,
    lineas: dto.lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      descripcion: l.descripcion ?? '',
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  };
}

export function crearPedidoToDto(model: CrearPedido): CrearPedidoDto {
  return {
    cliente_id: model.clienteId,
    tipo: model.tipo,
    deposito_id: model.depositoId ?? null,
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

export function depositoRefToModel(dto: DepositoRefDto): DepositoRef {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    activo: dto.activo,
  };
}
