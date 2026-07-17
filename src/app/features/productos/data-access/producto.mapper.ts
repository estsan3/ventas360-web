import {
  ActualizarProductoDto,
  CrearProductoDto,
  ProductoDto,
  ProductosPaginaDto,
} from './producto.dto';
import { ActualizarProducto, CrearProducto, Producto, ProductosPagina } from './producto.model';

export function productoToModel(dto: ProductoDto): Producto {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    marca: dto.marca,
    rubro: dto.rubro,
    codigoBarras: dto.codigo_barras,
    costo: dto.costo,
    precio: dto.precio,
    stock: dto.stock,
    activo: dto.activo,
  };
}

export function crearProductoToDto(model: CrearProducto): CrearProductoDto {
  return {
    sku: model.sku,
    nombre: model.nombre,
    marca: model.marca,
    rubro: model.rubro,
    codigo_barras: model.codigoBarras,
    costo: model.costo,
    precio: model.precio,
    stock: model.stock,
  };
}

export function actualizarProductoToDto(model: ActualizarProducto): ActualizarProductoDto {
  return {
    sku: model.sku,
    nombre: model.nombre,
    marca: model.marca,
    rubro: model.rubro,
    codigo_barras: model.codigoBarras,
    costo: model.costo,
    precio: model.precio,
    stock: model.stock,
    activo: model.activo,
  };
}

export function productosPaginaToModel(dto: ProductosPaginaDto): ProductosPagina {
  return {
    items: dto.items.map(productoToModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
  };
}
