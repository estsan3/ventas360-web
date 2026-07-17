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
import { FiltroActivo, Producto } from './data-access/producto.model';
import { ProductosStore } from './data-access/productos.store';

const COLUMNAS: TableColumn[] = [
  { key: 'sku', label: 'SKU', width: '100px' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'precioFmt', label: 'Precio', align: 'right', width: '120px' },
  { key: 'stock', label: 'Stock', align: 'right', width: '80px' },
  { key: 'estado', label: 'Estado', width: '100px' },
  { key: 'acciones', label: 'Acciones', align: 'right', width: '96px' },
];

const PEDIDOS_COLUMNS: TableColumn[] = [
  { key: 'fecha', label: 'Fecha', width: '110px' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'estadoLabel', label: 'Estado', width: '120px' },
  { key: 'cantidad', label: 'Cant.', align: 'right', width: '70px' },
];

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

@Component({
  selector: 'app-productos-page',
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
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosPage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ProductosStore);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly columnas = COLUMNAS;
  protected readonly pedidosColumns = PEDIDOS_COLUMNS;
  protected readonly estado = this.store.productos;
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
    sku: ['', [Validators.required, Validators.maxLength(40)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    precio: ['', [Validators.required]],
    stock: ['0', [Validators.required]],
  });

  protected readonly filas = computed(() => {
    let items = this.estado().data ?? [];
    if (this.filtro() === 'activos') {
      items = items.filter((p) => p.activo);
    } else if (this.filtro() === 'inactivos') {
      items = items.filter((p) => !p.activo);
    }
    const q = this.busqueda().trim().toLowerCase();
    if (q) {
      items = items.filter(
        (p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    return items.map(
      (p) =>
        ({
          ...p,
          precioFmt: formatearPrecio(p.precio),
          estado: p.activo ? 'Activo' : 'Inactivo',
        }) as Record<string, unknown>,
    );
  });

  protected readonly detalle = computed(() => {
    const id = this.seleccionadoId();
    if (!id) {
      return null;
    }
    return (this.estado().data ?? []).find((p) => p.id === id) ?? null;
  });

  protected readonly configModalTitulo = computed(() => {
    const det = this.detalle();
    return det ? `Configuración · ${det.nombre}` : 'Configuración';
  });

  protected readonly pedidosDelProducto = computed(() =>
    this.store.pedidosProducto().map((row) => row as unknown as Record<string, unknown>),
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
    this.form.reset({ sku: '', nombre: '', precio: '', stock: '0' });
    this.formDirty.set(false);
    this.drawerAbierto.set(true);
  }

  protected abrirConfig(id: string): void {
    const producto = (this.estado().data ?? []).find((p) => p.id === id);
    if (!producto) {
      return;
    }
    this.seleccionadoId.set(id);
    this.form.enable();
    this.form.reset({
      sku: producto.sku,
      nombre: producto.nombre,
      precio: String(producto.precio),
      stock: String(producto.stock),
    });
    if (!this.esAdmin()) {
      this.form.disable();
    }
    this.masterDirty.set(false);
    this.configModalAbierto.set(true);
    this.store.cargarPedidosDelProducto(id);
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
    const raw = this.form.getRawValue();
    const precio = Number(raw.precio);
    const stock = Number(raw.stock);
    if (!(precio > 0) || !Number.isFinite(precio)) {
      this.notifications.error('Precio inválido', 'Debe ser mayor a cero');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      this.notifications.error('Stock inválido', 'Debe ser un entero ≥ 0');
      return;
    }
    this.guardando.set(true);
    this.store.actualizar(id, { sku: raw.sku, nombre: raw.nombre, precio, stock }).subscribe({
      next: (producto) => {
        this.notifications.success('Producto actualizado', producto.nombre);
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
    const raw = this.form.getRawValue();
    const precio = Number(raw.precio);
    const stock = Number(raw.stock);
    if (!(precio > 0) || !Number.isFinite(precio)) {
      this.notifications.error('Precio inválido', 'Debe ser mayor a cero');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      this.notifications.error('Stock inválido', 'Debe ser un entero ≥ 0');
      return;
    }
    this.guardando.set(true);
    this.store.crear({ sku: raw.sku, nombre: raw.nombre, precio, stock }).subscribe({
      next: (producto) => {
        this.notifications.success('Producto creado', producto.nombre);
        this.guardando.set(false);
        this.drawerAbierto.set(false);
        this.formDirty.set(false);
        this.abrirConfig(producto.id);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async toggleActivo(producto: Producto): Promise<void> {
    const activar = !producto.activo;
    if (!activar) {
      const ok = await this.confirmDialog.abrir({
        titulo: 'Desactivar producto',
        mensaje: `¿Desactivar ${producto.nombre}?`,
        textoConfirmar: 'Desactivar',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }
    }
    this.store.actualizar(producto.id, { activo: activar }).subscribe((p) => {
      this.notifications.success(activar ? 'Producto activado' : 'Producto desactivado', p.nombre);
    });
  }

  protected errorCampo(campo: 'sku' | 'nombre' | 'precio' | 'stock'): string {
    const control = this.form.controls[campo];
    if (!control.touched || !control.errors) {
      return '';
    }
    if (control.errors['required']) {
      return 'Campo obligatorio';
    }
    if (control.errors['maxlength']) {
      return 'Texto demasiado largo';
    }
    return '';
  }
}
