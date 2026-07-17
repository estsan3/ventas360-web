import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Logo } from '../../shared/ui/logo/logo';
import { AuthStore } from '../state/auth.store';

export interface TopbarNavItem {
  id: string;
  label: string;
}

/**
 * Header global del mock DC: logo + nav horizontal + contexto + avatar.
 */
@Component({
  selector: 'app-topbar',
  imports: [Logo],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  private readonly router = inject(Router);

  readonly items = input<TopbarNavItem[]>([]);
  readonly activeId = input<string | null>(null);
  readonly itemSelected = output<string>();

  protected readonly authStore = inject(AuthStore);
  protected readonly menuPerfilAbierto = signal(false);

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

  protected seleccionar(id: string): void {
    this.itemSelected.emit(id);
  }

  protected irAConfiguracion(): void {
    this.menuPerfilAbierto.set(false);
    this.router.navigate(['/configuracion']);
  }

  protected cerrarSesion(): void {
    this.menuPerfilAbierto.set(false);
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
