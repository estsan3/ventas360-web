import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'danger' | 'outline';
export type ButtonSize = 'xl' | 'md' | 'sm';

/**
 * Botón del kit Ventas360 (Figma: Componentes → XL / Medium / Small).
 * Presentacional puro: el contenido (texto y/o icono svg) se proyecta.
 */
@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit'>('button');
  readonly fullWidth = input(false);

  readonly clicked = output<void>();
}
