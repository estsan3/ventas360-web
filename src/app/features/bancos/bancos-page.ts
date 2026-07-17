import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../core/models/async-state';
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
import { BancosService, CuentaBancariaDto, ValorBancarioDto } from './data-access/bancos.service';

@Component({
  selector: 'app-bancos-page',
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
  templateUrl: './bancos-page.html',
  styleUrl: './bancos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BancosPage {
  private readonly api = inject(BancosService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationStore);

  protected readonly cuentas = signal<CuentaBancariaDto[]>([]);
  protected readonly estadoValores = signal<AsyncState<ValorBancarioDto[]>>(asyncIdle());
  protected readonly drawerAbierto = signal(false);
  protected readonly guardando = signal(false);

  protected readonly tipoOptions: SelectOption[] = [
    { value: 'cheque_tercero', label: 'Cheque de tercero' },
    { value: 'cheque_propio', label: 'Cheque propio' },
  ];

  protected readonly columnasCuentas: TableColumn[] = [
    { key: 'codigo', label: 'Código', width: '120px' },
    { key: 'nombre', label: 'Cuenta' },
    { key: 'banco', label: 'Banco', width: '140px' },
    { key: 'saldo', label: 'Saldo', width: '130px', align: 'right' },
    { key: 'flags', label: '', width: '100px' },
  ];

  protected readonly columnasValores: TableColumn[] = [
    { key: 'tipo', label: 'Tipo', width: '140px' },
    { key: 'numero', label: 'Nº', width: '100px' },
    { key: 'librador', label: 'Librador' },
    { key: 'monto', label: 'Monto', width: '120px', align: 'right' },
    { key: 'estado', label: 'Estado', width: '120px' },
    { key: 'acciones', label: '', width: '120px', align: 'right' },
  ];

  protected readonly filasCuentas = computed(() =>
    this.cuentas().map((c) => ({
      codigo: c.codigo,
      nombre: c.nombre,
      banco: c.banco || '—',
      saldo: this.fmt(c.saldo),
      default: c.es_default,
    })),
  );

  protected readonly filasValores = computed(() =>
    (this.estadoValores().data ?? []).map((v) => ({
      id: v.id,
      tipo: v.tipo === 'cheque_tercero' ? 'Tercero' : 'Propio',
      numero: v.numero || '—',
      librador: v.librador || '—',
      monto: this.fmt(v.monto),
      estado: v.estado,
      enCartera: v.estado === 'en_cartera',
    })),
  );

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['cheque_tercero' as 'cheque_tercero' | 'cheque_propio', Validators.required],
    monto: ['', Validators.required],
    numero: [''],
    librador: [''],
    bancoEmisor: [''],
    observacion: [''],
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.api.cuentas().subscribe((items) => this.cuentas.set(items));
    this.estadoValores.set(asyncLoading());
    this.api.valores().subscribe({
      next: (items) => this.estadoValores.set(asyncSuccess(items)),
      error: (e: Error) => this.estadoValores.set(asyncError(e.message)),
    });
  }

  protected abrirValor(): void {
    this.form.reset({
      tipo: 'cheque_tercero',
      monto: '',
      numero: '',
      librador: '',
      bancoEmisor: '',
      observacion: '',
    });
    this.drawerAbierto.set(true);
  }

  protected guardarValor(): void {
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
      .crearValor({
        tipo: raw.tipo,
        monto,
        numero: raw.numero,
        librador: raw.librador,
        banco_emisor: raw.bancoEmisor,
        observacion: raw.observacion,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Valor cargado', 'Quedó en cartera');
          this.drawerAbierto.set(false);
          this.guardando.set(false);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected depositar(id: string): void {
    this.api.depositar(id).subscribe({
      next: () => {
        this.notifications.success('Valor depositado', 'Acreditado en cuenta');
        this.cargar();
      },
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
