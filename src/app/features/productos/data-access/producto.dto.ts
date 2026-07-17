export interface ProductoDto {
  id: string;
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface CrearProductoDto {
  sku: string;
  nombre: string;
  precio: number;
  stock: number;
}

export type ActualizarProductoDto = Partial<CrearProductoDto & { activo: boolean }>;
