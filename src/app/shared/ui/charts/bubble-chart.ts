import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartDatum } from './chart-colors';

interface Bubble {
  label: string;
  percent: number;
  cx: number;
  cy: number;
  r: number;
  color: string;
  textColor: string;
}

// Verdes de marca en escala (identidad por label directo, no por color)
const BUBBLE_COLORS = ['#1a4d2e', '#00a63e', '#4ade80'];
const POSICIONES = [
  { cx: 105, cy: 78 },
  { cx: 52, cy: 60 },
  { cx: 62, cy: 122 },
];

/**
 * Burbujas proporcionales (Figma: Reportería → Viajes por destino).
 * Muestra hasta 3 categorías; el detalle completo va en la lista lateral.
 */
@Component({
  selector: 'app-bubble-chart',
  templateUrl: './bubble-chart.html',
  styleUrl: './bubble-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BubbleChart {
  readonly data = input.required<ChartDatum[]>();

  protected readonly bubbles = computed<Bubble[]>(() => {
    const total = this.data().reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
      return [];
    }
    return this.data()
      .slice(0, 3)
      .map((datum, index) => {
        const percent = Math.round((datum.value / total) * 100);
        return {
          label: datum.label,
          percent,
          ...POSICIONES[index],
          r: 20 + Math.sqrt(percent) * 4.2,
          color: BUBBLE_COLORS[index],
          textColor: index === 2 ? '#14532d' : '#ffffff',
        };
      });
  });
}
