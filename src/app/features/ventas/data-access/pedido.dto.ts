export type EstadoPedidoDto = 'borrador' | 'confirmado' | 'entregado' | 'cancelado';

export interface LineaPedidoDto {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface PedidoDto {
  id: string;
  cliente_id: string;
  estado: EstadoPedidoDto;
  total: number;
  fecha: string;
  lineas: LineaPedidoDto[];
}

export interface CrearLineaPedidoDto {
  producto_id: string;
  cantidad: number;
}

export interface CrearPedidoDto {
  cliente_id: string;
  fecha?: string | null;
  lineas: CrearLineaPedidoDto[];
}

/** Lookups propios del feature (no importar data-access de otros features). */
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
