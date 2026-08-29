import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Button } from '../../shared/ui/button/button';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { MIN_CHARS_BUSQUEDA } from '../../core/utils/busqueda';
import { BANCOS_EMISORES_AR } from '../cuenta-corriente/data-access/bancos-argentina';
import { estaEnTesoreria } from '../tesoreria/tesoreria.util';
import {
  BancosService,
  CuentaBancariaDto,
  TipoValor,
  ValorBancarioDto,
} from './data-access/bancos.service';

export type TabCheques = 'terceros' | 'propios';
export type ChipEstado = 'todos' | string;
export type PlazoFiltro = 'cualquier' | '7' | '15' | '30' | 'vencidos';
export type ModalCheque = 'depositar' | 'entregar' | 'gestionar' | null;

const DOW = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const NDIAS = 14;
const ALERTA_DEPOSITO_DIAS = 3;

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

function diasHastaVto(fechaVto: string | null): number {
  if (!fechaVto) {
    return 999;
  }
  const v = new Date(`${fechaVto.slice(0, 10)}T12:00:00`);
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  return Math.round((v.getTime() - hoy.getTime()) / 86_400_000);
}

function etiquetaEstado(tipo: TipoValor, estado: string): string {
  if (tipo === 'cheque_propio') {
    const map: Record<string, string> = {
      en_cartera: 'Emitido',
      cobrado: 'Debitado',
      depositado: 'Debitado',
      entregado: 'Emitido',
      rechazado: 'Rechazado',
    };
    return map[estado] ?? estado;
  }
  const map: Record<string, string> = {
    en_cartera: 'En cartera',
    entregado: 'Endosado',
    depositado: 'Depositado',
    cobrado: 'Acreditado',
    rechazado: 'Rechazado',
  };
  return map[estado] ?? estado;
}

