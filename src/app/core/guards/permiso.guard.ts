import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModuloPermiso } from '../models/modulos';
import { AuthStore } from '../state/auth.store';

/** Exige al menos uno de los módulos de la matriz. */
export function permisoGuard(...modulos: ModuloPermiso[]): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    if (authStore.esPlataforma()) {
      return router.createUrlTree(['/comercios']);
    }
    if (authStore.puede(...modulos)) {
      return true;
    }
    return router.createUrlTree([authStore.rutaInicial()]);
  };
}

/** Solo el host de plataforma (`admin.*`). */
export const plataformaGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (authStore.esPlataforma()) {
    return true;
  }
  return router.createUrlTree([authStore.rutaInicial()]);
};

/** Redirige `''` a la primera pantalla permitida. */
export const redirectInicialGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  return router.createUrlTree([authStore.rutaInicial()]);
};
