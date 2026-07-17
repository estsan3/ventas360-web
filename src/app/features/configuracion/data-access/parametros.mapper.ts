import {
  ParametrosNegocioDto,
  ParametrosOperativosDto,
  TalonarioDto,
  UpsertTalonarioDto,
} from './parametros.dto';
import { ParametrosNegocio, ParametrosOperativos, Talonario } from './parametros.model';

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
