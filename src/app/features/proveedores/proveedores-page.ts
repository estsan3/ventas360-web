import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { CatalogToolbar } from '../../shared/ui/catalog-toolbar/catalog-toolbar';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { CondicionIva, Proveedor } from './data-access/proveedor.model';
import { ProveedoresStore } from './data-access/proveedores.store';

@Component({
  selector: 'app-proveedores-page',
  imports: [
    Badge,
    Button,
    CatalogToolbar,
    Icon,
    ReactiveFormsModule,
    TextInput,
    SelectInput,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './proveedores-page.html',
  styleUrl: './proveedores-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProveedoresPage {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly store = inject(ProveedoresStore);

  protected readonly drawerAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly busqueda = signal('');

  protected readonly condicionOptions: SelectOption[] = [
    { value: 'responsable_inscripto', label: 'Responsable inscripto' },
    { value: 'monotributo', label: 'Monotributo' },
    { value: 'exento', label: 'Exento' },
    { value: 'consumidor_final', label: 'Consumidor final' },
  ];

  protected readonly columnas: TableColumn[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'cuit', label: 'CUIT', width: '130px' },
    { key: 'telefono', label: 'Teléfono', width: '140px' },
    { key: 'email', label: 'Email' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '140px', align: 'right' },
  ];

  protected readonly estado = computed(() => this.store.proveedores());
  protected readonly filas = computed(() =>
    (this.estado().data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      cuit: p.cuit || '—',
      telefono: p.telefono || '—',
      email: p.email || '—',
      estado: p.activo ? 'Activo' : 'Inactivo',
      activo: p.activo,
    })),
  );

  protected readonly drawerTitulo = computed(() =>
    this.editandoId() ? 'Editar proveedor' : 'Nuevo proveedor',
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: [''],
    telefono: [''],
    cuit: [''],
    condicionIva: ['responsable_inscripto' as CondicionIva, Validators.required],
    observaciones: [''],
  });

  constructor() {
    effect(() => {
      const q = this.busqueda();
      untracked(() => this.store.cargar(q));
    });
  }

  protected abrirAlta(): void {
    this.editandoId.set(null);
    this.form.reset({
      nombre: '',
      email: '',
      telefono: '',
      cuit: '',
      condicionIva: 'responsable_inscripto',
      observaciones: '',
    });
    this.drawerAbierto.set(true);
  }

  protected abrirEditar(id: string): void {
    const p = (this.estado().data ?? []).find((x) => x.id === id);
    if (!p) {
      return;
    }
    this.editandoId.set(id);
    this.form.reset({
      nombre: p.nombre,
      email: p.email,
      telefono: p.telefono,
      cuit: p.cuit,
      condicionIva: p.condicionIva,
      observaciones: p.observaciones,
    });
    this.drawerAbierto.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const body = this.form.getRawValue();
    const id = this.editandoId();
    this.guardando.set(true);
    const req = id ? this.store.actualizar(id, body) : this.store.crear(body);
    req.subscribe({
      next: () => {
        this.notifications.success(
          id ? 'Proveedor actualizado' : 'Proveedor creado',
          'Cambios guardados',
        );
        this.drawerAbierto.set(false);
        this.editandoId.set(null);
        this.guardando.set(false);
        this.store.cargar(this.busqueda());
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async desactivar(id: string): Promise<void> {
    const p = (this.estado().data ?? []).find((x) => x.id === id) as Proveedor | undefined;
    if (!p?.activo) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Desactivar proveedor',
      mensaje: `¿Desactivar a ${p.nombre}?`,
      textoConfirmar: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.store.desactivar(id).subscribe((prov) => {
      this.notifications.warning('Proveedor desactivado', prov.nombre);
    });
  }
}
