import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
 * Sidebar de navegación del kit Ventas360.
 * Fila superior tipo header: hamburguesa (cuadrado tintado) + logo
 * grande cuando está expandida. Colapsada muestra solo iconos.
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
  /** Línea secundaria bajo el logo (ej. la fecha) — solo visible expandida */
  readonly subtitle = input('');

  readonly itemSelected = output<string>();

  protected readonly expandida = signal(true);

  protected itemsIn(section: 'top' | 'bottom'): SidebarItem[] {
    return this.items().filter((item) => (item.section ?? 'top') === section);
  }
}
