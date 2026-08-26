import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { etiquetaRol } from '../../core/models/modulos';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { ComercioDetalle, UsuarioComercio } from './data-access/comercio.model';
import { ComerciosStore } from './data-access/comercios.store';

function slugDesdeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

@Component({
  selector: 'app-comercios-page',
  imports: [
    Badge,
    Button,
    Icon,
    ReactiveFormsModule,
    SideDrawer,
    TextInput,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './comercios-page.html',
  styleUrl: './comercios-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComerciosPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(ComerciosStore);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly etiquetaRol = etiquetaRol;
  protected readonly guardando = signal(false);
  protected readonly panel = signal<'alta' | 'detalle' | null>(null);
  protected readonly detalle = signal<ComercioDetalle | null>(null);
  protected readonly usuarioClaveId = signal<string | null>(null);
  protected readonly estado = this.store.comercios;
  private slugManual = false;

  protected readonly columnas: TableColumn[] = [
    { key: 'nombre', label: 'Comercio' },
    { key: 'slug', label: 'Subdominio', width: '140px' },
    { key: 'admin', label: 'Administrador' },
    { key: 'adminEmail', label: 'Email' },
    { key: 'adminDni', label: 'DNI', width: '120px' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '180px', align: 'right' },
  ];

  protected readonly filas = computed(() =>
    (this.estado().data ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      slug: c.slug,
      adminNombre: c.adminNombre ?? '',
      adminEmail: c.adminEmail ?? '',
      adminDni: c.adminDni ?? '',
      estado: c.activo ? 'Activo' : 'Inactivo',
      activo: c.activo,
    })),
  );

  protected readonly tituloDrawer = computed(() =>
    this.panel() === 'detalle' ? (this.detalle()?.nombre ?? 'Comercio') : 'Nuevo comercio',
  );

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$/)]],
    adminNombre: ['', [Validators.required, Validators.minLength(2)]],
    adminDni: ['', [Validators.required, Validators.minLength(6)]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly formClave = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.store.cargar();
    this.form.controls.nombre.valueChanges.subscribe((nombre) => {
      if (this.slugManual || this.panel() !== 'alta') {
        return;
      }
      this.form.controls.slug.setValue(slugDesdeNombre(nombre), { emitEvent: false });
    });
    this.form.controls.slug.valueChanges.subscribe(() => {
      if (this.panel() === 'alta') {
        this.slugManual = true;
      }
    });
  }

  protected abrirAlta(): void {
    this.panel.set(null);
    this.slugManual = false;
    this.usuarioClaveId.set(null);
    this.detalle.set(null);
    this.form.reset({
      nombre: '',
      slug: '',
      adminNombre: '',
      adminDni: '',
      adminEmail: '',
      adminPassword: '',
    });
    this.panel.set('alta');
  }

  protected abrirDetalle(id: string): void {
    this.usuarioClaveId.set(null);
    this.formClave.reset({ password: '' });
    this.store.obtener(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.panel.set('detalle');
      },
    });
  }

  protected cerrarPanel(): void {
    this.panel.set(null);
    this.detalle.set(null);
    this.usuarioClaveId.set(null);
  }

  protected crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notifications.error('Faltan datos', 'Completá nombre, subdominio y el admin inicial.');
      return;
    }
    this.guardando.set(true);
    this.store.crear(this.form.getRawValue()).subscribe({
      next: (creado) => {
        this.notifications.success(
          'Comercio creado',
          `${creado.nombre} · ${creado.slug}.localhost`,
        );
        this.guardando.set(false);
        this.cerrarPanel();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected mostrarClave(usuario: UsuarioComercio): void {
    this.usuarioClaveId.set(usuario.id);
    this.formClave.reset({ password: '' });
  }

  protected guardarClave(usuario: UsuarioComercio): void {
    const comercio = this.detalle();
    if (!comercio) {
      return;
    }
    if (this.formClave.invalid) {
      this.formClave.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.store
      .cambiarPassword(comercio.id, usuario.id, this.formClave.getRawValue().password)
      .subscribe({
        next: () => {
          this.notifications.success('Contraseña actualizada', usuario.email);
          this.guardando.set(false);
          this.usuarioClaveId.set(null);
          this.formClave.reset({ password: '' });
        },
        error: () => this.guardando.set(false),
      });
  }

  protected async toggleActivo(id: string): Promise<void> {
    const actual = (this.estado().data ?? []).find((c) => c.id === id);
    if (!actual) {
      return;
    }
    const activar = !actual.activo;
    const ok = await this.confirmDialog.abrir({
      titulo: activar ? 'Activar comercio' : 'Desactivar comercio',
      mensaje: activar
        ? `¿Activar ${actual.nombre}?`
        : `¿Desactivar ${actual.nombre}? Dejará de poder iniciar sesión.`,
      textoConfirmar: activar ? 'Activar' : 'Desactivar',
      variant: activar ? 'default' : 'danger',
    });
    if (!ok) {
      return;
    }
    this.store.setActivo(id, activar).subscribe((c) => {
      this.notifications.success(activar ? 'Comercio activo' : 'Comercio inactivo', c.nombre);
      const abierto = this.detalle();
      if (abierto?.id === c.id) {
        this.detalle.set({ ...abierto, activo: c.activo });
      }
    });
  }

  protected errorAlta(
    campo: 'nombre' | 'slug' | 'adminNombre' | 'adminDni' | 'adminEmail' | 'adminPassword',
  ): string {
    const control = this.form.controls[campo];
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
      return campo === 'adminPassword' ? 'Mínimo 8 caracteres' : 'Demasiado corto';
    }
    if (control.hasError('pattern')) {
      return 'Solo minúsculas, números y guiones (ej. agronorte)';
    }
    return '';
  }

  protected errorClave(): string {
    const control = this.formClave.controls.password;
    if (!control.touched || control.valid) {
      return '';
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('minlength')) {
      return 'Mínimo 8 caracteres';
    }
    return '';
  }
}
