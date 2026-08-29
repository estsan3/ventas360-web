import { Routes } from '@angular/router';

export const COMPROBANTES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'presupuestos' },
  {
    path: ':tab',
    loadComponent: () => import('./comprobantes-page').then((m) => m.ComprobantesPage),
  },
];