@Component({
  selector: 'app-bancos-page',
  imports: [Button, FormsModule, ReactiveFormsModule, TextInput, SelectInput, SideDrawer],
  templateUrl: './bancos-page.html',
  styleUrl: './bancos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onAtajo($event)' },
})
export class BancosPage {
  private readonly api = inject(BancosService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly enTesoreria = computed(() => estaEnTesoreria(this.url()));

  private readonly buscaInput = viewChild<ElementRef<HTMLInputElement>>('buscaInput');

  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly valores = signal<ValorBancarioDto[]>([]);
  protected readonly cuentas = signal<CuentaBancariaDto[]>([]);
  protected readonly tab = signal<TabCheques>('terceros');
  protected readonly chip = signal<ChipEstado>('todos');
  protected readonly banco = signal('');
  protected readonly plazo = signal<PlazoFiltro>('cualquier');
  protected readonly q = signal('');
  protected readonly sugOpen = signal(false);
  protected readonly selIds = signal<string[]>([]);
  protected readonly detId = signal<string | null>(null);
  protected readonly modal = signal<ModalCheque>(null);
  protected readonly drawerNuevo = signal(false);
  protected readonly guardando = signal(false);

  protected readonly bancoOptions: SelectOption[] = BANCOS_EMISORES_AR.map((b) => ({
    value: b,
    label: b,
  }));
  protected readonly tipoOptions: SelectOption[] = [
    { value: 'cheque_tercero', label: 'Cheque de tercero' },
    { value: 'cheque_propio', label: 'Cheque propio' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['cheque_tercero' as TipoValor, Validators.required],
    monto: ['', Validators.required],
    numero: ['', Validators.required],
    librador: [''],
    bancoEmisor: ['', Validators.required],
    recibidoDe: [''],
    fecha: [''],
    fechaVto: [''],
    observacion: [''],
  });
  protected readonly formModal = this.fb.nonNullable.group({
    destino: ['', [Validators.required, Validators.minLength(2)]],
    fecha: [''],
    comprobante: [''],
  });

  constructor() {
    this.cargar();
  }

  protected readonly terceros = computed(() =>
    this.valores().filter((v) => v.tipo === 'cheque_tercero'),
  );
  protected readonly propios = computed(() =>
    this.valores().filter((v) => v.tipo === 'cheque_propio'),
  );

  protected readonly baseTab = computed(() =>
    this.tab() === 'terceros' ? this.terceros() : this.propios(),
  );

  protected readonly chipsEstado = computed(() =>
    this.tab() === 'terceros'
      ? ['Todos', 'En cartera', 'Endosado', 'Depositado', 'Acreditado', 'Rechazado']
      : ['Todos', 'Emitido', 'Debitado', 'Rechazado'],
  );

  protected readonly bancosFiltro = computed(() => {
    const set = new Set(
      this.baseTab()
        .map((v) => v.banco_emisor.trim())
        .filter(Boolean),
    );
    return ['', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];
  });

  protected readonly filtrados = computed(() => {
    const chip = this.chip();
    const banco = this.banco();
    const plazo = this.plazo();
    const q = this.q().trim().toLowerCase();
    return this.baseTab()
      .filter((v) => {
        const label = etiquetaEstado(v.tipo, v.estado);
        if (chip !== 'todos' && label !== chip) {
          return false;
        }
        if (banco && v.banco_emisor !== banco) {
          return false;
        }
        const d = diasHastaVto(v.fecha_vto);
        if (plazo === 'vencidos' && d >= 0) {
          return false;
        }
        if (plazo === '7' && !(d >= 0 && d <= 7)) {
          return false;
        }
        if (plazo === '15' && !(d >= 0 && d <= 15)) {
          return false;
        }
        if (plazo === '30' && !(d >= 0 && d <= 30)) {
          return false;
        }
        if (!q) {
          return true;
        }
        const blob = [v.numero, v.librador, v.recibido_de, v.entregado_a, v.banco_emisor]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => diasHastaVto(a.fecha_vto) - diasHastaVto(b.fecha_vto));
  });

  protected readonly filas = computed(() => this.filtrados().map((v) => this.aFila(v)));

  protected readonly sugerencias = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (q.length < MIN_CHARS_BUSQUEDA) {
      return [];
    }
    return this.baseTab()
      .filter((v) =>
        [v.numero, v.librador, v.recibido_de, v.entregado_a].join(' ').toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map((v) => ({
        id: v.id,
        numero: v.numero || 's/n',
        sub: `${v.recibido_de || v.entregado_a || v.librador || '—'} · ${v.banco_emisor || 'Banco'}`,
        importe: fmtMoney(v.monto),
      }));
  });

  protected readonly kpis = computed(() => {
    const terceros = this.terceros();
    const propios = this.propios();
    const enCartera = terceros.filter((v) => v.estado === 'en_cartera');
    const a7 = enCartera.filter((v) => {
      const d = diasHastaVto(v.fecha_vto);
      return d >= 0 && d <= 7;
    });
    const propiosPend = propios.filter((v) => v.estado === 'en_cartera');
    const propios7 = propiosPend.filter((v) => {
      const d = diasHastaVto(v.fecha_vto);
      return d >= 0 && d <= 7;
    });
    const endosados = terceros.filter((v) => v.estado === 'entregado');
    const sum = (arr: ValorBancarioDto[]) => arr.reduce((acc, v) => acc + v.monto, 0);
    return [
      {
        label: 'En cartera',
        value: fmtMoney(sum(enCartera)),
        hint: `${enCartera.length} cheques de terceros`,
      },
      {
        label: 'A cobrar 7 días',
        value: fmtMoney(sum(a7)),
        hint: `${a7.length} a depositar`,
        tono: 'ok',
      },
      {
        label: 'Propios a debitar',
        value: fmtMoney(sum(propiosPend)),
        hint: `${propios7.length} en 7 días`,
        tono: 'danger',
      },
      {
        label: 'Endosados',
        value: fmtMoney(sum(endosados)),
        hint: 'en poder de terceros',
        tono: 'info',
      },
    ];
  });

  protected readonly alertas = computed(() => {
    const terceros = this.terceros();
    const propios = this.propios();
    const enCartera = terceros.filter((v) => v.estado === 'en_cartera');
    const hoy = enCartera.filter((v) => diasHastaVto(v.fecha_vto) === 0);
    const pronto = enCartera.filter((v) => {
      const d = diasHastaVto(v.fecha_vto);
      return d > 0 && d <= ALERTA_DEPOSITO_DIAS;
    });
    const propios7 = propios.filter((v) => {
      const d = diasHastaVto(v.fecha_vto);
      return v.estado === 'en_cartera' && d >= 0 && d <= 7;
    });
    const rechazados = terceros.filter((v) => v.estado === 'rechazado');
    const sum = (arr: ValorBancarioDto[]) => arr.reduce((acc, v) => acc + v.monto, 0);
    return [
      {
        key: 'hoy',
        titulo: 'Vencen hoy',
        sub: 'Depositar antes del cierre',
        n: hoy.length,
        tono: 'danger' as const,
        patch: { tab: 'terceros' as TabCheques, chip: 'En cartera', plazo: '7' as PlazoFiltro },
      },
      {
        key: 'pronto',
        titulo: `A depositar en ${ALERTA_DEPOSITO_DIAS} días`,
        sub: fmtMoney(sum(pronto)),
        n: pronto.length,
        tono: 'warn' as const,
        patch: { tab: 'terceros' as TabCheques, chip: 'En cartera', plazo: '7' as PlazoFiltro },
      },
      {
        key: 'propios',
        titulo: 'Fondos para propios',
        sub: `${fmtMoney(sum(propios7))} se debitan esta semana`,
        n: propios7.length,
        tono: 'info' as const,
        patch: { tab: 'propios' as TabCheques, chip: 'Emitido', plazo: '7' as PlazoFiltro },
      },
      {
        key: 'rechazo',
        titulo: 'Rechazados sin gestionar',
        sub: `${fmtMoney(sum(rechazados))} reimputados al cliente`,
        n: rechazados.length,
        tono: 'danger' as const,
        patch: {
          tab: 'terceros' as TabCheques,
          chip: 'Rechazado',
          plazo: 'cualquier' as PlazoFiltro,
        },
      },
    ];
  });

  protected readonly diasCal = computed(() => {
    const terceros = this.terceros();
    const propios = this.propios();
    const montos = Array.from({ length: NDIAS }, (_, i) => {
      const ins = terceros
        .filter((v) => v.estado === 'en_cartera' && diasHastaVto(v.fecha_vto) === i)
        .reduce((acc, v) => acc + v.monto, 0);
      const outs = propios
        .filter((v) => v.estado === 'en_cartera' && diasHastaVto(v.fecha_vto) === i)
        .reduce((acc, v) => acc + v.monto, 0);
      return { ins, outs };
    });
    const maxDia = Math.max(1, ...montos.map((m) => Math.max(m.ins, m.outs)));
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    return montos.map((m, i) => {
      const dt = new Date(hoy.getTime() + i * 86_400_000);
      return {
        i,
        dia: String(dt.getDate()).padStart(2, '0'),
        dow: DOW[dt.getDay()],
        inH: Math.max(m.ins > 0 ? 5 : 0, Math.round((m.ins / maxDia) * 44)),
        outH: Math.max(m.outs > 0 ? 5 : 0, Math.round((m.outs / maxDia) * 44)),
        hoy: i === 0,
        hay: m.ins > 0 || m.outs > 0,
      };
    });
  });

  protected readonly resumenTxt = computed(() => {
    if (this.cargando() && this.valores().length === 0) {
      return 'Cargando cartera…';
    }
    return `${this.terceros().length} cheques de terceros · ${this.propios().length} propios`;
  });

  protected readonly totalFiltrado = computed(() =>
    fmtMoney(this.filtrados().reduce((acc, v) => acc + v.monto, 0)),
  );

  protected readonly detalle = computed(() => {
    const id = this.detId();
    const v = this.valores().find((x) => x.id === id) ?? this.filtrados()[0] ?? null;
    if (!v) {
      return null;
    }
    return this.aDetalle(v);
  });

  protected readonly modalCfg = computed(() => {
    const kind = this.modal();
    if (kind === 'depositar') {
      return {
        titulo: 'Depositar cheque',
        sub: 'Se registra el depósito y queda pendiente de acreditación.',
        destLabel: 'Cuenta bancaria',
        cta: 'Registrar depósito',
        nota: 'Al acreditarse, el movimiento se concilia contra el extracto y el cheque pasa a Depositado.',
      };
    }
    if (kind === 'entregar') {
      return {
        titulo: 'Endosar / entregar cheque',
        sub: 'Queda registrado a quién se lo entregaste y contra qué comprobante.',
        destLabel: 'Entregar a',
        cta: 'Registrar entrega',
        nota: 'El cheque sale de la cartera disponible pero sigue trazado.',
      };
    }
    if (kind === 'gestionar') {
      return {
        titulo: 'Gestionar rechazo',
        sub: 'Dejá constancia del curso de acción sobre el valor rechazado.',
        destLabel: 'Acción',
        cta: 'Guardar gestión',
        nota: 'El importe debería volver a la cuenta corriente del cliente con nota de débito.',
      };
    }
    return null;
  });

  protected readonly destinosModal = computed(() => {
    if (this.modal() === 'depositar') {
      const cuentas = this.cuentas().filter((c) => c.activo);
      return cuentas.map((c) => ({
        value: c.id,
        label: `${c.nombre}${c.banco ? ` · ${c.banco}` : ''}`,
      }));
    }
    if (this.modal() === 'gestionar') {
      return [
        { value: 'Reclamar al cliente', label: 'Reclamar al cliente' },
        { value: 'Acordar plan de pago', label: 'Acordar plan de pago' },
        { value: 'Canjear por otro valor', label: 'Canjear por otro valor' },
      ];
    }
    return [];
  });

  protected onAtajo(event: KeyboardEvent): void {
    if (event.key === 'F3') {
      event.preventDefault();
      this.buscaInput()?.nativeElement.focus();
      this.sugOpen.set(true);
    }
  }

  protected onQuery(valor: string): void {
    this.q.set(valor);
    this.sugOpen.set(true);
    this.asegurarDetalleVisible();
  }

  protected elegirSug(id: string): void {
    this.detId.set(id);
    this.q.set('');
    this.sugOpen.set(false);
  }

  protected buscar(): void {
    this.cargar();
  }

  protected setTab(tab: TabCheques): void {
    this.tab.set(tab);
    this.chip.set('todos');
    this.selIds.set([]);
    this.asegurarDetalleVisible();
  }

  protected setChip(label: string): void {
    this.chip.set(label === 'Todos' ? 'todos' : label);
    this.asegurarDetalleVisible();
  }

  protected aplicarAlerta(patch: { tab: TabCheques; chip: string; plazo: PlazoFiltro }): void {
    this.tab.set(patch.tab);
    this.chip.set(patch.chip);
    this.plazo.set(patch.plazo);
    this.asegurarDetalleVisible();
  }

  protected pickDia(i: number): void {
    this.plazo.set(i <= 7 ? '7' : '15');
    this.chip.set('todos');
    this.asegurarDetalleVisible();
  }

  protected onBanco(valor: string): void {
    this.banco.set(valor);
    this.asegurarDetalleVisible();
  }

  protected onPlazo(valor: PlazoFiltro): void {
    this.plazo.set(valor);
    this.asegurarDetalleVisible();
  }

  protected toggleSel(id: string, event: Event): void {
    event.stopPropagation();
    const actual = this.selIds();
    this.selIds.set(actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]);
  }

