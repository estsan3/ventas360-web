/** Modelo de dominio del front. */
export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
}

export interface CrearCliente {
  nombre: string;
  email: string;
  telefono: string;
}

export type ActualizarCliente = Partial<CrearCliente>;

export type FiltroActivo = 'activos' | 'inactivos' | 'todos';
