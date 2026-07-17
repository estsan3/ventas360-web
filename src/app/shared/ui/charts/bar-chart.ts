import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CHART_COLORS, ChartDatum } from './chart-colors';

interface Bar {
  label: string;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
}

const WIDTH = 420;
const HEIGHT = 200;
const PADDING_BOTTOM = 24;
const PADDING_TOP = 18;
const BAR_MAX_WIDTH = 48;
const RADIUS = 4; // redondeo solo en el extremo del dato (arriba)

/**
 * Barras verticales de una serie (Figma: Reportería → Viajes por campos).
 * Serie única: sin leyenda (el título la nombra), labels directos en tinta.
 */
@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
  readonly data = input.required<ChartDatum[]>();
  /** Índice en la paleta del kit (0–3). */
  readonly colorIndex = input(0);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly color = computed(() => CHART_COLORS[this.colorIndex() % CHART_COLORS.length]);
  protected readonly plotHeight = HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  protected readonly baseline = HEIGHT - PADDING_BOTTOM;

  protected readonly gridLines = computed(() => {
    const step = this.plotHeight / 3;
    return [0, 1, 2, 3].map((i) => PADDING_TOP + i * step);
  });

  protected readonly bars = computed<Bar[]>(() => {
    const data = this.data();
    if (data.length === 0) {
      return [];
    }
    const max = Math.max(...data.map((d) => d.value), 1);
    const slot = WIDTH / data.length;
    const barWidth = Math.min(slot * 0.5, BAR_MAX_WIDTH);

    return data.map((datum, index) => {
      const height = Math.max((datum.value / max) * this.plotHeight, 2);
      const x = slot * index + (slot - barWidth) / 2;
      const y = this.baseline - height;
      const r = Math.min(RADIUS, barWidth / 2, height);
      // Redondeo solo arriba (extremo del dato), base recta sobre el eje
      const path = [
        `M ${x} ${this.baseline}`,
        `V ${y + r}`,
        `Q ${x} ${y} ${x + r} ${y}`,
        `H ${x + barWidth - r}`,
        `Q ${x + barWidth} ${y} ${x + barWidth} ${y + r}`,
        `V ${this.baseline}`,
        'Z',
      ].join(' ');
      return {
        label: datum.label.length > 14 ? `${datum.label.slice(0, 12)}…` : datum.label,
        value: datum.value,
        x,
        y,
        width: barWidth,
        height,
        path,
      };
    });
  });
}
