import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { AuthStore } from '../../core/state/auth.store';
import {
  BancosService,
  CuentaBancariaDto,
  ValorBancarioDto,
} from '../bancos/data-access/bancos.service';
import { CajaService, MovimientoCajaDto, SaldoCajaDto } from './data-access/caja.service';

export interface FilaMovimientoCaja {
  id: string;
  hora: string;
  concepto: string;
  medio: string;
  ingreso: string;
  egreso: string;
}

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
  templateUrl: './caja-page.html',
  styleUrl: './caja-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaPage {
  private readonly api = inject(CajaService);
  private readonly bancos = inject(BancosService);
  private readonly auth = inject(AuthStore);

  protected readonly saldo = signal<SaldoCajaDto | null>(null);
  protected readonly movimientosRaw = signal<MovimientoCajaDto[]>([]);
  protected readonly cuentas = signal<CuentaBancariaDto[]>([]);
  protected readonly valores = signal<ValorBancarioDto[]>([]);
  protected readonly cargando = signal(true);

  protected readonly usuarioNombre = computed(() => this.auth.user()?.nombre ?? 'Cajero');

  protected readonly kpiEfectivo = computed(() => {
    const efectivo = totalesMedio(this.movimientosRaw(), 'efectivo');
    if (this.cargando() && this.movimientosRaw().length === 0 && !this.saldo()) {
      return { valor: formatearMoneda(0), meta: 'Cargando…' };
    }
    return {
      valor: formatearMoneda(efectivo.saldo),
      meta:
        efectivo.ingresos === 0 && efectivo.egresos === 0
          ? 'Sin movimientos de efectivo hoy'
          : `Ingresos ${formatearMoneda(efectivo.ingresos)} · Egresos ${formatearMoneda(efectivo.egresos)}`,
    };
  });

  protected readonly kpiCheques = computed(() => {
    const cartera = this.valores().filter(
      (v) => v.tipo === 'cheque_tercero' && v.estado === 'en_cartera',
    );
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
      hora: horaDeFecha(m.fecha),
      concepto: m.concepto || 'Movimiento de caja',
      medio: etiquetaMedio(m.medio),
      ingreso: m.tipo === 'ingreso' ? formatearMonto(m.monto) : '—',
      egreso: m.tipo === 'egreso' ? formatearMonto(m.monto) : '—',
    })),
  );

  constructor() {
    this.api.saldo().subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.api.movimientos().subscribe({
      next: (items) => this.movimientosRaw.set(items),
      error: () => this.movimientosRaw.set([]),
    });
    this.bancos
      .cuentas()
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.cuentas.set(items));
    this.bancos
      .valores()
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.valores.set(items));
  }
}
