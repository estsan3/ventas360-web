import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Panel lateral deslizable con backdrop (patrón topbar buscador).
 */
@Component({
  selector: 'app-side-drawer',
  imports: [Button, Icon],
  templateUrl: './side-drawer.html',
  styleUrl: './side-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideDrawer {
  readonly abierto = input(false);
  readonly titulo = input('');
  readonly ancho = input('600px');

  readonly cerrar = output<void>();

  protected onBackdropClick(): void {
    this.cerrar.emit();
  }
}
