import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type KpiTone = 'brand' | 'neutral' | 'orange' | 'amber' | 'red' | 'green';

/**
 * Card de KPI del kit Ventas360 (Figma: UI Kit Gestión → Card / Reportería,
 * y totalizadores de Gestión operativa).
 * light: card blanca con icono en cuadrado verde y chip de tendencia.
 * dark: card verde profunda (ej. Recaudación $619,000).
 * tone (≠ brand): panel de icono tintado + valor coloreado (totalizadores).
 */
@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCard {
  readonly variant = input<'light' | 'dark'>('light');
  readonly tone = input<KpiTone>('brand');
  /** stat: icono arriba y chip de tendencia flotante (dashboard Reportería) */
  readonly layout = input<'row' | 'stat'>('row');
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  /** Chip de tendencia, ej. "+12%" */
  readonly trend = input('');
  /** Semántica del chip: neutral = dato informativo (sin flecha, gris) */
  readonly trendTone = input<'auto' | 'good' | 'bad' | 'neutral'>('auto');
  /** Línea de contexto bajo el valor, ej. "182 tn en movimiento" */
  readonly detail = input('');

  protected readonly trendIsBad = computed(() => {
    if (this.trendTone() === 'neutral') {
      return false;
    }
    if (this.trendTone() !== 'auto') {
      return this.trendTone() === 'bad';
    }
    return this.trend().startsWith('-');
  });

  protected readonly trendGlyph = computed(() => (this.trend().startsWith('-') ? '↘' : '↗'));
}
