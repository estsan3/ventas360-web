export interface LineaMostradorInterpretadaDto {
  producto_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number | null;
  producto_nombre: string | null;
  producto_sku: string | null;
  match_tipo: string | null;
}

export interface InterpretarMostradorResponseDto {
  intencion: string;
  tipo: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  deposito_id: string | null;
  lineas: LineaMostradorInterpretadaDto[];
  confianza: number;
  advertencias: string[];
  preguntas: string[];
  modo_parser: string;
}

export interface AccionDiaDto {
  id: string;
  tipo: string;
  prioridad: string;
  titulo: string;
  detalle: string;
  cantidad: number;
  monto: number | null;
  ruta_web: string;
}

export interface AccionesDiaResponseDto {
  acciones: AccionDiaDto[];
  generado_en: string;
}

export interface ResumenDiaMetricasDto {
  ventas_dia: number;
  monto_ventas_dia: number;
  pedidos_pendientes: number;
  remitos_por_facturar: number;
  saldo_cobrar: number;
  saldo_vencido: number;
  articulos_bajo_stock: number;
  articulos_sin_stock: number;
  moneda: string;
}

export interface ResumenDiaResponseDto {
  metricas: ResumenDiaMetricasDto;
  narrativa: string | null;
  modo_narrativa: string | null;
  acciones_destacadas: string[];
  acciones?: AccionDiaDto[];
  generado_en?: string | null;
}
