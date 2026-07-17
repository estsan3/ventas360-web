/** Modelo de dominio del usuario autenticado (front). */
export interface User {
  id: string;
  nombre: string;
  email: string;
  dni: string;
  rol: 'administrador' | 'vendedor';
}
