import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { BancosService, ValorBancarioDto } from '../bancos/data-access/bancos.service';
import { ConfiguracionService } from '../configuracion/data-access/configuracion.service';
import { CuentaCorrienteService } from '../cuenta-corriente/data-access/cuenta-corriente.service';
import {
  EstadoCuenta,
  ListaPrecioRef,
  SaldoCliente,
} from '../cuenta-corriente/data-access/cxc.model';
import { Pedido, ProductoRef, UsuarioRef } from '../ventas/data-access/pedido.model';
import { VentasService } from '../ventas/data-access/ventas.service';
import { ZonasStore } from '../zonas/data-access/zonas.store';
import {
  BadgeTone,
  ChipCli,
  DIAS_INACTIVIDAD,
  DIAS_MORA,
  SubFicha,
  TabCli,
  diasDesde,
  etiquetaIva,
  formatearFechaCorta,
  formatearMoney,
  formatearMoneyDec,
  moraTone,
  normalizar,
  pct,
} from './clientes-vista';
import { Cliente, CondicionIva } from './data-access/cliente.model';
import { ClientesStore } from './data-access/clientes.store';

interface TagVista {
  label: string;
  tone: BadgeTone;
}

interface CliEnr {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  iva: CondicionIva;
  ivaTxt: string;
  zonaId: string | null;
  zona: string;
  vendId: string | null;
  vend: string;
  limite: number;
  saldo: number;
  moraDias: number;
  vencido: number;
  usoPct: number;
  excede: boolean;
  bloqueado: boolean;
  activo: boolean;
  ultIso: string | null;
  ultFmt: string;
  inactivo: boolean;
  cond: string;
  observaciones: string;
  tags: TagVista[];
}

