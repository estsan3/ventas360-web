import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { Logo } from '../logo/logo';

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
 */
@Component({
  selector: 'app-sidebar',
  imports: [Icon, Logo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly items = input.required<SidebarItem[]>();
  readonly activeId = input('');
  /** Iniciales del avatar del pie */
  readonly avatarIniciales = input('U');
  /** Texto del pie (visible solo expandido) */
  readonly pieTexto = input('Suc. Central · Caja 1');

  readonly itemSelected = output<string>();
  readonly avatarClicked = output<void>();

  protected readonly expandida = signal(true);

  protected readonly widthPx = computed(() => (this.expandida() ? '224px' : '68px'));

  protected itemsIn(section: 'top' | 'bottom'): SidebarItem[] {
    return this.items().filter((item) => (item.section ?? 'top') === section);
  }

  protected toggle(): void {
    this.expandida.update((v) => !v);
  }
}
