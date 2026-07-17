import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { TipoCompra } from './data-access/compra.model';
import { ComprasService } from './data-access/compras.service';
import { ComprasStore } from './data-access/compras.store';

@Component({
  selector: 'app-compras-page',
  imports: [
    Badge,
    Button,
    Icon,
    ReactiveFormsModule,
    TextInput,
    SelectInput,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './compras-page.html',
  styleUrl: './compras-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComprasService);
  private readonly notifications = inject(NotificationStore);
  protected readonly store = inject(ComprasStore);

  protected readonly drawerAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly proveedoresOpts = signal<SelectOption[]>([]);
  protected readonly productosOpts = signal<SelectOption[]>([]);
  protected readonly depositosOpts = signal<SelectOption[]>([]);
  private readonly precios = signal<Record<string, number>>({});
  private readonly nombresProv = signal<Record<string, string>>({});

  protected readonly tipoOptions: SelectOption[] = [
    { value: 'remito_compra', label: 'Remito de compra' },
    { value: 'factura_compra', label: 'Factura de compra' },
  ];

  protected readonly columnas: TableColumn[] = [
    { key: 'tipo', label: 'Tipo', width: '140px' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'fecha', label: 'Fecha', width: '120px' },
    { key: 'total', label: 'Total', width: '120px', align: 'right' },
    { key: 'estado', label: 'Estado', width: '120px' },
    { key: 'acciones', label: '', width: '180px', align: 'right' },
  ];

  protected readonly estado = computed(() => this.store.compras());
  protected readonly filas = computed(() =>
    (this.estado().data ?? []).map((c) => ({
      id: c.id,
      tipo: c.tipo === 'remito_compra' ? 'Remito' : 'Factura',
      tipoRaw: c.tipo,
      proveedor: this.nombresProv()[c.proveedorId] ?? c.proveedorId,
      fecha: c.fecha,
      total: this.formatear(c.total),
      estado: c.estado,
      puedeConfirmar: c.estado === 'borrador',
      puedeFacturar: c.tipo === 'remito_compra' && c.estado === 'confirmado',
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['remito_compra' as TipoCompra, Validators.required],
    proveedorId: ['', Validators.required],
    depositoId: ['', Validators.required],
    productoId: ['', Validators.required],
    cantidad: ['1', [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.store.cargar();
    this.api.listarProveedoresRef().subscribe((items) => {
      this.proveedoresOpts.set(items.map((p) => ({ value: p.id, label: p.nombre })));
      this.nombresProv.set(Object.fromEntries(items.map((p) => [p.id, p.nombre])));
    });
    this.api.listarProductosRef().subscribe((items) => {
      this.productosOpts.set(items.map((p) => ({ value: p.id, label: p.nombre })));
      this.precios.set(Object.fromEntries(items.map((p) => [p.id, p.precio])));
    });
    this.api.listarDepositosRef().subscribe((items) => {
      this.depositosOpts.set(items.map((d) => ({ value: d.id, label: d.nombre })));
    });
  }

  protected abrirAlta(): void {
    const dep = this.depositosOpts()[0]?.value ?? '';
    const prov = this.proveedoresOpts()[0]?.value ?? '';
    const prod = this.productosOpts()[0]?.value ?? '';
    this.form.reset({
      tipo: 'remito_compra',
      proveedorId: prov,
      depositoId: dep,
      productoId: prod,
      cantidad: '1',
    });
    this.drawerAbierto.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const cantidad = Number(raw.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      this.notifications.error('Cantidad inválida', 'Debe ser un entero ≥ 1');
      return;
    }
    this.guardando.set(true);
    this.store
      .crear({
        tipo: raw.tipo,
        proveedorId: raw.proveedorId,
        depositoId: raw.depositoId,
        lineas: [
          {
            productoId: raw.productoId,
            cantidad,
            precioUnitario: this.precios()[raw.productoId],
          },
        ],
      })
      .subscribe({
        next: () => {
          this.notifications.success('Compra creada', 'Quedó en borrador');
          this.drawerAbierto.set(false);
          this.guardando.set(false);
          this.store.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected confirmar(id: string): void {
    this.store.confirmar(id).subscribe({
      next: () => {
        this.notifications.success('Compra confirmada', 'Stock ingresado');
        this.store.cargar();
      },
    });
  }

  protected facturar(id: string): void {
    this.store.facturar(id).subscribe({
      next: () => {
        this.notifications.success('Factura de compra', 'Imputada en CxP');
        this.store.cargar();
      },
    });
  }

  private formatear(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
