import { Routes } from '@angular/router';

export const PROVEEDORES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./proveedores-page').then((m) => m.ProveedoresPage),
  },
];
