import { Routes } from '@angular/router';

export const CUENTA_CORRIENTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./cuenta-corriente-page').then((m) => m.CuentaCorrientePage),
  },
];
