export interface ParametrosNegocioDto {
  iva_porcentaje: number;
  moneda: 'ARS' | 'USD';
}

export interface ParametrosOperativosDto {
  sucursal_codigo: string;
  sucursal_nombre: string;
  condiciones_pago: string[];
}

export type TipoComprobanteTalonarioDto = 'presupuesto' | 'pedido' | 'remito' | 'factura';

export interface TalonarioDto {
  id: string;
  tipo_comprobante: TipoComprobanteTalonarioDto;
  prefijo: string;
  proximo_numero: number;
  activo: boolean;
}

export interface UpsertTalonarioDto {
  tipo_comprobante: TipoComprobanteTalonarioDto;
  prefijo: string;
  proximo_numero: number;
  activo: boolean;
}

export interface ParametrosAfipDto {
  habilitada: boolean;
  cuit: string;
  razon_social: string;
  condicion_iva: 'responsable_inscripto' | 'monotributo' | 'exento';
  punto_venta: number;
  domicilio: string;
  proveedor?: 'simulado' | 'afip';
  homologacion?: boolean;
  certificado_configurado?: boolean;
}
