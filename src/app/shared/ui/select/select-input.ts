import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Select del kit Ventas360 (Figma: Crear despacho → selects del formulario).
 * ControlValueAccessor: se usa con formControlName igual que TextInput.
 */
@Component({
  selector: 'app-select-input',
  templateUrl: './select-input.html',
  styleUrl: './select-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectInput),
      multi: true,
    },
  ],
})
export class SelectInput implements ControlValueAccessor {
  readonly label = input('');
  readonly placeholder = input('Seleccionar…');
  readonly options = input.required<SelectOption[]>();
  readonly error = input('');

  readonly selectId = `app-select-${nextId++}`;
  readonly value = signal('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected handleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}
