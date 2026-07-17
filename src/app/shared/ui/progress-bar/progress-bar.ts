import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProgressVariant = 'success' | 'info' | 'danger' | 'neutral';

/**
 * Barra de progreso del kit Ventas360 (Figma: Labels → barras de progreso).
 * Usada en la tabla de gestión operativa para el avance de cada viaje.
 */
@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBar {
  /** 0 a 100 */
  readonly value = input.required<number>();
  readonly variant = input<ProgressVariant>('info');

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value())));
}
