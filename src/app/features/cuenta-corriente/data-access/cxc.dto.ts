export interface SaldoClienteDto {
  cliente_id: string;
  saldo: number;
  debe_total: number;
  haber_total: number;
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
}

export interface FacturaRefDto {
  id: string;
  tipo: string;
  cliente_id: string;
  estado: string;
  total: number;
  fecha: string;
}

export interface PaginaItemsDto<T> {
  items: T[];
}
