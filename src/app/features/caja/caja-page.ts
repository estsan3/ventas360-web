import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../../core/state/auth.store';
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

@Component({
  selector: 'app-caja-page',
  templateUrl: './caja-page.html',
  styleUrl: './caja-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaPage {
  private readonly api = inject(CajaService);
  private readonly auth = inject(AuthStore);

  protected readonly saldo = signal<SaldoCajaDto | null>(null);
  protected readonly movimientosRaw = signal<MovimientoCajaDto[]>([]);
  protected readonly cargando = signal(true);

  /** KPIs mock para medios que la API aún no expone. */
  protected readonly kpiCheques = { valor: '$ 645.200', meta: '8 cheques · mock' };
  protected readonly kpiBanco = { valor: '$ 1.892.140', meta: 'Conciliado · mock' };
  protected readonly kpiTarjetas = { valor: '$ 168.900', meta: 'Acredita · mock' };

  protected readonly usuarioNombre = computed(() => this.auth.user()?.nombre ?? 'Cajero');

  protected readonly kpiEfectivo = computed(() => {
    const s = this.saldo();
    if (!s) {
      return { valor: '—', meta: 'Cargando…' };
    }
    return {
      valor: formatearMoneda(s.saldo),
      meta: `Ingresos ${formatearMoneda(s.ingresos)} · Egresos ${formatearMoneda(s.egresos)}`,
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
  }
}
