import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Sidebar, SidebarItem } from '../../shared/ui/sidebar/sidebar';
import { Topbar } from './topbar';

const TITULOS: Record<string, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  productos: 'Productos',
  ventas: 'Ventas',
  configuracion: 'Configuración',
};

const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard', icon: 'grid', label: 'Dashboard' },
  { id: 'clientes', icon: 'user', label: 'Clientes' },
  { id: 'productos', icon: 'package', label: 'Productos' },
  { id: 'ventas', icon: 'dollar', label: 'Ventas' },
  { id: 'configuracion', icon: 'settings', label: 'Configuración', section: 'bottom' },
];

/**
 * Layout principal autenticado: sidebar de navegación + contenido ruteado.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Topbar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);

  protected readonly items = computed(() => NAV_ITEMS);

  protected readonly activeId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.currentSection()),
    ),
    { initialValue: this.currentSection() },
  );

  protected readonly titulo = computed(() => TITULOS[this.activeId() ?? ''] ?? 'Ventas360');

  protected navigate(id: string): void {
    this.router.navigate(['/', id]);
  }

  private currentSection(): string {
    return this.router.url.split('/')[1]?.split('?')[0] ?? '';
  }
}
