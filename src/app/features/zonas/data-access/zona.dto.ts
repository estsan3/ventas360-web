/** Forma exacta de la API (`ZonaResponse` / página). */
export interface ZonaDto {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface CrearZonaDto {
  nombre: string;
  codigo?: string;
}

export type ActualizarZonaDto = Partial<CrearZonaDto>;

export interface ZonasPaginaDto {
  items: ZonaDto[];
  total: number;
  page: number;
  page_size: number;
}
