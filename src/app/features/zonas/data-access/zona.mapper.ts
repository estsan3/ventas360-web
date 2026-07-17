import { ActualizarZonaDto, CrearZonaDto, ZonaDto, ZonasPaginaDto } from './zona.dto';
import { ActualizarZona, CrearZona, Zona, ZonasPagina } from './zona.model';

export function zonaToModel(dto: ZonaDto): Zona {
  return {
    id: dto.id,
    nombre: dto.nombre,
    codigo: dto.codigo,
    activo: dto.activo,
  };
}

export function crearZonaToDto(model: CrearZona): CrearZonaDto {
  return {
    nombre: model.nombre,
    codigo: model.codigo,
  };
}

export function actualizarZonaToDto(model: ActualizarZona): ActualizarZonaDto {
  return {
    nombre: model.nombre,
    codigo: model.codigo,
  };
}

export function zonasPaginaToModel(dto: ZonasPaginaDto): ZonasPagina {
  return {
    items: dto.items.map(zonaToModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
  };
}
