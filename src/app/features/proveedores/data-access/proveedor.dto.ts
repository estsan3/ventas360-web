export type CondicionIvaDto =
  'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export interface ProveedorDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicion_iva: CondicionIvaDto;
  observaciones: string;
  activo: boolean;
}

export interface CrearProveedorDto {
  nombre: string;
  email?: string;
  telefono?: string;
  cuit?: string;
  condicion_iva?: CondicionIvaDto;
  observaciones?: string;
}

export interface ProveedoresPaginaDto {
  items: ProveedorDto[];
  total: number;
  page: number;
  page_size: number;
}
