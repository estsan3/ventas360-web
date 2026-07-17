import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast } from '../../shared/ui/toast/toast';
import { NotificationStore } from '../state/notification.store';

/**
 * Overlay global de toasts (esquina superior derecha).
 * Se monta una sola vez en App; solo lee el NotificationStore.
 */
@Component({
  selector: 'app-toast-container',
  imports: [Toast],
  template: `
    <div class="container">
      @for (notification of store.notifications(); track notification.id) {
        <app-toast
          [variant]="notification.variant"
          [title]="notification.title"
          [message]="notification.message"
          (closed)="store.dismiss(notification.id)"
        />
      }
    </div>
  `,
  styles: [
    `
      @use 'tokens' as t;

      .container {
        position: fixed;
        top: t.$space-md;
        right: t.$space-md;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: t.$space-sm;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainer {
  protected readonly store = inject(NotificationStore);
}
