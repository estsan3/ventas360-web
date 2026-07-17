export type EstadoPedido = 'borrador' | 'confirmado' | 'entregado' | 'cancelado';

export interface LineaPedido {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  estado: EstadoPedido;
  total: number;
  fecha: string;
  lineas: LineaPedido[];
}

export interface CrearLineaPedido {
  productoId: string;
  cantidad: number;
}

export interface CrearPedido {
  clienteId: string;
  fecha?: string | null;
  lineas: CrearLineaPedido[];
}

export interface ClienteRef {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ProductoRef {
  id: string;
  sku: string;
  nombre: string;
  activo: boolean;
  precio: number;
}

export type FiltroEstado = 'todos' | EstadoPedido;

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
