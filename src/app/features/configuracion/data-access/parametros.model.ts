export interface ParametrosNegocio {
  ivaPorcentaje: number;
  moneda: 'ARS' | 'USD';
}

export interface ParametrosOperativos {
  sucursalCodigo: string;
  sucursalNombre: string;
  condicionesPago: string[];
}

/** Tipos de comprobante que tienen numerador (alineado a ventas). */
export type TipoTalonario = 'presupuesto' | 'pedido' | 'remito' | 'factura';

export const TIPOS_TALONARIO: readonly TipoTalonario[] = [
  'presupuesto',
  'pedido',
  'remito',
  'factura',
];

export interface Talonario {
  id: string;
  tipoComprobante: TipoTalonario;
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
