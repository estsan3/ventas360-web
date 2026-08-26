import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { Toast } from '../../shared/ui/toast/toast';

/**
 * Pantalla de login (Figma: Login 173:1629): panel promocional verde
 * a la izquierda, formulario a la derecha.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, Button, Icon, TextInput, Toast],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly loginError = signal('');

  protected readonly contexto = this.authStore.contexto;
  protected readonly hostOk = computed(() => {
    const ctx = this.contexto();
    if (!ctx) {
      return false;
    }
    if (ctx.tipo === 'plataforma') {
      return true;
    }
    return ctx.tipo === 'comercio' && ctx.tenant !== null;
  });
  protected readonly tituloHost = computed(() => {
    const ctx = this.contexto();
    if (ctx?.tipo === 'plataforma') {
      return 'Plataforma';
    }
    return ctx?.tenant?.nombre ?? 'Ventas360';
  });
  protected readonly subtituloHost = computed(() => {
    const ctx = this.contexto();
    if (!ctx || ctx.tipo === 'sin_slug') {
      return 'Entrá con el subdominio de tu comercio (ej. demo.localhost:4201).';
    }
    if (ctx.tipo === 'plataforma') {
      return 'Administración de comercios';
    }
    if (!ctx.tenant) {
      return 'No hay un comercio para este subdominio.';
    }
    return 'Accedé al panel de tu comercio';
  });

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  constructor() {
    if (this.authStore.isAuthenticated()) {
      void this.router.navigateByUrl(this.authStore.rutaInicial());
    }
  }

  protected fieldError(field: 'email' | 'password'): string {
    const control = this.form.controls[field];
    if (!control.touched || control.valid) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('email')) {
      return 'El correo no es válido';
    }
    if (control.hasError('minlength')) {
      return 'Mínimo 4 caracteres';
    }
    return '';
  }

  protected submit(): void {
    this.loginError.set('');
    if (!this.hostOk()) {
      this.loginError.set(this.subtituloHost());
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authStore.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.authStore.rutaInicial());
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.loginError.set(error.message);
      },
    });
  }
}
