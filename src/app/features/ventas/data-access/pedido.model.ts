/** DTOs alineados con la API de ventas. */

export type EstadoPedido = 'borrador' | 'confirmado' | 'entregado' | 'cancelado';

export interface LineaPedido {
  id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  estado: EstadoPedido;
  total: number;
  fecha: string;
  lineas: LineaPedido[];
}

export interface CrearLineaPedido {
  producto_id: string;
  cantidad: number;
}

export interface CrearPedido {
  cliente_id: string;
  fecha?: string | null;
  lineas: CrearLineaPedido[];
}

export type FiltroEstado = 'todos' | EstadoPedido;

/** Transiciones válidas según la BO del backend. */
export const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  borrador: ['confirmado', 'cancelado'],
  confirmado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
