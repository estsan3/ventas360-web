import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';

@Component({
  selector: 'app-configuracion-page',
  imports: [Button, Icon],
  templateUrl: './configuracion-page.html',
  styleUrl: './configuracion-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionPage {
  private readonly router = inject(Router);

  protected readonly authStore = inject(AuthStore);

  protected cerrarSesion(): void {
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
