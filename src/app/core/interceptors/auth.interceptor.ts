import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Adjunta credentials (cookie httpOnly) a las llamadas a la API.
 * El JWT no vive en sessionStorage/localStorage.
 *
 * El GET same-origin no manda Origin y el proxy pisa Host; el subdominio
 * viaja en X-Forwarded-Host para clasificar el comercio.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const host = typeof globalThis.location === 'undefined' ? '' : globalThis.location.host;
  return next(
    req.clone({
      withCredentials: true,
      setHeaders: host ? { 'X-Forwarded-Host': host } : {},
    }),
  );
};
