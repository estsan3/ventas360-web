export interface TenantDto {
  id: string;
  slug: string;
  nombre: string;
  activo: boolean;
  admin_nombre?: string | null;
  admin_email?: string | null;
  admin_dni?: string | null;
}

export interface TenantUsuarioDto {
  id: string;
  nombre: string;
  email: string;
  dni: string;
  rol: string;
}

export interface TenantDetalleDto extends TenantDto {
  usuarios: TenantUsuarioDto[];
}

export interface AdministradorCreadoDto {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface TenantCreadoDto extends TenantDto {
  administrador: AdministradorCreadoDto;
}

export interface CrearTenantDto {
  nombre: string;
  slug: string;
  administrador: {
    nombre: string;
    dni: string;
    email: string;
    password: string;
  };
}
