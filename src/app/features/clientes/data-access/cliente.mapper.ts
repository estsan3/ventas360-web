import { ActualizarClienteDto, ClienteDto, CrearClienteDto } from './cliente.dto';
import { ActualizarCliente, Cliente, CrearCliente } from './cliente.model';

export function clienteToModel(dto: ClienteDto): Cliente {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    activo: dto.activo,
  };
}

export function crearClienteToDto(model: CrearCliente): CrearClienteDto {
  return { ...model };
}

export function actualizarClienteToDto(model: ActualizarCliente): ActualizarClienteDto {
  return { ...model };
}
