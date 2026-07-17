import {
  ActualizarClienteDto,
  ClienteDto,
  ClientesPaginaDto,
  CrearClienteDto,
} from './cliente.dto';
import { ActualizarCliente, Cliente, ClientesPagina, CrearCliente } from './cliente.model';

export function clienteToModel(dto: ClienteDto): Cliente {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    cuit: dto.cuit,
    condicionIva: dto.condicion_iva,
    limiteCredito: dto.limite_credito,
    zonaId: dto.zona_id,
    vendedorId: dto.vendedor_id,
    bloqueado: dto.bloqueado,
    observaciones: dto.observaciones,
    activo: dto.activo,
  };
}

export function crearClienteToDto(model: CrearCliente): CrearClienteDto {
  return {
    nombre: model.nombre,
    email: model.email,
    telefono: model.telefono,
    cuit: model.cuit,
    condicion_iva: model.condicionIva,
    limite_credito: model.limiteCredito,
    zona_id: model.zonaId,
    vendedor_id: model.vendedorId,
    bloqueado: model.bloqueado,
    observaciones: model.observaciones,
  };
}

export function actualizarClienteToDto(model: ActualizarCliente): ActualizarClienteDto {
  return {
    nombre: model.nombre,
    email: model.email,
    telefono: model.telefono,
    cuit: model.cuit,
    condicion_iva: model.condicionIva,
    limite_credito: model.limiteCredito,
    zona_id: model.zonaId,
    vendedor_id: model.vendedorId,
    bloqueado: model.bloqueado,
    observaciones: model.observaciones,
  };
}

export function clientesPaginaToModel(dto: ClientesPaginaDto): ClientesPagina {
  return {
    items: dto.items.map(clienteToModel),
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
  };
}
