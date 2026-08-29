import {
  ParametrosAfipDto,
  ParametrosNegocioDto,
  ParametrosOperativosDto,
  TalonarioDto,
  UpsertTalonarioDto,
} from './parametros.dto';
import {
  ParametrosAfip,
  ParametrosNegocio,
  ParametrosOperativos,
  Talonario,
} from './parametros.model';

export function negocioToModel(dto: ParametrosNegocioDto): ParametrosNegocio {
  return { ivaPorcentaje: dto.iva_porcentaje, moneda: dto.moneda };
}

export function negocioToDto(model: ParametrosNegocio): ParametrosNegocioDto {
  return { iva_porcentaje: model.ivaPorcentaje, moneda: model.moneda };
}

export function operativosToModel(dto: ParametrosOperativosDto): ParametrosOperativos {
  return {
    sucursalCodigo: dto.sucursal_codigo,
    sucursalNombre: dto.sucursal_nombre,
    condicionesPago: dto.condiciones_pago,
  };
}

export function operativosToDto(model: ParametrosOperativos): ParametrosOperativosDto {
  return {
    sucursal_codigo: model.sucursalCodigo,
    sucursal_nombre: model.sucursalNombre,
    condiciones_pago: model.condicionesPago,
  };
}

export function talonarioToModel(dto: TalonarioDto): Talonario {
  return {
    id: dto.id,
    tipoComprobante: dto.tipo_comprobante,
    prefijo: dto.prefijo,
    proximoNumero: dto.proximo_numero,
    activo: dto.activo,
  };
}

export function talonarioToUpsertDto(model: Talonario): UpsertTalonarioDto {
  return {
    tipo_comprobante: model.tipoComprobante,
    prefijo: model.prefijo,
    proximo_numero: model.proximoNumero,
    activo: model.activo,
  };
}

export function afipToModel(dto: ParametrosAfipDto): ParametrosAfip {
  return {
    habilitada: dto.habilitada,
    cuit: dto.cuit,
    razonSocial: dto.razon_social,
    condicionIva: dto.condicion_iva,
    puntoVenta: dto.punto_venta,
    domicilio: dto.domicilio,
    proveedor: dto.proveedor ?? 'simulado',
    homologacion: dto.homologacion ?? true,
    certificadoConfigurado: dto.certificado_configurado ?? false,
  };
}

export function afipToDto(model: ParametrosAfip): ParametrosAfipDto {
  return {
    habilitada: model.habilitada,
    cuit: model.cuit,
    razon_social: model.razonSocial,
    condicion_iva: model.condicionIva,
    punto_venta: model.puntoVenta,
    domicilio: model.domicilio,
  };
}
