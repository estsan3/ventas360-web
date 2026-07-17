export interface SaldoClienteDto {
  cliente_id: string;
  saldo: number;
  debe_total: number;
  haber_total: number;
  fecha_ultimo_movimiento?: string | null;
  fecha_debe_mas_antigua?: string | null;
}

export interface MovimientoCxcDto {
  id: string;
  cliente_id: string;
  tipo: 'debe' | 'haber';
  monto: number;
  referencia_tipo: string;
  referencia_id: string;
  concepto: string;
  fecha: string;
}

export interface EstadoCuentaDto {
  cliente_id: string;
  saldo: number;
  movimientos: MovimientoCxcDto[];
}

export interface ImputacionReciboDto {
  id: string;
  factura_id: string;
  monto: number;
}

export interface ReciboDto {
  id: string;
  cliente_id: string;
  fecha: string;
  monto: number;
  medio: 'efectivo' | 'transferencia' | 'tarjeta';
  observacion: string;
  imputaciones: ImputacionReciboDto[];
}

export interface CrearReciboDto {
  cliente_id: string;
  monto: number;
  medio: 'efectivo' | 'transferencia' | 'tarjeta';
  observacion?: string;
  fecha?: string | null;
  imputaciones: { factura_id: string; monto: number }[];
}

export interface ClienteRefDto {
  id: string;
  nombre: string;
  activo: boolean;
  email?: string;
  telefono?: string;
  cuit?: string;
  condicion_iva?: string;
  limite_credito?: number;
  zona_id?: string | null;
  vendedor_id?: string | null;
  bloqueado?: boolean;
}

export interface ZonaRefDto {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface FacturaRefDto {
  id: string;
  tipo: string;
  cliente_id: string;
  estado: string;
  total: number;
  fecha: string;
}

export interface LineaComprobanteDto {
  id: string;
  producto_id: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ComprobanteCxcDto {
  id: string;
  tipo: 'remito' | 'factura' | string;
  cliente_id: string;
  estado: string;
  neto: number;
  iva: number;
  iva_porcentaje: number;
  total: number;
  numero: string | null;
  fecha: string;
  origen_id: string | null;
  lineas: LineaComprobanteDto[];
}

export interface ListaPrecioDto {
  id: string;
  codigo: string;
  nombre: string;
  es_default: boolean;
  activo: boolean;
}

export interface PrecioArticuloDto {
  id: string;
  lista_id: string;
  articulo_id: string;
  precio: number;
}

export interface PaginaItemsDto<T> {
  items: T[];
  total?: number;
  page?: number;
  page_size?: number;
}
