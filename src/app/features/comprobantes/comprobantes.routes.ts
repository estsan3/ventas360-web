import { Routes } from '@angular/router';

export const COMPROBANTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./comprobantes-page').then((m) => m.ComprobantesPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'presupuestos' },
      {
        path: 'presupuestos',
        loadComponent: () =>
          import('../presupuestos/presupuestos-page').then((m) => m.PresupuestosPage),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('../pedidos/pedidos-page').then((m) => m.PedidosPage),
      },
      {
        path: 'remitos',
        loadComponent: () => import('../remitos/remitos-page').then((m) => m.RemitosPage),
      },
    ],
  },
];
