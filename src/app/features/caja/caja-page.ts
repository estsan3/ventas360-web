import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { CajaService, MovimientoCajaDto, SaldoCajaDto } from './data-access/caja.service';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../core/models/async-state';

@Component({
  selector: 'app-caja-page',
  imports: [
    Badge,
    Button,
    FormsModule,
    Icon,
    ReactiveFormsModule,
    TextInput,
    KpiCard,
    SelectInput,
    SideDrawer,
    StateWrapper,
    Table,
    TableCellDef,
  ],
  templateUrl: './caja-page.html',
  styleUrl: './caja-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaPage {
  private readonly api = inject(CajaService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationStore);

  protected readonly fecha = signal(new Date().toISOString().slice(0, 10));
  protected readonly estado = signal<AsyncState<MovimientoCajaDto[]>>(asyncIdle());
  protected readonly saldo = signal<SaldoCajaDto | null>(null);
  protected readonly drawerAbierto = signal(false);
  protected readonly guardando = signal(false);

  protected readonly tipoOptions: SelectOption[] = [
    { value: 'ingreso', label: 'Ingreso' },
    { value: 'egreso', label: 'Egreso' },
  ];
  protected readonly medioOptions: SelectOption[] = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'tarjeta', label: 'Tarjeta' },
    { value: 'otro', label: 'Otro' },
  ];

  protected readonly columnas: TableColumn[] = [
    { key: 'tipo', label: 'Tipo', width: '100px' },
    { key: 'medio', label: 'Medio', width: '110px' },
    { key: 'concepto', label: 'Concepto' },
    { key: 'monto', label: 'Monto', width: '120px', align: 'right' },
  ];

  protected readonly filas = computed(() =>
    (this.estado().data ?? []).map((m) => ({
      tipo: m.tipo,
      medio: m.medio,
      concepto: m.concepto,
      monto: this.fmt(m.monto),
      esIngreso: m.tipo === 'ingreso',
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['ingreso' as 'ingreso' | 'egreso', Validators.required],
    medio: ['efectivo' as 'efectivo' | 'tarjeta' | 'otro', Validators.required],
    monto: ['', Validators.required],
    concepto: [''],
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    const f = this.fecha();
    this.estado.set(asyncLoading());
    this.api.movimientos(f).subscribe({
      next: (items) => this.estado.set(asyncSuccess(items)),
      error: (e: Error) => this.estado.set(asyncError(e.message)),
    });
    this.api.saldo(f).subscribe({ next: (s) => this.saldo.set(s) });
  }

  protected onFecha(valor: string): void {
    this.fecha.set(valor);
    this.cargar();
  }

  protected abrir(): void {
    this.form.reset({ tipo: 'ingreso', medio: 'efectivo', monto: '', concepto: '' });
    this.drawerAbierto.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const monto = Number(raw.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.notifications.error('Monto inválido', 'Debe ser mayor a cero');
      return;
    }
    this.guardando.set(true);
    this.api
      .crear({
        tipo: raw.tipo,
        medio: raw.medio,
        monto,
        concepto: raw.concepto || `${raw.tipo} manual`,
        fecha: this.fecha(),
      })
      .subscribe({
        next: () => {
          this.notifications.success('Movimiento registrado', 'Caja actualizada');
          this.drawerAbierto.set(false);
          this.guardando.set(false);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected fmt(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(valor);
  }
}
