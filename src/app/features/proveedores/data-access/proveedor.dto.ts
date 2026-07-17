export type CondicionIvaDto =
  'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export type PoliticaPrecioVentaDto = 'solo_costo' | 'margen_fijo' | 'copiar_lista';

export interface MapeoColumnaDto {
  columna: string;
  campo: string;
}

export interface ProveedorDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicion_iva: CondicionIvaDto;
  observaciones: string;
  activo: boolean;
  mapeo_excel?: MapeoColumnaDto[];
  excel_fila_inicio?: number;
  politica_precio_venta?: PoliticaPrecioVentaDto;
  margen_venta_pct?: number;
  ultima_importacion_fecha?: string | null;
  ultima_importacion_archivo?: string;
  ultima_importacion_actualizados?: number;
  ultima_importacion_nuevos?: number;
  ultima_importacion_sin_match?: number;
}

export interface CrearProveedorDto {
  nombre: string;
  email?: string;
  telefono?: string;
  cuit?: string;
  condicion_iva?: CondicionIvaDto;
  observaciones?: string;
  mapeo_excel?: MapeoColumnaDto[];
  excel_fila_inicio?: number;
  politica_precio_venta?: PoliticaPrecioVentaDto;
  margen_venta_pct?: number;
}

export type ActualizarProveedorDto = Partial<CrearProveedorDto>;

export interface ProveedoresPaginaDto {
  items: ProveedorDto[];
  total: number;
  page: number;
  page_size: number;
}
