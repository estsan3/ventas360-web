export interface SaldoCliente {
  clienteId: string;
  saldo: number;
  debeTotal: number;
  haberTotal: number;
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

export interface CrearRecibo {
  clienteId: string;
  monto: number;
  medio: MedioCobro;
  observacion?: string;
  facturaId: string;
}

export interface ClienteRef {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface FacturaRef {
  id: string;
  total: number;
  fecha: string;
  estado: string;
}
