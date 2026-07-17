import { Routes } from '@angular/router';

export const PRESUPUESTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./presupuestos-page').then((m) => m.PresupuestosPage),
  },
];
