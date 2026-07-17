import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../shared/ui/icon/icon';
import { AuthStore } from '../state/auth.store';

/**
 * Header global: fecha, menú de perfil y cierre de sesión.
 */
@Component({
  selector: 'app-topbar',
  imports: [Icon],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  private readonly router = inject(Router);

  protected readonly authStore = inject(AuthStore);
  protected readonly menuPerfilAbierto = signal(false);

  protected readonly fecha = (() => {
    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const MESES = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${DIAS[hoy.getDay()]}, ${dia} de ${MESES[hoy.getMonth()]} del ${hoy.getFullYear()}`;
  })();

  protected irAMiPerfil(): void {
    this.menuPerfilAbierto.set(false);
    this.router.navigate(['/configuracion']);
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
