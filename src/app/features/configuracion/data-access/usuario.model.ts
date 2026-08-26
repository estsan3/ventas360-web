import { UserRol } from '../../../core/models/modulos';

export interface Usuario {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: UserRol;
}

export type NuevoUsuario = Omit<Usuario, 'id'> & { password: string };
