import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../state/auth.store';

/** Solo administradores pueden gestionar transportistas. */
export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.user()?.rol === 'administrador') {
    return true;
  }
  return router.createUrlTree(['/gestion-operativa']);
};
