import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Button } from '../../shared/ui/button/button';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { BANCOS_EMISORES_AR } from '../cuenta-corriente/data-access/bancos-argentina';
import { BancosService, ValorBancarioDto } from '../bancos/data-access/bancos.service';
import { ComprasService } from '../compras/data-access/compras.service';
import { CrearPagoBody, MedioPago, PagoDto, PagosService } from './data-access/pagos.service';

function money(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function fechaCorta(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

function etiquetaMedio(medio: string): string {
  if (medio === 'efectivo') {
    return 'Efectivo';
  }
  if (medio === 'transferencia') {
    return 'Transferencia';
  }
  if (medio === 'cheque') {
    return 'Cheque';
  }
  if (medio === 'mixto') {
    return 'Mixto';
  }
  return medio;
}

@Component({
  selector: 'app-tesoreria-pagos-page',
  imports: [Button, ReactiveFormsModule, TextInput, SelectInput, SideDrawer],
  templateUrl: './tesoreria-pagos-page.html',
  styleUrls: ['../bancos/bancos-page.scss', './tesoreria-pagos-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreriaPagosPage {
  private readonly api = inject(PagosService);
  private readonly compras = inject(ComprasService);
  private readonly bancos = inject(BancosService);
  private readonly notifications = inject(NotificationStore);
  private readonly fb = inject(FormBuilder);

  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly pagos = signal<PagoDto[]>([]);
  protected readonly nombresProv = signal<Record<string, string>>({});
  protected readonly saldos = signal<Record<string, number>>({});
  protected readonly chequesCartera = signal<ValorBancarioDto[]>([]);
  protected readonly detId = signal<string | null>(null);
  protected readonly drawer = signal(false);

  protected readonly medioOpts: SelectOption[] = [
    { value: 'efectivo', label: 'Efectivo (caja)' },
    { value: 'transferencia', label: 'Transferencia (banco)' },
    { value: 'cheque_cartera', label: 'Cheque de cartera' },
    { value: 'cheque_propio', label: 'Cheque propio' },
  ];

  protected readonly bancoOpts: SelectOption[] = BANCOS_EMISORES_AR.map((b) => ({
    value: b,
    label: b,
  }));

  protected readonly form = this.fb.nonNullable.group({
    proveedorId: ['', Validators.required],
    monto: ['', Validators.required],
    medioUi: ['efectivo', Validators.required],
    chequeId: [''],
    numero: [''],
    bancoEmisor: [''],
    fechaVto: [''],
  });

  protected readonly proveedoresOpts = computed((): SelectOption[] =>
    Object.entries(this.nombresProv()).map(([id, nombre]) => ({
      value: id,
      label: this.saldos()[id] !== undefined ? `${nombre} · ${money(this.saldos()[id])}` : nombre,
    })),
  );

  protected readonly chequesOpts = computed((): SelectOption[] =>
    this.chequesCartera()
      .filter((c) => c.estado === 'en_cartera' && c.tipo === 'cheque_tercero')
      .map((c) => ({
        value: c.id,
        label: `${c.numero} · ${c.banco_emisor} · ${money(c.monto)}`,
      })),
  );

  protected readonly kpis = computed(() => {
    const deuda = Object.values(this.saldos()).reduce((a, n) => a + Math.max(n, 0), 0);
    const pagado = this.pagos().reduce((a, p) => a + p.monto, 0);
    const cheques = this.pagos().filter((p) =>
      p.lineas.some((l) => l.medio === 'cheque' || p.medio === 'cheque'),
    ).length;
    return [
      { label: 'Saldo a pagar', value: money(deuda), hint: 'CxP abierta', tono: 'danger' as const },
      {
        label: 'Pagos registrados',
        value: money(pagado),
        hint: `${this.pagos().length} comprobantes`,
        tono: 'ok' as const,
      },
      {
        label: 'Con cheque',
        value: String(cheques),
        hint: 'Endoso o propio',
        tono: 'info' as const,
      },
    ];
  });

  protected readonly filas = computed(() =>
    this.pagos().map((p) => ({
      id: p.id,
      fecha: fechaCorta(p.fecha),
      proveedor: this.nombresProv()[p.proveedor_id] ?? p.proveedor_id,
      medio: etiquetaMedio(p.medio),
      importe: money(p.monto),
      on: this.detId() === p.id,
    })),
  );

  protected readonly detalle = computed(() => {
    const id = this.detId();
    const p = this.pagos().find((x) => x.id === id);
    if (!p) {
      return null;
    }
    return {
      numero: p.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      proveedor: this.nombresProv()[p.proveedor_id] ?? p.proveedor_id,
      fecha: fechaCorta(p.fecha),
      medio: etiquetaMedio(p.medio),
      importe: money(p.monto),
      observacion: p.observacion || '—',
      lineas: p.lineas.map((l) => `${etiquetaMedio(l.medio)} · ${money(l.monto)}`),
    };
  });

  protected readonly medioUi = signal('efectivo');

  constructor() {
    this.form.controls.medioUi.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.medioUi.set(v));
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.api.listar().subscribe({
      next: (items) => {
        this.pagos.set(items);
        this.cargando.set(false);
        if (!this.detId() && items[0]) {
          this.detId.set(items[0].id);
        }
      },
      error: () => this.cargando.set(false),
    });
    this.compras.listarProveedoresCompletos().subscribe((items) => {
      this.nombresProv.set(Object.fromEntries(items.map((p) => [p.id, p.nombre])));
    });
    this.compras.listarSaldosCxp().subscribe({ next: (s) => this.saldos.set(s) });
    this.bancos.valores().subscribe({ next: (v) => this.chequesCartera.set(v) });
  }

  protected abrirDetalle(id: string): void {
    this.detId.set(id);
  }

  protected abrirNuevo(): void {
    const first = this.proveedoresOpts()[0]?.value ?? '';
    this.form.reset({
      proveedorId: first,
      monto: '',
      medioUi: 'efectivo',
      chequeId: '',
      numero: '',
      bancoEmisor: '',
      fechaVto: '',
    });
    this.medioUi.set('efectivo');
    this.drawer.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const monto = Number(raw.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      this.notifications.error('Monto', 'Ingresá un importe mayor a cero');
      return;
    }
    const nombre = this.nombresProv()[raw.proveedorId] ?? 'Proveedor';
    const ui = raw.medioUi;
    const body: CrearPagoBody = {
      proveedor_id: raw.proveedorId,
      monto,
      medio: ui.startsWith('cheque') ? 'cheque' : (ui as MedioPago),
      destinatario: nombre,
      observacion: `Pago a ${nombre}`,
    };
    if (ui === 'cheque_cartera') {
      if (!raw.chequeId) {
        this.notifications.error('Cheque', 'Elegí un cheque de la cartera');
        return;
      }
      body.cheque_id = raw.chequeId;
    }
    if (ui === 'cheque_propio') {
      if (!raw.numero.trim() || !raw.bancoEmisor) {
        this.notifications.error('Cheque propio', 'Completá número y banco');
        return;
      }
      body.cheque = {
        numero: raw.numero.trim(),
        banco_emisor: raw.bancoEmisor,
        fecha_vto: raw.fechaVto || null,
      };
    }
    this.guardando.set(true);
    this.api.crear(body).subscribe({
      next: (pago) => {
        this.notifications.success('Pago registrado', `${money(pago.monto)} a ${nombre}`);
        this.guardando.set(false);
        this.drawer.set(false);
        this.detId.set(pago.id);
        this.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }
}
