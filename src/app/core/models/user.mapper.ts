import { parseRol } from './modulos';
import { UserDto } from './user.dto';
import { User } from './user';

export function userToModel(dto: UserDto): User {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    dni: dto.dni ?? '',
    rol: parseRol(dto.rol),
    tenantId: dto.tenant_id ?? null,
    permisos: dto.permisos ?? [],
  };
}
