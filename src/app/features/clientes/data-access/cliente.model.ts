/** Modelo de dominio del front. */
export type CondicionIva = 'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: CondicionIva;
  limiteCredito: number;
  zonaId: string | null;
  vendedorId: string | null;
  bloqueado: boolean;
  observaciones: string;
  activo: boolean;
}

export interface CrearCliente {
  nombre: string;
  email: string;
  telefono: string;
  cuit?: string;
  condicionIva?: CondicionIva;
  limiteCredito?: number;
  zonaId?: string | null;
  vendedorId?: string | null;
  bloqueado?: boolean;
  observaciones?: string;
}

export type ActualizarCliente = Partial<CrearCliente>;

export type FiltroActivo = 'activos' | 'inactivos' | 'todos';

export interface ClientesPagina {
  items: Cliente[];
  total: number;
  page: number;
  pageSize: number;
}
