export type TipoComprobante = 'pedido' | 'remito' | 'factura';
export type EstadoPedido = 'borrador' | 'confirmado' | 'entregado' | 'facturado' | 'cancelado';

export interface LineaPedido {
  id: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  tipo: TipoComprobante;
  clienteId: string;
  estado: EstadoPedido;
  depositoId: string | null;
  origenId: string | null;
  neto: number;
  iva: number;
  ivaPorcentaje: number;
  total: number;
  cae: string | null;
  fecha: string;
  lineas: LineaPedido[];
}

export interface CrearLineaPedido {
  productoId: string;
  cantidad: number;
}

export interface CrearPedido {
  clienteId: string;
  tipo: TipoComprobante;
  depositoId?: string | null;
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

export interface DepositoRef {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export type FiltroEstado = 'todos' | EstadoPedido;
export type FiltroTipo = 'todos' | TipoComprobante;

export const TRANSICIONES: Record<TipoComprobante, Record<EstadoPedido, EstadoPedido[]>> = {
  pedido: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: ['entregado', 'cancelado'],
    entregado: [],
    facturado: [],
    cancelado: [],
  },
  remito: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: ['facturado', 'cancelado'],
    entregado: [],
    facturado: [],
    cancelado: [],
  },
  factura: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: [],
    entregado: [],
    facturado: [],
    cancelado: [],
  },
};

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  facturado: 'Facturado',
  cancelado: 'Cancelado',
};

export const ETIQUETAS_TIPO: Record<TipoComprobante, string> = {
  pedido: 'Pedido',
  remito: 'Remito',
  factura: 'Factura',
};
