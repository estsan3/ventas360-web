import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CHART_PAIR } from './chart-colors';

export interface GroupedBarDatum {
  label: string;
  values: [number, number];
}

interface BarGroup {
  label: string;
  x: number;
  bars: { path: string; value: number; color: string; cx: number; y: number }[];
}

const WIDTH = 560;
const HEIGHT = 220;
const PADDING_BOTTOM = 24;
const PADDING_TOP = 12;
const PADDING_LEFT = 36;
const BAR_WIDTH = 18;
const BAR_GAP = 6;
const RADIUS = 4;

/**
 * Barras agrupadas de 2 series (Figma: Reportería → Viajes por campos).
 * Par de verdes validado; leyenda provista por el contenedor.
 */
@Component({
  selector: 'app-grouped-bar-chart',
  templateUrl: './grouped-bar-chart.html',
  styleUrl: './grouped-bar-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupedBarChart {
  readonly data = input.required<GroupedBarDatum[]>();
  readonly series = input.required<[string, string]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly colors = CHART_PAIR;
  protected readonly baseline = HEIGHT - PADDING_BOTTOM;
  private readonly plotHeight = HEIGHT - PADDING_BOTTOM - PADDING_TOP;

  protected readonly max = computed(() => Math.max(...this.data().flatMap((d) => d.values), 1));

  protected readonly gridLines = computed(() => {
    const step = this.plotHeight / 4;
    return [0, 1, 2, 3, 4].map((i) => ({
      y: PADDING_TOP + i * step,
      value: Math.round((this.max() * (4 - i)) / 4),
    }));
  });

  protected readonly groups = computed<BarGroup[]>(() => {
    const data = this.data();
    if (data.length === 0) {
      return [];
    }
    const slot = (WIDTH - PADDING_LEFT) / data.length;
    const groupWidth = BAR_WIDTH * 2 + BAR_GAP;

    return data.map((datum, groupIndex) => {
      const groupX = PADDING_LEFT + slot * groupIndex + (slot - groupWidth) / 2;
      return {
        label: datum.label,
        x: groupX + groupWidth / 2,
        bars: datum.values.map((value, serieIndex) => {
          const height = Math.max((value / this.max()) * this.plotHeight, 2);
          const x = groupX + serieIndex * (BAR_WIDTH + BAR_GAP);
          const y = this.baseline - height;
          const r = Math.min(RADIUS, BAR_WIDTH / 2, height);
          return {
            value,
            color: this.colors[serieIndex],
            cx: x + BAR_WIDTH / 2,
            y,
            path: [
              `M ${x} ${this.baseline}`,
              `V ${y + r}`,
              `Q ${x} ${y} ${x + r} ${y}`,
              `H ${x + BAR_WIDTH - r}`,
              `Q ${x + BAR_WIDTH} ${y} ${x + BAR_WIDTH} ${y + r}`,
              `V ${this.baseline}`,
              'Z',
            ].join(' '),
          };
        }),
      };
    });
  });
}
