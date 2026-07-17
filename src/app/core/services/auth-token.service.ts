import { Injectable } from '@angular/core';

const CLAVE_TOKEN = 'ventas360_access_token';

/** Persistencia del JWT entre recargas (sessionStorage se limpia al cerrar la pestaña). */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  obtener(): string | null {
    return sessionStorage.getItem(CLAVE_TOKEN);
  }

  guardar(token: string): void {
    sessionStorage.setItem(CLAVE_TOKEN, token);
  }

  limpiar(): void {
    sessionStorage.removeItem(CLAVE_TOKEN);
  }
}