@Component({
  selector: 'app-clientes-page',
  imports: [FormsModule],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesPage {
  private readonly store = inject(ClientesStore);
  private readonly zonasStore = inject(ZonasStore);
  private readonly cxc = inject(CuentaCorrienteService);
  private readonly ventas = inject(VentasService);
  private readonly bancos = inject(BancosService);
  private readonly config = inject(ConfiguracionService);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);

  protected readonly tab = signal<TabCli>('cartera');
  protected readonly chip = signal<ChipCli>('todos');
  protected readonly sub = signal<SubFicha>('cond');
  protected readonly q = signal('');
  protected readonly fZona = signal('');
  protected readonly fVend = signal('');
  protected readonly selId = signal<string | null>(null);
  protected readonly listaSelId = signal<string | null>(null);

  protected readonly saldos = signal<Record<string, SaldoCliente>>({});
  protected readonly vendedores = signal<UsuarioRef[]>([]);
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly productos = signal<ProductoRef[]>([]);
  protected readonly listas = signal<ListaPrecioRef[]>([]);
  protected readonly preciosLista = signal<{ articuloId: string; precio: number }[]>([]);
  protected readonly preciosDefault = signal<Map<string, number>>(new Map());
  protected readonly cheques = signal<ValorBancarioDto[]>([]);
  protected readonly estadoCta = signal<EstadoCuenta | null>(null);
  protected readonly reglas = signal<Record<string, boolean>>({
    remito: true,
    cheque: true,
    contado: false,
    bloqueo_auto: true,
    autorizar: false,
  });

  protected readonly altaOpen = signal(false);
  protected readonly altaModo = signal<'alta' | 'editar'>('alta');
  protected readonly altaPaso = signal(1);
  protected readonly guardando = signal(false);
  protected readonly listaOpen = signal(false);
  protected readonly vendOpen = signal(false);
  protected readonly limiteOpen = signal(false);
  protected readonly limiteDraft = signal('');
  protected readonly vendDraft = signal('');
  protected readonly listaCodigo = signal('');
  protected readonly listaNombre = signal('');

  protected readonly altaNombre = signal('');
  protected readonly altaCuit = signal('');
  protected readonly altaIva = signal<CondicionIva>('responsable_inscripto');
  protected readonly altaEmail = signal('');
  protected readonly altaTel = signal('');
  protected readonly altaZona = signal('');
  protected readonly altaVend = signal('');
  protected readonly altaLimite = signal('0');
  protected readonly altaObs = signal('');
  protected readonly altaBloqueado = signal(false);

  protected readonly esAdmin = computed(() => this.auth.puede('clientes'));
  protected readonly estado = computed(() => this.store.clientes());
  protected readonly todos = computed(() => this.estado().data ?? []);
  protected readonly zonas = computed(() =>
    (this.zonasStore.zonas().data ?? []).filter((z) => z.activo),
  );
  protected readonly mapaZonas = computed(() => {
    const m = new Map<string, string>();
    for (const z of this.zonasStore.zonas().data ?? []) {
      m.set(z.id, z.nombre);
    }
    return m;
  });
  protected readonly mapaVend = computed(() => {
    const m = new Map<string, string>();
    for (const v of this.vendedores()) {
      m.set(v.id, v.nombre);
    }
    return m;
  });
  protected readonly listaDefault = computed(
    () =>
      this.listas().find((l) => l.esDefault && l.activo) ??
      this.listas().find((l) => l.activo) ??
      null,
  );

  protected readonly enriquecidos = computed((): CliEnr[] => {
    const saldos = this.saldos();
    const zonas = this.mapaZonas();
    const vends = this.mapaVend();
    const pedidos = this.pedidos();
    return this.todos().map((c) => this.enriquecer(c, saldos, zonas, vends, pedidos));
  });

  protected readonly filtrados = computed(() => {
    const q = normalizar(this.q().trim());
    const zona = this.fZona();
    const vend = this.fVend();
    const chip = this.chip();
    return this.enriquecidos().filter((c) => {
      if (
        q &&
        !normalizar(c.nombre).includes(q) &&
        !c.cuit.includes(this.q().trim()) &&
        !normalizar(c.telefono).includes(q) &&
        !normalizar(c.email).includes(q)
      ) {
        return false;
      }
      if (zona && c.zonaId !== zona) {
        return false;
      }
      if (vend && c.vendId !== vend) {
        return false;
      }
      if (chip === 'mora' && c.moraDias <= DIAS_MORA) {
        return false;
      }
      if (chip === 'limite' && !c.excede) {
        return false;
      }
      if (chip === 'bloq' && !c.bloqueado) {
        return false;
      }
      if (chip === 'inactivos' && !c.inactivo) {
        return false;
      }
      if (chip === 'nuevos') {
        return false;
      }
      return true;
    });
  });

  protected readonly kpis = computed(() => {
    const all = this.enriquecidos();
    const activos = all.filter((c) => c.activo && !c.bloqueado);
    const mora = all.filter((c) => c.moraDias > DIAS_MORA);
    const limite = all.filter((c) => c.excede);
    const bloq = all.filter((c) => c.bloqueado);
    const saldo = all.reduce((n, c) => n + c.saldo, 0);
    const vencido = all.reduce((n, c) => n + c.vencido, 0);
    const chip = this.chip();
    return [
      {
        id: 'todos' as ChipCli,
        label: 'Clientes activos',
        value: String(activos.length),
        hint: 'activos y no bloqueados',
        tone: 'ink' as BadgeTone,
        on: chip === 'todos',
      },
      {
        id: 'nuevos' as ChipCli,
        label: 'Nuevos del año',
        value: '—',
        hint: 'el API no guarda fecha de alta',
        tone: 'accent' as BadgeTone,
        on: chip === 'nuevos',
      },
      {
        id: 'mora' as ChipCli,
        label: 'Con mora',
        value: String(mora.length),
        hint: `más de ${DIAS_MORA} días`,
        tone: 'warn' as BadgeTone,
        on: chip === 'mora',
      },
      {
        id: 'limite' as ChipCli,
        label: 'Sobre el límite',
        value: String(limite.length),
        hint: 'requieren autorización',
        tone: 'danger' as BadgeTone,
        on: chip === 'limite',
      },
      {
        id: 'bloq' as ChipCli,
        label: 'Bloqueados',
        value: String(bloq.length),
        hint: 'no pueden comprar en cuenta',
        tone: 'danger' as BadgeTone,
        on: chip === 'bloq',
      },
      {
        id: 'todos' as ChipCli,
        label: 'Saldo de cartera',
        value: formatearMoney(saldo),
        hint: `${formatearMoney(vencido)} vencido`,
        tone: 'ink' as BadgeTone,
        on: false,
      },
    ];
  });

  protected readonly chips = computed(() => {
    const chip = this.chip();
    return [
      { id: 'todos' as ChipCli, label: 'Todos' },
      { id: 'mora' as ChipCli, label: 'Con mora' },
      { id: 'limite' as ChipCli, label: 'Sobre límite' },
      { id: 'inactivos' as ChipCli, label: `Sin comprar hace ${DIAS_INACTIVIDAD} d` },
    ].map((c) => ({ ...c, on: chip === c.id }));
  });

  protected readonly rows = computed(() => {
    const sel = this.selId();
    return this.filtrados().map((c) => ({
      ...c,
      sel: sel === c.id,
      moraTxt: c.moraDias <= 0 ? 'Al día' : `${c.moraDias} d`,
      moraTone: moraTone(c.moraDias),
      credTxt: c.limite ? `${c.usoPct} % de ${formatearMoney(c.limite)}` : 'sin límite',
      credTone: (c.excede ? 'danger' : c.usoPct > 80 ? 'warn' : 'ok') as BadgeTone,
      credPct: pct(c.usoPct),
      saldoTxt: c.saldo ? formatearMoney(c.saldo) : '—',
      ultTone: (c.inactivo ? 'warn' : 'muted') as BadgeTone,
      lista: '—',
    }));
  });

  protected readonly vacio = computed(
    () => this.estado().status !== 'loading' && this.rows().length === 0,
  );
  protected readonly countTxt = computed(() => {
    const n = this.rows().length;
    const t = this.enriquecidos().length;
    return `${n} de ${t} clientes`;
  });
  protected readonly totalFmt = computed(() =>
    formatearMoney(this.filtrados().reduce((n, c) => n + c.saldo, 0)),
  );
  protected readonly contextoTxt = computed(() => {
    const n = this.enriquecidos().length;
    const mora = this.enriquecidos().filter((c) => c.moraDias > DIAS_MORA).length;
    return `${n} clientes · ${mora} con mora`;
  });
  protected readonly badgeFicha = computed(() => (this.selId() ? 1 : 0));

  protected readonly listaLateral = computed(() => {
    const q = normalizar(this.q().trim());
    const sel = this.selId();
    return this.enriquecidos()
      .filter(
        (c) =>
          !q ||
          normalizar(c.nombre).includes(q) ||
          c.cuit.includes(this.q().trim()) ||
          normalizar(c.email).includes(q),
      )
      .map((c) => ({
        ...c,
        sel: sel === c.id,
        saldoTxt: c.saldo ? formatearMoney(c.saldo) : 'sin saldo',
        moraTxt: c.moraDias <= 0 ? 'Al día' : `${c.moraDias} d`,
        moraTone: moraTone(c.moraDias),
      }));
  });

  protected readonly ficha = computed(() => {
    const id = this.selId();
    const c = this.enriquecidos().find((x) => x.id === id) ?? this.enriquecidos()[0] ?? null;
    if (!c) {
      return null;
    }
    const disp = Math.max(0, c.limite - c.saldo);
    const sano = Math.max(0, c.saldo - c.vencido);
    const base = Math.max(c.limite, c.saldo, 1);
    const compras = this.pedidos().filter((p) => p.clienteId === c.id && p.tipo === 'factura');
    const total12 = compras.reduce((n, p) => n + p.total, 0);
    const ticket = compras.length ? total12 / compras.length : 0;
    const chequesN = this.chequesDe(c).length;
    const tags = [...c.tags];
    if (c.moraDias > 60) {
      tags.unshift({ label: `${c.moraDias} días de mora`, tone: 'danger' });
    } else if (c.moraDias > DIAS_MORA) {
      tags.unshift({ label: `${c.moraDias} días de mora`, tone: 'warn' });
    }
    return {
      ...c,
      meta: `${c.cuit || 'sin CUIT'} · ${c.email || 'sin mail'} · ${c.telefono || 'sin tel'}`,
      tags: tags.length ? tags : [{ label: 'Al día', tone: 'ok' as BadgeTone }],
      kpis: [
        {
          label: 'Saldo',
          value: c.saldo ? formatearMoney(c.saldo) : '$ 0',
          hint: c.cond,
          tone: (c.saldo ? 'danger' : 'ok') as BadgeTone,
        },
        {
          label: 'Vencido',
          value: c.vencido ? formatearMoney(c.vencido) : '—',
          hint: c.moraDias ? `${c.moraDias} días de mora` : 'sin vencidos',
          tone: (c.vencido ? 'danger' : 'ok') as BadgeTone,
        },
        {
          label: 'Crédito usado',
          value: c.limite ? `${c.usoPct} %` : 'sin límite',
          hint: c.limite ? `de ${formatearMoney(c.limite)}` : 'venta solo contado',
          tone: (c.excede ? 'danger' : 'ink') as BadgeTone,
        },
        {
          label: 'Compras 12 meses',
          value: formatearMoney(total12),
          hint: `${compras.length} facturas`,
          tone: 'ink' as BadgeTone,
        },
        {
          label: 'Ticket promedio',
          value: formatearMoney(ticket),
          hint: c.ultIso ? `última compra ${c.ultFmt}` : 'sin compras',
          tone: 'ink' as BadgeTone,
        },
        {
          label: 'Cheques en cartera',
          value: String(chequesN),
          hint: chequesN ? 'pendientes de acreditar' : 'ninguno',
          tone: (chequesN ? 'warn' : 'ok') as BadgeTone,
        },
      ],
      credTitulo: c.bloqueado
        ? 'Cliente bloqueado para cuenta corriente'
        : c.excede
          ? 'Está por encima del límite de crédito'
          : c.moraDias > DIAS_MORA
            ? 'Hay deuda en mora'
            : 'Cuenta al día',
      credSub: c.bloqueado
        ? 'No se puede vender en cuenta hasta desbloquear.'
        : c.excede
          ? 'Hace falta autorización o un cobro para seguir vendiendo en cuenta.'
          : c.moraDias > DIAS_MORA
            ? `La deuda más antigua tiene ${c.moraDias} días.`
            : 'Puede seguir comprando dentro del límite.',
      credTone: (c.bloqueado || c.excede
        ? 'danger'
        : c.moraDias > DIAS_MORA
          ? 'warn'
          : 'ok') as BadgeTone,
      barSano: pct((sano / base) * 100),
      barVencido: pct((c.vencido / base) * 100),
      sanoFmt: formatearMoney(sano),
      vencidoFmt: formatearMoney(c.vencido),
      dispFmt: formatearMoney(disp),
      credCtaLabel: c.bloqueado
        ? 'Desbloquear'
        : c.excede || c.moraDias > DIAS_MORA
          ? 'Cobrar'
          : 'Nueva venta',
    };
  });

  protected readonly bloques = computed(() => {
    const c = this.ficha();
    if (!c) {
      return [];
    }
    const lista = this.listaDefault();
    return [
      {
        titulo: 'Identificación',
        sub: c.activo ? 'activo' : 'inactivo',
        filas: [
          { label: 'Razón social', value: c.nombre },
          { label: 'CUIT', value: c.cuit || '—' },
          { label: 'Condición IVA', value: c.ivaTxt },
          { label: 'Email', value: c.email || '—' },
          { label: 'Teléfono', value: c.telefono || '—' },
        ],
      },
      {
        titulo: 'Comercial',
        sub: c.zona,
        filas: [
          { label: 'Zona', value: c.zona },
          { label: 'Vendedor', value: c.vend },
          { label: 'Lista de precios', value: lista ? lista.nombre : '—' },
          { label: 'Condición', value: c.cond },
          { label: 'Límite de crédito', value: c.limite ? formatearMoney(c.limite) : 'sin límite' },
        ],
      },
      {
        titulo: 'Estado',
        sub: c.bloqueado ? 'bloqueado' : 'operativo',
        filas: [
          { label: 'Activo', value: c.activo ? 'Sí' : 'No' },
          { label: 'Bloqueado', value: c.bloqueado ? 'Sí' : 'No' },
          { label: 'Saldo', value: formatearMoney(c.saldo) },
          { label: 'Última compra', value: c.ultFmt },
        ],
      },
      {
        titulo: 'Notas',
        sub: 'observaciones del cliente',
        filas: [{ label: 'Observaciones', value: c.observaciones || 'Sin notas internas' }],
      },
    ];
  });

  protected readonly reglasVista = computed(() => {
    const r = this.reglas();
    const c = this.ficha();
    return [
      {
        id: 'remito',
        on: r['remito'] ?? true,
        label: 'Permite remito sin facturar',
        sub: 'entrega ahora y factura después',
      },
      {
        id: 'cheque',
        on: r['cheque'] ?? true,
        label: 'Acepta cheques de terceros',
        sub: 'entran a la cartera de tesorería',
      },
      {
        id: 'contado',
        on: r['contado'] ?? false,
        label: 'Solo contado',
        sub: c?.limite ? 'hoy tiene límite de crédito' : 'sin límite cargado',
      },
      {
        id: 'bloqueo_auto',
        on: r['bloqueo_auto'] ?? true,
        label: 'Bloquear si supera el límite',
        sub: 'el bloqueo real se guarda en el cliente',
      },
      {
        id: 'autorizar',
        on: r['autorizar'] ?? false,
        label: 'Requiere autorización extra',
        sub: 'regla de mostrador, no persiste en el API',
      },
    ];
  });

  protected readonly cobranza = computed(() => {
    const movs = this.estadoCta()?.movimientos ?? [];
    return [...movs]
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .slice(0, 8)
      .map((m) => ({
        fecha: formatearFechaCorta(m.fecha),
        detalle: m.concepto || m.referenciaTipo,
        valor: (m.tipo === 'haber' ? '+' : '−') + formatearMoney(m.monto),
        tone: (m.tipo === 'haber' ? 'ok' : 'danger') as BadgeTone,
      }));
  });

  protected readonly historial = computed(() => {
    const id = this.ficha()?.id;
    if (!id) {
      return [];
    }
    return this.pedidos()
      .filter((p) => p.clienteId === id)
      .slice()
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map((p) => {
        const estado = this.estadoHist(p);
        return {
          id: p.id,
          num: p.numero || p.id.slice(0, 8),
          fecha: formatearFechaCorta(p.fecha),
          detalle:
            p.lineas
              .map((l) => l.descripcion)
              .filter(Boolean)
              .slice(0, 3)
              .join(' · ') || p.tipo,
          items: p.lineas.length,
          total: formatearMoney(p.total),
          tone: estado.tone,
          estado: estado.label,
        };
      });
  });

  protected readonly histTotal = computed(() => {
    const id = this.ficha()?.id;
    if (!id) {
      return formatearMoney(0);
    }
    const sum = this.pedidos()
      .filter((p) => p.clienteId === id && p.tipo === 'factura')
      .reduce((n, p) => n + p.total, 0);
    return formatearMoney(sum);
  });
  protected readonly histNota = computed(() => {
    const n = this.historial().length;
    return n ? `${n} comprobantes` : 'Sin comprobantes todavía';
  });

  protected readonly topCompras = computed(() => {
    const id = this.ficha()?.id;
    if (!id) {
      return [];
    }
    const acc = new Map<string, { nom: string; imp: number }>();
    for (const p of this.pedidos().filter((x) => x.clienteId === id && x.tipo === 'factura')) {
      for (const l of p.lineas) {
        const prev = acc.get(l.productoId) ?? { nom: l.descripcion, imp: 0 };
        prev.imp += l.cantidad * l.precioUnitario;
        acc.set(l.productoId, prev);
      }
    }
    const ranked = [...acc.values()].sort((a, b) => b.imp - a.imp).slice(0, 5);
    const max = ranked[0]?.imp || 1;
    return ranked.map((t) => ({
      nom: t.nom,
      imp: formatearMoney(t.imp),
      pct: pct((t.imp / max) * 100),
    }));
  });

  protected readonly comportamiento = computed(() => {
    const c = this.ficha();
    if (!c) {
      return [];
    }
    const facts = this.pedidos().filter((p) => p.clienteId === c.id && p.tipo === 'factura');
    return [
      { label: 'Facturas', value: String(facts.length), tone: 'ink' as BadgeTone },
      { label: 'Última compra', value: c.ultFmt, tone: (c.inactivo ? 'warn' : 'ink') as BadgeTone },
      {
        label: 'Saldo',
        value: formatearMoney(c.saldo),
        tone: (c.saldo ? 'danger' : 'ok') as BadgeTone,
      },
      {
        label: 'Mora',
        value: c.moraDias <= 0 ? 'Al día' : `${c.moraDias} d`,
        tone: moraTone(c.moraDias),
      },
      {
        label: 'Cheques',
        value: String(this.chequesDe(c).length),
        tone: 'ink' as BadgeTone,
      },
    ];
  });

  protected readonly listasRows = computed(() => {
    const sel = this.listaSelId();
    const defaultId = this.listaDefault()?.id;
    const nCli = this.enriquecidos().length;
    return this.listas().map((l) => ({
      id: l.id,
      nombre: l.nombre,
      sub: l.esDefault ? 'precio de vidriera, base de comparación' : l.codigo,
      margen: '—',
      dif: l.esDefault ? 'base' : '—',
      difTone: 'muted' as BadgeTone,
      clientes: l.esDefault ? String(nCli) : '—',
      facturado: '—',
      estado: l.activo ? 'Vigente' : 'Inactiva',
      estTone: (l.activo ? 'ok' : 'muted') as BadgeTone,
      sel: (sel ?? defaultId) === l.id,
    }));
  });

  protected readonly listaSelNombre = computed(() => {
    const id = this.listaSelId() ?? this.listaDefault()?.id;
    return this.listas().find((l) => l.id === id)?.nombre ?? 'Lista';
  });

  protected readonly artRows = computed(() => {
    const prods = this.productos();
    const pub = this.preciosDefault();
    const listaId = this.listaSelId() ?? this.listaDefault()?.id;
    const esDefault = listaId === this.listaDefault()?.id;
    return this.preciosLista().map((p) => {
      const art = prods.find((x) => x.id === p.articuloId);
      const publico = pub.get(p.articuloId) ?? art?.precio ?? p.precio;
      const dif = p.precio - publico;
      return {
        id: p.articuloId,
        cod: art?.sku ?? p.articuloId.slice(0, 8),
        nom: art?.nombre ?? 'Artículo',
        costo: '—',
        precio: formatearMoneyDec(p.precio),
        margen: '—',
        publico: formatearMoneyDec(publico),
        dif: esDefault || dif === 0 ? '—' : (dif > 0 ? '+' : '') + formatearMoneyDec(dif),
        difTone: (dif < 0 ? 'ok' : dif > 0 ? 'warn' : 'muted') as BadgeTone,
      };
    });
  });

  protected readonly descRows = computed(() => [
    {
      nombre: 'Precio de lista',
      valor: 'base',
      regla: 'Cada cliente usa la lista default: el API no asigna lista por cliente.',
      tone: 'ink' as BadgeTone,
    },
    {
      nombre: 'Descuento de lista vs. pública',
      valor: 'según artículo',
      regla: 'La diferencia se ve en la grilla de la lista seleccionada.',
      tone: 'accent' as BadgeTone,
    },
    {
      nombre: 'Pago contado',
      valor: 'no configurado',
      regla: 'El API no tiene motor de descuentos; el mostrador cobra el precio de lista.',
      tone: 'muted' as BadgeTone,
    },
  ]);

  protected readonly cascada = computed(() => {
    const art = this.artRows()[0];
    return [
      {
        n: '1',
        label: 'Precio de lista',
        detalle: this.listaSelNombre(),
        valor: art?.precio ?? '—',
        tone: 'ink' as BadgeTone,
      },
      {
        n: '2',
        label: 'Vs. precio público',
        detalle: 'lista default / mostrador',
        valor: art?.publico ?? '—',
        tone: 'muted' as BadgeTone,
      },
      {
        n: '3',
        label: 'Descuento de reglas',
        detalle: 'no hay motor de descuentos',
        valor: '—',
        tone: 'muted' as BadgeTone,
      },
      {
        n: '4',
        label: 'Precio final',
        detalle: 'el que cobra el mostrador',
        valor: art?.precio ?? '—',
        tone: 'accent' as BadgeTone,
      },
    ];
  });

  constructor() {
    this.store.cargar({ filtro: 'todos', pageSize: 200 });
    this.zonasStore.cargar({ filtro: 'activos' });
    this.cxc.listarSaldos().subscribe({
      next: (items) => {
        const map: Record<string, SaldoCliente> = {};
        for (const s of items) {
          map[s.clienteId] = s;
        }
        this.saldos.set(map);
      },
    });
    this.ventas.listarUsuariosRef().subscribe({ next: (v) => this.vendedores.set(v) });
    this.ventas.listar().subscribe({ next: (p) => this.pedidos.set(p) });
    this.ventas.listarProductosRef().subscribe({ next: (p) => this.productos.set(p) });
    this.bancos.valores({ tipo: 'cheque_tercero', estado: 'en_cartera' }).subscribe({
      next: (v) => this.cheques.set(v),
      error: () => this.cheques.set([]),
    });
    this.cxc.listarListasPrecio().subscribe({
      next: (items) => {
        this.listas.set(items);
        const def = items.find((l) => l.esDefault && l.activo) ?? items.find((l) => l.activo);
        if (def) {
          this.listaSelId.set(def.id);
        }
      },
    });

    effect(() => {
      const id = this.selId();
      untracked(() => {
        if (!id) {
          this.estadoCta.set(null);
          return;
        }
        this.cxc.estadoCuenta(id).subscribe({
          next: (e) => this.estadoCta.set(e),
          error: () => this.estadoCta.set(null),
        });
      });
    });

    effect(() => {
      const id = this.listaSelId();
      untracked(() => {
        if (!id) {
          this.preciosLista.set([]);
          return;
        }
        this.cxc.listarPreciosLista(id).subscribe({
          next: (arts) => this.preciosLista.set(arts),
          error: () => this.preciosLista.set([]),
        });
      });
    });

    effect(() => {
      const def = this.listaDefault();
      untracked(() => {
        if (!def) {
          return;
        }
        this.cxc.listarPreciosLista(def.id).subscribe({
          next: (arts) => {
            const m = new Map<string, number>();
            for (const a of arts) {
              m.set(a.articuloId, a.precio);
            }
            this.preciosDefault.set(m);
          },
        });
      });
    });
  }

  protected setTab(tab: TabCli): void {
    this.tab.set(tab);
    if (tab === 'ficha' && !this.selId() && this.enriquecidos()[0]) {
      this.selId.set(this.enriquecidos()[0].id);
    }
  }

  protected setChip(id: ChipCli): void {
    this.chip.set(id);
    this.tab.set('cartera');
  }

  protected limpiar(): void {
    this.q.set('');
    this.fZona.set('');
    this.fVend.set('');
    this.chip.set('todos');
  }

  protected abrirFicha(id: string): void {
    this.selId.set(id);
    this.sub.set('cond');
    this.tab.set('ficha');
  }

  protected abrirAlta(): void {
    if (!this.esAdmin()) {
      return;
    }
    this.altaModo.set('alta');
    this.altaPaso.set(1);
    this.altaNombre.set('');
    this.altaCuit.set('');
    this.altaIva.set('responsable_inscripto');
    this.altaEmail.set('');
    this.altaTel.set('');
    this.altaZona.set('');
    this.altaVend.set('');
    this.altaLimite.set('0');
    this.altaObs.set('');
    this.altaBloqueado.set(false);
    this.altaOpen.set(true);
  }

  protected abrirEditar(): void {
    const c = this.ficha();
    if (!c || !this.esAdmin()) {
      return;
    }
    this.altaModo.set('editar');
    this.altaPaso.set(1);
    this.altaNombre.set(c.nombre);
    this.altaCuit.set(c.cuit);
    this.altaIva.set(c.iva);
    this.altaEmail.set(c.email);
    this.altaTel.set(c.telefono);
    this.altaZona.set(c.zonaId ?? '');
    this.altaVend.set(c.vendId ?? '');
    this.altaLimite.set(String(c.limite));
    this.altaObs.set(c.observaciones);
    this.altaBloqueado.set(c.bloqueado);
    this.altaOpen.set(true);
  }

  protected altaPrev(): void {
    this.altaPaso.update((n) => Math.max(1, n - 1));
  }

  protected altaNext(): void {
    if (this.altaPaso() < 3) {
      if (this.altaPaso() === 1 && !this.altaNombre().trim()) {
        this.notifications.error('Falta el nombre', 'Completá la razón social');
        return;
      }
      if (this.altaPaso() === 1 && !this.altaEmail().trim()) {
        this.notifications.error('Falta el email', 'El API exige un email válido');
        return;
      }
      this.altaPaso.update((n) => n + 1);
      return;
    }
    this.guardarCliente();
  }

  protected irCuenta(): void {
    const id = this.ficha()?.id;
    if (!id) {
      return;
    }
    void this.router.navigate(['/cuenta-corriente'], { queryParams: { clienteId: id } });
  }

  protected irVenta(): void {
    const id = this.ficha()?.id;
    void this.router.navigate(['/ventas'], id ? { queryParams: { clienteId: id } } : {});
  }

  protected credCta(): void {
    const c = this.ficha();
    if (!c) {
      return;
    }
    if (c.bloqueado) {
      this.toggleBloqueo();
      return;
    }
    if (c.excede || c.moraDias > DIAS_MORA) {
      this.irCuenta();
      return;
    }
    this.irVenta();
  }

  protected toggleBloqueo(): void {
    const c = this.ficha();
    if (!c || !this.esAdmin()) {
      return;
    }
    this.store.actualizar(c.id, { bloqueado: !c.bloqueado }).subscribe({
      next: (cli) =>
        this.notifications.success(
          cli.bloqueado ? 'Cliente bloqueado' : 'Cliente desbloqueado',
          cli.nombre,
        ),
    });
  }

  protected toggleRegla(id: string): void {
    this.reglas.update((r) => ({ ...r, [id]: !r[id] }));
  }

  protected whatsapp(): void {
    this.notifications.warning(
      'WhatsApp',
      'No hay integración de campañas. Usá el teléfono de la ficha.',
    );
  }

  protected exportar(): void {
    window.print();
  }

  protected abrirAsignarVend(): void {
    this.vendDraft.set(this.ficha()?.vendId ?? this.filtrados()[0]?.vendId ?? '');
    this.vendOpen.set(true);
  }

  protected guardarVendedor(): void {
    const ids =
      this.tab() === 'ficha' && this.ficha()
        ? [this.ficha()!.id]
        : this.filtrados().map((c) => c.id);
    const vend = this.vendDraft() || null;
    if (!this.esAdmin() || ids.length === 0) {
      this.vendOpen.set(false);
      return;
    }
    this.guardando.set(true);
    const id = ids[0];
    this.store.actualizar(id, { vendedorId: vend }).subscribe({
      next: (c) => {
        this.notifications.success('Vendedor asignado', c.nombre);
        this.guardando.set(false);
        this.vendOpen.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected abrirLimite(): void {
    this.limiteDraft.set(String(this.ficha()?.limite ?? 0));
    this.limiteOpen.set(true);
  }

  protected guardarLimite(): void {
    const c = this.ficha();
    const n = Number(this.limiteDraft());
    if (!c || !this.esAdmin() || !Number.isFinite(n) || n < 0) {
      this.notifications.error('Límite inválido', 'Debe ser un número ≥ 0');
      return;
    }
    this.guardando.set(true);
    this.store.actualizar(c.id, { limiteCredito: n }).subscribe({
      next: () => {
        this.notifications.success('Límite actualizado', c.nombre);
        this.guardando.set(false);
        this.limiteOpen.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected abrirNuevaLista(): void {
    if (!this.esAdmin()) {
      return;
    }
    this.listaCodigo.set('');
    this.listaNombre.set('');
    this.listaOpen.set(true);
  }

  protected crearLista(): void {
    const codigo = this.listaCodigo().trim();
    const nombre = this.listaNombre().trim();
    if (!codigo || !nombre) {
      this.notifications.error('Faltan datos', 'Código y nombre de la lista');
      return;
    }
    this.guardando.set(true);
    this.config.crearListaPrecio({ codigo, nombre }).subscribe({
      next: (l) => {
        this.listas.update((xs) => [
          ...xs,
          {
            id: l.id,
            codigo: l.codigo,
            nombre: l.nombre,
            esDefault: l.esDefault,
            activo: l.activo,
          },
        ]);
        this.listaSelId.set(l.id);
        this.guardando.set(false);
        this.listaOpen.set(false);
        this.notifications.success('Lista creada', l.nombre);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected pickLista(id: string): void {
    this.listaSelId.set(id);
  }

  private guardarCliente(): void {
    const limite = Number(this.altaLimite());
    if (!Number.isFinite(limite) || limite < 0) {
      this.notifications.error('Límite inválido', 'Debe ser un número ≥ 0');
      return;
    }
    const body = {
      nombre: this.altaNombre().trim(),
      email: this.altaEmail().trim(),
      telefono: this.altaTel().trim(),
      cuit: this.altaCuit().trim(),
      condicionIva: this.altaIva(),
      limiteCredito: limite,
      zonaId: this.altaZona() || null,
      vendedorId: this.altaVend() || null,
      bloqueado: this.altaBloqueado(),
      observaciones: this.altaObs().trim(),
    };
    this.guardando.set(true);
    const modo = this.altaModo();
    const id = this.selId();
    const req = modo === 'editar' && id ? this.store.actualizar(id, body) : this.store.crear(body);
    req.subscribe({
      next: (c) => {
        this.notifications.success(
          modo === 'editar' ? 'Cliente actualizado' : 'Cliente creado',
          c.nombre,
        );
        this.guardando.set(false);
        this.altaOpen.set(false);
        this.abrirFicha(c.id);
      },
      error: () => this.guardando.set(false),
    });
  }

  private enriquecer(
    c: Cliente,
    saldos: Record<string, SaldoCliente>,
    zonas: Map<string, string>,
    vends: Map<string, string>,
    pedidos: Pedido[],
  ): CliEnr {
    const s = saldos[c.id];
    const saldo = s?.saldo ?? 0;
    const moraDias = saldo > 0 ? (diasDesde(s?.fechaDebeMasAntigua) ?? 0) : 0;
    const vencido = moraDias > DIAS_MORA ? saldo : 0;
    const limite = c.limiteCredito;
    const usoPct = limite ? Math.min(100, Math.round((saldo / limite) * 100)) : 0;
    const excede = limite > 0 && saldo > limite;
    const compras = pedidos.filter(
      (p) =>
        p.clienteId === c.id &&
        (p.tipo === 'factura' || p.tipo === 'remito' || p.tipo === 'pedido'),
    );
    const ultIso = compras.reduce<string | null>(
      (acc, p) => (!acc || p.fecha > acc ? p.fecha : acc),
      s?.fechaUltimoMovimiento ?? null,
    );
    const diasUlt = diasDesde(ultIso);
    const inactivo = !ultIso || (diasUlt !== null && diasUlt >= DIAS_INACTIVIDAD);
    const tags: TagVista[] = [];
    if (c.bloqueado) {
      tags.push({ label: 'Bloqueado', tone: 'danger' });
    } else if (excede) {
      tags.push({ label: 'Sobre límite', tone: 'danger' });
    }
    if (inactivo) {
      tags.push({ label: 'Poco activo', tone: 'warn' });
    }
    if (!tags.length) {
      tags.push({ label: 'Al día', tone: 'ok' });
    }
    if (!c.activo) {
      tags.push({ label: 'Inactivo', tone: 'muted' });
    }
    return {
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      cuit: c.cuit,
      iva: c.condicionIva,
      ivaTxt: etiquetaIva(c.condicionIva),
      zonaId: c.zonaId,
      zona: (c.zonaId && zonas.get(c.zonaId)) || 'Sin zona',
      vendId: c.vendedorId,
      vend: (c.vendedorId && vends.get(c.vendedorId)) || 'Sin vendedor',
      limite,
      saldo,
      moraDias,
      vencido,
      usoPct,
      excede,
      bloqueado: c.bloqueado,
      activo: c.activo,
      ultIso,
      ultFmt: formatearFechaCorta(ultIso),
      inactivo,
      cond: limite > 0 ? 'Cuenta corriente' : 'Contado',
      observaciones: c.observaciones,
      tags,
    };
  }

  private chequesDe(c: CliEnr): ValorBancarioDto[] {
    const nom = normalizar(c.nombre);
    return this.cheques().filter(
      (v) => v.origen_id === c.id || (v.recibido_de && normalizar(v.recibido_de).includes(nom)),
    );
  }

  private estadoHist(p: Pedido): { label: string; tone: BadgeTone } {
    if (p.tipo === 'factura') {
      if (p.estado === 'confirmado' || p.estado === 'facturado') {
        return { label: 'Emitida', tone: 'ok' };
      }
      if (p.estado === 'cancelado') {
        return { label: 'Anulada', tone: 'danger' };
      }
      return { label: 'Borrador', tone: 'muted' };
    }
    if (p.tipo === 'remito') {
      return { label: p.estado === 'confirmado' ? 'Remito' : 'Remito borrador', tone: 'info' };
    }
    if (p.tipo === 'presupuesto') {
      return { label: 'Presupuesto', tone: 'accent' };
    }
    return { label: p.estado, tone: 'muted' };
  }
}
