/** Modelo de dominio del front. */
export interface Zona {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface CrearZona {
  nombre: string;
  codigo?: string;
}

export type ActualizarZona = Partial<CrearZona>;

export type FiltroActivoZona = 'activos' | 'inactivos' | 'todos';

export interface ZonasPagina {
  items: Zona[];
  total: number;
  page: number;
  pageSize: number;
}
