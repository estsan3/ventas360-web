export type TipoCompraDto = 'remito_compra' | 'factura_compra';

export interface LineaCompraDto {
  id: string;
  producto_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CompraDto {
  id: string;
  tipo: TipoCompraDto;
  proveedor_id: string;
  estado: string;
  deposito_id: string | null;
  origen_id: string | null;
  neto: number;
  iva: number;
  iva_porcentaje: number;
  total: number;
  numero: string | null;
  fecha: string;
  lineas: LineaCompraDto[];
}

export interface CrearCompraDto {
  proveedor_id: string;
  tipo: TipoCompraDto;
  deposito_id: string;
  fecha?: string;
  lineas: { producto_id: string; cantidad: number; precio_unitario?: number }[];
}
