import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-tesoreria-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './tesoreria-page.html',
  styleUrl: './tesoreria-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreriaPage {
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly contextoTxt = computed(() => {
    const u = this.url();
    if (u.includes('/cheques')) {
      return 'Cartera de terceros y propios · vencimientos y endosos';
    }
    if (u.includes('/pagos')) {
      return 'Pagos a proveedores · baja CxP y pega en caja, banco o cartera';
    }
    return 'Apertura y cierre de turno · movimientos del día y arqueo';
  });
}
