export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface CrearProducto {
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
}

export type ActualizarProducto = Partial<CrearProducto & { activo: boolean }>;

export type FiltroActivo = 'activos' | 'inactivos' | 'todos';