  protected abrirDetalle(id: string): void {
    this.detId.set(id);
  }

  protected accionFila(id: string, accion: string, event: Event): void {
    event.stopPropagation();
    this.detId.set(id);
    if (accion === 'Depositar') {
      this.abrirModal('depositar');
    } else if (accion === 'Endosar' || accion === 'Seguir') {
      this.abrirModal('entregar');
    } else if (accion === 'Gestionar') {
      this.abrirModal('gestionar');
    }
  }

  protected abrirModal(kind: Exclude<ModalCheque, null>): void {
    const reset = (cuentas: CuentaBancariaDto[]) => {
      const defaultCta = cuentas.find((c) => c.es_default)?.id ?? cuentas[0]?.id ?? '';
      this.formModal.reset({
        destino: kind === 'depositar' ? defaultCta : '',
        fecha: new Date().toISOString().slice(0, 10),
        comprobante: '',
      });
      this.modal.set(kind);
    };
    if (kind === 'depositar' && this.cuentas().length === 0) {
      this.api.cuentas().subscribe((items) => {
        this.cuentas.set(items);
        reset(items);
      });
      return;
    }
    reset(this.cuentas());
  }

  protected cerrarModal(): void {
    this.modal.set(null);
  }

  protected confirmarModal(): void {
    const kind = this.modal();
    const id = this.detId();
    if (!kind || !id) {
      return;
    }
    const dest = this.formModal.controls.destino.value.trim();
    const fecha = this.formModal.controls.fecha.value || null;
    if (kind === 'depositar') {
      this.guardando.set(true);
      this.api.depositar(id, dest || undefined).subscribe({
        next: () => {
          this.notifications.success('Cheque depositado', 'Quedó pendiente de acreditación');
          this.guardando.set(false);
          this.modal.set(null);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
      return;
    }
    if (kind === 'entregar') {
      if (dest.length < 2) {
        this.notifications.error('Destinatario', 'Indicá a quién se entrega el cheque');
        return;
      }
      this.guardando.set(true);
      this.api.entregar(id, dest, fecha).subscribe({
        next: () => {
          this.notifications.success('Cheque endosado', dest);
          this.guardando.set(false);
          this.modal.set(null);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
      return;
    }
    this.notifications.success('Gestión registrada', dest || 'Quedó la constancia en el valor');
    this.modal.set(null);
  }

  protected abrirNuevo(): void {
    const tipo: TipoValor = this.tab() === 'propios' ? 'cheque_propio' : 'cheque_tercero';
    this.form.reset({
      tipo,
      monto: '',
      numero: '',
      librador: tipo === 'cheque_propio' ? 'Propio' : '',
      bancoEmisor: '',
      recibidoDe: '',
      fecha: '',
      fechaVto: '',
      observacion: '',
    });
    this.drawerNuevo.set(true);
  }

  protected guardarNuevo(): void {
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
        recibido_de: raw.recibidoDe,
        fecha: raw.fecha || null,
        fecha_vto: raw.fechaVto || null,
        observacion: raw.observacion,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Cheque cargado', 'Quedó en la cartera');
          this.drawerNuevo.set(false);
          this.guardando.set(false);
          this.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected depositarLote(): void {
    const ids = this.selIds().filter((id) => {
      const v = this.valores().find((x) => x.id === id);
      return v?.estado === 'en_cartera' && v.tipo === 'cheque_tercero';
    });
    if (ids.length === 0) {
      this.notifications.warning('Selección', 'Elegí cheques de terceros en cartera');
      return;
    }
    let pendientes = ids.length;
    for (const id of ids) {
      this.api.depositar(id).subscribe({
        next: () => {
          pendientes -= 1;
          if (pendientes === 0) {
            this.notifications.success('Depósito en lote', `${ids.length} cheque(s)`);
            this.selIds.set([]);
            this.cargar();
          }
        },
      });
    }
  }

  private asegurarDetalleVisible(): void {
    const id = this.detId();
    const visibles = this.filtrados();
    if (id && visibles.some((v) => v.id === id)) {
      return;
    }
    this.detId.set(visibles[0]?.id ?? null);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.valores().subscribe({
      next: (items) => {
        this.valores.set(items);
        this.cargando.set(false);
        this.asegurarDetalleVisible();
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.cargando.set(false);
      },
    });
    if (this.cuentas().length === 0) {
      this.api.cuentas().subscribe((items) => this.cuentas.set(items));
    }
  }

  private aFila(v: ValorBancarioDto) {
    const d = diasHastaVto(v.fecha_vto);
    const estado = etiquetaEstado(v.tipo, v.estado);
    const { venceColor, venceSub } = this.tonoVence(d, v.estado);
    const terceros = v.tipo === 'cheque_tercero';
    const cerrado = ['cobrado', 'rechazado'].includes(v.estado);
    const accion =
      v.estado === 'rechazado'
        ? 'Gestionar'
        : !terceros
          ? cerrado
            ? 'Ver'
            : 'Conciliar'
          : cerrado || v.estado === 'depositado'
            ? 'Ver'
            : v.estado === 'entregado'
              ? 'Seguir'
              : 'Depositar';
    return {
      id: v.id,
      numero: v.numero || 's/n',
      banco: v.banco_emisor || '—',
      origen: terceros ? v.recibido_de || v.librador || '—' : v.banco_emisor || '—',
      origenRef: terceros ? v.origen || v.origen_id || '—' : 'Cheque propio',
      destino: v.entregado_a || (terceros ? '— sin destino —' : '—'),
      destinoRef: terceros
        ? v.entregado_a
          ? v.fecha_entrega
            ? fmtFecha(v.fecha_entrega)
            : 'Endosado'
          : 'En cartera'
        : v.observacion || '',
      destinoMuted: !v.entregado_a,
      vence: fmtFecha(v.fecha_vto),
      venceSub,
      venceColor,
      importe: fmtMoney(v.monto),
      estado,
      estTono: this.tonoEstado(estado),
      accion,
      sel: this.selIds().includes(v.id),
      on: this.detId() === v.id,
    };
  }

  private aDetalle(v: ValorBancarioDto) {
    const d = diasHastaVto(v.fecha_vto);
    const estado = etiquetaEstado(v.tipo, v.estado);
    const { venceColor, venceSub } = this.tonoVence(d, v.estado);
    const propio = v.tipo === 'cheque_propio';
    const timeline = this.timeline(v);
    let avisoTitulo = 'Sin alertas';
    let avisoTxt = 'El cheque está dentro de plazo y con su cadena de custodia.';
    let avisoTono: 'ok' | 'warn' | 'danger' | 'info' = 'ok';
    if (v.estado === 'rechazado') {
      avisoTitulo = 'Rechazado — acción pendiente';
      avisoTxt = `El importe volvió a la cuenta de ${v.recibido_de || v.librador || 'el cliente'}. Definí si se reclama o se refinancia.`;
      avisoTono = 'danger';
    } else if (propio && v.estado === 'en_cartera') {
      avisoTitulo = 'Requiere fondos';
      avisoTxt = `Se debita el ${fmtFecha(v.fecha_vto)} de ${v.banco_emisor || 'la cuenta'}.`;
      avisoTono = 'info';
    } else if (d >= 0 && d <= 3 && v.estado === 'en_cartera') {
      avisoTitulo = 'Depositar pronto';
      avisoTxt = `Fecha de pago ${fmtFecha(v.fecha_vto)}. Si se endosa, tiene que salir hoy.`;
      avisoTono = 'warn';
    }
    const acciones = propio
      ? [
          { label: 'Conciliar', kind: null as ModalCheque },
          { label: 'Endosar', kind: 'entregar' as ModalCheque },
        ]
      : v.estado === 'rechazado'
        ? [{ label: 'Gestionar', kind: 'gestionar' as ModalCheque }]
        : [
            { label: 'Depositar', kind: 'depositar' as ModalCheque },
            { label: 'Endosar', kind: 'entregar' as ModalCheque },
          ];
    return {
      id: v.id,
      numero: v.numero || 's/n',
      banco: v.banco_emisor || '—',
      tipoTxt: propio ? 'Cheque propio' : 'Cheque de tercero',
      estado,
      estTono: this.tonoEstado(estado),
      importe: fmtMoney(v.monto),
      vence: fmtFecha(v.fecha_vto),
      venceSub,
      venceColor,
      campos: propio
        ? [
            { label: 'Cuenta', value: v.banco_emisor || '—' },
            { label: 'Emitido', value: fmtFecha(v.fecha) },
            { label: 'Entregado a', value: v.entregado_a || '—' },
            { label: 'Observación', value: v.observacion || '—' },
            { label: 'Número', value: v.numero || '—' },
            { label: 'Firmante', value: v.librador || 'Propio' },
          ]
        : [
            { label: 'Librador', value: v.librador || '—' },
            { label: 'Banco emisor', value: v.banco_emisor || '—' },
            { label: 'Recibido de', value: v.recibido_de || '—' },
            { label: 'Recibido el', value: fmtFecha(v.fecha) },
            { label: 'Origen', value: v.origen || v.origen_id || '—' },
            { label: 'Tenedor actual', value: v.entregado_a || 'Nosotros' },
          ],
      timeline,
      avisoTitulo,
      avisoTxt,
      avisoTono,
      acciones,
      enCartera: v.estado === 'en_cartera',
    };
  }

  private timeline(v: ValorBancarioDto) {
    const items: { titulo: string; fecha: string; detalle: string; refTxt: string }[] = [];
    if (v.tipo === 'cheque_propio') {
      items.push({
        titulo: 'Emitido',
        fecha: fmtFecha(v.fecha),
        detalle: `${v.banco_emisor || 'Cuenta'} · cheque propio`,
        refTxt: '',
      });
      if (v.entregado_a) {
        items.push({
          titulo: `Entregado a ${v.entregado_a}`,
          fecha: fmtFecha(v.fecha_entrega || v.fecha),
          detalle: 'Contra orden de pago o egreso',
          refTxt: v.observacion,
        });
      }
      if (v.estado === 'cobrado' || v.estado === 'depositado') {
        items.push({
          titulo: 'Debitado de la cuenta',
          fecha: fmtFecha(v.fecha_vto),
          detalle: 'Conciliado con extracto bancario',
          refTxt: '',
        });
      } else {
        items.push({
          titulo: `Se debita el ${fmtFecha(v.fecha_vto)}`,
          fecha: 'pendiente',
          detalle: `Asegurar fondos en ${v.banco_emisor || 'la cuenta'}`,
          refTxt: '',
        });
      }
    } else {
      items.push({
        titulo: `Recibido de ${v.recibido_de || v.librador || 'cliente'}`,
        fecha: fmtFecha(v.fecha),
        detalle: `Librador: ${v.librador || '—'}`,
        refTxt: v.origen || v.origen_id,
      });
      if (v.estado === 'entregado') {
        items.push({
          titulo: `Endosado a ${v.entregado_a}`,
          fecha: fmtFecha(v.fecha_entrega),
          detalle: 'Sale de la cartera disponible',
          refTxt: v.observacion,
        });
      }
      if (v.estado === 'depositado' || v.estado === 'cobrado') {
        items.push({
          titulo: 'Depositado',
          fecha: fmtFecha(v.fecha_entrega || v.fecha),
          detalle: v.entregado_a || 'Cuenta de la empresa',
          refTxt: '',
        });
      }
      if (v.estado === 'cobrado') {
        items.push({
          titulo: 'Acreditado',
          fecha: fmtFecha(v.fecha_vto),
          detalle: 'Conciliado con extracto',
          refTxt: '',
        });
      }
      if (v.estado === 'rechazado') {
        items.push({
          titulo: 'Rechazado por el banco',
          fecha: fmtFecha(v.fecha_vto),
          detalle: 'Se reimputó a la cuenta corriente del cliente',
          refTxt: v.observacion,
        });
      }
      if (v.estado === 'en_cartera') {
        items.push({
          titulo: 'En cartera',
          fecha: 'hoy',
          detalle: 'Disponible para depositar o endosar',
          refTxt: '',
        });
      }
    }
    return items;
  }

  private tonoVence(d: number, estado: string): { venceColor: string; venceSub: string } {
    if (estado === 'rechazado') {
      return { venceColor: 'danger', venceSub: 'Rechazado' };
    }
    if (estado === 'cobrado') {
      return { venceColor: 'muted', venceSub: 'Cerrado' };
    }
    if (d < 0) {
      return { venceColor: 'danger', venceSub: `${Math.abs(d)} d vencido` };
    }
    if (d === 0) {
      return { venceColor: 'danger', venceSub: 'Hoy' };
    }
    if (d <= 3) {
      return { venceColor: 'warn', venceSub: `en ${d} d` };
    }
    if (d >= 900) {
      return { venceColor: 'muted', venceSub: 's/vto' };
    }
    return { venceColor: 'muted', venceSub: `en ${d} d` };
  }

  private tonoEstado(estado: string): 'info' | 'ok' | 'warn' | 'danger' | 'neutral' {
    if (estado === 'En cartera' || estado === 'Emitido') {
      return 'info';
    }
    if (estado === 'Acreditado' || estado === 'Debitado') {
      return 'ok';
    }
    if (estado === 'Depositado' || estado === 'Endosado') {
      return 'warn';
    }
    if (estado === 'Rechazado') {
      return 'danger';
    }
    return 'neutral';
  }
}
