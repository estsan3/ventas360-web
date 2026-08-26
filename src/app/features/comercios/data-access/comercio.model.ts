export interface Comercio {
  id: string;
  slug: string;
  nombre: string;
  activo: boolean;
  adminNombre: string | null;
  adminEmail: string | null;
  adminDni: string | null;
}

export interface UsuarioComercio {
  id: string;
  nombre: string;
  email: string;
  dni: string;
  rol: string;
}

export interface ComercioDetalle extends Comercio {
  usuarios: UsuarioComercio[];
}

export interface ComercioCreado extends Comercio {
  administrador: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface NuevoComercio {
  nombre: string;
  slug: string;
  adminNombre: string;
  adminDni: string;
  adminEmail: string;
  adminPassword: string;
}
