import { Injectable, signal } from '@angular/core';

export type ConfirmDialogVariant = 'default' | 'danger';

export interface ConfirmDialogOptions {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variant?: ConfirmDialogVariant;
}

/**
 * Diálogo de confirmación global (reemplaza window.confirm).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly abierto = signal(false);
  readonly titulo = signal('Confirmar');
  readonly mensaje = signal('');
  readonly textoConfirmar = signal('Confirmar');
  readonly textoCancelar = signal('Cancelar');
  readonly variant = signal<ConfirmDialogVariant>('default');

  private resolver: ((value: boolean) => void) | null = null;

  abrir(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
    }

    this.titulo.set(options.titulo ?? 'Confirmar');
    this.mensaje.set(options.mensaje);
    this.textoConfirmar.set(options.textoConfirmar ?? 'Confirmar');
    this.textoCancelar.set(options.textoCancelar ?? 'Cancelar');
    this.variant.set(options.variant ?? 'default');
    this.abierto.set(true);

    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  confirmarCierreSinGuardar(): Promise<boolean> {
    return this.abrir({
      titulo: 'Cambios sin guardar',
      mensaje: 'Hay cambios sin guardar. ¿Desea cerrar igualmente?',
      textoConfirmar: 'Cerrar sin guardar',
      textoCancelar: 'Seguir editando',
    });
  }

  confirmar(): void {
    this.cerrar(true);
  }

  cancelar(): void {
    this.cerrar(false);
  }

  private cerrar(resultado: boolean): void {
    this.abierto.set(false);
    const resolver = this.resolver;
    this.resolver = null;
    resolver?.(resultado);
  }
}
