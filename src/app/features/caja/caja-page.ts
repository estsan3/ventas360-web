import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { NotificationStore } from '../../notifications/state/notification.store';
import {
  BancosService,
  CuentaBancariaDto,
  ValorBancarioDto,
} from '../bancos/data-access/bancos.service';
import {
  CajaService,
  EstadoCaja,
  MedioCaja,
  MovimientoCajaDto,
  SaldoCajaDto,
} from './data-access/caja.service';

type ChipCaja = 'todos' | 'efectivo' | 'ingresos' | 'egresos' | 'revisar';
type TipoMovManual = 'ingreso' | 'egreso' | 'transferencia' | 'ajuste';
type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'muted' | 'ink';

const DENOM = [20000, 10000, 5000, 2000, 1000, 500, 200];
const TOLERANCIA = 2000;

const CONCEPTOS: Record<TipoMovManual, string[]> = {
  ingreso: ['Aporte del dueño', 'Devolución de vale', 'Reintegro de gasto', 'Ingreso extra'],
  egreso: [
    'Gasto operativo',
    'Pago a proveedor',
    'Vale de sueldo',
    'Retiro del dueño',
    'Flete y combustible',
  ],
  transferencia: ['Depósito bancario', 'Retiro a tesorería', 'A otra sucursal'],
  ajuste: ['Diferencia de arqueo', 'Corrección de importe', 'Redondeo'],
};

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearMoneyDec(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function horaDeFecha(iso: string | null): string {
  if (!iso) {
    return '—';
  }
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

function etiquetaMedio(medio: string): string {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    cheque: 'Cheque',
    otro: 'Transferencia / QR',
  };
  return map[medio] ?? medio;
}

function codigoTipo(m: MovimientoCajaDto): string {
  const ref = (m.referencia_tipo || '').toLowerCase();
  if (ref === 'apertura') {
    return 'APE';
  }
  if (ref === 'recibo' || ref === 'cobro') {
    return 'COB';
  }
  if (ref === 'factura' || ref === 'remito' || ref === 'venta') {
    return 'VTA';
  }
  if (ref === 'pago_proveedor') {
    return 'EGR';
  }
  if (m.tipo === 'egreso' && /transf|depósito|deposito|caja fuerte/i.test(m.concepto)) {
    return 'TRF';
  }
  if (/devol|nota de crédito|nc /i.test(m.concepto)) {
    return 'DEV';
  }
  return m.tipo === 'egreso' ? 'EGR' : 'ING';
}

function tonoTipo(codigo: string): BadgeTone {
  if (codigo === 'APE') {
    return 'muted';
  }
  if (codigo === 'COB' || codigo === 'ING') {
    return 'ok';
  }
  if (codigo === 'VTA') {
    return 'accent';
  }
  if (codigo === 'EGR') {
    return 'danger';
  }
  if (codigo === 'TRF') {
    return 'info';
  }
  return 'warn';
}

@Component({
  selector: 'app-caja-page',
  imports: [FormsModule],
  templateUrl: './caja-page.html',
  styleUrl: './caja-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajaPage {
  private readonly api = inject(CajaService);
  private readonly bancos = inject(BancosService);
  private readonly notifications = inject(NotificationStore);
  private readonly confirm = inject(ConfirmDialogService);

  protected readonly saldo = signal<SaldoCajaDto | null>(null);
  protected readonly movimientosRaw = signal<MovimientoCajaDto[]>([]);
  protected readonly cuentas = signal<CuentaBancariaDto[]>([]);
  protected readonly valores = signal<ValorBancarioDto[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly q = signal('');
  protected readonly chip = signal<ChipCaja>('todos');
  protected readonly conteo = signal<Record<number, number>>({});
  protected readonly motivo = signal('');
  protected readonly aclaracion = signal('');
  protected readonly fondoProximo = signal('');
  protected readonly abrirOpen = signal(false);
  protected readonly fondoAbrir = signal('0');
  protected readonly movOpen = signal(false);
  protected readonly movTipo = signal<TipoMovManual>('egreso');
  protected readonly movMonto = signal('');
  protected readonly movConcepto = signal('Gasto operativo');
  protected readonly movDetalle = signal('');
  protected readonly movMedio = signal<MedioCaja>('efectivo');

  protected readonly denoms = DENOM;
  protected readonly tiposMov: { id: TipoMovManual; label: string }[] = [
    { id: 'ingreso', label: 'Ingreso' },
    { id: 'egreso', label: 'Egreso' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'ajuste', label: 'Ajuste' },
  ];
  protected readonly chips: { id: ChipCaja; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'efectivo', label: 'Solo efectivo' },
    { id: 'ingresos', label: 'Ingresos' },
    { id: 'egresos', label: 'Egresos' },
    { id: 'revisar', label: 'Para revisar' },
  ];

  protected readonly estadoCaja = computed<EstadoCaja>(() => this.saldo()?.estado ?? 'sin_abrir');
  protected readonly abierta = computed(() => this.estadoCaja() === 'abierta');

  constructor() {
    this.cargar();
    this.cargarCuentas();
    this.cargarValores();
  }

  protected readonly turno = computed(() => {
    const s = this.saldo();
    const est = this.estadoCaja();
    const fecha = s?.fecha ? String(s.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const nro = `T-${fecha.replace(/-/g, '')}`;
    if (est === 'sin_abrir') {
      return {
        numero: nro,
        estado: 'Sin abrir',
        tone: 'muted' as BadgeTone,
        meta: 'Abrí el turno con el fondo inicial para registrar movimientos y arqueo.',
      };
    }
    if (est === 'cerrada') {
      const dif =
        (s?.diferencia ?? 0) + (s?.cheques_diferencia ?? 0) + (s?.tarjetas_diferencia ?? 0);
      return {
        numero: nro,
        estado: dif === 0 ? 'Cerrado · cuadró' : 'Cerrado con diferencia',
        tone: (dif === 0 ? 'ok' : 'warn') as BadgeTone,
        meta: [
          s?.cerrada_por ? `cerrado por ${s.cerrada_por}` : 'cerrado',
          `efectivo ${formatearMoneda(s?.efectivo_contado ?? 0)}`,
        ].join(' · '),
      };
    }
    const hora = horaDeFecha(s?.abierta_en ?? null);
    return {
      numero: nro,
      estado: 'Abierto',
      tone: 'ok' as BadgeTone,
      meta: [
        hora !== '—' ? `abierto ${hora}` : 'abierto',
        s?.abierta_por || '',
        `fondo inicial ${formatearMoneda(s?.fondo_inicial ?? 0)}`,
      ]
        .filter(Boolean)
        .join(' · '),
    };
  });

  protected readonly kpis = computed(() => {
    const items = this.movimientosRaw();
    const por = (medio: MedioCaja) =>
      items
        .filter((m) => m.medio === medio)
        .reduce((n, m) => n + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0);
    const nMedio = (medio: MedioCaja) => items.filter((m) => m.medio === medio).length;
    const efectivo = this.saldo()?.efectivo_esperado ?? por('efectivo');
    const tarjetas = this.saldo()?.tarjetas_esperado ?? por('tarjeta');
    const cheques = this.saldo()?.cheques_esperado ?? por('cheque');
    const otros = por('otro');
    const ingresos = items.filter((m) => m.tipo === 'ingreso' && m.referencia_tipo !== 'apertura');
    const egresos = items.filter((m) => m.tipo === 'egreso');
    const total =
      ingresos.reduce((n, m) => n + m.monto, 0) - egresos.reduce((n, m) => n + m.monto, 0);
    const chip: ChipCaja = this.chip();
    return [
      {
        id: 'efectivo' as ChipCaja,
        label: 'Efectivo en caja',
        value: formatearMoneda(efectivo),
        hint: nMedio('efectivo') === 1 ? '1 movimiento' : `${nMedio('efectivo')} movimientos`,
        tone: 'ink' as BadgeTone,
        on: chip === 'efectivo',
      },
      {
        id: 'todos' as ChipCaja,
        label: 'Tarjetas',
        value: formatearMoneda(tarjetas),
        hint: tarjetas === 0 ? 'sin cobros con tarjeta' : 'se rinden aparte',
        tone: 'accent' as BadgeTone,
        on: false,
      },
      {
        id: 'todos' as ChipCaja,
        label: 'Transferencias y QR',
        value: formatearMoneda(otros),
        hint: this.kpiBancoHint(),
        tone: 'accent' as BadgeTone,
        on: false,
      },
      {
        id: 'todos' as ChipCaja,
        label: 'Cheques recibidos',
        value: formatearMoneda(cheques),
        hint: this.kpiChequesHint(),
        tone: 'info' as BadgeTone,
        on: false,
      },
      {
        id: 'todos' as ChipCaja,
        label: 'Total del turno',
        value: formatearMoneda(total),
        hint: 'ingresos menos egresos',
        tone: 'ink' as BadgeTone,
        on: false,
      },
    ];
  });

  protected readonly filas = computed(() => {
    const chip = this.chip();
    const q = this.q().trim().toLowerCase();
    const raw = this.movimientosRaw();
    let acum = 0;
    const conAcum = raw.map((m) => {
      const signed = m.tipo === 'ingreso' ? m.monto : -m.monto;
      if (m.medio === 'efectivo') {
        acum += signed;
      }
      return { m, acumEfe: m.medio === 'efectivo' ? acum : null, signed };
    });
    return conAcum
      .filter(({ m, signed }) => {
        if (chip === 'efectivo' && m.medio !== 'efectivo') {
          return false;
        }
        if (chip === 'ingresos' && signed <= 0) {
          return false;
        }
        if (chip === 'egresos' && signed >= 0) {
          return false;
        }
        if (chip === 'revisar' && !this.avisoDe(m)) {
          return false;
        }
        if (!q) {
          return true;
        }
        const comp = (m.referencia_id || m.referencia_tipo || '').toLowerCase();
        return (
          m.concepto.toLowerCase().includes(q) ||
          comp.includes(q) ||
          String(Math.round(m.monto)).includes(q) ||
          etiquetaMedio(m.medio).toLowerCase().includes(q)
        );
      })
      .map(({ m, acumEfe, signed }) => {
        const codigo = codigoTipo(m);
        const aviso = this.avisoDe(m);
        return {
          id: m.id,
          hora: horaDeFecha(m.creado_en || m.fecha),
          codigo,
          tone: tonoTipo(codigo),
          comp: this.compDe(m),
          concepto: m.concepto || 'Movimiento de caja',
          aviso,
          medio: etiquetaMedio(m.medio),
          importe: formatearMoneyDec(signed),
          impTone: (signed < 0 ? 'danger' : codigo === 'APE' ? 'muted' : 'ink') as BadgeTone,
          acum: acumEfe === null ? '—' : formatearMoneyDec(acumEfe),
          user: this.saldo()?.abierta_por?.split('@')[0] || '—',
        };
      });
  });

  protected readonly countTxt = computed(() => {
    const n = this.filas().length;
    const t = this.movimientosRaw().length;
    return `${n} de ${t} movimientos del turno`;
  });

  protected readonly pieIngresos = computed(() => {
    const items = this.movimientosRaw().filter(
      (m) => m.tipo === 'ingreso' && m.referencia_tipo !== 'apertura',
    );
    const egresos = this.movimientosRaw().filter((m) => m.tipo === 'egreso');
    return {
      ingresos: formatearMoneda(items.reduce((n, m) => n + m.monto, 0)),
      egresos: formatearMoneda(egresos.reduce((n, m) => n + m.monto, 0)),
    };
  });

  protected readonly efectivoTeorico = computed(() => this.saldo()?.efectivo_esperado ?? 0);
  protected readonly efectivoTeoricoFmt = computed(() => formatearMoneda(this.efectivoTeorico()));

  protected readonly billetes = computed(() => {
    const c = this.conteo();
    return DENOM.map((v) => {
      const cant = c[v] ?? 0;
      return {
        v,
        label: formatearMoneda(v),
        cant: cant ? String(cant) : '',
        sub: cant ? formatearMoneda(v * cant) : '—',
        tiene: cant > 0,
      };
    });
  });

  protected readonly contado = computed(() =>
    DENOM.reduce((n, v) => n + v * (this.conteo()[v] || 0), 0),
  );
  protected readonly contadoFmt = computed(() => formatearMoneda(this.contado()));
  protected readonly cantBilletes = computed(() =>
    DENOM.reduce((n, v) => n + (this.conteo()[v] || 0), 0),
  );

  protected readonly dif = computed(
    () => Math.round((this.contado() - this.efectivoTeorico()) * 100) / 100,
  );
  protected readonly difVista = computed(() => {
    const d = this.dif();
    const dentro = Math.abs(d) <= TOLERANCIA;
    if (d === 0) {
      return {
        label: 'Caja cuadrada',
        fmt: formatearMoneda(0),
        tone: 'ok' as BadgeTone,
        txt: 'El conteo coincide con el sistema. Se puede cerrar el turno sin observaciones.',
      };
    }
    return {
      label: d > 0 ? 'Sobrante' : 'Faltante',
      fmt: formatearMoneda(d),
      tone: (dentro ? 'warn' : 'danger') as BadgeTone,
      txt: dentro
        ? `Está dentro de la tolerancia de ${formatearMoneda(TOLERANCIA)}: se puede cerrar dejando el motivo.`
        : `Supera la tolerancia de ${formatearMoneda(TOLERANCIA)}. El cierre necesita motivo.`,
    };
  });
  protected readonly pedirMotivo = computed(() => this.dif() !== 0);

  protected readonly motivos = [
    'Vuelto mal dado',
    'Falta ticket de un gasto',
    'Error de tipeo en una venta',
    'Cobro no registrado',
    'Robo o faltante a investigar',
  ];

  protected readonly otrosMedios = computed(() => {
    const s = this.saldo();
    const cuenta = this.cuentas().find((c) => c.es_default) ?? this.cuentas()[0];
    return [
      {
        label: 'Tarjetas de débito y crédito',
        destino: 'se rinden aparte · liquidación del posnet',
        valor: formatearMoneda(s?.tarjetas_esperado ?? 0),
        on: (s?.tarjetas_esperado ?? 0) > 0,
      },
      {
        label: 'Transferencias y QR',
        destino: cuenta ? `cuenta ${cuenta.nombre || cuenta.banco}` : 'sin cuenta cargada',
        valor: formatearMoneda(
          this.movimientosRaw()
            .filter((m) => m.medio === 'otro')
            .reduce((n, m) => n + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0),
        ),
        on: true,
      },
      {
        label: 'Cheques recibidos',
        destino: 'pasan a la cartera de cheques',
        valor: formatearMoneda(s?.cheques_esperado ?? 0),
        on: (s?.cheques_esperado ?? 0) > 0,
      },
    ];
  });

  protected readonly cierrePasos = computed(() => {
    const nro = this.turno().numero;
    const fondo = parseMonto(this.fondoProximo()) ?? 0;
    const rendir = Math.max(0, this.contado() - fondo);
    const d = this.dif();
    return [
      {
        titulo: `Se cierra el turno ${nro}`,
        detalle: 'Nadie más puede cargar movimientos en este turno.',
        on: true,
      },
      {
        titulo: `Deja ${formatearMoneda(fondo)} de fondo fijo`,
        detalle: 'Queda como sugerencia de saldo inicial del próximo turno.',
        on: fondo > 0,
      },
      {
        titulo: `Se rinde ${formatearMoneda(rendir)}`,
        detalle: 'Efectivo contado menos el fondo que queda.',
        on: rendir > 0,
      },
      {
        titulo:
          d === 0
            ? 'Sin diferencia que registrar'
            : `Se asienta la diferencia de ${formatearMoneda(d)}`,
        detalle: d === 0 ? 'El arqueo cierra exacto.' : 'Queda en el historial del turno.',
        on: d === 0,
      },
      {
        titulo: 'Los cheques quedan en la cartera',
        detalle: `${this.chequesEnCartera().length} en cartera · pestaña Cheques.`,
        on: this.chequesEnCartera().length > 0,
      },
    ];
  });

  protected readonly aRendirFmt = computed(() => {
    const fondo = parseMonto(this.fondoProximo()) ?? 0;
    return formatearMoneda(Math.max(0, this.contado() - fondo));
  });

  protected readonly cierreLabel = computed(() => {
    const d = this.dif();
    if (d === 0) {
      return 'Cerrar turno';
    }
    return Math.abs(d) <= TOLERANCIA ? 'Cerrar con diferencia' : 'Cerrar con autorización';
  });

  protected readonly conceptosMov = computed(() => CONCEPTOS[this.movTipo()]);
  protected readonly notaMov = computed(() => {
    switch (this.movTipo()) {
      case 'ingreso':
        return {
          txt: 'Suma al efectivo del turno. Si viene de otra caja, cargalo como transferencia para que no se cuente dos veces.',
          tone: 'ok' as BadgeTone,
        };
      case 'egreso':
        return {
          txt: 'Baja el efectivo del turno y queda en el arqueo. Si es pago a proveedor, usá la pestaña Pagos.',
          tone: 'warn' as BadgeTone,
        };
      case 'transferencia':
        return {
          txt: 'No es un gasto: sale de esta caja. El API lo registra como egreso de efectivo.',
          tone: 'info' as BadgeTone,
        };
      default:
        return {
          txt: 'Se usa al cerrar, cuando la diferencia ya se investigó. Queda con tu usuario.',
          tone: 'danger' as BadgeTone,
        };
    }
  });

  protected readonly tituloMov = computed(() =>
    this.movTipo() === 'transferencia' ? 'Transferencia de caja' : 'Movimiento manual de caja',
  );

  protected readonly saldoDespuesFmt = computed(() => {
    const n = parseMonto(this.movMonto()) ?? 0;
    const signo = this.movTipo() === 'ingreso' ? 1 : -1;
    return formatearMoneda(this.efectivoTeorico() + signo * n);
  });

  protected readonly ctaMov = computed(() => {
    if (this.movTipo() === 'transferencia') {
      return 'Registrar transferencia';
    }
    return `Registrar ${this.movTipo()}`;
  });

  protected setChip(c: ChipCaja): void {
    this.chip.set(c);
  }

  protected setMovTipo(t: TipoMovManual): void {
    this.movTipo.set(t);
    this.movConcepto.set(CONCEPTOS[t][0]);
  }

  protected guardarArqueo(): void {
    this.notifications.success('Arqueo', 'El conteo queda en pantalla hasta cerrar el turno');
  }

  protected setKpi(id: ChipCaja): void {
    this.chip.set(id);
  }

  protected setDenom(v: number, raw: string): void {
    const n = raw.trim() === '' ? 0 : Number(raw.replace(/\D/g, ''));
    this.conteo.update((c) => {
      const next = { ...c };
      if (!n) {
        delete next[v];
      } else {
        next[v] = n;
      }
      return next;
    });
  }

  protected abrirCaja(): void {
    const previo = this.estadoCaja() === 'cerrada' ? (this.saldo()?.efectivo_contado ?? 0) : 0;
    const sugerido = parseMonto(this.fondoProximo()) ?? previo;
    this.fondoAbrir.set(String(sugerido));
    this.abrirOpen.set(true);
  }

  protected abrirMov(tipo: TipoMovManual = 'egreso'): void {
    if (!this.abierta()) {
      this.notifications.error('Caja cerrada', 'Abrí el turno para cargar un movimiento.');
      return;
    }
    this.movTipo.set(tipo);
    this.movConcepto.set(CONCEPTOS[tipo][0]);
    this.movMonto.set('');
    this.movDetalle.set('');
    this.movMedio.set('efectivo');
    this.movOpen.set(true);
  }

  protected imprimir(): void {
    window.print();
  }

  protected confirmarAbrir(): void {
    const fondo = parseMonto(this.fondoAbrir());
    if (fondo === null || fondo < 0) {
      this.notifications.error('Fondo inválido', 'Ingresá un monto mayor o igual a cero.');
      return;
    }
    this.guardando.set(true);
    this.api.abrir(fondo).subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.guardando.set(false);
        this.abrirOpen.set(false);
        this.notifications.success(
          'Caja abierta',
          fondo === 0 ? 'Sin fondo inicial.' : `Fondo ${formatearMoneda(fondo)}.`,
        );
        this.cargarMovimientos();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected confirmarMovimiento(): void {
    const monto = parseMonto(this.movMonto());
    const concepto = (this.movDetalle().trim() || this.movConcepto()).trim();
    if (monto === null || monto <= 0) {
      this.notifications.error('Monto inválido', 'El movimiento debe ser mayor a cero.');
      return;
    }
    if (concepto.length < 3) {
      this.notifications.error('Concepto', 'Indicá de qué se trata.');
      return;
    }
    const tipoApi: 'ingreso' | 'egreso' = this.movTipo() === 'ingreso' ? 'ingreso' : 'egreso';
    this.guardando.set(true);
    this.api
      .crear({
        tipo: tipoApi,
        medio: this.movMedio(),
        monto,
        concepto,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.movOpen.set(false);
          this.notifications.success('Movimiento registrado', concepto);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected async confirmarCerrar(): Promise<void> {
    if (!this.abierta()) {
      return;
    }
    if (this.pedirMotivo() && !this.motivo()) {
      this.notifications.error('Motivo', 'Indicá el motivo de la diferencia.');
      return;
    }
    const efectivo = this.contado();
    const cheques = this.saldo()?.cheques_esperado ?? 0;
    const tarjetas = this.saldo()?.tarjetas_esperado ?? 0;
    const d = this.dif();
    if (d !== 0) {
      const ok = await this.confirm.abrir({
        titulo: 'Cerrar con diferencia',
        mensaje: `${this.difVista().label} ${this.difVista().fmt}. ¿Cerrar igual?`,
        textoConfirmar: this.cierreLabel(),
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
          this.notifications.success(
            'Caja cerrada',
            d === 0 ? 'El arqueo cuadró.' : 'Quedó registrada la diferencia.',
          );
          this.cargarMovimientos();
        },
        error: () => this.guardando.set(false),
      });
  }

  private chequesEnCartera(): ValorBancarioDto[] {
    return this.valores().filter((v) => v.estado === 'en_cartera');
  }

  private kpiChequesHint(): string {
    const n = this.chequesEnCartera().length;
    if (n === 0) {
      return 'ninguno en cartera';
    }
    return n === 1 ? '1 cheque a cartera' : `${n} cheques a cartera`;
  }

  private kpiBancoHint(): string {
    const c = this.cuentas().find((x) => x.es_default) ?? this.cuentas()[0];
    return c ? c.nombre || c.banco || 'cuenta bancaria' : 'sin cuenta cargada';
  }

  private avisoDe(m: MovimientoCajaDto): string {
    const ref = (m.referencia_tipo || '').toLowerCase();
    if (ref === 'pago_proveedor') {
      return 'Pago a proveedor: baja el saldo de la cuenta corriente';
    }
    if (m.medio === 'cheque') {
      return 'El cheque entra o sale de la cartera';
    }
    if (codigoTipo(m) === 'TRF') {
      return 'Sale de esta caja; no es un gasto de operación';
    }
    return '';
  }

  private compDe(m: MovimientoCajaDto): string {
    if (m.referencia_tipo === 'apertura') {
      return this.turno().numero;
    }
    if (m.referencia_id) {
      return m.referencia_id.replace(/-/g, '').slice(0, 10).toUpperCase();
    }
    return m.referencia_tipo || 'manual';
  }

  private cargar(): void {
    this.cargando.set(true);
    this.api.saldo().subscribe({
      next: (s) => {
        this.saldo.set(s);
        this.cargando.set(false);
        if (s.estado === 'abierta' && !this.fondoProximo()) {
          this.fondoProximo.set(String(Math.round(s.fondo_inicial)));
        }
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

  protected formatearMoneda = formatearMoneda;
}
