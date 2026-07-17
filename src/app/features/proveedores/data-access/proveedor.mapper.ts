import { ActualizarProveedorDto, CrearProveedorDto, ProveedorDto } from './proveedor.dto';
import { ActualizarProveedor, CrearProveedor, Proveedor } from './proveedor.model';

const MAPEO_DEFAULT = [
  { columna: 'A', campo: 'codigo_producto' },
  { columna: 'B', campo: 'descripcion' },
  { columna: 'C', campo: 'precio_costo' },
];

export function proveedorToModel(dto: ProveedorDto): Proveedor {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    cuit: dto.cuit,
    condicionIva: dto.condicion_iva,
    observaciones: dto.observaciones,
    activo: dto.activo,
    mapeoExcel: dto.mapeo_excel?.length ? dto.mapeo_excel : MAPEO_DEFAULT,
    excelFilaInicio: dto.excel_fila_inicio ?? 2,
    politicaPrecioVenta: dto.politica_precio_venta ?? 'solo_costo',
    margenVentaPct: dto.margen_venta_pct ?? 30,
    ultimaImportacionFecha: dto.ultima_importacion_fecha ?? null,
    ultimaImportacionArchivo: dto.ultima_importacion_archivo ?? '',
    ultimaImportacionActualizados: dto.ultima_importacion_actualizados ?? 0,
    ultimaImportacionNuevos: dto.ultima_importacion_nuevos ?? 0,
    ultimaImportacionSinMatch: dto.ultima_importacion_sin_match ?? 0,
  };
}

export function crearProveedorToDto(model: CrearProveedor): CrearProveedorDto {
  return {
    nombre: model.nombre,
    email: model.email,
    telefono: model.telefono,
    cuit: model.cuit,
    condicion_iva: model.condicionIva,
    observaciones: model.observaciones,
    mapeo_excel: model.mapeoExcel,
    excel_fila_inicio: model.excelFilaInicio,
    politica_precio_venta: model.politicaPrecioVenta,
    margen_venta_pct: model.margenVentaPct,
  };
}

export function actualizarProveedorToDto(model: ActualizarProveedor): ActualizarProveedorDto {
  return {
    nombre: model.nombre,
    email: model.email,
    telefono: model.telefono,
    cuit: model.cuit,
    condicion_iva: model.condicionIva,
    observaciones: model.observaciones,
    mapeo_excel: model.mapeoExcel,
    excel_fila_inicio: model.excelFilaInicio,
    politica_precio_venta: model.politicaPrecioVenta,
    margen_venta_pct: model.margenVentaPct,
  };
}
