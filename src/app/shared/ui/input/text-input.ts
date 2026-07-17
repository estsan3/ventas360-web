import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatCuitInput } from '../../../core/utils/format-cuit';

let nextId = 0;

/**
 * Input de texto del kit Ventas360 (Figma: Componentes → Input).
 * Implementa ControlValueAccessor: se usa igual con [(ngModel)] o formControlName.
 */
@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.html',
  styleUrl: './text-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInput),
      multi: true,
    },
  ],
})
export class TextInput implements ControlValueAccessor {
  readonly label = input('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'date'>('text');
  readonly placeholder = input('');
  readonly error = input('');
  /** Máscara de entrada en vivo (`cuit` → XX-XXXXXXXX-X). */
  readonly mask = input<'cuit' | ''>('');

  readonly inputId = `app-text-input-${nextId++}`;
  readonly value = signal('');
  readonly disabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    const crudo = value ?? '';
    this.value.set(this.mask() === 'cuit' ? formatCuitInput(crudo) : crudo);
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

  protected handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    if (this.mask() === 'cuit') {
      value = formatCuitInput(value);
      if (input.value !== value) {
        input.value = value;
      }
    }
    this.value.set(value);
    this.onChange(value);
  }
}
