export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'vendedor';
}
