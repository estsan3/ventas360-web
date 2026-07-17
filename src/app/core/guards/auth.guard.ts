import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthStore } from '../state/auth.store';

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (!authStore.restoring()) {
    return authStore.isAuthenticated() ? true : router.createUrlTree(['/login']);
  }

  // Esperar a que termine restoreSession() antes de decidir.
  return toObservable(authStore.restoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() => (authStore.isAuthenticated() ? true : router.createUrlTree(['/login']))),
  );
};
