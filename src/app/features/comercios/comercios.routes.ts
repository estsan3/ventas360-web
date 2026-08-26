import { Routes } from '@angular/router';

export const COMERCIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./comercios-page').then((m) => m.ComerciosPage),
  },
];
