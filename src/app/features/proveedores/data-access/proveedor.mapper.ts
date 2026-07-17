import { CrearProveedorDto, ProveedorDto } from './proveedor.dto';
import { CrearProveedor, Proveedor } from './proveedor.model';

export function proveedorToModel(dto: ProveedorDto): Proveedor {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    cuit: dto.cuit,
    condicionIva: dto.condicion_iva,
    observaciones: dto.observaciones,
    activo: dto.activo,
  };
}

export function crearProveedorToDto(model: CrearProveedor): CrearProveedorDto {
  return {
    nombre: model.nombre,
    email: model.email,
    telefono: model.telefono,
    cuit: model.cuit,
    condicion_iva: model.condicionIva,
    observaciones: model.observaciones,
  };
}
