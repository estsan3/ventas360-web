import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { CuentaCorrienteService } from '../cuenta-corriente/data-access/cuenta-corriente.service';
import {
  ClienteRef,
  EstadoPedido,
  Pedido,
  ProductoRef,
  UsuarioRef,
  ZonaRef,
} from '../ventas/data-access/pedido.model';
import { VentasService } from '../ventas/data-access/ventas.service';
import { VentasStore } from '../ventas/data-access/ventas.store';
import {
  BadgeTone,
  ChipVentas,
  TabVentas,
  chipMatch,
  etiquetaEstadoVista,
  etiquetaIva,
  facturaVencida,
  formatearFechaCorta,
  formatearMoney,
  formatearMoneyDec,
  numeroDoc,
  rutaDeTab,
  sumarDias,
  tabDesdeRuta,
  tipoDeTab,
  tipoTxt,
} from './ventas-docs-vista';

interface KpiVta {
  id: ChipVentas;
  label: string;
  value: string;
  hint: string;
  tone: BadgeTone;
}

interface ChipDef {
  id: ChipVentas;
  label: string;
}

interface Celda {
  v: string;
  sub?: string;
  mono?: boolean;
  strong?: boolean;
  tone?: BadgeTone;
  pill?: boolean;
  align?: 'left' | 'right' | 'center';
}

interface FilaVta {
  id: string;
  sel: boolean;
  celdas: Celda[];
}

interface LineaFicha {
  id: string;
  nombre: string;
  sku: string;
  cant: string;
  precio: string;
  desc: string;
  subtotal: string;
  aviso: boolean;
  avisoTxt: string;
}

interface PasoCircuito {
  label: string;
  value: string;
  on: boolean;
  tab: TabVentas;
  id: string | null;
}

interface Impacto {
  titulo: string;
  detalle: string;
  on: boolean;
}

interface FichaVta {
  id: string;
  numero: string;
  estado: string;
  tone: BadgeTone;
  tipoTxt: string;
  cliente: string;
  meta: string;
  lineasTitulo: string;
  lineas: LineaFicha[];
  totales: { label: string; value: string; strong?: boolean }[];
  notaTxt: string;
  notaTone: BadgeTone;
  traza: PasoCircuito[];
  impactos: Impacto[];
  sec: string[];
  ctaLabel: string;
  ctaTone: BadgeTone;
  qrSrc: string | null;
  qrUrl: string | null;
}

const CHIPS: Record<TabVentas, ChipDef[]> = {
  pre: [
    { id: 'todos', label: 'Todos' },
    { id: 'enviado', label: 'Enviados' },
    { id: 'aceptado', label: 'Aceptados' },
    { id: 'vencido', label: 'Vencidos' },
  ],
  ped: [
    { id: 'todos', label: 'Todos' },
    { id: 'para_preparar', label: 'Para preparar' },
    { id: 'preparado', label: 'Preparados' },
    { id: 'bloqueado', label: 'Bloqueados' },
  ],
  rem: [
    { id: 'todos', label: 'Todos' },
    { id: 'para_facturar', label: 'Para facturar' },
    { id: 'en_reparto', label: 'En reparto' },
    { id: 'devuelto', label: 'Devueltos' },
  ],
  fac: [
    { id: 'todos', label: 'Todos' },
    { id: 'emitida', label: 'Emitidas' },
    { id: 'vencida', label: 'Vencidas' },
    { id: 'nc', label: 'Notas de crédito' },
  ],
};

const COLS: Record<TabVentas, { label: string; align?: 'left' | 'right' | 'center' }[]> = {
  pre: [
    { label: 'Presupuesto' },
    { label: 'Cliente' },
    { label: 'Emitido' },
    { label: 'Válido hasta' },
    { label: 'Vendedor' },
    { label: 'Total', align: 'right' },
    { label: 'Estado', align: 'center' },
  ],
  ped: [
    { label: 'Pedido' },
    { label: 'Cliente' },
    { label: 'Ingresó' },
    { label: 'Compromiso' },
    { label: 'Stock', align: 'center' },
    { label: 'Total', align: 'right' },
    { label: 'Estado', align: 'center' },
  ],
  rem: [
    { label: 'Remito' },
    { label: 'Cliente' },
    { label: 'Fecha' },
    { label: 'Pedido' },
    { label: 'Bultos', align: 'right' },
    { label: 'Valorizado', align: 'right' },
    { label: 'Estado', align: 'center' },
  ],
  fac: [
    { label: 'Comprobante' },
    { label: 'Cliente' },
    { label: 'Fecha' },
    { label: 'Vence' },
    { label: 'CAE' },
    { label: 'Total', align: 'right' },
    { label: 'Estado', align: 'center' },
  ],
};

