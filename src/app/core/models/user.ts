import { UserRol } from './modulos';

/** Modelo de dominio del usuario autenticado (front). */
export interface User {
  id: string;
  nombre: string;
  email: string;
  dni: string;
  rol: UserRol;
  tenantId: string | null;
  permisos: string[];
}
