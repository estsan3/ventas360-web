export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  rubro: string;
  codigoBarras: string;
  costo: number;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface CrearProducto {
  sku: string;
  nombre: string;
  marca?: string;
  rubro?: string;
  codigoBarras?: string;
  costo?: number;
  precio: number;
  stock: number;
}

export type ActualizarProducto = Partial<CrearProducto & { activo: boolean }>;

export type FiltroActivo = 'activos' | 'inactivos' | 'todos';

export interface ProductosPagina {
  items: Producto[];
  total: number;
  page: number;
  pageSize: number;
}