@Component({
  selector: 'app-comprobantes-page',
  imports: [FormsModule],
  templateUrl: './comprobantes-page.html',
  styleUrl: './comprobantes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobantesPage {
  private readonly store = inject(VentasStore);
  private readonly api = inject(VentasService);
  private readonly cxc = inject(CuentaCorrienteService);
  private readonly notifications = inject(NotificationStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });

  protected readonly tab = computed(() => tabDesdeRuta(this.params()?.get('tab') ?? null));
  protected readonly chip = signal<ChipVentas>('todos');
  protected readonly q = signal('');
  protected readonly vendedorId = signal('');
  protected readonly sel = signal<Record<TabVentas, string | null>>({
    pre: null,
    ped: null,
    rem: null,
    fac: null,
  });
  protected readonly vendedores = signal<UsuarioRef[]>([]);
  protected readonly zonas = signal<ZonaRef[]>([]);
  protected readonly saldos = signal<Record<string, number>>({});
  protected readonly guardando = signal(false);

  protected readonly estado = computed(() => this.store.pedidos());
  protected readonly todos = computed(() => this.estado().data ?? []);
  protected readonly clientes = computed(() => this.store.clientesRef());
  protected readonly productos = computed(() => this.store.productosRef());

  constructor() {
    effect(() => {
      this.tab();
      untracked(() => this.chip.set('todos'));
    });
    this.boot();
  }

  private boot(): void {
    this.store.cargar();
    this.store.cargarReferencias();
    this.api.listarUsuariosRef().subscribe({ next: (v) => this.vendedores.set(v) });
    this.api.listarZonasRef().subscribe({ next: (z) => this.zonas.set(z) });
    this.cxc.listarSaldos().subscribe({
      next: (items) => {
        this.saldos.set(Object.fromEntries(items.map((s) => [s.clienteId, s.saldo])));
      },
    });
  }

  protected readonly docsTab = computed(() => {
    const tipo = tipoDeTab(this.tab());
    return this.todos().filter((p) => p.tipo === tipo);
  });

  protected readonly clienteDe = computed(() => {
    return Object.fromEntries(this.clientes().map((c) => [c.id, c]));
  });

  protected readonly productoDe = computed(() => {
    return Object.fromEntries(this.productos().map((p) => [p.id, p]));
  });

  protected readonly vendedorDe = computed(() => {
    return Object.fromEntries(this.vendedores().map((v) => [v.id, v.nombre]));
  });

  protected readonly zonaDe = computed(() => {
    return Object.fromEntries(this.zonas().map((z) => [z.id, z.nombre]));
  });

  protected readonly mesTxt = computed(() =>
    new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  );

  protected readonly contextoTxt = computed(() => {
    const tab = this.tab();
    const dep = this.store.depositosRef()[0]?.nombre ?? 'depósito';
    if (tab === 'pre') {
      return 'Presupuestos válidos 14 días · lista de precios vigente';
    }
    if (tab === 'ped') {
      return 'Reserva de stock activa · límite de crédito por cliente';
    }
    if (tab === 'rem') {
      return `Cada remito descuenta stock al confirmarse · ${dep}`;
    }
    return 'Facturación electrónica AFIP · punto de venta 0001';
  });

  protected readonly badges = computed(() => {
    const docs = this.todos();
    const aceptados = docs.filter((d) => d.tipo === 'presupuesto' && d.estado === 'aceptado');
    const preSinPed = aceptados.filter((p) => !this.hijoDe(p.id, 'pedido')).length;
    const pedPend = docs.filter(
      (d) => d.tipo === 'pedido' && (d.estado === 'borrador' || this.esBloqueado(d)),
    ).length;
    const remFact = docs.filter((d) => d.tipo === 'remito' && d.estado === 'confirmado').length;
    const facAlert = docs.filter(
      (d) => d.tipo === 'factura' && (!d.cae || facturaVencida(d)),
    ).length;
    return { pre: preSinPed, ped: pedPend, rem: remFact, fac: facAlert };
  });

  protected readonly chips = computed(() => CHIPS[this.tab()]);
  protected readonly cols = computed(() => COLS[this.tab()]);
  protected readonly nuevoLabel = computed(
    () =>
      ({
        pre: '+ Nuevo presupuesto',
        ped: '+ Nuevo pedido',
        rem: '+ Nuevo remito',
        fac: '+ Nueva factura',
      })[this.tab()],
  );
  protected readonly buscarPh = computed(
    () =>
      ({
        pre: 'N° de presupuesto, cliente o artículo',
        ped: 'N° de pedido, cliente o artículo',
        rem: 'N° de remito, cliente o artículo',
        fac: 'N° de comprobante, cliente o CAE',
      })[this.tab()],
  );
  protected readonly totalLabel = computed(
    () =>
      ({ pre: 'Presupuestado', ped: 'Comprometido', rem: 'Valorizado', fac: 'Facturado' })[
        this.tab()
      ],
  );
  protected readonly pieAcciones = computed(
    () =>
      ({
        pre: ['Imprimir', 'Exportar'],
        ped: ['Imprimir hoja de armado', 'Generar remito'],
        rem: ['Hoja de ruta', 'Facturar este remito'],
        fac: ['Imprimir / PDF', 'Exportar'],
      })[this.tab()],
  );

  protected readonly kpis = computed((): KpiVta[] => {
    const tab = this.tab();
    const docs = this.docsTab();
    const mes = this.mesTxt();
    if (tab === 'pre') {
      const abiertos = docs.filter((d) => d.estado === 'vigente' || d.estado === 'borrador');
      const aceptados = docs.filter((d) => d.estado === 'aceptado' && !this.hijoDe(d.id, 'pedido'));
      const vencen = docs.filter((d) => {
        const vto = new Date(sumarDias(d.fecha, 14));
        const lim = new Date();
        lim.setDate(lim.getDate() + 7);
        return vto <= lim && d.estado !== 'convertido' && d.estado !== 'cancelado';
      });
      const convertibles = docs.filter((d) => d.estado === 'aceptado' || d.estado === 'convertido');
      const tasa = docs.length ? Math.round((convertibles.length / docs.length) * 100) : 0;
      return [
        {
          id: 'enviado',
          label: 'Presupuestos abiertos',
          value: String(abiertos.length),
          hint: 'esperando respuesta',
          tone: 'ink',
        },
        {
          id: 'aceptado',
          label: 'Aceptados sin pedido',
          value: String(aceptados.length),
          hint: 'convertir a pedido',
          tone: 'accent',
        },
        {
          id: 'vence_semana',
          label: 'Vencen esta semana',
          value: String(vencen.length),
          hint: 'revalidar precios',
          tone: 'warn',
        },
        {
          id: 'todos',
          label: 'Tasa de conversión',
          value: `${tasa} %`,
          hint: 'sobre el universo cargado',
          tone: 'ink',
        },
        {
          id: 'todos',
          label: 'Monto presupuestado',
          value: formatearMoney(docs.reduce((n, d) => n + d.total, 0)),
          hint: mes,
          tone: 'ink',
        },
      ];
    }
    if (tab === 'ped') {
      const prep = docs.filter((d) => d.estado === 'borrador' && !this.esBloqueado(d));
      const listos = docs.filter((d) => d.estado === 'confirmado');
      const falt = docs.filter((d) => this.faltantes(d) > 0);
      const bloq = docs.filter((d) => this.esBloqueado(d));
      const abiertos = docs.filter((d) => d.estado !== 'facturado' && d.estado !== 'cancelado');
      return [
        {
          id: 'para_preparar',
          label: 'Para preparar',
          value: String(prep.length),
          hint: 'armar y remitir',
          tone: 'accent',
        },
        {
          id: 'preparado',
          label: 'Preparados',
          value: String(listos.length),
          hint: 'esperando reparto',
          tone: 'accent',
        },
        {
          id: 'faltante',
          label: 'Con faltante de stock',
          value: String(falt.length),
          hint: 'no se pueden completar',
          tone: 'danger',
        },
        {
          id: 'bloqueado',
          label: 'Bloqueados por crédito',
          value: String(bloq.length),
          hint: 'límite excedido',
          tone: 'danger',
        },
        {
          id: 'todos',
          label: 'Comprometido',
          value: formatearMoney(abiertos.reduce((n, d) => n + d.total, 0)),
          hint: 'pedidos abiertos',
          tone: 'ink',
        },
      ];
    }
    if (tab === 'rem') {
      const facturar = docs.filter((d) => d.estado === 'confirmado');
      const reparto = docs.filter((d) => d.estado === 'borrador');
      const dev = docs.filter((d) => d.estado === 'cancelado');
      const hoy = new Date().toISOString().slice(0, 10);
      const unid = docs
        .filter((d) => d.fecha.slice(0, 10) === hoy)
        .reduce((n, d) => n + d.lineas.reduce((m, l) => m + l.cantidad, 0), 0);
      return [
        {
          id: 'para_facturar',
          label: 'Para facturar',
          value: String(facturar.length),
          hint: 'mercadería entregada',
          tone: 'accent',
        },
        {
          id: 'en_reparto',
          label: 'En reparto',
          value: String(reparto.length),
          hint: 'salieron del depósito',
          tone: 'accent',
        },
        {
          id: 'devuelto',
          label: 'Devoluciones',
          value: String(dev.length),
          hint: 'reingresan a stock',
          tone: 'danger',
        },
        {
          id: 'para_facturar',
          label: 'Entregado sin facturar',
          value: formatearMoney(facturar.reduce((n, d) => n + d.total, 0)),
          hint: 'riesgo fiscal',
          tone: 'warn',
        },
        {
          id: 'todos',
          label: 'Unidades del día',
          value: String(unid),
          hint: 'salidas de stock',
          tone: 'ink',
        },
      ];
    }
    const vencidas = docs.filter((d) => facturaVencida(d));
    const sinCae = docs.filter((d) => !d.cae);
    const iva = docs.reduce((n, d) => n + d.iva, 0);
    return [
      {
        id: 'todos',
        label: 'Facturado del mes',
        value: formatearMoney(docs.reduce((n, d) => n + d.total, 0)),
        hint: mes,
        tone: 'ink',
      },
      {
        id: 'vencida',
        label: 'Vencidas sin cobrar',
        value: String(vencidas.length),
        hint: 'pasar a cobranzas',
        tone: 'danger',
      },
      {
        id: 'sin_cae',
        label: 'Sin CAE',
        value: String(sinCae.length),
        hint: 'reintentar en AFIP',
        tone: 'danger',
      },
      {
        id: 'nc',
        label: 'Notas de crédito',
        value: formatearMoney(0),
        hint: 'el API aún no emite NC',
        tone: 'muted',
      },
      {
        id: 'todos',
        label: 'IVA débito fiscal',
        value: formatearMoney(iva),
        hint: 'libro IVA ventas',
        tone: 'ink',
      },
    ];
  });

  protected readonly filtrados = computed(() => {
    const tab = this.tab();
    const chip = this.chip();
    const q = this.q().trim().toLowerCase();
    const vend = this.vendedorId();
    const clientes = this.clienteDe();
    const productos = this.productoDe();
    return this.docsTab().filter((p) => {
      const cli = clientes[p.clienteId];
      const extras = {
        bloqueado: this.esBloqueado(p),
        faltante: this.faltantes(p) > 0,
        venceIso: sumarDias(p.fecha, tab === 'pre' ? 14 : 30),
      };
      if (!chipMatch(tab, chip, p, extras)) {
        return false;
      }
      if (vend && cli?.vendedorId !== vend) {
        return false;
      }
      if (!q) {
        return true;
      }
      const num = numeroDoc(p).toLowerCase();
      const nom = (cli?.nombre ?? '').toLowerCase();
      const cae = (p.cae ?? '').toLowerCase();
      const art = p.lineas.some((l) => {
        const prod = productos[l.productoId];
        return (
          l.descripcion.toLowerCase().includes(q) ||
          (prod?.nombre ?? '').toLowerCase().includes(q) ||
          (prod?.sku ?? '').toLowerCase().includes(q)
        );
      });
      return num.includes(q) || nom.includes(q) || cae.includes(q) || art;
    });
  });

  protected readonly filas = computed((): FilaVta[] => {
    const tab = this.tab();
    const selId = this.sel()[tab];
    const ids = this.filtrados().map((p) => p.id);
    const activo = selId && ids.includes(selId) ? selId : (ids[0] ?? null);
    const clientes = this.clienteDe();
    const vendedores = this.vendedorDe();
    return this.filtrados().map((p) => {
      const cli = clientes[p.clienteId];
      const est = this.estadoVista(p);
      const celdas: Celda[] = [
        { v: numeroDoc(p), mono: true, strong: true },
        {
          v: cli?.nombre ?? p.clienteId.slice(0, 8),
          sub: `${cli?.cuit || 's/CUIT'} · ${etiquetaIva(cli?.condicionIva ?? '')}`,
        },
      ];
      if (tab === 'pre') {
        const vto = sumarDias(p.fecha, 14);
        const caduco = new Date(vto) < new Date();
        celdas.push({ v: formatearFechaCorta(p.fecha), mono: true });
        celdas.push({
          v: formatearFechaCorta(vto),
          mono: true,
          tone: caduco ? 'danger' : undefined,
        });
        celdas.push({ v: vendedores[cli?.vendedorId ?? ''] ?? '—' });
      } else if (tab === 'ped') {
        const falt = this.faltantes(p);
        const vto = sumarDias(p.fecha, 7);
        celdas.push({ v: formatearFechaCorta(p.fecha), mono: true });
        celdas.push({
          v: formatearFechaCorta(vto),
          mono: true,
          tone: new Date(vto) < new Date() ? 'danger' : undefined,
        });
        celdas.push({
          v: falt ? `${falt} sin stock` : 'Completo',
          pill: true,
          align: 'center',
          tone: falt ? 'danger' : 'ok',
        });
      } else if (tab === 'rem') {
        const ped = p.origenId ? this.todos().find((x) => x.id === p.origenId) : undefined;
        const bultos = p.lineas.reduce((n, l) => n + l.cantidad, 0);
        celdas.push({ v: formatearFechaCorta(p.fecha), mono: true });
        celdas.push({
          v: ped ? numeroDoc(ped) : 'sin pedido',
          mono: true,
          tone: ped ? 'accent' : 'muted',
        });
        celdas.push({ v: String(bultos), mono: true, align: 'right' });
      } else {
        const vto = p.caeVencimiento || sumarDias(p.fecha, 30);
        celdas.push({ v: formatearFechaCorta(p.fecha), mono: true });
        celdas.push({
          v: formatearFechaCorta(vto),
          mono: true,
          tone: facturaVencida(p) ? 'danger' : undefined,
        });
        celdas.push({
          v: p.cae || 'sin CAE',
          mono: true,
          tone: p.cae ? undefined : 'danger',
        });
      }
      celdas.push({ v: formatearMoneyDec(p.total), mono: true, strong: true, align: 'right' });
      celdas.push({ v: est.label, pill: true, align: 'center', tone: est.tone });
      return { id: p.id, sel: p.id === activo, celdas };
    });
  });

  protected readonly totalFmt = computed(() =>
    formatearMoneyDec(this.filtrados().reduce((n, p) => n + p.total, 0)),
  );
  protected readonly countTxt = computed(() => {
    const n = this.filtrados().length;
    return n === 1 ? '1 comprobante' : `${n} comprobantes`;
  });

  protected readonly ficha = computed((): FichaVta | null => {
    const tab = this.tab();
    const ids = this.filtrados().map((p) => p.id);
    const selId = this.sel()[tab];
    const id = selId && ids.includes(selId) ? selId : (ids[0] ?? null);
    const p = this.todos().find((x) => x.id === id);
    if (!p) {
      return null;
    }
    const cli = this.clienteDe()[p.clienteId];
    const est = this.estadoVista(p);
    const cadena = this.cadenaDe(p);
    const vtoPre = formatearFechaCorta(sumarDias(p.fecha, 14));
    const vtoFac = formatearFechaCorta(p.caeVencimiento || sumarDias(p.fecha, 30));
    const vend = this.vendedorDe()[cli?.vendedorId ?? ''] ?? '—';
    const zona = this.zonaDe()[cli?.zonaId ?? ''] ?? '';
    const saldo = this.saldos()[p.clienteId] ?? 0;
    const limite = cli?.limiteCredito ?? 0;
    const excede = limite > 0 && saldo + p.total > limite;
    const falt = this.faltantes(p);
    const lineas = p.lineas.map((l) => this.lineaFicha(l, tab));
    const nota = this.notaCta(tab, p, cli, cadena, falt, excede, saldo, limite, vtoPre, vtoFac);
    const qrUrl = p.qrUrl;
    const qrSrc = qrUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=168x168&data=${encodeURIComponent(qrUrl)}`
      : null;
    return {
      id: p.id,
      numero: numeroDoc(p),
      estado: est.label,
      tone: est.tone,
      tipoTxt: tipoTxt(tab),
      cliente: cli?.nombre ?? p.clienteId.slice(0, 8),
      meta: [
        cli?.cuit || 's/CUIT',
        etiquetaIva(cli?.condicionIva ?? ''),
        vend,
        zona,
        tab === 'pre' ? `vence ${vtoPre}` : tab === 'fac' ? `vence ${vtoFac}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      lineasTitulo: tab === 'rem' ? 'Mercadería entregada' : 'Detalle del comprobante',
      lineas,
      totales: [
        { label: 'Neto', value: formatearMoneyDec(p.neto) },
        { label: `IVA ${p.ivaPorcentaje || 21} %`, value: formatearMoneyDec(p.iva) },
        { label: 'Total', value: formatearMoneyDec(p.total), strong: true },
      ],
      notaTxt: nota.txt,
      notaTone: nota.tone,
      traza: this.trazaDe(cadena, p),
      impactos: this.impactosDe(tab, p, cli, cadena, falt, excede, saldo, limite, vtoPre, vtoFac),
      sec: nota.sec,
      ctaLabel: nota.cta,
      ctaTone: nota.tone,
      qrSrc,
      qrUrl,
    };
  });

  protected setTab(tab: TabVentas): void {
    this.chip.set('todos');
    this.q.set('');
    void this.router.navigate(['/comprobantes', rutaDeTab(tab)]);
  }

  protected setChip(c: ChipVentas): void {
    this.chip.set(c);
  }

  protected setKpi(id: ChipVentas): void {
    this.chip.set(id);
  }

  protected limpiar(): void {
    this.q.set('');
    this.chip.set('todos');
    this.vendedorId.set('');
  }

  protected abrir(id: string): void {
    const tab = this.tab();
    this.sel.update((s) => ({ ...s, [tab]: id }));
  }

  protected irNuevo(): void {
    const dest: Record<TabVentas, string> = {
      pre: '/ventas/presupuesto',
      ped: '/ventas/pedido',
      rem: '/ventas/remito',
      fac: '/ventas',
    };
    void this.router.navigateByUrl(dest[this.tab()]);
  }

  protected pieClick(label: string): void {
    if (label.toLowerCase().includes('facturar')) {
      this.cta();
      return;
    }
    if (label.toLowerCase().includes('generar remito')) {
      this.cta();
      return;
    }
    window.print();
  }

  protected secClick(label: string): void {
    if (label.toLowerCase().includes('cancelar')) {
      this.cancelarSel();
      return;
    }
    if (label.toLowerCase().includes('duplicar')) {
      this.duplicarSel();
      return;
    }
    window.print();
  }

  protected irCircuito(paso: PasoCircuito): void {
    if (!paso.id) {
      return;
    }
    this.sel.update((s) => ({ ...s, [paso.tab]: paso.id }));
    this.setTab(paso.tab);
  }

  protected cta(): void {
    const f = this.ficha();
    if (!f || this.guardando()) {
      return;
    }
    const p = this.todos().find((x) => x.id === f.id);
    if (!p) {
      return;
    }
    const tab = this.tab();
    if (tab === 'pre') {
      this.ctaPresupuesto(p);
      return;
    }
    if (tab === 'ped') {
      this.ctaPedido(p);
      return;
    }
    if (tab === 'rem') {
      this.ctaRemito(p);
      return;
    }
    this.ctaFactura(p);
  }

  private ctaPresupuesto(p: Pedido): void {
    if (p.estado === 'convertido') {
      const ped = this.hijoDe(p.id, 'pedido');
      if (ped) {
        this.sel.update((s) => ({ ...s, ped: ped.id }));
        this.setTab('ped');
      }
      return;
    }
    if (p.estado === 'vencido') {
      this.runEstado(p.id, 'vigente', 'Presupuesto revalidado', 'Volvió a vigente');
      return;
    }
    if (p.estado === 'cancelado') {
      this.irNuevo();
      return;
    }
    this.convertirPresupuesto(p);
  }

  private convertirPresupuesto(p: Pedido): void {
    const avanzar = (origen: Pedido) => {
      this.guardando.set(true);
      this.store
        .crear({
          clienteId: origen.clienteId,
          tipo: 'pedido',
          origenId: origen.id,
          lineas: origen.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
        })
        .subscribe({
          next: (pedido) => {
            this.store.cambiarEstado(origen.id, 'convertido').subscribe({
              next: () => {
                this.guardando.set(false);
                this.notifications.success('Pedido creado', numeroDoc(pedido));
                this.store.cargar();
                this.sel.update((s) => ({ ...s, ped: pedido.id }));
                this.setTab('ped');
              },
              error: () => this.guardando.set(false),
            });
          },
          error: () => this.guardando.set(false),
        });
    };
    if (p.estado === 'vigente' || p.estado === 'borrador') {
      this.guardando.set(true);
      const siguiente: EstadoPedido = p.estado === 'borrador' ? 'vigente' : 'aceptado';
      this.store.cambiarEstado(p.id, siguiente).subscribe({
        next: (act) => {
          if (act.estado === 'aceptado') {
            this.guardando.set(false);
            avanzar(act);
            return;
          }
          this.store.cambiarEstado(act.id, 'aceptado').subscribe({
            next: (ok) => {
              this.guardando.set(false);
              avanzar(ok);
            },
            error: () => this.guardando.set(false),
          });
        },
        error: () => this.guardando.set(false),
      });
      return;
    }
    avanzar(p);
  }

  private ctaPedido(p: Pedido): void {
    if (this.esBloqueado(p)) {
      void this.router.navigate(['/cuenta-corriente'], { queryParams: { clienteId: p.clienteId } });
      return;
    }
    if (p.estado === 'facturado' || p.estado === 'entregado') {
      const rem = this.hijoDe(p.id, 'remito');
      const fac = rem ? this.hijoDe(rem.id, 'factura') : this.hijoDe(p.id, 'factura');
      if (fac) {
        this.sel.update((s) => ({ ...s, fac: fac.id }));
        this.setTab('fac');
        return;
      }
      if (rem) {
        this.sel.update((s) => ({ ...s, rem: rem.id }));
        this.setTab('rem');
      }
      return;
    }
    if (p.estado === 'borrador') {
      this.runEstado(p.id, 'confirmado', 'Pedido preparado', 'Listo para remitir');
      return;
    }
    this.generarRemito(p);
  }

  private generarRemito(p: Pedido): void {
    const dep = this.store.depositosRef()[0];
    if (!dep) {
      this.notifications.error('Remito', 'No hay depósito para descontar stock');
      return;
    }
    this.guardando.set(true);
    this.store
      .crear({
        clienteId: p.clienteId,
        tipo: 'remito',
        depositoId: dep.id,
        origenId: p.id,
        lineas: p.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      })
      .subscribe({
        next: (remito) => {
          this.store.cambiarEstado(p.id, 'entregado').subscribe({
            next: () => {
              this.guardando.set(false);
              this.notifications.success('Remito creado', numeroDoc(remito));
              this.store.cargar();
              this.sel.update((s) => ({ ...s, rem: remito.id }));
              this.setTab('rem');
            },
            error: () => this.guardando.set(false),
          });
        },
        error: () => this.guardando.set(false),
      });
  }

  private ctaRemito(p: Pedido): void {
    if (p.estado === 'facturado') {
      const fac = this.hijoDe(p.id, 'factura');
      if (fac) {
        this.sel.update((s) => ({ ...s, fac: fac.id }));
        this.setTab('fac');
      }
      return;
    }
    if (p.estado === 'cancelado') {
      this.notifications.error('Devolución', 'El reingreso a stock se hace cancelando el remito');
      return;
    }
    if (p.estado === 'borrador') {
      this.guardando.set(true);
      this.store.confirmarRemito(p.id).subscribe({
        next: () => {
          this.guardando.set(false);
          this.notifications.success('Remito confirmado', 'Stock descontado · listo para facturar');
          this.store.cargar();
        },
        error: () => this.guardando.set(false),
      });
      return;
    }
    this.guardando.set(true);
    this.store.facturarRemito(p.id).subscribe({
      next: (fac) => {
        this.guardando.set(false);
        this.notifications.success('Factura emitida', numeroDoc(fac));
        this.store.cargar();
        this.sel.update((s) => ({ ...s, fac: fac.id }));
        this.setTab('fac');
      },
      error: () => this.guardando.set(false),
    });
  }

  private ctaFactura(p: Pedido): void {
    if (!p.cae && p.estado !== 'confirmado') {
      this.notifications.error('CAE', 'Reintentá la emisión desde el mostrador');
      return;
    }
    void this.router.navigate(['/cuenta-corriente'], { queryParams: { clienteId: p.clienteId } });
  }

  private cancelarSel(): void {
    const f = this.ficha();
    if (!f) {
      return;
    }
    this.runEstado(f.id, 'cancelado', 'Cancelado', 'El comprobante quedó anulado');
  }

  private duplicarSel(): void {
    const f = this.ficha();
    const p = this.todos().find((x) => x.id === f?.id);
    if (!p) {
      return;
    }
    const dep = p.depositoId ?? this.store.depositosRef()[0]?.id ?? null;
    this.guardando.set(true);
    this.store
      .crear({
        clienteId: p.clienteId,
        tipo: p.tipo,
        depositoId: p.tipo === 'remito' ? dep : null,
        lineas: p.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
      })
      .subscribe({
        next: (nuevo) => {
          this.guardando.set(false);
          this.notifications.success('Copia creada', numeroDoc(nuevo));
          this.store.cargar();
          this.abrir(nuevo.id);
        },
        error: () => this.guardando.set(false),
      });
  }

  private runEstado(id: string, estado: EstadoPedido, titulo: string, detalle: string): void {
    this.guardando.set(true);
    this.store.cambiarEstado(id, estado).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notifications.success(titulo, detalle);
        this.store.cargar();
      },
      error: () => this.guardando.set(false),
    });
  }

  private estadoVista(p: Pedido): { label: string; tone: BadgeTone } {
    if (p.tipo === 'pedido' && this.esBloqueado(p) && p.estado === 'borrador') {
      return { label: 'Bloqueado', tone: 'danger' };
    }
    if (p.tipo === 'factura' && facturaVencida(p)) {
      return { label: 'Vencida', tone: 'danger' };
    }
    if (p.tipo === 'factura' && !p.cae) {
      return { label: 'Sin CAE', tone: 'danger' };
    }
    return etiquetaEstadoVista(p.tipo, p.estado);
  }

  private esBloqueado(p: Pedido): boolean {
    const cli = this.clienteDe()[p.clienteId];
    if (!cli || p.tipo !== 'pedido') {
      return false;
    }
    if (cli.bloqueado) {
      return true;
    }
    const limite = cli.limiteCredito ?? 0;
    if (limite <= 0) {
      return false;
    }
    const saldo = this.saldos()[p.clienteId] ?? 0;
    return saldo + p.total > limite && p.estado !== 'cancelado' && p.estado !== 'facturado';
  }

  private faltantes(p: Pedido): number {
    const productos = this.productoDe();
    return p.lineas.filter((l) => (productos[l.productoId]?.stock ?? 0) < l.cantidad).length;
  }

  private hijoDe(origenId: string, tipo: Pedido['tipo']): Pedido | undefined {
    return this.todos().find((d) => d.origenId === origenId && d.tipo === tipo);
  }

  private cadenaDe(p: Pedido): Record<TabVentas, Pedido | undefined> {
    const byId = new Map(this.todos().map((d) => [d.id, d]));
    const ancestros: Pedido[] = [];
    let cur: Pedido | undefined = p;
    const vistos = new Set<string>();
    while (cur && !vistos.has(cur.id)) {
      vistos.add(cur.id);
      ancestros.unshift(cur);
      cur = cur.origenId ? byId.get(cur.origenId) : undefined;
    }
    const root = ancestros[0] ?? p;
    const out: Record<TabVentas, Pedido | undefined> = {
      pre: undefined,
      ped: undefined,
      rem: undefined,
      fac: undefined,
    };
    const cola: Pedido[] = [root];
    const seen = new Set<string>();
    while (cola.length) {
      const n = cola.shift();
      if (!n || seen.has(n.id)) {
        continue;
      }
      seen.add(n.id);
      if (n.tipo === 'presupuesto') {
        out.pre = n;
      }
      if (n.tipo === 'pedido') {
        out.ped = n;
      }
      if (n.tipo === 'remito') {
        out.rem = n;
      }
      if (n.tipo === 'factura') {
        out.fac = n;
      }
      for (const h of this.todos().filter((d) => d.origenId === n.id)) {
        cola.push(h);
      }
    }
    return out;
  }

  private trazaDe(cadena: Record<TabVentas, Pedido | undefined>, actual: Pedido): PasoCircuito[] {
    const tabs: TabVentas[] = ['pre', 'ped', 'rem', 'fac'];
    const labels = ['Presupuesto', 'Pedido', 'Remito', 'Factura'];
    return tabs
      .map((t, i) => {
        const doc = cadena[t];
        return {
          label: labels[i],
          value: doc ? numeroDoc(doc) : '—',
          on: !!doc,
          tab: t,
          id: doc?.id ?? null,
        };
      })
      .map((paso) => (paso.id === actual.id ? { ...paso, on: true } : paso));
  }

  private lineaFicha(l: Pedido['lineas'][number], tab: TabVentas): LineaFicha {
    const prod: ProductoRef | undefined = this.productoDe()[l.productoId];
    const stock = prod?.stock ?? 0;
    const sin = stock < l.cantidad && (tab === 'pre' || tab === 'ped');
    return {
      id: l.id,
      nombre: l.descripcion || prod?.nombre || l.productoId,
      sku: prod?.sku ?? l.productoId.slice(0, 8),
      cant: `${l.cantidad} u`,
      precio: formatearMoneyDec(l.precioUnitario),
      desc: '—',
      subtotal: formatearMoneyDec(l.cantidad * l.precioUnitario),
      aviso: sin,
      avisoTxt: sin
        ? `Stock disponible ${stock} u de ${l.cantidad} pedidas: hay que reponer o entregar parcial.`
        : '',
    };
  }

  private notaCta(
    tab: TabVentas,
    p: Pedido,
    cli: ClienteRef | undefined,
    cadena: Record<TabVentas, Pedido | undefined>,
    falt: number,
    excede: boolean,
    saldo: number,
    limite: number,
    vtoPre: string,
    vtoFac: string,
  ): { txt: string; tone: BadgeTone; cta: string; sec: string[] } {
    if (tab === 'pre') {
      const sec = ['Imprimir', 'Duplicar'];
      if (p.estado === 'convertido' || cadena.ped) {
        return {
          txt: cadena.ped
            ? `Ya se convirtió en el pedido ${numeroDoc(cadena.ped)}: los precios quedaron congelados.`
            : 'Convertido: buscá el pedido en la pestaña Pedidos.',
          tone: 'ok',
          cta: 'Ver pedido',
          sec,
        };
      }
      if (p.estado === 'vencido') {
        return {
          txt: `Venció el ${vtoPre} sin respuesta. Al revalidarlo vuelve a vigente con la lista de hoy.`,
          tone: 'warn',
          cta: 'Revalidar precios',
          sec,
        };
      }
      if (p.estado === 'cancelado') {
        return {
          txt: 'El cliente lo rechazó. Queda en el historial para comparar contra el próximo presupuesto.',
          tone: 'danger',
          cta: 'Rehacer',
          sec,
        };
      }
      if (falt) {
        return {
          txt: `${falt} artículos no tienen stock suficiente. El presupuesto se puede convertir igual, pero conviene aclarar el plazo.`,
          tone: 'warn',
          cta: 'Convertir en pedido',
          sec,
        };
      }
      return {
        txt: `Un presupuesto no mueve stock ni cuenta corriente: solo reserva el precio hasta el ${vtoPre}.`,
        tone: 'info',
        cta: 'Convertir en pedido',
        sec,
      };
    }
    if (tab === 'ped') {
      const sec = ['Hoja de armado', 'Cancelar pedido'];
      if (this.esBloqueado(p)) {
        return {
          txt: `Pedido bloqueado: el saldo de ${formatearMoney(saldo)} más este pedido supera el límite de ${formatearMoney(limite)}. Necesita cobro previo.`,
          tone: 'danger',
          cta: 'Ir a cobrar',
          sec,
        };
      }
      if (p.estado === 'facturado' || p.estado === 'entregado') {
        return {
          txt: cadena.fac
            ? `Pedido cumplido: remitido${cadena.rem ? ' con ' + numeroDoc(cadena.rem) : ''} y facturado con ${numeroDoc(cadena.fac)}.`
            : 'Pedido remitido. Falta la factura.',
          tone: 'ok',
          cta: cadena.fac ? 'Ver factura' : 'Ver remito',
          sec,
        };
      }
      if (falt) {
        return {
          txt: `${falt} líneas sin stock suficiente. Podés remitir lo cargado o esperar la reposición.`,
          tone: 'warn',
          cta: p.estado === 'confirmado' ? 'Generar remito' : 'Marcar preparado',
          sec,
        };
      }
      return {
        txt: 'El pedido reserva stock sin descontarlo. Recién el remito hace la salida real de mercadería.',
        tone: 'info',
        cta: p.estado === 'confirmado' ? 'Generar remito' : 'Marcar preparado',
        sec,
      };
    }
    if (tab === 'rem') {
      const sec = ['Imprimir remito'];
      if (p.estado === 'cancelado') {
        return {
          txt: 'El cliente rechazó la entrega. Las unidades reingresan si el remito se canceló con stock.',
          tone: 'danger',
          cta: 'Ver historial',
          sec,
        };
      }
      if (p.estado === 'facturado') {
        return {
          txt: cadena.fac
            ? `Entregado y facturado con ${numeroDoc(cadena.fac)}. El movimiento de stock ya está registrado.`
            : 'Remito facturado.',
          tone: 'ok',
          cta: 'Ver factura',
          sec,
        };
      }
      if (p.estado === 'borrador') {
        return {
          txt: 'Salió del depósito al confirmarse: el stock se descuenta en ese momento. Si el cliente rechaza, se cancela antes de facturar.',
          tone: 'info',
          cta: 'Confirmar entrega',
          sec,
        };
      }
      return {
        txt: 'Mercadería entregada sin facturar. Conviene facturar el mismo día: el remito descuenta stock pero no genera la deuda del cliente.',
        tone: 'accent',
        cta: 'Facturar este remito',
        sec,
      };
    }
    const sec = ['Imprimir / PDF'];
    if (!p.cae) {
      return {
        txt: 'Todavía no hay CAE. El comprobante no es válido hasta obtenerlo: revisá el punto de venta o reintentá desde el mostrador.',
        tone: 'danger',
        cta: 'Ir a cuenta corriente',
        sec,
      };
    }
    if (facturaVencida(p)) {
      return {
        txt: `Venció el ${vtoFac} sin cobrar. Ya está sumando en la cuenta corriente de ${cli?.nombre ?? 'el cliente'}.`,
        tone: 'danger',
        cta: 'Registrar cobro',
        sec,
      };
    }
    if (excede) {
      return {
        txt: `Emitida, pero el saldo queda en ${formatearMoney(saldo + p.total)} sobre un límite de ${formatearMoney(limite)}. El próximo pedido se puede bloquear.`,
        tone: 'warn',
        cta: 'Registrar cobro',
        sec,
      };
    }
    return {
      txt: `Emitida con CAE ${p.cae}. Suma a la cuenta corriente con vencimiento ${vtoFac}.`,
      tone: 'info',
      cta: 'Registrar cobro',
      sec,
    };
  }

  private impactosDe(
    tab: TabVentas,
    p: Pedido,
    cli: ClienteRef | undefined,
    cadena: Record<TabVentas, Pedido | undefined>,
    falt: number,
    excede: boolean,
    saldo: number,
    limite: number,
    vtoPre: string,
    vtoFac: string,
  ): Impacto[] {
    if (tab === 'pre') {
      return [
        {
          titulo: 'Stock',
          detalle: 'No mueve nada: el presupuesto no reserva ni descuenta unidades.',
          on: false,
        },
        {
          titulo: 'Precio',
          detalle: `Queda congelado hasta el ${vtoPre} con la lista vigente al ${formatearFechaCorta(p.fecha)}.`,
          on: true,
        },
        { titulo: 'Cuenta corriente', detalle: 'Sin efecto hasta que se facture.', on: false },
        {
          titulo: 'Al convertirlo',
          detalle: 'Genera el pedido con estas cantidades y precios.',
          on: true,
        },
      ];
    }
    if (tab === 'ped') {
      return [
        {
          titulo: 'Stock',
          detalle: falt
            ? `Faltan ${falt} líneas de stock para completar.`
            : 'Reserva las unidades: siguen contadas pero no disponibles para el mostrador.',
          on: true,
        },
        {
          titulo: 'Crédito del cliente',
          detalle: excede
            ? 'Excede el límite: el pedido queda marcado como bloqueado hasta cobrar.'
            : `Saldo ${formatearMoney(saldo)} sobre un límite de ${formatearMoney(limite || 0)}.`,
          on: !excede,
        },
        {
          titulo: 'Cuenta corriente',
          detalle: 'Sin movimiento: la deuda nace con la factura.',
          on: false,
        },
        {
          titulo: 'Al remitir',
          detalle: 'Descuenta el stock y habilita la facturación.',
          on: true,
        },
      ];
    }
    if (tab === 'rem') {
      const unid = p.lineas.reduce((n, l) => n + l.cantidad, 0);
      return [
        {
          titulo: 'Stock',
          detalle:
            p.estado === 'cancelado'
              ? `Reingresa ${unid} u al depósito al procesar la devolución.`
              : `Descuenta ${unid} u del depósito con fecha ${formatearFechaCorta(p.fecha)}.`,
          on: true,
        },
        {
          titulo: 'Cuenta corriente',
          detalle: 'No genera deuda: el remito solo documenta la entrega.',
          on: false,
        },
        {
          titulo: 'Pedido asociado',
          detalle: cadena.ped
            ? `Descuenta lo entregado de ${numeroDoc(cadena.ped)}.`
            : 'Sin pedido: es una entrega directa.',
          on: !!cadena.ped,
        },
        {
          titulo: 'Al facturar',
          detalle: 'Toma estas cantidades y precios, y recién ahí impacta la cuenta corriente.',
          on: true,
        },
      ];
    }
    return [
      {
        titulo: 'Cuenta corriente',
        detalle: `Suma ${formatearMoneyDec(p.total)} al saldo de ${cli?.nombre ?? 'el cliente'}, vence ${vtoFac}.`,
        on: true,
      },
      {
        titulo: 'Stock',
        detalle: cadena.rem
          ? `No mueve stock: la salida se hizo con el remito ${numeroDoc(cadena.rem)}.`
          : 'Sin remito: al emitirla se descuenta el stock en el mismo acto.',
        on: !cadena.rem,
      },
      {
        titulo: 'AFIP',
        detalle: p.cae
          ? `CAE ${p.cae} obtenido, comprobante fiscal válido.`
          : 'Pendiente de CAE: el comprobante no es válido todavía.',
        on: !!p.cae,
      },
      {
        titulo: 'IVA ventas',
        detalle: p.iva
          ? `Genera ${formatearMoneyDec(p.iva)} de débito fiscal en el libro del mes.`
          : `Sin IVA: el cliente es ${etiquetaIva(cli?.condicionIva ?? '').toLowerCase()}.`,
        on: p.iva > 0,
      },
    ];
  }
}
