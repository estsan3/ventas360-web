import { Routes } from '@angular/router';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ventas-page').then((m) => m.VentasPage),
    data: { tipo: 'factura' },
  },
  {
    path: 'presupuesto',
    loadComponent: () => import('./ventas-page').then((m) => m.VentasPage),
    data: { tipo: 'presupuesto' },
  },
  {
    path: 'pedido',
    loadComponent: () => import('./ventas-page').then((m) => m.VentasPage),
    data: { tipo: 'pedido' },
  },
  {
    path: 'remito',
    loadComponent: () => import('./ventas-page').then((m) => m.VentasPage),
    data: { tipo: 'remito' },
  },
];
