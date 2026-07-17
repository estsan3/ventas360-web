export interface UsuarioDto {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: string;
}

export interface NuevoUsuarioDto {
  nombre: string;
  dni: string;
  email: string;
  rol: string;
  password: string;
}
