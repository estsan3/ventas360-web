import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { DepositoInventario, DepositosService } from './data-access/depositos.service';
import { ParsearRemitoResultado } from './data-access/remito-ia.model';
import { RemitoIaService } from './data-access/remito-ia.service';
import { InventarioItem, RemitoCompraItem, StockService } from './data-access/stock.service';
import { ProductosService } from '../productos/data-access/productos.service';
import {
  ArticuloStock,
  CanalAlerta,
  CANALES_DEF,
  ChipAlerta,
  EstadoAlerta,
  MIN_CHARS_STOCK,
  RemFiltro,
  RemSub,
  TabStock,
  TomaFiltro,
  alertasDe,
  csvCelda,
  etiquetaRemito,
  formatearFechaCorta,
  matchIaChip,
  moneyStk,
  normStk,
  parseNumStk,
  reglasBase,
  ReglaAlerta,
  tabDesdeQuery,
  umbralMax,
  umbralMin,
} from './stock.model';

export interface FilaConteo {
  articuloId: string;
  codigo: string;
  articulo: string;
  ubicacion: string;
  sistema: number;
  conteo: string;
  costoUnit: number;
}

interface RemitoVista {
  id: string;
  remito: string;
  fecha: string;
  proveedor: string;
  renglones: number;
  bultos: number;
  total: number;
  estado: string;
  estadoTone: 'warn' | 'ok' | 'danger' | 'info' | 'neutral';
  puedeConfirmar: boolean;
  lineas: RemitoCompraItem['lineas'];
}

interface LineaCarga {
  nombre: string;
  codigoTxt: string;
  pedido: number;
  recibidoTxt: string;
  costo: number;
  productoId: string | null;
  matchTipo: string | null;
  aviso?: string;
}

function claveToma(tenantId: string, depositoId: string): string {
  return `ventas360.toma.${tenantId}.${depositoId}`;
}

function claveReglas(tenantId: string): string {
  return `ventas360.stock.reglas.${tenantId}`;
}

function claveCanales(tenantId: string): string {
  return `ventas360.stock.canales.${tenantId}`;
}

