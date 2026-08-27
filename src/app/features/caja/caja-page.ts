import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Button } from '../../shared/ui/button/button';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import {
  BancosService,
  CuentaBancariaDto,
  ValorBancarioDto,
} from '../bancos/data-access/bancos.service';
import {
  CajaService,
  EstadoCaja,
  MovimientoCajaDto,
  SaldoCajaDto,
} from './data-access/caja.service';

export interface FilaMovimientoCaja {
  id: string;
  hora: string;
  concepto: string;
  medio: string;
  ingreso: string;
  egreso: string;
}

type DrawerCaja = 'abrir' | 'egreso' | 'cerrar' | 'entregar' | null;
type VistaCaja = 'movimientos' | 'cheques';

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearMonto(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function etiquetaMedio(medio: string): string {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    cheque: 'Cheque',
    otro: 'Otro',
  };
  return map[medio] ?? medio;
}

function horaDeFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function parseMonto(valor: string): number | null {
  const n = Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function totalesMedio(
  items: MovimientoCajaDto[],
  medio: string,
): { ingresos: number; egresos: number; saldo: number; cobros: number } {
  let ingresos = 0;
  let egresos = 0;
  let cobros = 0;
  for (const m of items) {
    if (m.medio !== medio) {
      continue;
    }
    if (m.tipo === 'ingreso') {
      ingresos += m.monto;
      cobros += 1;
    } else {
      egresos += m.monto;
    }
  }
  return { ingresos, egresos, saldo: ingresos - egresos, cobros };
}

@Component({
  selector: 'app-caja-page',
  imports: [ReactiveFormsModule, SideDrawer, TextInput, SelectInput, Button],
  templateUrl: './caja-page.html',
  styleUrl: './caja-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaPage {
  private readonly api = inject(CajaService);
  private readonly bancos = inject(BancosService);
  private readonly notifications = inject(NotificationStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly fb = inject(FormBuilder);

  protected readonly saldo = signal<SaldoCajaDto | null>(null);
  protected readonly movimientosRaw = signal<MovimientoCajaDto[]>([]);
  protected readonly cuentas = signal<CuentaBancariaDto[]>([]);
  protected readonly valores = signal<ValorBancarioDto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly drawer = signal<DrawerCaja>(null);
  protected readonly vista = signal<VistaCaja>('movimientos');
  protected readonly contadoDraft = signal('');
  protected readonly chequesDraft = signal('');
  protected readonly tarjetasDraft = signal('');
  protected readonly medioEgreso = signal('efectivo');
  protected readonly modoCheque = signal('cartera');
  protected readonly chequeEntregarId = signal('');

  protected readonly estadoCaja = computed<EstadoCaja>(() => this.saldo()?.estado ?? 'sin_abrir');

  protected readonly formAbrir = this.fb.nonNullable.group({
    fondoInicial: ['0', Validators.required],
  });
  protected readonly formEgreso = this.fb.nonNullable.group({
    monto: ['', Validators.required],
    concepto: ['', [Validators.required, Validators.minLength(3)]],
    medio: ['efectivo', Validators.required],
    modoCheque: ['cartera'],
    chequeId: [''],
    entregadoA: [''],
    numero: [''],
    bancoEmisor: [''],
    fechaVto: [''],
  });
  protected readonly formCerrar = this.fb.nonNullable.group({
    efectivoContado: ['', Validators.required],
    chequesContado: ['0', Validators.required],
    tarjetasContado: ['0', Validators.required],
  });
  protected readonly formEntregar = this.fb.nonNullable.group({
    destinatario: ['', [Validators.required, Validators.minLength(2)]],
  });

  protected readonly mediosEgreso: SelectOption[] = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'otro', label: 'Otro' },
  ];
  protected readonly modosCheque: SelectOption[] = [
    { value: 'cartera', label: 'De cartera (tercero)' },
    { value: 'propio', label: 'Emitir propio' },
  ];

  protected readonly etiquetaEstado = computed(() => {
    const s = this.saldo();
    if (!s || s.estado === 'sin_abrir') {
      return 'sin abrir';
    }
    if (s.estado === 'abierta') {
      return s.abierta_por ? `abierta · ${s.abierta_por}` : 'abierta';
    }
    const partes: string[] = [];
    const agregar = (d: number | null | undefined, label: string) => {
      const n = d ?? 0;
      if (n === 0) {
        return;
      }
      partes.push(
        n > 0
          ? `${label} sobrante ${formatearMoneda(n)}`
          : `${label} faltante ${formatearMoneda(Math.abs(n))}`,
      );
    };
    agregar(s.diferencia, 'efectivo');
    agregar(s.cheques_diferencia, 'cheques');
    agregar(s.tarjetas_diferencia, 'tarjetas');
    return partes.length === 0 ? 'cerrada · cuadró' : `cerrada · ${partes.join(' · ')}`;
  });

  protected readonly diferenciaCierre = computed(() => {
    return this.diffMedio(this.contadoDraft(), this.saldo()?.efectivo_esperado ?? 0);
  });

  protected readonly diferenciaCheques = computed(() => {
    return this.diffMedio(this.chequesDraft(), this.saldo()?.cheques_esperado ?? 0);
  });

  protected readonly diferenciaTarjetas = computed(() => {
    return this.diffMedio(this.tarjetasDraft(), this.saldo()?.tarjetas_esperado ?? 0);
  });

  protected readonly kpiEfectivo = computed(() => {
    const s = this.saldo();
    if (this.cargando() && !s) {
      return { valor: formatearMoneda(0), meta: 'Cargando…' };
    }
    const esperado = s?.efectivo_esperado ?? 0;
    if (s?.estado === 'sin_abrir') {
      return {
        valor: formatearMoneda(esperado),
        meta:
          esperado === 0
            ? 'Abrí la caja para empezar el día'
            : 'Hay cobros, la caja no está abierta',
      };
    }
    if (s?.estado === 'cerrada') {
      return {
        valor: formatearMoneda(s.efectivo_contado ?? esperado),
        meta: `Esperado ${formatearMoneda(s.efectivo_esperado)} · contado ${formatearMoneda(s.efectivo_contado ?? 0)}`,
      };
    }
    return {
      valor: formatearMoneda(esperado),
      meta:
        esperado === 0 && (s?.fondo_inicial ?? 0) === 0
          ? 'Caja abierta · sin efectivo todavía'
          : `Fondo ${formatearMoneda(s?.fondo_inicial ?? 0)}`,
    };
  });

  protected readonly chequesEnCartera = computed(() =>
    this.valores().filter((v) => v.estado === 'en_cartera'),
  );

  protected readonly opcionesChequesCartera = computed<SelectOption[]>(() =>
    this.chequesEnCartera().map((v) => ({
      value: v.id,
      label: `${v.numero || 's/n'} · ${v.banco_emisor || 'Banco'} · ${formatearMoneda(v.monto)}`,
    })),
  );

  protected readonly kpiCheques = computed(() => {
    const cartera = this.chequesEnCartera();
    const total = cartera.reduce((acc, v) => acc + v.monto, 0);
    const n = cartera.length;
    return {
      valor: formatearMoneda(total),
      meta: n === 0 ? 'Sin cheques en cartera' : n === 1 ? '1 cheque' : `${n} cheques`,
    };
  });

  protected readonly kpiBanco = computed(() => {
    const cuentas = this.cuentas().filter((c) => c.activo);
    if (cuentas.length === 0) {
      return {
        label: 'Cuentas bancarias',
        valor: formatearMoneda(0),
        meta: 'Sin cuenta cargada',
      };
    }
    const cuenta = cuentas.find((c) => c.es_default) ?? cuentas[0];
    return {
      label: cuenta.nombre || cuenta.banco || 'Cuenta bancaria',
      valor: formatearMoneda(cuenta.saldo),
      meta:
        cuentas.length === 1 ? cuenta.banco || 'Saldo de la cuenta' : `${cuentas.length} cuentas`,
    };
  });

  protected readonly kpiTarjetas = computed(() => {
    const tarjetas = totalesMedio(this.movimientosRaw(), 'tarjeta');
    return {
      valor: formatearMoneda(tarjetas.ingresos),
      meta:
        tarjetas.cobros === 0
          ? 'Sin cobros con tarjeta hoy'
          : tarjetas.cobros === 1
            ? '1 cobro hoy'
            : `${tarjetas.cobros} cobros hoy`,
    };
  });

  protected readonly movimientos = computed((): FilaMovimientoCaja[] =>
    this.movimientosRaw().map((m) => ({
      id: m.id,
      hora: horaDeFecha(m.creado_en || m.fecha),
      concepto: m.concepto || 'Movimiento de caja',
      medio: etiquetaMedio(m.medio),
      ingreso: m.tipo === 'ingreso' ? formatearMonto(m.monto) : '—',
      egreso: m.tipo === 'egreso' ? formatearMonto(m.monto) : '—',
    })),
  );

  constructor() {
    this.formCerrar.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.contadoDraft.set(v.efectivoContado ?? '');
      this.chequesDraft.set(v.chequesContado ?? '');
      this.tarjetasDraft.set(v.tarjetasContado ?? '');
    });
    this.formEgreso.controls.medio.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.medioEgreso.set(v);
    });
    this.formEgreso.controls.modoCheque.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      this.modoCheque.set(v);
    });
    this.formEgreso.controls.chequeId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const cheque = this.valores().find((v) => v.id === id);
      if (cheque) {
        this.formEgreso.controls.monto.setValue(String(cheque.monto));
      }
    });
    this.cargar();
    this.cargarCuentas();
  }

  protected setVista(next: VistaCaja): void {
    this.vista.set(next);
    if (next === 'cheques') {
      this.cargarValores();
    }
  }

  protected tituloDrawer(): string {
    switch (this.drawer()) {
      case 'abrir':
        return 'Abrir caja';
      case 'egreso':
        return 'Registrar egreso';
      case 'cerrar':
        return 'Cerrar caja';
      case 'entregar':
        return 'Entregar cheque';
      default:
        return '';
    }
  }

  protected abrirDrawer(kind: Exclude<DrawerCaja, null>): void {
    if (kind === 'abrir') {
      const previo = this.estadoCaja() === 'cerrada' ? (this.saldo()?.efectivo_contado ?? 0) : 0;
      this.formAbrir.reset({ fondoInicial: String(previo) });
    }
    if (kind === 'egreso') {
      this.cargarValores();
      this.formEgreso.reset({
        monto: '',
        concepto: '',
        medio: 'efectivo',
        modoCheque: 'cartera',
        chequeId: '',
        entregadoA: '',
        numero: '',
        bancoEmisor: '',
        fechaVto: '',
      });
      this.medioEgreso.set('efectivo');
      this.modoCheque.set('cartera');
    }
    if (kind === 'cerrar') {
      const s = this.saldo();
      const efectivo = String(s?.efectivo_esperado ?? 0);
      const cheques = String(s?.cheques_esperado ?? 0);
      const tarjetas = String(s?.tarjetas_esperado ?? 0);
      this.formCerrar.reset({
        efectivoContado: efectivo,
        chequesContado: cheques,
        tarjetasContado: tarjetas,
      });
      this.contadoDraft.set(efectivo);
      this.chequesDraft.set(cheques);
      this.tarjetasDraft.set(tarjetas);
    }
    this.drawer.set(kind);
  }

  protected cerrarDrawer(): void {
    if (!this.guardando()) {
      this.drawer.set(null);
    }
  }

  protected confirmarAbrir(): void {
    const fondo = parseMonto(this.formAbrir.controls.fondoInicial.value);
    if (fondo === null || fondo < 0) {
      this.notifications.error('Fondo inválido', 'Ingresá un monto mayor o igual a cero.');
      return;
    }
    this.guardando.set(true);
    this.api.abrir(fondo).subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.guardando.set(false);
        this.drawer.set(null);
        this.notifications.success(
          'Caja abierta',
          fondo === 0 ? 'Sin fondo inicial.' : `Fondo ${formatearMoneda(fondo)}.`,
        );
        this.cargarMovimientos();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected confirmarEgreso(): void {
    const raw = this.formEgreso.getRawValue();
    const monto = parseMonto(raw.monto);
    const concepto = raw.concepto.trim();
    const medio = raw.medio as 'efectivo' | 'cheque' | 'otro';
    if (monto === null || monto <= 0) {
      this.notifications.error('Monto inválido', 'El egreso debe ser mayor a cero.');
      return;
    }
    if (concepto.length < 3) {
      this.notifications.error('Concepto', 'Indicá para qué es el egreso.');
      return;
    }
    if (medio === 'cheque') {
      const dest = raw.entregadoA.trim();
      if (dest.length < 2) {
        this.notifications.error('Destinatario', 'Indicá a quién se entrega el cheque.');
        return;
      }
      if (raw.modoCheque === 'cartera' && !raw.chequeId) {
        this.notifications.error('Cheque', 'Elegí un cheque de la cartera.');
        return;
      }
      if (raw.modoCheque === 'propio' && (!raw.numero.trim() || !raw.bancoEmisor.trim())) {
        this.notifications.error('Cheque propio', 'Completá número y banco.');
        return;
      }
    }
    this.guardando.set(true);
    this.api
      .crear({
        tipo: 'egreso',
        medio,
        monto,
        concepto,
        cheque_id: medio === 'cheque' && raw.modoCheque === 'cartera' ? raw.chequeId : null,
        entregado_a: medio === 'cheque' ? raw.entregadoA.trim() : '',
        cheque:
          medio === 'cheque' && raw.modoCheque === 'propio'
            ? {
                numero: raw.numero.trim(),
                banco_emisor: raw.bancoEmisor.trim(),
                destinatario: raw.entregadoA.trim(),
                fecha_vto: raw.fechaVto || null,
              }
            : null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.drawer.set(null);
          this.notifications.success('Egreso registrado', concepto);
          this.cargar();
          this.cargarBancos();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected async confirmarCerrar(): Promise<void> {
    const efectivo = parseMonto(this.formCerrar.controls.efectivoContado.value);
    const cheques = parseMonto(this.formCerrar.controls.chequesContado.value);
    const tarjetas = parseMonto(this.formCerrar.controls.tarjetasContado.value);
    if (
      efectivo === null ||
      efectivo < 0 ||
      cheques === null ||
      cheques < 0 ||
      tarjetas === null ||
      tarjetas < 0
    ) {
      this.notifications.error('Arqueo inválido', 'Ingresá lo contado en cada medio.');
      return;
    }
    const diffs = [
      this.diffMedio(String(efectivo), this.saldo()?.efectivo_esperado ?? 0) ?? 0,
      this.diffMedio(String(cheques), this.saldo()?.cheques_esperado ?? 0) ?? 0,
      this.diffMedio(String(tarjetas), this.saldo()?.tarjetas_esperado ?? 0) ?? 0,
    ];
    if (diffs.some((d) => d !== 0)) {
      const ok = await this.confirm.abrir({
        titulo: 'Cerrar con diferencia',
        mensaje: 'Hay diferencia entre lo esperado y lo contado. ¿Cerrar igual?',
        textoConfirmar: 'Cerrar caja',
        textoCancelar: 'Seguir contando',
        variant: 'danger',
      });
      if (!ok) {
        return;
      }
    }
    this.guardando.set(true);
    this.api
      .cerrar({
        efectivo_contado: efectivo,
        cheques_contado: cheques,
        tarjetas_contado: tarjetas,
      })
      .subscribe({
        next: (s) => {
          this.saldo.set(s);
          this.guardando.set(false);
          this.drawer.set(null);
          const d =
            (s.diferencia ?? 0) + (s.cheques_diferencia ?? 0) + (s.tarjetas_diferencia ?? 0);
          this.notifications.success(
            'Caja cerrada',
            d === 0 ? 'El arqueo cuadró.' : 'Quedó registrada la diferencia.',
          );
          this.cargarMovimientos();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected abrirEntregar(id: string): void {
    this.chequeEntregarId.set(id);
    this.formEntregar.reset({ destinatario: '' });
    this.drawer.set('entregar');
  }

  protected confirmarEntregar(): void {
    const dest = this.formEntregar.controls.destinatario.value.trim();
    const id = this.chequeEntregarId();
    if (dest.length < 2 || !id) {
      this.notifications.error('Destinatario', 'Indicá a quién se entrega el cheque.');
      return;
    }
    this.guardando.set(true);
    this.bancos.entregar(id, dest).subscribe({
      next: () => {
        this.guardando.set(false);
        this.drawer.set(null);
        this.notifications.success('Cheque entregado', dest);
        this.cargarBancos();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected depositarCheque(id: string): void {
    this.bancos.depositar(id).subscribe({
      next: () => {
        this.notifications.success('Cheque depositado', 'Acreditado en la cuenta');
        this.cargarBancos();
      },
    });
  }

  protected etiquetaEstadoValor(estado: string): string {
    const map: Record<string, string> = {
      en_cartera: 'En cartera',
      depositado: 'Depositado',
      cobrado: 'Cobrado',
      rechazado: 'Rechazado',
      entregado: 'Entregado',
    };
    return map[estado] ?? estado;
  }

  protected etiquetaTipoCheque(tipo: string): string {
    return tipo === 'cheque_propio' ? 'Propio' : 'Tercero';
  }

  protected textoDif(d: number | null): string {
    if (d === null) {
      return '';
    }
    if (d === 0) {
      return 'Cuadra';
    }
    return d < 0 ? `Faltante ${formatearMoneda(Math.abs(d))}` : `Sobrante ${formatearMoneda(d)}`;
  }

  protected tonoDif(d: number | null): 'ok' | 'neg' | 'pos' | '' {
    if (d === null) {
      return '';
    }
    if (d === 0) {
      return 'ok';
    }
    return d < 0 ? 'neg' : 'pos';
  }

  private diffMedio(contado: string, esperado: number): number | null {
    const n = parseMonto(contado);
    if (n === null) {
      return null;
    }
    return Math.round((n - esperado) * 100) / 100;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.saldo().subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.cargarMovimientos();
  }

  private cargarMovimientos(): void {
    this.api.movimientos().subscribe({
      next: (items) => this.movimientosRaw.set(items),
      error: () => this.movimientosRaw.set([]),
    });
  }

  private cargarCuentas(): void {
    this.bancos
      .cuentas()
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.cuentas.set(items));
  }

  private cargarValores(): void {
    this.bancos
      .valores()
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.valores.set(items));
  }

  private cargarBancos(): void {
    this.cargarCuentas();
    this.cargarValores();
  }

  protected formatearMoneda = formatearMoneda;
}
