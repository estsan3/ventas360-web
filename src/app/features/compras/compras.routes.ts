import { Routes } from '@angular/router';

export const COMPRAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./compras-page').then((m) => m.ComprasPage),
  },
];
