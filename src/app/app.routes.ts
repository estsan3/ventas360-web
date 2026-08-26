import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permisoGuard, plataformaGuard, redirectInicialGuard } from './core/guards/permiso.guard';
import { RedirectInicial } from './core/guards/redirect-inicial';

/**
 * Shell + lazy load por feature (`features/<dominio>/<dominio>.routes.ts`).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [permisoGuard('inicio')],
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'clientes',
        canActivate: [permisoGuard('clientes')],
        loadChildren: () =>
          import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES),
      },
      {
        path: 'productos',
        canActivate: [permisoGuard('articulos')],
        loadChildren: () =>
          import('./features/productos/productos.routes').then((m) => m.PRODUCTOS_ROUTES),
      },
      {
        path: 'ventas',
        canActivate: [permisoGuard('mostrador')],
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
      },
      {
        path: 'presupuestos',
        canActivate: [permisoGuard('ventas')],
        loadChildren: () =>
          import('./features/presupuestos/presupuestos.routes').then((m) => m.PRESUPUESTOS_ROUTES),
      },
      {
        path: 'pedidos',
        canActivate: [permisoGuard('ventas')],
        loadChildren: () =>
          import('./features/pedidos/pedidos.routes').then((m) => m.PEDIDOS_ROUTES),
      },
      {
        path: 'remitos',
        canActivate: [permisoGuard('ventas')],
        loadChildren: () =>
          import('./features/remitos/remitos.routes').then((m) => m.REMITOS_ROUTES),
      },
      {
        path: 'cuenta-corriente',
        canActivate: [permisoGuard('cta_cte')],
        loadChildren: () =>
          import('./features/cuenta-corriente/cuenta-corriente.routes').then(
            (m) => m.CUENTA_CORRIENTE_ROUTES,
          ),
      },
      {
        path: 'inventario',
        canActivate: [permisoGuard('stock')],
        loadChildren: () =>
          import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'proveedores',
        canActivate: [permisoGuard('compras')],
        loadChildren: () =>
          import('./features/proveedores/proveedores.routes').then((m) => m.PROVEEDORES_ROUTES),
      },
      {
        path: 'compras',
        canActivate: [permisoGuard('compras')],
        loadChildren: () =>
          import('./features/compras/compras.routes').then((m) => m.COMPRAS_ROUTES),
      },
      {
        path: 'caja',
        canActivate: [permisoGuard('compras')],
        loadChildren: () => import('./features/caja/caja.routes').then((m) => m.CAJA_ROUTES),
      },
      {
        path: 'bancos',
        canActivate: [permisoGuard('compras')],
        loadChildren: () => import('./features/bancos/bancos.routes').then((m) => m.BANCOS_ROUTES),
      },
      {
        path: 'configuracion',
        canActivate: [permisoGuard('configuracion')],
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes').then(
            (m) => m.CONFIGURACION_ROUTES,
          ),
      },
      {
        path: 'comercios',
        canActivate: [plataformaGuard],
        loadChildren: () =>
          import('./features/comercios/comercios.routes').then((m) => m.COMERCIOS_ROUTES),
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [redirectInicialGuard],
        component: RedirectInicial,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
