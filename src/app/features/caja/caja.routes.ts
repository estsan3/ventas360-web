import { Routes } from '@angular/router';

export const CAJA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./caja-page').then((m) => m.CajaPage),
  },
];
