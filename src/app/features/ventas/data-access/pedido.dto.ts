export type TipoComprobanteDto = 'pedido' | 'remito' | 'factura';
export type EstadoPedidoDto = 'borrador' | 'confirmado' | 'entregado' | 'facturado' | 'cancelado';

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
}

export interface ProductoRefDto {
  id: string;
  sku: string;
  nombre: string;
  activo: boolean;
  precio: number;
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
