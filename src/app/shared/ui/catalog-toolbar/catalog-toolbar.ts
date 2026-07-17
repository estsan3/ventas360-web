import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextInput } from '../input/text-input';
import { SelectInput, SelectOption } from '../select/select-input';

/**
 * Toolbar presentacional de listados (buscar + filtro estado).
 * Dumb: sin HTTP ni stores.
 */
@Component({
  selector: 'app-catalog-toolbar',
  imports: [FormsModule, TextInput, SelectInput],
  templateUrl: './catalog-toolbar.html',
  styleUrl: './catalog-toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogToolbar {
  readonly busqueda = input('');
  readonly filtro = input('');
  readonly filtroOptions = input.required<SelectOption[]>();
  readonly placeholderBusqueda = input('Buscar…');

  readonly busquedaChange = output<string>();
  readonly filtroChange = output<string>();
}
