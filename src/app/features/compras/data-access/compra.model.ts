export type TipoCompra = 'remito_compra' | 'factura_compra';

export interface LineaCompra {
  id: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Compra {
  id: string;
  tipo: TipoCompra;
  proveedorId: string;
  estado: string;
  depositoId: string | null;
  origenId: string | null;
  neto: number;
  iva: number;
  ivaPorcentaje: number;
  total: number;
  numero: string | null;
  fecha: string;
  lineas: LineaCompra[];
}

export interface CrearCompra {
  proveedorId: string;
  tipo: TipoCompra;
  depositoId: string;
  lineas: { productoId: string; cantidad: number; precioUnitario?: number }[];
}
