export type CondicionIva = 'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export type PoliticaPrecioVenta = 'solo_costo' | 'margen_fijo' | 'copiar_lista';

export interface MapeoColumna {
  columna: string;
  campo: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: CondicionIva;
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

export interface CrearProveedor {
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: CondicionIva;
  observaciones: string;
  mapeoExcel?: MapeoColumna[];
  excelFilaInicio?: number;
  politicaPrecioVenta?: PoliticaPrecioVenta;
  margenVentaPct?: number;
}

export type ActualizarProveedor = Partial<CrearProveedor>;
