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
import { CondicionIva } from './data-access/proveedor.model';
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
  protected readonly store = inject(ProveedoresStore);

  protected readonly drawerAbierto = signal(false);
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
  ];

  protected readonly estado = computed(() => this.store.proveedores());
  protected readonly filas = computed(() =>
    (this.estado().data ?? []).map((p) => ({
      nombre: p.nombre,
      cuit: p.cuit || '—',
      telefono: p.telefono || '—',
      email: p.email || '—',
      estado: p.activo ? 'Activo' : 'Inactivo',
      activo: p.activo,
    })),
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

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.store.crear(this.form.getRawValue()).subscribe({
      next: () => {
        this.notifications.success('Proveedor creado', 'Alta registrada');
        this.drawerAbierto.set(false);
        this.guardando.set(false);
        this.store.cargar(this.busqueda());
      },
      error: () => this.guardando.set(false),
    });
  }
}
