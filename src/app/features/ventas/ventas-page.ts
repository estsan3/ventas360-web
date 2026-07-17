import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge, BadgeVariant } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { Modal } from '../../shared/ui/modal/modal';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import {
  ETIQUETAS_ESTADO,
  EstadoPedido,
  FiltroEstado,
  Pedido,
  TRANSICIONES,
} from './data-access/pedido.model';
import { VentasStore } from './data-access/ventas.store';

const COLUMNAS: TableColumn[] = [
  { key: 'fecha', label: 'Fecha', width: '110px' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'totalFmt', label: 'Total', align: 'right', width: '120px' },
  { key: 'lineasCount', label: 'Líneas', align: 'right', width: '80px' },
  { key: 'estadoLabel', label: 'Estado', width: '120px' },
  { key: 'acciones', label: 'Acciones', align: 'right', width: '96px' },
];

const COLUMNAS_LINEAS: TableColumn[] = [
  { key: 'producto', label: 'Producto' },
  { key: 'cantidad', label: 'Cant.', align: 'right', width: '70px' },
  { key: 'precioFmt', label: 'P. unit.', align: 'right', width: '110px' },
  { key: 'subtotalFmt', label: 'Subtotal', align: 'right', width: '120px' },
];

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function badgeEstado(estado: EstadoPedido): BadgeVariant {
  switch (estado) {
    case 'borrador':
      return 'warning';
    case 'confirmado':
      return 'info';
    case 'entregado':
      return 'success';
    case 'cancelado':
      return 'danger';
  }
}

