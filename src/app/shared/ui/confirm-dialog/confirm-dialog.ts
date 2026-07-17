import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Modal de confirmación del sistema (sustituto de window.confirm).
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Button, Icon],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly dialog = inject(ConfirmDialogService);

  protected readonly icono = computed(() =>
    this.dialog.variant() === 'danger' ? 'alert-triangle' : 'alert-circle',
  );

  protected readonly confirmVariant = computed(() =>
    this.dialog.variant() === 'danger' ? 'danger' : 'primary',
  );
}
