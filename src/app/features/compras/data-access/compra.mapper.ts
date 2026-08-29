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
    fechaEntrega: dto.fecha_entrega ?? null,
    observaciones: dto.observaciones ?? '',
    cantidadPedida: dto.cantidad_pedida ?? 0,
    cantidadRecibida: dto.cantidad_recibida ?? 0,
    lineas: dto.lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id ?? '',
      codigoProveedor: l.codigo_proveedor ?? '',
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  };
}

export function crearCompraToDto(model: CrearCompra): CrearCompraDto {
  const dto: CrearCompraDto = {
    proveedor_id: model.proveedorId,
    tipo: model.tipo,
    deposito_id: model.depositoId,
    lineas: model.lineas.map((l) => {
      const linea: CrearCompraDto['lineas'][number] = { cantidad: l.cantidad };
      if (l.productoId) {
        linea.producto_id = l.productoId;
      }
      if (l.codigoProveedor) {
        linea.codigo_proveedor = l.codigoProveedor;
      }
      if (l.precioUnitario !== undefined) {
        linea.precio_unitario = l.precioUnitario;
      }
      return linea;
    }),
  };
  if (model.origenId) {
    dto.origen_id = model.origenId;
  }
  return dto;
}
