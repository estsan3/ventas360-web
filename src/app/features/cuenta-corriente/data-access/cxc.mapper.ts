import {
  ClienteRefDto,
  ComprobanteCxcDto,
  CrearReciboDto,
  EstadoCuentaDto,
  FacturaRefDto,
  ListaPrecioDto,
  ReciboDto,
  SaldoClienteDto,
  ZonaRefDto,
} from './cxc.dto';
import {
  ClienteRef,
  ComprobanteCxc,
  CrearRecibo,
  EstadoCuenta,
  FacturaRef,
  ListaPrecioRef,
  Recibo,
  SaldoCliente,
  ZonaRef,
} from './cxc.model';

export function saldoToModel(dto: SaldoClienteDto): SaldoCliente {
  return {
    clienteId: dto.cliente_id,
    saldo: dto.saldo,
    debeTotal: dto.debe_total,
    haberTotal: dto.haber_total,
    fechaUltimoMovimiento: dto.fecha_ultimo_movimiento ?? null,
    fechaDebeMasAntigua: dto.fecha_debe_mas_antigua ?? null,
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
    imputaciones: model.imputaciones.map((i) => ({
      factura_id: i.facturaId,
      monto: i.monto,
    })),
  };
}

export function clienteRefToModel(dto: ClienteRefDto): ClienteRef {
  return {
    id: dto.id,
    nombre: dto.nombre,
    activo: dto.activo,
    email: dto.email ?? '',
    telefono: dto.telefono ?? '',
    cuit: dto.cuit ?? '',
    condicionIva: dto.condicion_iva ?? 'consumidor_final',
    limiteCredito: dto.limite_credito ?? 0,
    zonaId: dto.zona_id ?? null,
    vendedorId: dto.vendedor_id ?? null,
    bloqueado: dto.bloqueado ?? false,
  };
}

export function zonaRefToModel(dto: ZonaRefDto): ZonaRef {
  return {
    id: dto.id,
    nombre: dto.nombre,
    codigo: dto.codigo,
    activo: dto.activo,
  };
}

export function facturaRefToModel(dto: FacturaRefDto): FacturaRef {
  return {
    id: dto.id,
    total: dto.total,
    fecha: dto.fecha,
    estado: dto.estado,
  };
}

export function comprobanteCxcToModel(dto: ComprobanteCxcDto): ComprobanteCxc {
  return {
    id: dto.id,
    tipo: dto.tipo === 'factura' ? 'factura' : 'remito',
    clienteId: dto.cliente_id,
    estado: dto.estado,
    neto: dto.neto,
    iva: dto.iva,
    ivaPorcentaje: dto.iva_porcentaje,
    total: dto.total,
    numero: dto.numero,
    fecha: dto.fecha,
    origenId: dto.origen_id,
    lineas: (dto.lineas ?? []).map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      descripcion: l.descripcion ?? '',
      cantidad: l.cantidad,
      precioUnitario: l.precio_unitario,
    })),
  };
}

export function listaPrecioToModel(dto: ListaPrecioDto): ListaPrecioRef {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    esDefault: dto.es_default,
    activo: dto.activo,
  };
}
