import {
  ClienteRefDto,
  CrearReciboDto,
  EstadoCuentaDto,
  FacturaRefDto,
  ReciboDto,
  SaldoClienteDto,
} from './cxc.dto';
import {
  ClienteRef,
  CrearRecibo,
  EstadoCuenta,
  FacturaRef,
  Recibo,
  SaldoCliente,
} from './cxc.model';

export function saldoToModel(dto: SaldoClienteDto): SaldoCliente {
  return {
    clienteId: dto.cliente_id,
    saldo: dto.saldo,
    debeTotal: dto.debe_total,
    haberTotal: dto.haber_total,
  };
}

export function estadoCuentaToModel(dto: EstadoCuentaDto): EstadoCuenta {
  return {
    clienteId: dto.cliente_id,
    saldo: dto.saldo,
    movimientos: dto.movimientos.map((m) => ({
      id: m.id,
      clienteId: m.cliente_id,
      tipo: m.tipo,
      monto: m.monto,
      referenciaTipo: m.referencia_tipo,
      referenciaId: m.referencia_id,
      concepto: m.concepto,
      fecha: m.fecha,
    })),
  };
}

export function reciboToModel(dto: ReciboDto): Recibo {
  return {
    id: dto.id,
    clienteId: dto.cliente_id,
    fecha: dto.fecha,
    monto: dto.monto,
    medio: dto.medio,
    observacion: dto.observacion,
  };
}

export function crearReciboToDto(model: CrearRecibo): CrearReciboDto {
  return {
    cliente_id: model.clienteId,
    monto: model.monto,
    medio: model.medio,
    observacion: model.observacion ?? '',
    imputaciones: [{ factura_id: model.facturaId, monto: model.monto }],
  };
}

export function clienteRefToModel(dto: ClienteRefDto): ClienteRef {
  return { id: dto.id, nombre: dto.nombre, activo: dto.activo };
}

export function facturaRefToModel(dto: FacturaRefDto): FacturaRef {
  return {
    id: dto.id,
    total: dto.total,
    fecha: dto.fecha,
    estado: dto.estado,
  };
}
