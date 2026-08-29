/** Módulos de la matriz (alineados a la API). */
export type ModuloPermiso =
  | 'inicio'
  | 'mostrador'
  | 'cta_cte'
  | 'articulos'
  | 'stock'
  | 'clientes'
  | 'ventas'
  | 'compras'
  | 'configuracion';

export type UserRol = 'administrador' | 'encargado' | 'vendedor' | 'superadmin';

/** Ruta del shell → módulo que la habilita. */
export const MODULO_POR_RUTA: Record<string, ModuloPermiso> = {
  dashboard: 'inicio',
  ventas: 'mostrador',
  comprobantes: 'ventas',
  presupuestos: 'ventas',
  pedidos: 'ventas',
  remitos: 'ventas',
  facturas: 'ventas',
  clientes: 'clientes',
  'cuenta-corriente': 'cta_cte',
  productos: 'articulos',
  inventario: 'stock',
  compras: 'compras',
  proveedores: 'compras',
  tesoreria: 'compras',
  caja: 'compras',
  bancos: 'compras',
  configuracion: 'configuracion',
};

/** Orden de aterrizaje tras login (primer módulo habilitado). */
export const RUTA_INICIAL_POR_MODULO: { modulo: ModuloPermiso; ruta: string }[] = [
  { modulo: 'inicio', ruta: '/dashboard' },
  { modulo: 'mostrador', ruta: '/ventas' },
  { modulo: 'cta_cte', ruta: '/cuenta-corriente' },
  { modulo: 'articulos', ruta: '/productos' },
  { modulo: 'stock', ruta: '/inventario' },
  { modulo: 'clientes', ruta: '/clientes' },
  { modulo: 'ventas', ruta: '/comprobantes' },
  { modulo: 'compras', ruta: '/compras' },
  { modulo: 'configuracion', ruta: '/configuracion' },
];

export function etiquetaRol(rol: string): string {
  switch (rol) {
    case 'administrador':
      return 'Administrador';
    case 'encargado':
      return 'Encargado';
    case 'vendedor':
      return 'Vendedor';
    case 'superadmin':
      return 'Superadmin';
    default:
      return rol;
  }
}

export function parseRol(rol: string): UserRol {
  if (
    rol === 'administrador' ||
    rol === 'encargado' ||
    rol === 'vendedor' ||
    rol === 'superadmin'
  ) {
    return rol;
  }
  return 'vendedor';
}
