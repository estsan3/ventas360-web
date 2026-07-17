import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Adjunta credentials (cookie httpOnly) a las llamadas a la API.
 * El JWT no vive en sessionStorage/localStorage.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  return next(req.clone({ withCredentials: true }));
};
