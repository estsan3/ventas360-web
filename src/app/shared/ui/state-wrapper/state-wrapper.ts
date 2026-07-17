import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AsyncStatus } from '../../../core/models/async-state';
import { Icon } from '../icon/icon';

/**
 * Wrapper de estados async: renderiza skeleton/error/vacío/contenido
 * de forma consistente en toda la app. El contenido se proyecta y se
 * muestra solo en success.
 */
@Component({
  selector: 'app-state-wrapper',
  imports: [Icon],
  templateUrl: './state-wrapper.html',
  styleUrl: './state-wrapper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateWrapper {
  readonly status = input.required<AsyncStatus>();
  readonly error = input('');
  /** true cuando success pero sin datos: muestra mensaje de vacío */
  readonly empty = input(false);
  readonly emptyMessage = input('No hay datos para mostrar');
  /** cantidad de filas del skeleton de carga */
  readonly skeletonRows = input(3);
}
