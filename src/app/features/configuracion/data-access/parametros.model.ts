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

export type CondicionIvaEmisor = 'responsable_inscripto' | 'monotributo' | 'exento';

export interface ParametrosAfip {
  habilitada: boolean;
  cuit: string;
  razonSocial: string;
  condicionIva: CondicionIvaEmisor;
  puntoVenta: number;
  domicilio: string;
  proveedor: 'simulado' | 'afip';
  homologacion: boolean;
  certificadoConfigurado: boolean;
}
