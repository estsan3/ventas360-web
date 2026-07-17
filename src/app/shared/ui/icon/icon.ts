import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'search'
  | 'filter'
  | 'plus'
  | 'x'
  | 'check-circle'
  | 'alert-triangle'
  | 'alert-circle'
  | 'info'
  | 'truck'
  | 'grid'
  | 'dollar'
  | 'message'
  | 'list'
  | 'settings'
  | 'play'
  | 'bell'
  | 'user'
  | 'chevron-down'
  | 'more-vertical'
  | 'ticket'
  | 'file-text'
  | 'clock'
  | 'fuel'
  | 'copy'
  | 'trash'
  | 'check-double'
  | 'map-pin'
  | 'send'
  | 'shield'
  | 'package'
  | 'log-out'
  | 'menu';

/**
 * Iconografía del kit Ventas360 (Figma: Componentes → íconos).
 * SVGs inline estilo stroke, tamaño controlado por font-size del contenedor.
 */
@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
}
