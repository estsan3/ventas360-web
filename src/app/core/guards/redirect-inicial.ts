import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Ruta vacía: el guard redirige antes de renderizar. */
@Component({
  selector: 'app-redirect-inicial',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedirectInicial {}
