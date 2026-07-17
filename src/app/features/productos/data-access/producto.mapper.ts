import { ActualizarProductoDto, CrearProductoDto, ProductoDto } from './producto.dto';
import { ActualizarProducto, CrearProducto, Producto } from './producto.model';

export function productoToModel(dto: ProductoDto): Producto {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    precio: dto.precio,
    stock: dto.stock,
    activo: dto.activo,
  };
}

export function crearProductoToDto(model: CrearProducto): CrearProductoDto {
  return { ...model };
}

export function actualizarProductoToDto(model: ActualizarProducto): ActualizarProductoDto {
  return { ...model };
}
