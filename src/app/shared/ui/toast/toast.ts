import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type ToastVariant = 'success' | 'error' | 'warning';

/**
 * Toast del kit Ventas360 (Figma: Componentes → Toasts).
 * Presentacional: el módulo notifications/ decide cuándo y cuál mostrar.
 */
@Component({
  selector: 'app-toast',
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  readonly variant = input.required<ToastVariant>();
  readonly title = input.required<string>();
  readonly message = input('');
  readonly dismissible = input(true);

  readonly closed = output<void>();

  protected readonly iconName = computed<IconName>(() => {
    switch (this.variant()) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert-triangle';
    }
  });
}