function leerConteos(tenantId: string, depositoId: string): Record<string, string> {
  if (!tenantId || !depositoId || typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(claveToma(tenantId, depositoId));
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function guardarConteos(tenantId: string, depositoId: string, filas: FilaConteo[]): void {
  if (!tenantId || !depositoId || typeof localStorage === 'undefined') {
    return;
  }
  const mapa: Record<string, string> = {};
  for (const f of filas) {
    if (f.conteo.trim() !== '') {
      mapa[f.articuloId] = f.conteo;
    }
  }
  const clave = claveToma(tenantId, depositoId);
  if (Object.keys(mapa).length === 0) {
    localStorage.removeItem(clave);
    return;
  }
  localStorage.setItem(clave, JSON.stringify(mapa));
}

function borrarConteos(tenantId: string, depositoId: string): void {
  if (!tenantId || !depositoId || typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(claveToma(tenantId, depositoId));
}

function leerJson<T>(clave: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(clave);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

@Component({
  selector: 'app-inventario-page',
  imports: [FormsModule],
  templateUrl: './inventario-page.html',
  styleUrl: './inventario-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioPage {
  private readonly depositosApi = inject(DepositosService);
  private readonly stockApi = inject(StockService);
  private readonly productosApi = inject(ProductosService);
  private readonly remitoIa = inject(RemitoIaService);
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmDialogService);

  protected readonly minChars = MIN_CHARS_STOCK;
  protected readonly money = moneyStk;

  protected readonly tab = signal<TabStock>('articulos');
  protected readonly remSub = signal<RemSub>('listado');
  protected readonly depositos = signal<DepositoInventario[]>([]);
  protected readonly depActivo = signal('');
  protected readonly queryArt = signal('');
  protected readonly fRubro = signal('');
  protected readonly fEstado = signal<EstadoAlerta>('Todos');
  protected readonly cargandoArt = signal(false);
  protected readonly articulos = signal<ArticuloStock[]>([]);
  protected readonly buscadoArt = signal(false);

  protected readonly busquedaToma = signal('');
  protected readonly tomaFiltro = signal<TomaFiltro>('Todos');
  protected readonly cargando = signal(false);
  protected readonly cerrando = signal(false);
  protected readonly filas = signal<FilaConteo[]>([]);

  protected readonly remitos = signal<RemitoVista[]>([]);
  protected readonly remFiltro = signal<RemFiltro>('Todos');
  protected readonly remSelId = signal<string | null>(null);
  protected readonly nombresProv = signal<Record<string, string>>({});
  protected readonly proveedores = signal<{ id: string; nombre: string }[]>([]);
  protected readonly proveedorIa = signal('');
  protected readonly parseando = signal(false);
  protected readonly creandoRemito = signal(false);
  protected readonly previewIa = signal<ParsearRemitoResultado | null>(null);
  protected readonly lineasCarga = signal<LineaCarga[]>([]);
  protected readonly nombreArchivoIa = signal('');
  protected readonly panelAlertas = signal(false);

  protected readonly reglas = signal<ReglaAlerta[]>(reglasBase());
  protected readonly canales = signal<CanalAlerta[]>(['panel', 'mail']);

  constructor() {
    this.tab.set(tabDesdeQuery(this.route.snapshot.queryParamMap.get('tab')));
    const tenant = this.tenantId();
    const saved = leerJson<ReglaAlerta[] | null>(claveReglas(tenant), null);
    if (saved?.length) {
      this.reglas.set(saved);
    }
    const ch = leerJson<CanalAlerta[] | null>(claveCanales(tenant), null);
    if (ch?.length) {
      this.canales.set(ch);
    }
    this.depositosApi.listar().subscribe({
      next: (items) => {
        const activos = items.filter((d) => d.activo);
        this.depositos.set(activos.length > 0 ? activos : items);
      },
      error: () => this.depositos.set([]),
    });
    if (this.tab() === 'remitos') {
      this.cargarMapProveedores();
      this.cargarRemitos();
    }
  }

  private tenantId(): string {
    return this.auth.contexto()?.tenant?.id ?? this.auth.contexto()?.slug ?? 'local';
  }

  protected readonly depositoActivoNombre = computed(() => {
    const id = this.depActivo();
    return this.depositos().find((d) => d.id === id)?.nombre ?? '';
  });

  protected readonly rubros = computed(() => {
    const set = new Set(
      this.articulos()
        .map((a) => a.rubro)
        .filter(Boolean),
    );
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly articulosFiltrados = computed(() => {
    const q = normStk(this.queryArt().trim());
    const rubro = this.fRubro();
    const estado = this.fEstado();
    const reglas = this.reglas();
    return this.articulos().filter((a) => {
      const al = alertasDe(a, reglas);
      if (
        q &&
        !(
          normStk(a.nombre).includes(q) ||
          normStk(a.codigo).includes(q) ||
          a.codigoBarras.includes(q)
        )
      ) {
        return false;
      }
      if (rubro && a.rubro !== rubro) {
        return false;
      }
      if (estado !== 'Todos' && !al.some((x) => x.id === estado)) {
        return false;
      }
      return true;
    });
  });

  protected readonly kpisArt = computed(() => {
    const reglas = this.reglas();
    const all = this.articulos();
    const con = all.map((a) => ({ a, al: alertasDe(a, reglas) }));
    const valor = all.reduce((n, a) => n + a.costo * a.stock, 0);
    const n = (id: string) => con.filter((x) => x.al.some((y) => y.id === id)).length;
    return [
      {
        id: 'Todos' as EstadoAlerta,
        label: 'Valorizado total',
        value: all.length ? moneyStk(valor) : '—',
        hint: `${all.length} artículos`,
        tono: 'text' as const,
      },
      {
        id: 'min' as EstadoAlerta,
        label: 'Bajo mínimo',
        value: String(n('min')),
        hint: 'reponer pronto',
        tono: 'danger' as const,
      },
      {
        id: 'quebrado' as EstadoAlerta,
        label: 'Quiebres',
        value: String(n('quebrado')),
        hint: 'sin existencia',
        tono: 'danger' as const,
      },
      {
        id: 'max' as EstadoAlerta,
        label: 'Sobre máximo',
        value: String(n('max')),
        hint: 'capital inmovilizado',
        tono: 'warn' as const,
      },
      {
        id: 'baja' as EstadoAlerta,
        label: 'Baja rotación',
        value: '—',
        hint: 'sin historial de ventas',
        tono: 'warn' as const,
      },
    ];
  });

  protected readonly valorFiltrado = computed(() =>
    this.articulosFiltrados().reduce((n, a) => n + a.costo * a.stock, 0),
  );

  protected readonly totalAlertas = computed(() => {
    const reglas = this.reglas();
    return this.articulos().reduce((n, a) => n + alertasDe(a, reglas).length, 0);
  });

  protected readonly criticas = computed(() => {
    const reglas = this.reglas();
    return this.articulos().filter((a) => alertasDe(a, reglas).some((x) => x.tono === 'danger'))
      .length;
  });

  protected readonly panelGrupos = computed(() => {
    const reglas = this.reglas().filter((r) => r.on);
    const arts = this.articulos();
    return reglas
      .map((r) => {
        const afectados = arts.filter((a) =>
          alertasDe(a, this.reglas()).some((x) => x.id === r.id),
        );
        if (!afectados.length) {
          return null;
        }
        const nombres = afectados.slice(0, 3).map((x) => x.nombre.split(' ').slice(0, 3).join(' '));
        return {
          id: r.id as EstadoAlerta,
          titulo: r.nombre,
          n: afectados.length,
          tono:
            r.sev === 'Crítica'
              ? ('danger' as const)
              : r.sev === 'Media'
                ? ('warn' as const)
                : ('info' as const),
          sub: nombres.join(', ') + (afectados.length > 3 ? ` y ${afectados.length - 3} más` : ''),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });

  protected readonly chipsEstado: { id: EstadoAlerta; label: string }[] = [
    { id: 'Todos', label: 'Todas' },
    { id: 'min', label: 'Bajo mínimo' },
    { id: 'max', label: 'Sobre máximo' },
    { id: 'baja', label: 'Baja rotación' },
    { id: 'alta', label: 'Alta rotación' },
    { id: 'quebrado', label: 'Quiebre' },
  ];

  protected readonly filasVista = computed(() => {
    const q = normStk(this.busquedaToma().trim());
    const f = this.tomaFiltro();
    return this.filas().filter((r) => {
      if (q && !(normStk(r.articulo).includes(q) || normStk(r.codigo).includes(q))) {
        return false;
      }
      if (f === 'pend') {
        return r.conteo.trim() === '';
      }
      if (f === 'dif') {
        return this.tieneDif(r);
      }
      return true;
    });
  });

  protected readonly contados = computed(
    () => this.filas().filter((f) => f.conteo.trim() !== '').length,
  );
  protected readonly conDiferencia = computed(
    () => this.filas().filter((f) => this.tieneDif(f)).length,
  );
  protected readonly pendientesToma = computed(() => this.filas().length - this.contados());
  protected readonly ajusteVal = computed(() =>
    this.filas().reduce((n, r) => {
      if (r.conteo.trim() === '') {
        return n;
      }
      const c = Number(r.conteo);
      if (!Number.isFinite(c)) {
        return n;
      }
      return n + (c - r.sistema) * r.costoUnit;
    }, 0),
  );

  protected readonly remitosFiltrados = computed(() => {
    const f = this.remFiltro();
    return this.remitos().filter((r) => {
      if (f === 'pend') {
        return r.puedeConfirmar || r.estadoTone === 'warn';
      }
      if (f === 'ok') {
        return !r.puedeConfirmar && r.estadoTone === 'ok';
      }
      return true;
    });
  });

  protected readonly remPendientes = computed(
    () => this.remitos().filter((r) => r.puedeConfirmar).length,
  );

  protected readonly remTotal = computed(() =>
    this.remitosFiltrados().reduce((n, r) => n + r.total, 0),
  );

  protected readonly remitoActivo = computed(() => {
    const id = this.remSelId();
    return this.remitos().find((r) => r.id === id) ?? null;
  });

  protected readonly lineasCargaVista = computed(() =>
    this.lineasCarga().map((l) => {
      const rec = parseNumStk(l.recibidoTxt);
      const dif = rec - l.pedido;
      const match = matchIaChip(l.matchTipo, !!l.productoId);
      return { ...l, rec, dif, match, subtotal: rec * l.costo };
    }),
  );

  protected readonly hayDifCarga = computed(() => this.lineasCargaVista().some((l) => l.dif !== 0));
  protected readonly hayNuevosCarga = computed(() =>
    this.lineasCargaVista().some((l) => !l.productoId),
  );
  protected readonly difCountCarga = computed(
    () => this.lineasCargaVista().filter((l) => l.dif !== 0).length,
  );
  protected readonly sinAsociarCarga = computed(
    () => this.lineasCargaVista().filter((l) => !l.productoId).length,
  );
  protected readonly totalPedidoCarga = computed(() =>
    this.lineasCarga().reduce((n, l) => n + l.costo * l.pedido, 0),
  );
  protected readonly totalRecibidoCarga = computed(() =>
    this.lineasCargaVista().reduce((n, l) => n + l.costo * l.rec, 0),
  );

  protected readonly canalesVista = computed(() => {
    const on = this.canales();
    return CANALES_DEF.map((c) => ({ ...c, on: on.includes(c.id) }));
  });

  protected readonly reglasVista = computed(() => {
    const arts = this.articulos();
    const reglas = this.reglas();
    return reglas.map((r) => {
      const count = arts.filter((a) => alertasDe(a, reglas).some((x) => x.id === r.id)).length;
      return { ...r, count };
    });
  });

  protected readonly contextoTxt = computed(() => {
    const t = this.tab();
    if (t === 'articulos') {
      return `${this.articulos().length || '—'} artículos · ${this.depositos().length} depósitos`;
    }
    if (t === 'remitos') {
      return 'Lectura de remitos por foto · revisá el match antes de impactar';
    }
    if (t === 'inventario') {
      const nom = this.depositoActivoNombre() || 'elegí depósito';
      return `Toma · ${nom}`;
    }
    return `${this.reglas().filter((r) => r.on).length} de ${this.reglas().length} reglas activas`;
  });

  protected setTab(tab: TabStock): void {
    this.tab.set(tab);
    this.panelAlertas.set(false);
    if (tab === 'remitos') {
      this.cargarMapProveedores();
      this.cargarRemitos();
    }
    if (tab === 'inventario' && this.depActivo()) {
      this.cargarInventario(this.depActivo());
    }
  }

  protected setDepArticulos(id: string): void {
    this.depActivo.set(id);
    if (id) {
      this.cargarArticulosDeposito(id);
    } else {
      this.articulos.set([]);
      this.buscadoArt.set(false);
    }
  }

  protected buscarArticulos(): void {
    const q = this.queryArt().trim();
    const dep = this.depActivo();
    if (dep) {
      this.cargarArticulosDeposito(dep);
      return;
    }
    if (q.length < MIN_CHARS_STOCK) {
      this.notifications.warning(
        'Búsqueda',
        `Escribí al menos ${MIN_CHARS_STOCK} caracteres o elegí un depósito.`,
      );
      return;
    }
    this.cargandoArt.set(true);
    this.buscadoArt.set(true);
    this.productosApi.listar({ q, filtro: 'activos', pageSize: 80 }).subscribe({
      next: (pag) => {
        this.articulos.set(
          pag.items.map((p) =>
            this.aArticulo(
              {
                articuloId: p.id,
                sku: p.sku,
                nombre: p.nombre,
                depositoId: '',
                cantidad: p.stock,
                costo: p.costo,
                precio: p.precio,
                marca: p.marca,
                rubro: p.rubro,
                codigoBarras: p.codigoBarras,
              },
              'Todos',
            ),
          ),
        );
        this.cargandoArt.set(false);
      },
      error: () => {
        this.articulos.set([]);
        this.cargandoArt.set(false);
      },
    });
  }

  protected onQueryEnter(ev: Event): void {
    ev.preventDefault();
    this.buscarArticulos();
  }

  protected limpiarFiltros(): void {
    this.queryArt.set('');
    this.fRubro.set('');
    this.fEstado.set('Todos');
    if (!this.depActivo()) {
      this.articulos.set([]);
      this.buscadoArt.set(false);
    }
  }

  protected setDepToma(id: string): void {
    this.depActivo.set(id);
    this.cargarInventario(id);
  }

  private aArticulo(i: InventarioItem, depositoNombre: string): ArticuloStock {
    const min = umbralMin();
    const max = umbralMax(i.cantidad);
    const bits = [i.codigoBarras, i.rubro, i.marca].filter(Boolean);
    return {
      articuloId: i.articuloId,
      codigo: i.sku,
      nombre: i.nombre,
      sub: bits.join(' · ') || i.sku,
      rubro: i.rubro,
      depositoId: i.depositoId,
      deposito: depositoNombre,
      stock: i.cantidad,
      min,
      max,
      costo: i.costo,
      codigoBarras: i.codigoBarras,
    };
  }

  private cargarArticulosDeposito(depositoId: string): void {
    this.cargandoArt.set(true);
    this.buscadoArt.set(true);
    const nom = this.depositos().find((d) => d.id === depositoId)?.nombre ?? 'Depósito';
    this.stockApi.listarInventario(depositoId).subscribe({
      next: (items) => {
        this.articulos.set(items.map((i) => this.aArticulo(i, nom)));
        this.cargandoArt.set(false);
      },
      error: () => {
        this.articulos.set([]);
        this.cargandoArt.set(false);
      },
    });
  }

  private cargarInventario(depositoId: string): void {
    if (!depositoId) {
      this.filas.set([]);
      return;
    }
    this.cargando.set(true);
    this.stockApi.listarInventario(depositoId).subscribe({
      next: (items) => {
        const guardados = leerConteos(this.tenantId(), depositoId);
        const nom = this.depositoActivoNombre();
        this.filas.set(
          items.map((i) => ({
            articuloId: i.articuloId,
            codigo: i.sku,
            articulo: i.nombre,
            ubicacion: nom,
            sistema: i.cantidad,
            conteo: guardados[i.articuloId] ?? '',
            costoUnit: i.costo,
          })),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.filas.set([]);
        this.cargando.set(false);
      },
    });
  }

  private cargarMapProveedores(): void {
    if (Object.keys(this.nombresProv()).length > 0) {
      return;
    }
    this.stockApi.mapProveedores().subscribe({
      next: (m) => {
        this.nombresProv.set(m);
        this.proveedores.set(
          Object.entries(m)
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
      },
    });
  }

  private cargarRemitos(): void {
    this.stockApi.listarRemitosCompra().subscribe({
      next: (items) => {
        this.remitos.set(
          items.map((r) => {
            const est = etiquetaRemito(r.estado);
            return {
              id: r.id,
              remito: r.comprobante,
              fecha: formatearFechaCorta(r.fecha),
              proveedor: this.nombresProv()[r.proveedorId] ?? r.proveedorId,
              renglones: r.renglones,
              bultos: r.renglones,
              total: r.total,
              estado: est.label,
              estadoTone: est.tono,
              puedeConfirmar: r.estado === 'borrador',
              lineas: r.lineas,
            };
          }),
        );
      },
      error: () => this.remitos.set([]),
    });
  }

  protected abrirRemito(id: string): void {
    const r = this.remitos().find((x) => x.id === id);
    if (!r) {
      return;
    }
    this.remSelId.set(id);
    this.previewIa.set(null);
    this.lineasCarga.set(
      r.lineas.map((l) => ({
        nombre: l.descripcion || l.productoId,
        codigoTxt: l.productoId.slice(0, 8),
        pedido: l.cantidad,
        recibidoTxt: String(l.cantidad),
        costo: l.precioUnitario,
        productoId: l.productoId,
        matchTipo: 'exacto',
      })),
    );
    this.remSub.set('carga');
  }

  protected actualizarConteo(articuloId: string, valor: string): void {
    this.filas.update((rows) => {
      const next = rows.map((r) => (r.articuloId === articuloId ? { ...r, conteo: valor } : r));
      guardarConteos(this.tenantId(), this.depActivo(), next);
      return next;
    });
  }

  protected exportarArticulos(): void {
    const rows = this.articulosFiltrados();
    if (!rows.length) {
      this.notifications.warning('Nada para exportar', 'No hay artículos con estos filtros.');
      return;
    }
    this.bajarCsv(
      ['Código', 'Artículo', 'Depósito', 'Stock', 'Mín', 'Máx', 'Costo', 'Valorizado'],
      rows.map((r) => [
        r.codigo,
        r.nombre,
        r.deposito,
        r.stock,
        r.min,
        r.max,
        r.costo,
        r.costo * r.stock,
      ]),
      'stock-articulos',
    );
  }

  protected exportarValorizado(): void {
    const rows = this.filas();
    if (!rows.length) {
      this.notifications.warning('Nada para exportar', 'No hay artículos en este depósito.');
      return;
    }
    this.bajarCsv(
      ['Código', 'Artículo', 'Depósito', 'Sistema', 'Conteo', 'Diferencia', 'Costo', 'Impacto'],
      rows.map((r) => {
        const c = r.conteo.trim() === '' ? '' : Number(r.conteo);
        const dif = typeof c === 'number' && Number.isFinite(c) ? c - r.sistema : '';
        const imp =
          typeof c === 'number' && Number.isFinite(c) ? (c - r.sistema) * r.costoUnit : '';
        return [r.codigo, r.articulo, r.ubicacion, r.sistema, c, dif, r.costoUnit, imp];
      }),
      'toma',
    );
  }

  private bajarCsv(encabezado: string[], filas: (string | number)[][], prefijo: string): void {
    const lineas = [
      encabezado.map(csvCelda).join(';'),
      ...filas.map((f) => f.map(csvCelda).join(';')),
    ];
    const blob = new Blob(['\uFEFF' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${prefijo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected async cerrarToma(): Promise<void> {
    const depositoId = this.depActivo();
    const contados = this.filas()
      .map((r) => ({ fila: r, cantidad: Math.trunc(Number(r.conteo)) }))
      .filter((x) => x.fila.conteo.trim() !== '' && Number.isFinite(x.cantidad) && x.cantidad >= 0);
    if (!depositoId) {
      this.notifications.warning('Sin depósito', 'Elegí un depósito para cerrar la toma.');
      return;
    }
    if (contados.length === 0) {
      this.notifications.warning(
        'Nada contado',
        'Cargá el conteo de al menos un artículo antes de ajustar.',
      );
      return;
    }
    const conDif = contados.filter((x) => x.cantidad !== x.fila.sistema).length;
    const pend = this.pendientesToma();
    const ok = await this.confirm.abrir({
      titulo: 'Cerrar toma y ajustar',
      mensaje:
        pend > 0
          ? `Hay ${pend} artículos sin contar: no se tocan. Se ajustan ${conDif} con diferencia.`
          : conDif === 0
            ? `Hay ${contados.length} artículos contados, todos coinciden. ¿Cerrar la toma?`
            : `Se van a ajustar ${conDif} artículo${conDif === 1 ? '' : 's'} con diferencia.`,
      textoConfirmar: 'Ajustar stock',
      textoCancelar: 'Seguir contando',
      variant: conDif > 0 ? 'danger' : 'default',
    });
    if (!ok) {
      return;
    }
    this.cerrando.set(true);
    this.stockApi
      .cerrarToma(
        depositoId,
        contados.map((x) => ({ articuloId: x.fila.articuloId, cantidad: x.cantidad })),
      )
      .subscribe({
        next: (r) => {
          borrarConteos(this.tenantId(), depositoId);
          this.cerrando.set(false);
          this.notifications.success(
            'Toma cerrada',
            r.ajustados === 0
              ? 'No hubo diferencias para ajustar.'
              : `Se ajustaron ${r.ajustados} artículo${r.ajustados === 1 ? '' : 's'}.`,
          );
          this.cargarInventario(depositoId);
        },
        error: () => this.cerrando.set(false),
      });
  }

  protected confirmarRemito(id: string): void {
    this.stockApi.confirmarCompra(id).subscribe({
      next: () => {
        this.notifications.success('Remito confirmado', 'Stock ingresado al depósito');
        this.cargarRemitos();
      },
    });
  }

  protected onArchivoRemito(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) {
      return;
    }
    const proveedorId = this.proveedorIa();
    const depositoId = this.depActivo();
    if (!proveedorId) {
      this.notifications.warning('Elegí proveedor', 'Seleccioná el proveedor del remito.');
      return;
    }
    if (!depositoId) {
      this.notifications.warning(
        'Sin depósito',
        'Elegí el depósito de recepción en Toma o Artículos.',
      );
      return;
    }
    if (!archivo.type.startsWith('image/')) {
      this.notifications.warning('Solo imágenes', 'Subí una foto JPG, PNG o WebP del remito.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.notifications.warning('Archivo grande', 'La imagen no puede superar 5 MB.');
      return;
    }
    this.nombreArchivoIa.set(archivo.name);
    this.parseando.set(true);
    this.previewIa.set(null);
    this.lineasCarga.set([]);
    this.remitoIa.parsearRemito(archivo, { proveedorId, depositoId }).subscribe({
      next: (resultado) => {
        this.parseando.set(false);
        this.previewIa.set(resultado);
        this.lineasCarga.set(
          resultado.lineas.map((l) => ({
            nombre: l.descripcionExtraida,
            codigoTxt: l.productoSku ?? l.skuExtraido ?? '',
            pedido: l.cantidad,
            recibidoTxt: String(l.cantidad),
            costo: l.precioUnitario ?? 0,
            productoId: l.productoId,
            matchTipo: l.matchTipo,
            aviso: l.productoId
              ? undefined
              : 'Sin artículo en el catálogo. Asociá o dalo de alta antes de confirmar.',
          })),
        );
        this.remSub.set('carga');
        this.remSelId.set(null);
        const modo = resultado.modoParser === 'anthropic' ? 'Claude Haiku' : 'demo';
        this.notifications.success('Remito leído', `${resultado.lineas.length} líneas · ${modo}`);
      },
      error: () => this.parseando.set(false),
    });
  }

  protected setRecibido(index: number, valor: string): void {
    this.lineasCarga.update((rows) =>
      rows.map((r, i) => (i === index ? { ...r, recibidoTxt: valor } : r)),
    );
  }

  protected recibidoIgualPedido(): void {
    this.lineasCarga.update((rows) => rows.map((r) => ({ ...r, recibidoTxt: String(r.pedido) })));
  }

  protected recibidoEnCero(): void {
    this.lineasCarga.update((rows) => rows.map((r) => ({ ...r, recibidoTxt: '0' })));
  }

  protected descartarPreviewIa(): void {
    this.previewIa.set(null);
    this.lineasCarga.set([]);
    this.nombreArchivoIa.set('');
    this.remSelId.set(null);
  }

  protected async crearRemitoDesdeIa(impactar: boolean): Promise<void> {
    const proveedorId = this.proveedorIa();
    const depositoId = this.depActivo();
    const lineas = this.lineasCargaVista().filter((l) => l.productoId && l.rec > 0);
    if (!this.previewIa()) {
      if (impactar && this.remSelId() && this.remitoActivo()?.puedeConfirmar) {
        this.confirmarRemito(this.remSelId()!);
      }
      return;
    }
    if (!proveedorId || !depositoId || lineas.length === 0) {
      this.notifications.warning(
        'Faltan datos',
        'Proveedor, depósito y al menos una línea asociada.',
      );
      return;
    }
    const sinMatch = this.lineasCarga().length - lineas.length;
    const ok = await this.confirm.abrir({
      titulo: impactar ? 'Confirmar e impactar stock' : 'Dejar pendiente de validar',
      mensaje:
        sinMatch > 0
          ? `Se usarán ${lineas.length} líneas. ${sinMatch} sin artículo quedan fuera.`
          : impactar
            ? `Se crea el remito y se ingresa stock con ${lineas.length} líneas.`
            : `Se crea un remito borrador con ${lineas.length} líneas.`,
      textoConfirmar: impactar ? 'Impactar stock' : 'Crear borrador',
      textoCancelar: 'Seguir editando',
    });
    if (!ok) {
      return;
    }
    this.creandoRemito.set(true);
    this.remitoIa
      .crearRemitoBorrador({
        proveedorId,
        depositoId,
        lineas: lineas.map((l) => ({
          productoId: l.productoId!,
          cantidad: l.rec,
          ...(l.costo ? { precioUnitario: l.costo } : {}),
        })),
      })
      .subscribe({
        next: (id) => {
          const fin = () => {
            this.creandoRemito.set(false);
            this.descartarPreviewIa();
            this.cargarRemitos();
            this.remSub.set('listado');
          };
          if (impactar) {
            this.stockApi.confirmarCompra(id).subscribe({
              next: () => {
                this.notifications.success('Stock ingresado', 'El remito impactó en el depósito.');
                fin();
              },
              error: () => {
                this.creandoRemito.set(false);
                this.cargarRemitos();
              },
            });
          } else {
            this.notifications.success('Remito creado', 'Quedó pendiente de validar.');
            fin();
          }
        },
        error: () => this.creandoRemito.set(false),
      });
  }

  protected toggleRegla(id: string): void {
    this.reglas.update((list) => list.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));
    this.persistirReglas();
  }

  protected setParamRegla(id: string, k: string, valor: string): void {
    this.reglas.update((list) =>
      list.map((r) =>
        r.id === id
          ? { ...r, params: r.params.map((p) => (p.k === k ? { ...p, v: valor } : p)) }
          : r,
      ),
    );
    this.persistirReglas();
  }

  protected toggleCanal(id: CanalAlerta): void {
    this.canales.update((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
    localStorage.setItem(claveCanales(this.tenantId()), JSON.stringify(this.canales()));
  }

  private persistirReglas(): void {
    localStorage.setItem(claveReglas(this.tenantId()), JSON.stringify(this.reglas()));
  }

  protected verReglaEnArticulos(id: string): void {
    this.fEstado.set((id === 'Todos' ? 'Todos' : id) as EstadoAlerta);
    this.setTab('articulos');
  }

  protected irCompras(): void {
    void this.router.navigateByUrl('/compras');
  }

  protected evaluarAhora(): void {
    const dep = this.depActivo() || this.depositos()[0]?.id;
    if (!dep) {
      this.notifications.warning('Sin depósito', 'Creá un depósito para evaluar el stock.');
      return;
    }
    this.setDepArticulos(dep);
    this.notifications.success(
      'Evaluación',
      'Alertas recalculadas con el inventario del depósito.',
    );
  }

  protected avisoNyI(msg: string): void {
    this.notifications.warning('Próximamente', msg);
  }

  protected chipsDe(a: ArticuloStock): ChipAlerta[] {
    const al = alertasDe(a, this.reglas());
    return al.length ? al : [{ id: 'ok', label: 'OK', tono: 'ok' }];
  }

  protected diferencia(row: FilaConteo): { texto: string; tono: 'ok' | 'neg' | 'pos' | 'muted' } {
    if (row.conteo.trim() === '') {
      return { texto: '—', tono: 'muted' };
    }
    const n = Number(row.conteo);
    if (!Number.isFinite(n)) {
      return { texto: '—', tono: 'muted' };
    }
    const d = n - row.sistema;
    if (d === 0) {
      return { texto: '0 u', tono: 'ok' };
    }
    return { texto: `${d > 0 ? '+' : ''}${d} u`, tono: d < 0 ? 'neg' : 'pos' };
  }

  protected impacto(row: FilaConteo): { texto: string; tono: 'neg' | 'pos' | 'muted' } {
    if (row.conteo.trim() === '') {
      return { texto: '—', tono: 'muted' };
    }
    const n = Number(row.conteo);
    if (!Number.isFinite(n) || n === row.sistema) {
      return { texto: '—', tono: 'muted' };
    }
    const valor = (n - row.sistema) * row.costoUnit;
    return { texto: moneyStk(valor), tono: valor < 0 ? 'neg' : 'pos' };
  }

  protected estadoToma(row: FilaConteo): { label: string; tono: 'ok' | 'neg' | 'pos' | 'muted' } {
    if (row.conteo.trim() === '') {
      return { label: 'Sin contar', tono: 'muted' };
    }
    const d = this.diferencia(row);
    if (d.tono === 'ok') {
      return { label: 'Coincide', tono: 'ok' };
    }
    if (d.tono === 'neg') {
      return { label: 'Faltante', tono: 'neg' };
    }
    return { label: 'Excedente', tono: 'pos' };
  }

  protected tieneDif(row: FilaConteo): boolean {
    const t = this.diferencia(row).tono;
    return t === 'neg' || t === 'pos';
  }
}
