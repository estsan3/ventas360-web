import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { CatalogToolbar } from '../../shared/ui/catalog-toolbar/catalog-toolbar';
import { TextInput } from '../../shared/ui/input/text-input';
import { Modal } from '../../shared/ui/modal/modal';
import { SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { Cliente, FiltroActivo } from './data-access/cliente.model';
import { ClientesStore } from './data-access/clientes.store';

const ETIQUETAS_ESTADO: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const COLUMNAS: TableColumn[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'email', label: 'Email' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'estado', label: 'Estado', width: '100px' },
  { key: 'acciones', label: 'Acciones', align: 'right', width: '96px' },
];

const PEDIDOS_COLUMNS: TableColumn[] = [
  { key: 'fecha', label: 'Fecha', width: '110px' },
  { key: 'estadoLabel', label: 'Estado', width: '120px' },
  { key: 'totalFmt', label: 'Total', align: 'right', width: '120px' },
  { key: 'lineasCount', label: 'Líneas', align: 'right', width: '80px' },
];

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

@Component({
  selector: 'app-clientes-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Badge,
    Button,
    Icon,
    CatalogToolbar,
    TextInput,
    Modal,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ClientesStore);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly columnas = COLUMNAS;
  protected readonly pedidosColumns = PEDIDOS_COLUMNS;
  protected readonly estado = this.store.clientes;
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<FiltroActivo>('activos');
  protected readonly drawerAbierto = signal(false);
  protected readonly configModalAbierto = signal(false);
  protected readonly seleccionadoId = signal<string | null>(null);
  protected readonly masterDirty = signal(false);
  protected readonly formDirty = signal(false);
  protected readonly guardando = signal(false);

  protected readonly esAdmin = computed(() => this.auth.user()?.rol === 'administrador');

  protected readonly filtroOptions: SelectOption[] = [
    { value: 'activos', label: 'Solo activos' },
    { value: 'inactivos', label: 'Solo inactivos' },
    { value: 'todos', label: 'Todos' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.maxLength(40)],
  });

  protected readonly filas = computed(() => {
    let items = this.estado().data ?? [];
    if (this.filtro() === 'activos') {
      items = items.filter((c) => c.activo);
    } else if (this.filtro() === 'inactivos') {
      items = items.filter((c) => !c.activo);
    }
    const q = this.busqueda().trim().toLowerCase();
    if (q) {
      items = items.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.telefono.toLowerCase().includes(q),
      );
    }
    return items.map(
      (c) =>
        ({
          ...c,
          estado: c.activo ? 'Activo' : 'Inactivo',
        }) as Record<string, unknown>,
    );
  });

  protected readonly detalle = computed(() => {
    const id = this.seleccionadoId();
    if (!id) {
      return null;
    }
    return (this.estado().data ?? []).find((c) => c.id === id) ?? null;
  });

  protected readonly configModalTitulo = computed(() => {
    const det = this.detalle();
    return det ? `Configuración · ${det.nombre}` : 'Configuración';
  });

  protected readonly pedidosDelCliente = computed(() =>
    this.store.pedidosCliente().map(
      (p) =>
        ({
          ...p,
          estadoLabel: ETIQUETAS_ESTADO[p.estado] ?? p.estado,
          totalFmt: formatearPrecio(p.total),
          lineasCount: p.lineasCount,
        }) as Record<string, unknown>,
    ),
  );

  constructor() {
    this.store.cargar();
    this.form.valueChanges.subscribe(() => {
      if (this.configModalAbierto()) {
        this.masterDirty.set(true);
      } else if (this.drawerAbierto()) {
        this.formDirty.set(true);
      }
    });
  }

  protected abrirCrear(): void {
    this.form.enable();
    this.form.reset({ nombre: '', email: '', telefono: '' });
    this.formDirty.set(false);
    this.drawerAbierto.set(true);
  }

  protected abrirConfig(id: string): void {
    const cliente = (this.estado().data ?? []).find((c) => c.id === id);
    if (!cliente) {
      return;
    }
    this.seleccionadoId.set(id);
    this.form.enable();
    this.form.reset({
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
    });
    if (!this.esAdmin()) {
      this.form.disable();
    }
    this.masterDirty.set(false);
    this.configModalAbierto.set(true);
    this.store.cargarPedidosDelCliente(id);
  }

  protected async cerrarConfigModal(): Promise<void> {
    if (this.masterDirty()) {
      const ok = await this.confirmDialog.confirmarCierreSinGuardar();
      if (!ok) {
        return;
      }
    }
    this.configModalAbierto.set(false);
    this.seleccionadoId.set(null);
    this.masterDirty.set(false);
    this.form.enable();
  }

  protected guardarMaster(): void {
    const id = this.seleccionadoId();
    if (!id || !this.masterDirty() || !this.esAdmin()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.store.actualizar(id, this.form.getRawValue()).subscribe({
      next: (cliente) => {
        this.notifications.success('Cliente actualizado', cliente.nombre);
        this.guardando.set(false);
        this.masterDirty.set(false);
        this.configModalAbierto.set(false);
        this.seleccionadoId.set(null);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async cerrarDrawer(): Promise<void> {
    if (this.formDirty()) {
      const ok = await this.confirmDialog.confirmarCierreSinGuardar();
      if (!ok) {
        return;
      }
    }
    this.drawerAbierto.set(false);
    this.formDirty.set(false);
  }

  protected guardarNuevo(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.store.crear(this.form.getRawValue()).subscribe({
      next: (cliente) => {
        this.notifications.success('Cliente creado', cliente.nombre);
        this.guardando.set(false);
        this.drawerAbierto.set(false);
        this.formDirty.set(false);
        this.abrirConfig(cliente.id);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async desactivar(cliente: Cliente): Promise<void> {
    const ok = await this.confirmDialog.abrir({
      titulo: 'Desactivar cliente',
      mensaje: `¿Desactivar a ${cliente.nombre}?`,
      textoConfirmar: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.store.desactivar(cliente.id).subscribe((c) => {
      this.notifications.warning('Cliente desactivado', c.nombre);
      if (this.seleccionadoId() === c.id) {
        this.seleccionadoId.set(c.id);
      }
    });
  }

  protected errorCampo(campo: 'nombre' | 'email' | 'telefono'): string {
    const control = this.form.controls[campo];
    if (!control.touched || !control.errors) {
      return '';
    }
    if (control.errors['required']) {
      return 'Campo obligatorio';
    }
    if (control.errors['email']) {
      return 'Email inválido';
    }
    if (control.errors['maxlength']) {
      return 'Texto demasiado largo';
    }
    return '';
  }
}
