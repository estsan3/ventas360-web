import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { Modal } from '../../shared/ui/modal/modal';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { CrearProducto, Producto } from './data-access/producto.model';
import { ProductosStore } from './data-access/productos.store';

const PEDIDOS_COLUMNS: TableColumn[] = [
  { key: 'fecha', label: 'Fecha', width: '110px' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'estadoLabel', label: 'Estado', width: '120px' },
  { key: 'cantidad', label: 'Cant.', align: 'right', width: '70px' },
];

const STOCK_BAJO = 5;

type ChipFiltro = 'todos' | 'bajo_minimo' | string;

interface FilaProductoVista {
  id: string;
  sku: string;
  nombre: string;
  rubro: string;
  marca: string;
  stock: number;
  stockTone: 'normal' | 'warn' | 'danger';
  costoFmt: string;
  precio1Fmt: string;
  precio2Fmt: string;
}

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function esBajoMinimo(stock: number): boolean {
  return stock === 0 || stock < STOCK_BAJO;
}

function tonoStock(stock: number): 'normal' | 'warn' | 'danger' {
  if (stock === 0) {
    return 'danger';
  }
  if (stock < STOCK_BAJO) {
    return 'warn';
  }
  return 'normal';
}

@Component({
  selector: 'app-productos-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Badge,
    Button,
    Icon,
    TextInput,
    Modal,
    SideDrawer,
    Table,
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

  protected readonly pedidosColumns = PEDIDOS_COLUMNS;
  protected readonly estado = this.store.productos;
  protected readonly total = this.store.total;
  protected readonly busqueda = signal('');
  protected readonly chip = signal<ChipFiltro>('todos');
  protected readonly drawerAbierto = signal(false);
  protected readonly configModalAbierto = signal(false);
  protected readonly seleccionadoId = signal<string | null>(null);
  protected readonly masterDirty = signal(false);
  protected readonly formDirty = signal(false);
  protected readonly guardando = signal(false);

  protected readonly esAdmin = computed(() => this.auth.user()?.rol === 'administrador');

  protected readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(40)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    marca: ['', Validators.maxLength(80)],
    rubro: ['', Validators.maxLength(80)],
    codigoBarras: ['', Validators.maxLength(40)],
    costo: ['0'],
    precio: ['', [Validators.required]],
    stock: ['0', [Validators.required]],
  });

  protected readonly rubros = computed(() => {
    const set = new Set<string>();
    for (const p of this.estado().data ?? []) {
      const r = p.rubro?.trim();
      if (r) {
        set.add(r);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly bajoMinimoCount = computed(
    () => (this.estado().data ?? []).filter((p) => esBajoMinimo(p.stock)).length,
  );

  protected readonly filasVista = computed((): FilaProductoVista[] => {
    const chip = this.chip();
    return (this.estado().data ?? [])
      .filter((p) => {
        if (chip === 'todos') {
          return true;
        }
        if (chip === 'bajo_minimo') {
          return esBajoMinimo(p.stock);
        }
        return (p.rubro?.trim() ?? '') === chip;
      })
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        rubro: p.rubro,
        marca: p.marca,
        stock: p.stock,
        stockTone: tonoStock(p.stock),
        costoFmt: formatearPrecio(p.costo),
        precio1Fmt: formatearPrecio(p.precio),
        precio2Fmt: formatearPrecio(Math.round(p.precio * 0.92)),
      }));
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
    // untracked: evitar que lecturas del store dentro de cargar()
    // re-disparen el effect (loop infinito de HTTP).
    effect(() => {
      const q = this.busqueda();
      untracked(() => this.store.cargar({ q, filtro: 'activos', page: 1 }));
    });
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
    this.form.reset({
      sku: '',
      nombre: '',
      marca: '',
      rubro: '',
      codigoBarras: '',
      costo: '0',
      precio: '',
      stock: '0',
    });
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
      marca: producto.marca,
      rubro: producto.rubro,
      codigoBarras: producto.codigoBarras,
      costo: String(producto.costo),
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

  protected payloadDesdeForm(): CrearProducto | null {
    const raw = this.form.getRawValue();
    const precio = Number(raw.precio);
    const stock = Number(raw.stock);
    const costo = Number(raw.costo);
    if (!(precio > 0) || !Number.isFinite(precio)) {
      this.notifications.error('Precio inválido', 'Debe ser mayor a cero');
      return null;
    }
    if (!Number.isFinite(costo) || costo < 0) {
      this.notifications.error('Costo inválido', 'Debe ser ≥ 0');
      return null;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      this.notifications.error('Stock inválido', 'Debe ser un entero ≥ 0');
      return null;
    }
    return {
      sku: raw.sku,
      nombre: raw.nombre,
      marca: raw.marca,
      rubro: raw.rubro,
      codigoBarras: raw.codigoBarras,
      costo,
      precio,
      stock,
    };
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
    const body = this.payloadDesdeForm();
    if (!body) {
      return;
    }
    this.guardando.set(true);
    this.store.actualizar(id, body).subscribe({
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
    const body = this.payloadDesdeForm();
    if (!body) {
      return;
    }
    this.guardando.set(true);
    this.store.crear(body).subscribe({
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

  protected errorCampo(
    campo: 'sku' | 'nombre' | 'marca' | 'rubro' | 'codigoBarras' | 'costo' | 'precio' | 'stock',
  ): string {
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
