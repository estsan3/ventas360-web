export type TipoComprobante = 'presupuesto' | 'pedido' | 'remito' | 'factura';

/** Estados según tipo (presupuesto tiene vigencia/aceptación; resto el flujo clásico). */
export type EstadoPedido =
  | 'borrador'
  | 'confirmado'
  | 'entregado'
  | 'facturado'
  | 'cancelado'
  | 'vigente'
  | 'aceptado'
  | 'vencido'
  | 'convertido';

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
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: string;
  limiteCredito: number;
  zonaId: string | null;
  vendedorId: string | null;
  bloqueado: boolean;
}

export interface SaldoClienteRef {
  clienteId: string;
  saldo: number;
  debeTotal: number;
  haberTotal: number;
}

export type MedioCobro = 'efectivo' | 'transferencia' | 'tarjeta';

export interface ReciboRef {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  medio: MedioCobro;
  observacion: string;
}

export interface RegistrarCobro {
  clienteId: string;
  monto: number;
  medio: MedioCobro;
  observacion?: string;
}

export interface ZonaRef {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface UsuarioRef {
  id: string;
  nombre: string;
  rol: string;
}

export interface ProductoRef {
  id: string;
  sku: string;
  nombre: string;
  activo: boolean;
  precio: number;
  /** Unidades disponibles (suma de depósitos). */
  stock: number;
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
  presupuesto: {
    borrador: ['vigente', 'cancelado'],
    vigente: ['aceptado', 'vencido', 'cancelado'],
    aceptado: ['convertido', 'cancelado'],
    vencido: ['vigente', 'cancelado'],
    convertido: [],
    cancelado: [],
    confirmado: [],
    entregado: [],
    facturado: [],
  },
  pedido: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: ['entregado', 'cancelado'],
    entregado: [],
    facturado: [],
    cancelado: [],
    vigente: [],
    aceptado: [],
    vencido: [],
    convertido: [],
  },
  remito: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: ['facturado', 'cancelado'],
    entregado: [],
    facturado: [],
    cancelado: [],
    vigente: [],
    aceptado: [],
    vencido: [],
    convertido: [],
  },
  factura: {
    borrador: ['confirmado', 'cancelado'],
    confirmado: [],
    entregado: [],
    facturado: [],
    cancelado: [],
    vigente: [],
    aceptado: [],
    vencido: [],
    convertido: [],
  },
};

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  facturado: 'Facturado',
  cancelado: 'Cancelado',
  vigente: 'Vigente',
  aceptado: 'Aceptado',
  vencido: 'Vencido',
  convertido: 'Convertido',
};

export const ETIQUETAS_TIPO: Record<TipoComprobante, string> = {
  presupuesto: 'Presupuesto',
  pedido: 'Pedido',
  remito: 'Remito',
  factura: 'Factura',
};
