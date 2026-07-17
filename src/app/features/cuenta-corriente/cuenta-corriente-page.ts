import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MedioCobro } from './data-access/cxc.model';
import { CuentaCorrienteStore } from './data-access/cuenta-corriente.store';

const COLUMNAS_SALDOS: TableColumn[] = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'debeFmt', label: 'Debe', align: 'right', width: '120px' },
  { key: 'haberFmt', label: 'Haber', align: 'right', width: '120px' },
  { key: 'saldoFmt', label: 'Saldo', align: 'right', width: '120px' },
  { key: 'acciones', label: 'Acciones', align: 'right', width: '96px' },
];

const COLUMNAS_MOV: TableColumn[] = [
  { key: 'fecha', label: 'Fecha', width: '110px' },
  { key: 'tipoLabel', label: 'Tipo', width: '90px' },
  { key: 'concepto', label: 'Concepto' },
  { key: 'montoFmt', label: 'Monto', align: 'right', width: '120px' },
];

function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

@Component({
  selector: 'app-cuenta-corriente-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Badge,
    Button,
    Icon,
    TextInput,
    SelectInput,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './cuenta-corriente-page.html',
  styleUrl: './cuenta-corriente-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentaCorrientePage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(CuentaCorrienteStore);
  private readonly notifications = inject(NotificationStore);

  protected readonly columnasSaldos = COLUMNAS_SALDOS;
  protected readonly columnasMov = COLUMNAS_MOV;
  protected readonly estado = this.store.saldos;
  protected readonly estadoCuenta = this.store.estadoCuenta;
  protected readonly clienteSeleccionadoId = signal<string | null>(null);
  protected readonly drawerRecibo = signal(false);
  protected readonly guardando = signal(false);

  protected readonly medioOptions: SelectOption[] = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'tarjeta', label: 'Tarjeta' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    facturaId: ['', Validators.required],
    monto: ['', Validators.required],
    medio: ['efectivo' as MedioCobro, Validators.required],
    observacion: [''],
  });

  private readonly mapaClientes = computed(() => {
    const map = new Map<string, string>();
    for (const c of this.store.clientesRef()) {
      map.set(c.id, c.nombre);
    }
    return map;
  });

  protected readonly filasSaldos = computed(() => {
    const nombres = this.mapaClientes();
    return (this.estado().data ?? []).map(
      (s) =>
        ({
          ...s,
          cliente: nombres.get(s.clienteId) ?? s.clienteId,
          debeFmt: formatearPrecio(s.debeTotal),
          haberFmt: formatearPrecio(s.haberTotal),
          saldoFmt: formatearPrecio(s.saldo),
        }) as Record<string, unknown>,
    );
  });

  protected readonly filasMovimientos = computed(() => {
    const estado = this.estadoCuenta();
    if (!estado) {
      return [];
    }
    return estado.movimientos.map(
      (m) =>
        ({
          ...m,
          tipoLabel: m.tipo === 'debe' ? 'Debe' : 'Haber',
          montoFmt: formatearPrecio(m.monto),
          badge: m.tipo === 'debe' ? 'warning' : 'success',
        }) as Record<string, unknown>,
    );
  });

  protected readonly facturaOptions = computed<SelectOption[]>(() =>
    this.store.facturasRef().map((f) => ({
      value: f.id,
      label: `${f.fecha} · ${formatearPrecio(f.total)}`,
    })),
  );

  protected readonly clienteDetalle = computed(() => {
    const id = this.clienteSeleccionadoId();
    if (!id) {
      return '';
    }
    return this.mapaClientes().get(id) ?? id;
  });

  protected readonly saldoDetalle = computed(() => this.estadoCuenta()?.saldo ?? 0);

  constructor() {
    this.store.cargarReferencias();
    this.store.cargarSaldos();
    this.form.controls.facturaId.valueChanges.subscribe((facturaId) => {
      this.onFacturaChange(facturaId);
    });
  }

  protected formatearTotal(valor: number): string {
    return formatearPrecio(valor);
  }

  protected verDetalle(clienteId: string): void {
    this.clienteSeleccionadoId.set(clienteId);
    this.store.cargarEstado(clienteId);
  }

  protected abrirRecibo(): void {
    const id = this.clienteSeleccionadoId();
    if (!id) {
      return;
    }
    this.store.cargarEstado(id);
    this.form.reset({
      facturaId: '',
      monto: '',
      medio: 'efectivo',
      observacion: '',
    });
    this.drawerRecibo.set(true);
  }

  protected cerrarRecibo(): void {
    this.drawerRecibo.set(false);
  }

  protected onFacturaChange(facturaId: string): void {
    const factura = this.store.facturasRef().find((f) => f.id === facturaId);
    if (factura) {
      this.form.patchValue({ monto: String(factura.total) });
    }
  }

  protected guardarRecibo(): void {
    const clienteId = this.clienteSeleccionadoId();
    if (!clienteId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const monto = Number(raw.monto);
    if (!(monto > 0)) {
      this.notifications.error('Monto inválido', 'Debe ser mayor a cero');
      return;
    }
    this.guardando.set(true);
    this.store
      .crearRecibo({
        clienteId,
        facturaId: raw.facturaId,
        monto,
        medio: raw.medio,
        observacion: raw.observacion,
      })
      .subscribe({
        next: (recibo) => {
          this.notifications.success('Recibo registrado', formatearPrecio(recibo.monto));
          this.guardando.set(false);
          this.drawerRecibo.set(false);
        },
        error: () => this.guardando.set(false),
      });
  }
}
