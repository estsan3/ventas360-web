import { TestBed } from '@angular/core/testing';
import { NotificationStore } from './notification.store';

describe('NotificationStore', () => {
  let store: NotificationStore;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    store = TestBed.inject(NotificationStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('notify agrega una notificación con la variante indicada', () => {
    store.error('Algo salió mal', 'detalle');

    expect(store.notifications()).toHaveLength(1);
    expect(store.notifications()[0].variant).toBe('error');
    expect(store.notifications()[0].title).toBe('Algo salió mal');
  });

  it('dismiss quita la notificación por id', () => {
    store.success('Uno');
    store.warning('Dos');
    const [primera] = store.notifications();

    store.dismiss(primera.id);

    expect(store.notifications()).toHaveLength(1);
    expect(store.notifications()[0].title).toBe('Dos');
  });

  it('las notificaciones se auto-cierran a los 5 segundos', () => {
    store.success('Efímera');
    expect(store.notifications()).toHaveLength(1);

    vi.advanceTimersByTime(5000);

    expect(store.notifications()).toHaveLength(0);
  });
});
