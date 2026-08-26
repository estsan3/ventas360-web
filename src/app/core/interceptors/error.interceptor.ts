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
      if (!req.url.includes('/auth/') && !req.url.includes('/tenants/contexto')) {
        notifications.error('Algo salió mal', message);
      }
      return throwError(() => new Error(message));
    }),
  );
};

function apiMensaje(error: HttpErrorResponse): string | undefined {
  return (error.error as { error?: { mensaje?: string } })?.error?.mensaje;
}

function friendlyMessage(error: HttpErrorResponse): string {
  const delApi = apiMensaje(error);
  switch (error.status) {
    case 0:
      return 'No hay conexión con el servidor';
    case 401:
      return delApi ?? 'Credenciales inválidas o sesión expirada';
    case 403:
      return delApi ?? 'No tenés permisos para esta operación';
    case 404:
      return delApi ?? 'El recurso solicitado no existe';
    case 422:
      return delApi ?? 'Los datos enviados no son válidos';
    default:
      return delApi ?? 'Ocurrió un error inesperado. Intentalo de nuevo.';
  }
}
