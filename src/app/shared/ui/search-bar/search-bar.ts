import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Barra de búsqueda del kit Ventas360: campo protagonista con lupa de
 * marca y botón de limpiar cuando hay texto.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  readonly placeholder = input('Buscar...');
  readonly value = input('');

  readonly valueChange = output<string>();

  protected readonly texto = signal('');

  protected handleInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.valueChange.emit(valor);
  }

  protected limpiar(campo: HTMLInputElement): void {
    campo.value = '';
    this.texto.set('');
    this.valueChange.emit('');
    campo.focus();
  }
}
