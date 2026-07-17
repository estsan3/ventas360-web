import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Modal centrado con backdrop (patrón topbar buscador).
 */
@Component({
  selector: 'app-modal',
  imports: [Button, Icon],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly abierto = input(false);
  readonly titulo = input('');
  readonly ancho = input('1440px');

  readonly cerrar = output<void>();
}
