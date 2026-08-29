export type TipoCompraDto = 'pedido_compra' | 'remito_compra' | 'factura_compra';

export interface LineaCompraDto {
  id: string;
  producto_id?: string;
  codigo_proveedor?: string;
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
  fecha_entrega?: string | null;
  observaciones?: string;
  cantidad_pedida?: number;
  cantidad_recibida?: number;
  lineas: LineaCompraDto[];
}

export interface CrearCompraDto {
  proveedor_id: string;
  tipo: TipoCompraDto;
  deposito_id: string;
  origen_id?: string;
  fecha?: string;
  lineas: {
    producto_id?: string;
    codigo_proveedor?: string;
    cantidad: number;
    precio_unitario?: number;
  }[];
}
