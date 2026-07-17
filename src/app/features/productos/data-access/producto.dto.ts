export interface ProductoDto {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
  rubro: string;
  codigo_barras: string;
  costo: number;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface CrearProductoDto {
  sku: string;
  nombre: string;
  marca?: string;
  rubro?: string;
  codigo_barras?: string;
  costo?: number;
  precio: number;
  stock: number;
}

export type ActualizarProductoDto = Partial<CrearProductoDto & { activo: boolean }>;

export interface ProductosPaginaDto {
  items: ProductoDto[];
  total: number;
  page: number;
  page_size: number;
}
