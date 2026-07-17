export interface MapeoColumnaDto {
  columna: string;
  campo: string;
}

export interface ImportarListaDto {
  proveedor_id: string;
  archivo: string;
  dry_run: boolean;
  actualizados: number;
  nuevos: number;
  sin_match: number;
  omitidas: string[];
  sin_match_codigos: string[];
  preview_cols: string[];
  preview_rows: string[][];
}

export interface ProveedorListaDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicion_iva: string;
  observaciones: string;
  activo: boolean;
  mapeo_excel: MapeoColumnaDto[];
  excel_fila_inicio: number;
  politica_precio_venta: 'solo_costo' | 'margen_fijo' | 'copiar_lista';
  margen_venta_pct: number;
  ultima_importacion_fecha: string | null;
  ultima_importacion_archivo: string;
  ultima_importacion_actualizados: number;
  ultima_importacion_nuevos: number;
  ultima_importacion_sin_match: number;
}
