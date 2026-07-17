/**
 * Paleta categórica de charts en ORDEN FIJO (nunca ciclada).
 * Alineada al mock DC Ventas360 (naranja / warm).
 */
export const CHART_COLORS = ['#e86412', '#2563eb', '#f0b585', '#3d8f5f'] as const;

export interface ChartDatum {
  label: string;
  value: number;
  /** Chip de tendencia opcional en la leyenda, ej. "+8%" */
  trend?: string;
}

/** Par naranja del mock para gráficos de 2 series */
export const CHART_PAIR = ['#e86412', '#f0b585'] as const;
