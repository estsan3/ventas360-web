/** Forma exacta de la API (`ClienteResponse` / página). */
export type CondicionIvaDto =
  'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export interface ClienteDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicion_iva: CondicionIvaDto;
  limite_credito: number;
  zona_id: string | null;
  vendedor_id: string | null;
  bloqueado: boolean;
  observaciones: string;
  activo: boolean;
}

export interface CrearClienteDto {
  nombre: string;
  email: string;
  telefono: string;
  cuit?: string;
  condicion_iva?: CondicionIvaDto;
  limite_credito?: number;
  zona_id?: string | null;
  vendedor_id?: string | null;
  bloqueado?: boolean;
  observaciones?: string;
}

export type ActualizarClienteDto = Partial<CrearClienteDto>;

export interface ClientesPaginaDto {
  items: ClienteDto[];
  total: number;
  page: number;
  page_size: number;
}
