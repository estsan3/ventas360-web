export interface LineaMostradorInterpretada {
  productoId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number | null;
  productoNombre: string | null;
  productoSku: string | null;
  matchTipo: string | null;
}

export interface InterpretarMostradorResultado {
  intencion: string;
  tipo: string;
  clienteId: string | null;
  clienteNombre: string | null;
  depositoId: string | null;
  lineas: LineaMostradorInterpretada[];
  confianza: number;
  advertencias: string[];
  preguntas: string[];
  modoParser: string;
}

export interface AccionDia {
  id: string;
  tipo: string;
  prioridad: 'alta' | 'media' | 'baja' | string;
  titulo: string;
  detalle: string;
  cantidad: number;
  monto: number | null;
  rutaWeb: string;
}

export interface AccionesDia {
  acciones: AccionDia[];
  generadoEn: string;
}

export interface ResumenDia {
  metricas: {
    ventasDia: number;
    montoVentasDia: number;
    pedidosPendientes: number;
    remitosPorFacturar: number;
    saldoCobrar: number;
    saldoVencido: number;
    articulosBajoStock: number;
    articulosSinStock: number;
    moneda: string;
  };
  narrativa: string | null;
  modoNarrativa: string | null;
  accionesDestacadas: string[];
  acciones: AccionDia[];
  generadoEn: string | null;
}
