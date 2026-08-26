import {
  CrearTenantDto,
  TenantCreadoDto,
  TenantDetalleDto,
  TenantDto,
  TenantUsuarioDto,
} from './comercio.dto';
import {
  Comercio,
  ComercioCreado,
  ComercioDetalle,
  NuevoComercio,
  UsuarioComercio,
} from './comercio.model';

export function comercioToModel(dto: TenantDto): Comercio {
  return {
    id: dto.id,
    slug: dto.slug,
    nombre: dto.nombre,
    activo: dto.activo,
    adminNombre: dto.admin_nombre ?? null,
    adminEmail: dto.admin_email ?? null,
    adminDni: dto.admin_dni ?? null,
  };
}

export function usuarioComercioToModel(dto: TenantUsuarioDto): UsuarioComercio {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    dni: dto.dni,
    rol: dto.rol,
  };
}

export function comercioDetalleToModel(dto: TenantDetalleDto): ComercioDetalle {
  return {
    ...comercioToModel(dto),
    usuarios: (dto.usuarios ?? []).map(usuarioComercioToModel),
  };
}

export function comercioCreadoToModel(dto: TenantCreadoDto): ComercioCreado {
  return {
    ...comercioToModel({
      ...dto,
      admin_nombre: dto.administrador?.nombre ?? dto.admin_nombre,
      admin_email: dto.administrador?.email ?? dto.admin_email,
      admin_dni: dto.admin_dni ?? null,
    }),
    administrador: dto.administrador,
  };
}

export function nuevoComercioToDto(model: NuevoComercio): CrearTenantDto {
  return {
    nombre: model.nombre,
    slug: model.slug,
    administrador: {
      nombre: model.adminNombre,
      dni: model.adminDni,
      email: model.adminEmail,
      password: model.adminPassword,
    },
  };
}
