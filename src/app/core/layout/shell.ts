import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Sidebar, SidebarItem } from '../../shared/ui/sidebar/sidebar';
import { AuthStore } from '../state/auth.store';

/** Navegación alineada al mock DC Ventas360 (sidebar vertical). */
const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Inicio', icon: 'grid' },
  { id: 'ventas', label: 'Mostrador', icon: 'file-text' },
  { id: 'presupuestos', label: 'Presup.', icon: 'ticket' },
  { id: 'pedidos', label: 'Pedidos', icon: 'list' },
  { id: 'remitos', label: 'Remitos', icon: 'truck' },
  { id: 'clientes', label: 'Clientes', icon: 'user' },
  { id: 'cuenta-corriente', label: 'Cta. cte.', icon: 'dollar' },
  { id: 'productos', label: 'Artículos', icon: 'package' },
  { id: 'inventario', label: 'Stock', icon: 'package' },
  { id: 'compras', label: 'Compras', icon: 'truck' },
  { id: 'caja', label: 'Caja', icon: 'dollar' },
  { id: 'configuracion', label: 'Config.', icon: 'settings', section: 'bottom' },
];

/**
 * Layout principal: sidebar vertical colapsable + contenido ruteado.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);

  protected readonly items = computed(() => NAV_ITEMS);
  protected readonly menuPerfilAbierto = signal(false);

  protected readonly activeId = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.currentSection()),
    ),
    { initialValue: this.currentSection() },
  );

  protected readonly iniciales = computed(() => {
    const nombre = this.authStore.user()?.nombre?.trim() ?? '';
    if (!nombre) {
      return 'U';
    }
    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) {
      return partes[0].slice(0, 2).toUpperCase();
    }
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  });

  protected readonly pieTexto = computed(() => {
    const user = this.authStore.user();
    return user ? `Suc. Central · ${user.nombre.split(/\s+/)[0]}` : 'Suc. Central · Caja 1';
  });

  protected navigate(id: string): void {
    this.menuPerfilAbierto.set(false);
    this.router.navigate(['/', id]);
  }

  protected abrirPerfil(): void {
    this.menuPerfilAbierto.update((v) => !v);
  }

  protected irAConfiguracion(): void {
    this.menuPerfilAbierto.set(false);
    this.router.navigate(['/configuracion']);
  }

  protected cerrarSesion(): void {
    this.menuPerfilAbierto.set(false);
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }

  private currentSection(): string {
    return this.router.url.split('/')[1]?.split('?')[0] ?? '';
  }
}
