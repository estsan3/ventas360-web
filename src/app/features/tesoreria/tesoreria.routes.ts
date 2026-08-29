import { Routes } from '@angular/router';

export const TESORERIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tesoreria-page').then((m) => m.TesoreriaPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'caja' },
      {
        path: 'caja',
        loadComponent: () => import('../caja/caja-page').then((m) => m.CajaPage),
      },
      {
        path: 'cheques',
        loadComponent: () => import('../bancos/bancos-page').then((m) => m.BancosPage),
      },
      {
        path: 'pagos',
        loadComponent: () => import('./tesoreria-pagos-page').then((m) => m.TesoreriaPagosPage),
      },
    ],
  },
];
