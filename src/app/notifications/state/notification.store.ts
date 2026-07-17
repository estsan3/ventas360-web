import { Injectable, signal } from '@angular/core';
import { ToastVariant } from '../../shared/ui/toast/toast';

export interface AppNotification {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
}

const AUTO_CLOSE_MS = 5000;
let nextId = 0;

/**
 * Módulo de notificaciones desacoplado: cualquier parte de la app
 * (interceptors, stores, features) puede notificar sin conocer la UI.
 * El toast-container solo lee este store.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStore {
  private readonly _notifications = signal<AppNotification[]>([]);

  readonly notifications = this._notifications.asReadonly();

  notify(variant: ToastVariant, title: string, message = ''): void {
    const notification: AppNotification = { id: nextId++, variant, title, message };
    this._notifications.update((list) => [...list, notification]);
    setTimeout(() => this.dismiss(notification.id), AUTO_CLOSE_MS);
  }

  success(title: string, message = ''): void {
    this.notify('success', title, message);
  }

  error(title: string, message = ''): void {
    this.notify('error', title, message);
  }

  warning(title: string, message = ''): void {
    this.notify('warning', title, message);
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }
}
