import { CompraDto, CrearCompraDto } from './compra.dto';
import { Compra, CrearCompra } from './compra.model';

export function compraToModel(dto: CompraDto): Compra {
  return {
    id: dto.id,
    tipo: dto.tipo,
    proveedorId: dto.proveedor_id,
    estado: dto.estado,
    depositoId: dto.deposito_id,
    origenId: dto.origen_id,
    neto: dto.neto,
    iva: dto.iva,
    ivaPorcentaje: dto.iva_porcentaje,
    total: dto.total,
    numero: dto.numero,
    fecha: dto.fecha,
    lineas: dto.lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  };
}

export function crearCompraToDto(model: CrearCompra): CrearCompraDto {
  return {
    proveedor_id: model.proveedorId,
    tipo: model.tipo,
    deposito_id: model.depositoId,
    lineas: model.lineas.map((l) => ({
      producto_id: l.productoId,
      cantidad: l.cantidad,
      precio_unitario: l.precioUnitario,
    })),
  };
}