@Component({
  selector: 'app-ventas-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Badge,
    Button,
    Icon,
    TextInput,
    Modal,
    SelectInput,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './ventas-page.html',
  styleUrl: './ventas-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentasPage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(VentasStore);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly columnas = COLUMNAS;
  protected readonly columnasLineas = COLUMNAS_LINEAS;
  protected readonly estado = this.store.pedidos;
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<FiltroEstado>('todos');
  protected readonly drawerCrear = signal(false);
  protected readonly configModalAbierto = signal(false);
  protected readonly pedidoSeleccionado = signal<Pedido | null>(null);
  protected readonly formDirty = signal(false);
  protected readonly guardando = signal(false);
  protected readonly cambiandoEstado = signal(false);

  protected readonly filtroOptions: SelectOption[] = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    clienteId: ['', Validators.required],
    fecha: [''],
    lineas: this.fb.array([this.nuevaLinea()]),
  });

  protected readonly clienteOptions = computed<SelectOption[]>(() =>
    this.store
      .clientesRef()
      .filter((c) => c.activo)
      .map((c) => ({ value: c.id, label: c.nombre })),
  );

  protected readonly productoOptions = computed<SelectOption[]>(() =>
    this.store
      .productosRef()
      .filter((p) => p.activo)
      .map((p) => ({
        value: p.id,
        label: `${p.sku} · ${p.nombre}`,
      })),
  );

  private readonly mapaClientes = computed(() => {
    const map = new Map<string, string>();
    for (const c of this.store.clientesRef()) {
      map.set(c.id, c.nombre);
    }
    return map;
  });

  private readonly mapaProductos = computed(() => {
    const map = new Map<string, string>();
    for (const p of this.store.productosRef()) {
      map.set(p.id, `${p.sku} · ${p.nombre}`);
    }
    return map;
  });

  protected readonly filas = computed(() => {
    let items = this.estado().data ?? [];
    if (this.filtro() !== 'todos') {
      items = items.filter((p) => p.estado === this.filtro());
    }
    const q = this.busqueda().trim().toLowerCase();
    if (q) {
      const clientes = this.mapaClientes();
      items = items.filter((p) => {
        const nombre = clientes.get(p.clienteId) ?? '';
        return (
          nombre.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.estado.toLowerCase().includes(q)
        );
      });
    }
    const clientes = this.mapaClientes();
    return items.map(
      (p) =>
        ({
          ...p,
          cliente: clientes.get(p.clienteId) ?? p.clienteId,
          totalFmt: formatearPrecio(p.total),
          lineasCount: p.lineas.length,
          estadoLabel: ETIQUETAS_ESTADO[p.estado],
          badge: badgeEstado(p.estado),
        }) as Record<string, unknown>,
    );
  });

  protected readonly lineasDetalle = computed(() => {
    const pedido = this.pedidoSeleccionado();
    if (!pedido) {
      return [];
    }
    const productos = this.mapaProductos();
    return pedido.lineas.map(
      (l) =>
        ({
          ...l,
          producto: productos.get(l.productoId) ?? l.productoId,
          precioFmt: formatearPrecio(l.precioUnitario),
          subtotalFmt: formatearPrecio(l.cantidad * l.precioUnitario),
        }) as Record<string, unknown>,
    );
  });

  protected readonly transicionesDisponibles = computed(() => {
    const pedido = this.pedidoSeleccionado();
    if (!pedido) {
      return [];
    }
    return TRANSICIONES[pedido.estado].map((estado) => ({
      estado,
      label: ETIQUETAS_ESTADO[estado],
      danger: estado === 'cancelado',
    }));
  });

  protected readonly clienteDetalle = computed(() => {
    const pedido = this.pedidoSeleccionado();
    if (!pedido) {
      return '';
    }
    return this.mapaClientes().get(pedido.clienteId) ?? pedido.clienteId;
  });

  protected readonly configModalTitulo = computed(() => {
    const pedido = this.pedidoSeleccionado();
    if (!pedido) {
      return 'Configuración';
    }
    return `Configuración · Pedido ${pedido.fecha}`;
  });

  protected get lineas(): FormArray {
    return this.form.controls.lineas;
  }

  constructor() {
    this.store.cargar();
    this.store.cargarReferencias();
    this.form.valueChanges.subscribe(() => {
      if (this.drawerCrear()) {
        this.formDirty.set(true);
      }
    });
  }

  protected badgeDe(estado: EstadoPedido): BadgeVariant {
    return badgeEstado(estado);
  }

  protected etiquetaEstado(estado: EstadoPedido): string {
    return ETIQUETAS_ESTADO[estado];
  }

  protected formatearTotal(valor: number): string {
    return formatearPrecio(valor);
  }

  protected abrirCrear(): void {
    this.store.cargarReferencias();
    this.form.reset({ clienteId: '', fecha: '' });
    this.lineas.clear();
    this.lineas.push(this.nuevaLinea());
    this.formDirty.set(false);
    this.drawerCrear.set(true);
  }

  protected agregarLinea(): void {
    this.lineas.push(this.nuevaLinea());
    this.formDirty.set(true);
  }

  protected quitarLinea(index: number): void {
    if (this.lineas.length <= 1) {
      return;
    }
    this.lineas.removeAt(index);
    this.formDirty.set(true);
  }

  protected async cerrarCrear(): Promise<void> {
    if (this.formDirty()) {
      const ok = await this.confirmDialog.confirmarCierreSinGuardar();
      if (!ok) {
        return;
      }
    }
    this.drawerCrear.set(false);
    this.formDirty.set(false);
  }

  protected guardarPedido(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const lineas = raw.lineas
      .map((l) => ({
        productoId: l.productoId,
        cantidad: Number(l.cantidad),
      }))
      .filter((l) => l.productoId && l.cantidad > 0);

    if (lineas.length === 0) {
      this.notifications.error('Pedido incompleto', 'Agregá al menos una línea válida');
      return;
    }

    this.guardando.set(true);
    this.store
      .crear({
        clienteId: raw.clienteId,
        fecha: raw.fecha || null,
        lineas,
      })
      .subscribe({
        next: (pedido) => {
          this.notifications.success('Pedido creado', `Total ${formatearPrecio(pedido.total)}`);
          this.guardando.set(false);
          this.drawerCrear.set(false);
          this.formDirty.set(false);
          this.abrirConfig(pedido);
        },
        error: () => this.guardando.set(false),
      });
  }

  protected abrirConfig(pedido: Pedido): void {
    const actual = (this.estado().data ?? []).find((p) => p.id === pedido.id) ?? pedido;
    this.pedidoSeleccionado.set(actual);
    this.configModalAbierto.set(true);
  }

  protected cerrarConfigModal(): void {
    this.configModalAbierto.set(false);
    this.pedidoSeleccionado.set(null);
  }

  protected async cambiarEstado(estado: EstadoPedido): Promise<void> {
    const pedido = this.pedidoSeleccionado();
    if (!pedido) {
      return;
    }
    if (estado === 'cancelado') {
      const ok = await this.confirmDialog.abrir({
        titulo: 'Cancelar pedido',
        mensaje: '¿Confirmás la cancelación de este pedido?',
        textoConfirmar: 'Cancelar pedido',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }
    }
    this.cambiandoEstado.set(true);
    this.store.cambiarEstado(pedido.id, estado).subscribe({
      next: (actualizado) => {
        this.pedidoSeleccionado.set(actualizado);
        this.notifications.success('Estado actualizado', ETIQUETAS_ESTADO[actualizado.estado]);
        this.cambiandoEstado.set(false);
      },
      error: () => this.cambiandoEstado.set(false),
    });
  }

  private nuevaLinea() {
    return this.fb.nonNullable.group({
      productoId: ['', Validators.required],
      cantidad: ['1', [Validators.required]],
    });
  }
}
