export interface LineaRemitoParseada {
  descripcionExtraida: string;
  skuExtraido: string | null;
  codigoBarrasExtraido: string | null;
  cantidad: number;
  precioUnitario: number | null;
  productoId: string | null;
  productoNombre: string | null;
  productoSku: string | null;
  matchTipo: string | null;
  confianza: string;
}

export interface ParsearRemitoResultado {
  numeroRemito: string | null;
  fecha: string | null;
  proveedorTexto: string | null;
  proveedorId: string | null;
  depositoId: string | null;
  lineas: LineaRemitoParseada[];
  sinMatch: number;
  advertencias: string[];
  confianzaExtraccion: number;
  modoParser: string;
}
