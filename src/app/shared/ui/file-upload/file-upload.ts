import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';

export interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  dataUrl: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Carga de imagen mock (base64 local) con preview y límite de 5 MB.
 */
@Component({
  selector: 'app-file-upload',
  imports: [Icon],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUpload),
      multi: true,
    },
  ],
})
export class FileUpload implements ControlValueAccessor {
  readonly label = input('Archivo');
  readonly soloLectura = input(false);

  protected readonly deshabilitado = signal(false);

  protected readonly error = signal('');
  protected readonly preview = signal<ArchivoAdjunto | undefined>(undefined);

  private onChange: (value: ArchivoAdjunto | undefined) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: ArchivoAdjunto | undefined): void {
    this.preview.set(value);
  }

  registerOnChange(fn: (value: ArchivoAdjunto | undefined) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.deshabilitado.set(isDisabled);
  }

  protected onFileSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error.set('Solo se permiten imágenes');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('El archivo supera 5 MB');
      return;
    }
    this.error.set('');
    const reader = new FileReader();
    reader.onload = () => {
      const adjunto: ArchivoAdjunto = {
        nombre: file.name,
        tipo: file.type,
        dataUrl: String(reader.result),
      };
      this.preview.set(adjunto);
      this.onChange(adjunto);
      this.onTouched();
    };
    reader.readAsDataURL(file);
  }

  protected quitar(): void {
    this.preview.set(undefined);
    this.onChange(undefined);
    this.onTouched();
  }
}
