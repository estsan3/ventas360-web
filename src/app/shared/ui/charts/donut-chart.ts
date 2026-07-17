import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CHART_COLORS, ChartDatum } from './chart-colors';

interface DonutSegment {
  label: string;
  value: number;
  percent: number;
  color: string;
  dasharray: string;
  dashoffset: number;
  trend?: string;
}

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3; // px de separación entre segmentos (spacer sobre superficie)

/**
 * Donut de composición (Figma: Reportería → Viajes por tipo).
 * Categorías en orden fijo; leyenda con valores en tinta de texto.
 */
@Component({
  selector: 'app-donut-chart',
  imports: [DecimalPipe],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChart {
  readonly data = input.required<ChartDatum[]>();
  readonly centerLabel = input('Total');
  readonly segmentClick = output<string>();

  protected readonly radius = RADIUS;

  protected readonly total = computed(() =>
    this.data().reduce((sum, datum) => sum + datum.value, 0),
  );

  protected readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (total === 0) {
      return [];
    }
    let offset = 0;
    return this.data().map((datum, index) => {
      const fraction = datum.value / total;
      const length = Math.max(fraction * CIRCUMFERENCE - GAP, 1);
      const segment: DonutSegment = {
        label: datum.label,
        value: datum.value,
        trend: datum.trend,
        percent: Math.round(fraction * 100),
        color: CHART_COLORS[index % CHART_COLORS.length],
        dasharray: `${length} ${CIRCUMFERENCE - length}`,
        dashoffset: -offset,
      };
      offset += fraction * CIRCUMFERENCE;
      return segment;
    });
  });
}
