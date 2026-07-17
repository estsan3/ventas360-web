export interface Usuario {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: 'administrador' | 'vendedor';
}

export type NuevoUsuario = Omit<Usuario, 'id'> & { password: string };
