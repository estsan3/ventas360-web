export interface ParametrosNegocioDto {
  iva_porcentaje: number;
  moneda: 'ARS' | 'USD';
}

export interface ParametrosOperativosDto {
  sucursal_codigo: string;
  sucursal_nombre: string;
  condiciones_pago: string[];
}

export interface TalonarioDto {
  id: string;
  tipo_comprobante: 'pedido' | 'remito' | 'factura';
  prefijo: string;
  proximo_numero: number;
  activo: boolean;
}

export interface UpsertTalonarioDto {
  tipo_comprobante: 'pedido' | 'remito' | 'factura';
  prefijo: string;
  proximo_numero: number;
  activo: boolean;
}
