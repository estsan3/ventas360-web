import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { Logo } from '../logo/logo';
import {
  leerBreakpointTablet,
  querySidebarCompacta,
  sidebarExpandidaPorDefecto,
} from './sidebar-viewport';

export interface SidebarItem {
  id: string;
  icon: IconName;
  label: string;
  section?: 'top' | 'bottom';
  adminOnly?: boolean;
}

/**
 * Sidebar vertical colapsable (mock DC): hamburguesa + logo + nav + pie.
 * Expandida ~224px (con etiquetas); colapsada ~68px (solo iconos).
 * En tablet/mobile (≤ `--breakpoint-tablet`) arranca colapsada; el hamburguesa sigue siendo override.
 */
@Component({
  selector: 'app-sidebar',
  imports: [Icon, Logo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<SidebarItem[]>();
  readonly activeId = input('');
  /** Iniciales del avatar del pie */
  readonly avatarIniciales = input('U');
  /** Texto del pie (visible solo expandido) */
  readonly pieTexto = input('Comercio');

  readonly itemSelected = output<string>();
  readonly avatarClicked = output<void>();

  protected readonly expandida = signal(true);

  constructor() {
    const mq = this.mediaQueryCompacta();
    if (!mq) {
      return;
    }
    this.expandida.set(sidebarExpandidaPorDefecto(mq.matches));
    const onChange = (): void => {
      this.expandida.set(sidebarExpandidaPorDefecto(mq.matches));
    };
    mq.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => mq.removeEventListener('change', onChange));
  }

  protected itemsIn(section: 'top' | 'bottom'): SidebarItem[] {
    return this.items().filter((item) => (item.section ?? 'top') === section);
  }

  protected toggle(): void {
    this.expandida.update((v) => !v);
  }

  private mediaQueryCompacta(): MediaQueryList | null {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return null;
    }
    return window.matchMedia(querySidebarCompacta(leerBreakpointTablet()));
  }
}
