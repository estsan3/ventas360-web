export type TipoComprobanteDto = 'presupuesto' | 'pedido' | 'remito' | 'factura';
export type EstadoPedidoDto =
  | 'borrador'
  | 'confirmado'
  | 'entregado'
  | 'facturado'
  | 'cancelado'
  | 'vigente'
  | 'aceptado'
  | 'vencido'
  | 'convertido';

export interface LineaPedidoDto {
  id: string;
  producto_id: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
}

export interface PedidoDto {
  id: string;
  tipo: TipoComprobanteDto;
  cliente_id: string;
  estado: EstadoPedidoDto;
  deposito_id: string | null;
  origen_id: string | null;
  neto: number;
  iva: number;
  iva_porcentaje: number;
  total: number;
  cae: string | null;
  fecha: string;
  lineas: LineaPedidoDto[];
}

export interface CrearLineaPedidoDto {
  producto_id: string;
  cantidad: number;
}

export interface CrearPedidoDto {
  cliente_id: string;
  tipo?: TipoComprobanteDto;
  deposito_id?: string | null;
  fecha?: string | null;
  lineas: CrearLineaPedidoDto[];
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

export interface ReciboDto {
  id: string;
  cliente_id: string;
  fecha: string;
  monto: number;
  medio: 'efectivo' | 'transferencia' | 'tarjeta';
  observacion: string;
}

export interface ZonaRefDto {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface UsuarioRefDto {
  id: string;
  nombre: string;
  rol: string;
}

export interface ProductoRefDto {
  id: string;
  sku: string;
  nombre: string;
  activo: boolean;
  precio: number;
  stock?: number;
}

export interface DepositoRefDto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface PaginaItemsDto<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
