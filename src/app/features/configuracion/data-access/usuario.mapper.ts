import { NuevoUsuarioDto, UsuarioDto } from './usuario.dto';
import { NuevoUsuario, Usuario } from './usuario.model';

export function usuarioToModel(dto: UsuarioDto): Usuario {
  return {
    id: dto.id,
    nombre: dto.nombre,
    dni: dto.dni,
    email: dto.email,
    rol: dto.rol === 'administrador' ? 'administrador' : 'vendedor',
  };
}

export function nuevoUsuarioToDto(model: NuevoUsuario): NuevoUsuarioDto {
  return {
    nombre: model.nombre,
    dni: model.dni,
    email: model.email,
    rol: model.rol,
    password: model.password,
  };
}
