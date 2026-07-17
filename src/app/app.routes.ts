import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-page').then((m) => m.ClientesPage),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-page').then((m) => m.ProductosPage),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/ventas/ventas-page').then((m) => m.VentasPage),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/configuracion-page').then((m) => m.ConfiguracionPage),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
