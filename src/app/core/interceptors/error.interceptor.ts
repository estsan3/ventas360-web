import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationStore } from '../../notifications/state/notification.store';

/**
 * Captura global de errores HTTP: traduce el error técnico a un mensaje
 * amigable y dispara un toast — ningún componente maneja errores a mano.
 * Los errores de /auth/ se excluyen: el login los muestra inline.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = friendlyMessage(error);
      if (!req.url.includes('/auth/')) {
        notifications.error('Algo salió mal', message);
      }
      return throwError(() => new Error(message));
    }),
  );
};

function friendlyMessage(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'No hay conexión con el servidor';
    case 401:
      return 'Credenciales inválidas o sesión expirada';
    case 403:
      return 'No tenés permisos para esta operación';
    case 404:
      return 'El recurso solicitado no existe';
    case 422:
      return (
        (error.error as { error?: { mensaje?: string } })?.error?.mensaje ??
        'Los datos enviados no son válidos'
      );
    default:
      return 'Ocurrió un error inesperado. Intentalo de nuevo.';
  }
}
