export type CampoMapeo =
  | 'codigo_producto'
  | 'descripcion'
  | 'precio_costo'
  | 'precio_lista'
  | 'marca'
  | 'rubro'
  | 'ignorar';

export type PoliticaPrecioVenta = 'solo_costo' | 'margen_fijo' | 'copiar_lista';

export interface MapeoColumna {
  columna: string;
  campo: CampoMapeo | string;
}

export interface ProveedorLista {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: string;
  observaciones: string;
  activo: boolean;
  mapeoExcel: MapeoColumna[];
  excelFilaInicio: number;
  politicaPrecioVenta: PoliticaPrecioVenta;
  margenVentaPct: number;
  ultimaImportacionFecha: string | null;
  ultimaImportacionArchivo: string;
  ultimaImportacionActualizados: number;
  ultimaImportacionNuevos: number;
  ultimaImportacionSinMatch: number;
}

export interface ImportarListaResultado {
  proveedorId: string;
  archivo: string;
  dryRun: boolean;
  actualizados: number;
  nuevos: number;
  sinMatch: number;
  omitidas: string[];
  sinMatchCodigos: string[];
  previewCols: string[];
  previewRows: string[][];
}

export interface CrearProveedorLista {
  nombre: string;
  cuit: string;
  observaciones: string;
  mapeoExcel: MapeoColumna[];
  excelFilaInicio: number;
  politicaPrecioVenta: PoliticaPrecioVenta;
  margenVentaPct: number;
}

export const CAMPOS_MAPEO_OPTS: { value: string; label: string }[] = [
  { value: 'codigo_producto', label: 'Código de producto' },
  { value: 'descripcion', label: 'Descripción' },
  { value: 'precio_costo', label: 'Precio de costo' },
  { value: 'precio_lista', label: 'Precio de lista' },
  { value: 'marca', label: 'Marca' },
  { value: 'rubro', label: 'Rubro' },
  { value: 'ignorar', label: '(ignorar columna)' },
];

export const COLUMNAS_EXCEL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function etiquetaCampo(campo: string): string {
  return CAMPOS_MAPEO_OPTS.find((c) => c.value === campo)?.label ?? campo;
}
