import { Routes } from '@angular/router';

export const REMITOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./remitos-page').then((m) => m.RemitosPage),
  },
];
