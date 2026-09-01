import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** En dev, `localhost:4201` no trae slug; la API usa el subdominio de demo. */
function hostParaApi(host: string): string {
  if (!environment.production && (host === 'localhost:4201' || host === '127.0.0.1:4201')) {
    return 'demo.localhost:4201';
  }
  return host;
}

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

  const host =
    typeof globalThis.location === 'undefined' ? '' : hostParaApi(globalThis.location.host);
  return next(
    req.clone({
      withCredentials: true,
      setHeaders: host ? { 'X-Forwarded-Host': host } : {},
    }),
  );
};
