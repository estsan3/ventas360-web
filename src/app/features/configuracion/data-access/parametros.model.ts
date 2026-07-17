export interface ParametrosNegocio {
  ivaPorcentaje: number;
  moneda: 'ARS' | 'USD';
}

export interface ParametrosOperativos {
  sucursalCodigo: string;
  sucursalNombre: string;
  condicionesPago: string[];
}

export interface Talonario {
  id: string;
  tipoComprobante: 'pedido' | 'remito' | 'factura';
  prefijo: string;
  proximoNumero: number;
  activo: boolean;
}
