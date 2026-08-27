export interface LineaRemitoParseadaDto {
  descripcion_extraida: string;
  sku_extraido: string | null;
  codigo_barras_extraido: string | null;
  cantidad: number;
  precio_unitario: number | null;
  producto_id: string | null;
  producto_nombre: string | null;
  producto_sku: string | null;
  match_tipo: string | null;
  confianza: string;
}

export interface ParsearRemitoResponseDto {
  numero_remito: string | null;
  fecha: string | null;
  proveedor_texto: string | null;
  proveedor_id: string | null;
  deposito_id: string | null;
  lineas: LineaRemitoParseadaDto[];
  sin_match: number;
  advertencias: string[];
  confianza_extraccion: number;
  modo_parser: string;
}

export interface CrearRemitoCompraDto {
  proveedor_id: string;
  tipo: 'remito_compra';
  deposito_id: string;
  lineas: {
    producto_id: string;
    cantidad: number;
    precio_unitario?: number;
  }[];
}

export interface CompraCreadaDto {
  id: string;
  estado: string;
}
