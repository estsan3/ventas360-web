import { UserDto } from './user.dto';
import { User } from './user';

export function userToModel(dto: UserDto): User {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    dni: dto.dni ?? '',
    rol: dto.rol === 'administrador' ? 'administrador' : 'vendedor',
  };
}
