export type TipoCompra = 'pedido_compra' | 'remito_compra' | 'factura_compra';

export interface LineaCompra {
  id: string;
  productoId: string;
  codigoProveedor: string;
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
  fechaEntrega: string | null;
  observaciones: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  lineas: LineaCompra[];
}

export interface CrearCompra {
  proveedorId: string;
  tipo: TipoCompra;
  depositoId: string;
  origenId?: string;
  lineas: {
    productoId?: string;
    codigoProveedor?: string;
    cantidad: number;
    precioUnitario?: number;
  }[];
}
