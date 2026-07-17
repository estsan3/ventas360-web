export interface SaldoCliente {
  clienteId: string;
  saldo: number;
  debeTotal: number;
  haberTotal: number;
  fechaUltimoMovimiento: string | null;
  fechaDebeMasAntigua: string | null;
}

export interface MovimientoCxc {
  id: string;
  clienteId: string;
  tipo: 'debe' | 'haber';
  monto: number;
  referenciaTipo: string;
  referenciaId: string;
  concepto: string;
  fecha: string;
}

export interface EstadoCuenta {
  clienteId: string;
  saldo: number;
  movimientos: MovimientoCxc[];
}

export type MedioCobro = 'efectivo' | 'transferencia' | 'tarjeta';

export interface Recibo {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  medio: MedioCobro;
  observacion: string;
}

export interface ImputacionCobro {
  facturaId: string;
  monto: number;
}

export interface CrearRecibo {
  clienteId: string;
  monto: number;
  medio: MedioCobro;
  observacion?: string;
  imputaciones: ImputacionCobro[];
}

export interface RegistrarCobro {
  clienteId: string;
  monto: number;
  medio: MedioCobro;
  observacion?: string;
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

export interface ZonaRef {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface FacturaRef {
  id: string;
  total: number;
  fecha: string;
  estado: string;
}

export interface LineaComprobante {
  id: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ComprobanteCxc {
  id: string;
  tipo: 'remito' | 'factura';
  clienteId: string;
  estado: string;
  neto: number;
  iva: number;
  ivaPorcentaje: number;
  total: number;
  numero: string | null;
  fecha: string;
  origenId: string | null;
  lineas: LineaComprobante[];
}

export interface ListaPrecioRef {
  id: string;
  codigo: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
}
