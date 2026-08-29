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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { textoBusquedaValido } from '../../core/utils/busqueda';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { ConfiguracionService } from '../configuracion/data-access/configuracion.service';
import { ListaPrecioCatalogo } from '../configuracion/data-access/catalogos.models';
import { ComprasService } from '../compras/data-access/compras.service';
import { ProveedorLista } from '../compras/data-access/lista-proveedor.model';
import { DepositoInventario, DepositosService } from '../inventario/data-access/depositos.service';
import { CrearProducto, Producto } from './data-access/producto.model';
import { ProductosStore } from './data-access/productos.store';
import {
  AccionImport,
  CHIPS_ART,
  COLS_DEMO,
  ChipArt,
  DESTINOS_COL,
  DestinoCol,
  FichaTab,
  MIN_CHARS_ART,
  OPCIONES_IMP,
  PREV_DEMO,
  REDONDEOS,
  REGLAS_PRECIO,
  SkuModo,
  TabArt,
  TonoArt,
  estadoArticulo,
  mapeoInicial,
  margenDe,
  moneyArt,
  parseNumArt,
  redondearVenta,
  skuEjemplo,
  skuGenerado,
  tabDesdeQuery,
} from './articulos.model';

interface FilaArt {
  id: string;
  sku: string;
  nombre: string;
  sub: string;
  prov: string;
  costo: string;
  venta: string;
  marg: string;
  margTono: TonoArt;
  act: string;
  estado: string;
  estTono: TonoArt;
  sinSku: boolean;
}

@Component({
  selector: 'app-productos-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosPage {
  private readonly store = inject(ProductosStore);
  private readonly auth = inject(AuthStore);
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly compras = inject(ComprasService);
  private readonly config = inject(ConfiguracionService);
  private readonly depositosApi = inject(DepositosService);

  protected readonly fichaTabs: FichaTab[] = ['General', 'Precios', 'Stock'];
  protected readonly chipsArt = CHIPS_ART;
  protected readonly destinos = DESTINOS_COL;
  protected readonly redondeos = REDONDEOS;
  protected readonly opcionesImp = OPCIONES_IMP;
  protected readonly reglasPrecioDef = REGLAS_PRECIO;
  protected readonly minChars = MIN_CHARS_ART;
  protected readonly estado = this.store.productos;
  protected readonly total = this.store.total;

  protected readonly tab = signal<TabArt>(
    tabDesdeQuery(this.route.snapshot.queryParamMap.get('tab')),
  );
  protected readonly query = signal('');
  protected readonly fRubro = signal('Todos los rubros');
  protected readonly fProv = signal('Todos los proveedores');
  protected readonly chip = signal<ChipArt>('Todos');
  protected readonly sel = signal<string[]>([]);
  protected readonly seleccionadoId = signal<string | null>(null);
  protected readonly fichaTab = signal<FichaTab>('General');
  protected readonly esNuevo = signal(false);
  protected readonly guardando = signal(false);
  protected readonly fichaDirty = signal(false);

  protected readonly skuTxt = signal('');
  protected readonly nombreTxt = signal('');
  protected readonly marcaTxt = signal('');
  protected readonly rubroTxt = signal('');
  protected readonly eanTxt = signal('');
  protected readonly codProvTxt = signal('');
  protected readonly proveedorTxt = signal('');
  protected readonly costoTxt = signal('');
  protected readonly precioTxt = signal('');
  protected readonly stockTxt = signal('');
  protected readonly ivaTxt = signal('21');
  protected readonly margenTxt = signal('');
  protected readonly unidadTxt = signal('Unidad');
  protected readonly estadoTxt = signal('Activo');
  protected readonly minTxt = signal('20');
  protected readonly maxTxt = signal('120');
  protected readonly pedidoTxt = signal('35');
  protected readonly loteTxt = signal('24');
  protected readonly depositoTxt = signal('');
  protected readonly ubicacionTxt = signal('');
  protected readonly promoTxt = signal('');

  protected readonly paso = signal(1);
  protected readonly mapeo = signal<Record<string, DestinoCol>>(mapeoInicial());
  protected readonly skuModo = signal<SkuModo>('propio');
  protected readonly skuPrefijo = signal('FER');
  protected readonly skuDesde = signal('600');
  protected readonly skuDigitos = signal('6');
  protected readonly margenImp = signal('58');
  protected readonly redondeo = signal<string>('Redondear a $ 100');
  protected readonly opciones = signal<string[]>(['actualizar', 'ean']);
  protected readonly omitidas = signal<number[]>([]);
  protected readonly guardarMapeo = signal(true);
  protected readonly prevF = signal<'Todos' | 'alta' | 'act' | 'rev'>('Todos');
  protected readonly archivoNombre = signal('Lista_InsumosDelSur_09-2026.xlsx');
  protected readonly archivoSub = signal('simulada · demo · 11 columnas · 412 filas');
  protected readonly archivoFile = signal<File | null>(null);
  protected readonly importando = signal(false);

  protected readonly listaMargen = signal<Record<string, string>>({});
  protected readonly reglasOn = signal<string[]>(['avisar', 'historial']);
  protected readonly proveedores = signal<ProveedorLista[]>([]);
  protected readonly depositos = signal<DepositoInventario[]>([]);
  protected readonly listasApi = signal<ListaPrecioCatalogo[]>([]);

  protected readonly esAdmin = computed(() => this.auth.puede('articulos'));

  protected readonly rubrosCombo = computed(() => {
    const set = new Set<string>();
    for (const p of this.estado().data ?? []) {
      const r = p.rubro?.trim();
      if (r) {
        set.add(r);
      }
    }
    return ['Todos los rubros', ...[...set].sort((a, b) => a.localeCompare(b, 'es'))];
  });

  protected readonly provsCombo = computed(() => {
    const set = new Set<string>();
    for (const p of this.proveedores()) {
      if (p.activo && p.nombre.trim()) {
        set.add(p.nombre.trim());
      }
    }
    for (const p of this.estado().data ?? []) {
      const n = p.proveedor?.trim();
      if (n) {
        set.add(n);
      }
    }
    return ['Todos los proveedores', ...[...set].sort((a, b) => a.localeCompare(b, 'es'))];
  });

  protected readonly filasVista = computed((): FilaArt[] => {
    const chip = this.chip();
    const rubro = this.fRubro();
    const prov = this.fProv();
    return (this.estado().data ?? [])
      .filter((p) => {
        if (rubro !== 'Todos los rubros' && (p.rubro?.trim() ?? '') !== rubro) {
          return false;
        }
        if (prov !== 'Todos los proveedores' && (p.proveedor?.trim() ?? '') !== prov) {
          return false;
        }
        if (chip === 'sinsku') {
          return !p.sku?.trim();
        }
        if (chip === 'sinean') {
          return !p.codigoBarras?.trim();
        }
        if (chip === 'margen') {
          const m = margenDe(p.costo, p.precio);
          return m !== null && m < 45;
        }
        return true;
      })
      .map((p) => {
        const m = margenDe(p.costo, p.precio);
        const est = estadoArticulo(p);
        return {
          id: p.id,
          sku: p.sku?.trim() || '— sin SKU —',
          nombre: p.nombre,
          sub: `${p.codigoBarras?.trim() || 'sin EAN'} · ${p.marca || '—'} · ${p.codigoProveedor?.trim() || 'sin cód. prov.'}`,
          prov: p.proveedor?.trim() || '—',
          costo: moneyArt(p.costo),
          venta: p.precio > 0 ? moneyArt(p.precio) : '—',
          marg: m === null ? '—' : `${m} %`,
          margTono: m === null ? 'muted' : m < 45 ? 'warn' : 'muted',
          act: '—',
          estado: est.label,
          estTono: est.tono,
          sinSku: !p.sku?.trim(),
        };
      });
  });

  protected readonly countTxt = computed(() => {
    const n = this.filasVista().length;
    const t = this.total();
    if (t > n) {
      return `${n} de ${t} artículos`;
    }
    return `${n} artículos`;
  });

  protected readonly contextoTxt = computed(() => {
    if (this.tab() === 'importar') {
      return this.archivoFile()
        ? `${this.archivoNombre()} · mapeo de columnas`
        : 'Importación simulada · demo (la real sigue disponible en Compras)';
    }
    if (this.tab() === 'listas') {
      return 'Los márgenes de ejemplo se aplican sobre el costo neto';
    }
    return 'Buscá por SKU, descripción, EAN o marca · mínimo 3 caracteres';
  });

  protected readonly fichaProducto = computed(() => {
    const id = this.seleccionadoId();
    if (!id) {
      return null;
    }
    return (this.estado().data ?? []).find((p) => p.id === id) ?? null;
  });

  protected readonly fichaEstado = computed(() => {
    if (this.esNuevo()) {
      return { label: 'Nuevo', tono: 'info' as TonoArt };
    }
    const p = this.fichaProducto();
    return p ? estadoArticulo(p) : { label: '—', tono: 'muted' as TonoArt };
  });

  protected readonly fichaCalculo = computed(() => {
    const costo = parseNumArt(this.costoTxt());
    const venta = parseNumArt(this.precioTxt());
    const iva = parseNumArt(this.ivaTxt()) || 21;
    const neto = venta / (1 + iva / 100);
    const m = margenDe(costo, venta);
    return [
      { label: 'Costo neto', value: moneyArt(costo), dest: false },
      { label: 'Margen aplicado', value: m === null ? '—' : `${m} %`, dest: false },
      { label: 'Neto de venta', value: moneyArt(neto), dest: false },
      {
        label: `IVA ${String(iva).replace('.', ',')} %`,
        value: moneyArt(venta - neto),
        dest: false,
      },
      { label: 'Precio final', value: moneyArt(venta), dest: true },
    ];
  });

  protected readonly precioMayorista = computed(() => {
    const v = parseNumArt(this.precioTxt());
    return v > 0 ? moneyArt(v * 0.88) : '';
  });
  protected readonly precioContado = computed(() => {
    const v = parseNumArt(this.precioTxt());
    return v > 0 ? moneyArt(v * 0.95) : '';
  });

  protected readonly columnasMapeo = computed(() => {
    const mapeo = this.mapeo();
    const usados = Object.values(mapeo).filter((v) => v !== 'Ignorar');
    return COLS_DEMO.map((c) => {
      const dest = mapeo[c.letra] ?? 'Ignorar';
      const dup = dest !== 'Ignorar' && usados.filter((v) => v === dest).length > 1;
      return {
        letra: c.letra,
        encabezado: c.enc,
        muestra: c.muestra,
        destino: dest,
        dup,
        ignorado: dest === 'Ignorar',
        nota: dup
          ? 'Ya asignaste este campo a otra columna'
          : dest === 'Precio de lista'
            ? 'Se le aplica el descuento de la columna F para obtener el costo'
            : dest === 'Descuento %'
              ? 'Se usa junto al precio de lista'
              : dest === 'Ignorar'
                ? 'No se importa'
                : '',
      };
    });
  });

  protected readonly mapeoEstado = computed(() => {
    const cols = this.columnasMapeo();
    const usados = cols.map((c) => c.destino).filter((v) => v !== 'Ignorar');
    const faltaCosto = !usados.includes('Costo neto') && !usados.includes('Precio de lista');
    const faltaDesc = !usados.includes('Descripción');
    const hayDup = cols.some((c) => c.dup);
    const ok = !faltaCosto && !faltaDesc && !hayDup;
    const label = hayDup
      ? 'Hay campos duplicados'
      : faltaCosto
        ? 'Falta asignar el costo'
        : faltaDesc
          ? 'Falta asignar la descripción'
          : 'Previsualizar 412 filas';
    return { ok, label, usados: usados.length };
  });

  protected readonly skuModosVista = computed(() => {
    const modo = this.skuModo();
    return (
      [
        { id: 'propio' as SkuModo, label: 'Generar SKU propio' },
        { id: 'prov' as SkuModo, label: 'Usar el código del proveedor' },
        { id: 'ean' as SkuModo, label: 'Usar el código de barras' },
      ] as const
    ).map((m) => ({
      ...m,
      on: modo === m.id,
      ejemplo: skuEjemplo(m.id, this.skuPrefijo(), this.skuDesde(), this.skuDigitos()),
    }));
  });

  protected readonly prevAll = computed(() => {
    const omit = new Set(this.omitidas());
    const margen = parseNumArt(this.margenImp());
    const modo = this.skuModo();
    return PREV_DEMO.map((p, i) => {
      const omitida = omit.has(i);
      const accion: AccionImport = omitida ? 'Omitida' : p.accion;
      const venta = redondearVenta(p.costo * (1 + margen / 100), this.redondeo());
      const varPct = p.ant > 0 ? Math.round((p.costo / p.ant - 1) * 100) : null;
      return {
        i,
        p,
        omitida,
        accion,
        sku: skuGenerado(modo, p, i, this.skuPrefijo(), this.skuDesde(), this.skuDigitos()),
        venta,
        varPct,
      };
    });
  });

  protected readonly prevKpis = computed(() => {
    const all = this.prevAll();
    const nAltas = all.filter((x) => !x.omitida && x.p.accion === 'Alta nueva').length;
    const nAct = all.filter((x) => !x.omitida && x.p.accion === 'Actualiza costo').length;
    const nRev = all.filter(
      (x) => x.p.accion === 'Sin SKU propio' || (x.varPct !== null && x.varPct >= 10),
    ).length;
    const f = this.prevF();
    return [
      {
        f: 'Todos' as const,
        label: 'Líneas leídas',
        value: String(PREV_DEMO.length),
        hint: 'demo · hoja Lista',
        tono: 'muted' as TonoArt,
      },
      {
        f: 'alta' as const,
        label: 'Altas nuevas',
        value: String(nAltas),
        hint: 'con SKU generado',
        tono: 'ok' as TonoArt,
      },
      {
        f: 'act' as const,
        label: 'Actualizan costo',
        value: String(nAct),
        hint: 'match por cód. proveedor',
        tono: 'info' as TonoArt,
      },
      {
        f: 'rev' as const,
        label: 'A revisar',
        value: String(nRev),
        hint: 'suben +10 % o sin match',
        tono: (nRev ? 'danger' : 'ok') as TonoArt,
      },
    ].map((k) => ({ ...k, on: f === k.f }));
  });

  protected readonly prevRows = computed(() => {
    const f = this.prevF();
    return this.prevAll()
      .filter(
        (x) =>
          f === 'Todos' ||
          (f === 'alta' && x.p.accion === 'Alta nueva') ||
          (f === 'act' && x.p.accion === 'Actualiza costo') ||
          (f === 'rev' &&
            (x.p.accion === 'Sin SKU propio' || (x.varPct !== null && x.varPct >= 10))),
      )
      .map((x) => {
        const nuevo = x.p.accion === 'Alta nueva';
        const subeMucho = x.varPct !== null && x.varPct >= 10;
        const varTxt =
          x.varPct === null
            ? 'nuevo'
            : x.varPct === 0
              ? '—'
              : `${x.varPct > 0 ? '+' : ''}${x.varPct} %`;
        const varTono: TonoArt =
          x.varPct === null
            ? 'ok'
            : x.varPct >= 10
              ? 'danger'
              : x.varPct > 0
                ? 'warn'
                : x.varPct < 0
                  ? 'ok'
                  : 'muted';
        const accTono: TonoArt =
          x.accion === 'Alta nueva'
            ? 'ok'
            : x.accion === 'Actualiza costo'
              ? 'info'
              : x.accion === 'Sin SKU propio'
                ? 'info'
                : 'muted';
        return {
          i: x.i,
          sku: x.sku,
          skuTono: x.p.sku ? ('muted' as TonoArt) : nuevo ? ('ok' as TonoArt) : ('info' as TonoArt),
          nombre: x.p.nom,
          codProv: x.p.codProv,
          costo: moneyArt(x.p.costo),
          costoAnt: x.p.ant ? moneyArt(x.p.ant) : '—',
          venta: moneyArt(x.venta),
          variacion: varTxt,
          varTono,
          accion: x.accion,
          accTono,
          nota: nuevo || subeMucho || x.p.accion === 'Sin SKU propio',
          notaTxt:
            x.p.accion === 'Sin SKU propio'
              ? 'no matchea y no se le puede generar SKU: revisar a mano'
              : nuevo
                ? 'artículo nuevo · rubro y margen del formato'
                : subeMucho
                  ? `el costo sube ${x.varPct} %: revisar antes de aplicar`
                  : '',
          notaTono: (x.p.accion === 'Sin SKU propio'
            ? 'info'
            : subeMucho
              ? 'danger'
              : 'ok') as TonoArt,
          tonoFila: x.omitida ? 'omit' : subeMucho ? 'warn' : nuevo ? 'ok' : '',
          omitirTxt: x.omitida ? 'Incluir' : 'Omitir',
        };
      });
  });

  protected readonly prevResumen = computed(() => {
    const all = this.prevAll();
    const nAltas = all.filter((x) => !x.omitida && x.p.accion === 'Alta nueva').length;
    const nAct = all.filter((x) => !x.omitida && x.p.accion === 'Actualiza costo').length;
    const nRev = all.filter(
      (x) => x.p.accion === 'Sin SKU propio' || (x.varPct !== null && x.varPct >= 10),
    ).length;
    const nAplicar = all.filter(
      (x) => !x.omitida && x.accion !== 'Sin cambios' && x.accion !== 'Sin SKU propio',
    ).length;
    return {
      nAplicar,
      tono: (nRev > 0 ? 'warn' : 'ok') as TonoArt,
      txt:
        nRev > 0
          ? `${nRev} líneas necesitan tu revisión: ${nAltas} altas nuevas y costos que suben más de 10 %.`
          : `Todo listo: ${nAltas} altas y ${nAct} actualizaciones de costo.`,
    };
  });

  protected readonly nRevImport = computed(
    () =>
      this.prevAll().filter(
        (x) => x.p.accion === 'Sin SKU propio' || (x.varPct !== null && x.varPct >= 10),
      ).length,
  );

  protected readonly listasVista = computed(() => {
    const api = this.listasApi().filter((l) => l.activo);
    const marg = this.listaMargen();
    const costoEj = (this.estado().data ?? []).find((p) => p.costo > 0)?.costo ?? 6100;
    if (api.length === 0) {
      return [];
    }
    return api.map((l, i) => {
      const defM = i === 0 ? '58' : i === 1 ? '34' : i === 2 ? '50' : '28';
      const m = marg[l.id] ?? defM;
      return {
        id: l.id,
        nombre: l.nombre,
        detalle: l.esDefault
          ? 'Precio de venta al público · la que usa la caja por defecto'
          : `Lista ${l.codigo}`,
        esDefault: l.esDefault,
        margen: m,
        arts: String(this.total() || '—'),
        ejemplo: moneyArt(
          redondearVenta(costoEj * (1 + parseNumArt(m) / 100), 'Redondear a $ 100'),
        ),
      };
    });
  });

  protected readonly historialVista = computed(() =>
    this.proveedores()
      .filter((p) => p.ultimaImportacionFecha || p.ultimaImportacionArchivo)
      .slice(0, 5)
      .map((p) => {
        const fecha = p.ultimaImportacionFecha
          ? p.ultimaImportacionFecha.slice(5, 10).replace('-', '/')
          : '—';
        const n = p.ultimaImportacionActualizados + p.ultimaImportacionNuevos;
        return {
          prov: p.nombre,
          detalle: `${n} artículos · ${p.ultimaImportacionArchivo || 'última lista'}`,
          variacion: `${p.ultimaImportacionActualizados} act. · ${p.ultimaImportacionNuevos} altas`,
          fecha,
        };
      }),
  );

  protected readonly formatosGuardados = computed(() =>
    this.proveedores()
      .filter((p) => p.activo && (p.mapeoExcel.length > 0 || p.ultimaImportacionArchivo))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        prov: p.nombre,
        sub: p.ultimaImportacionFecha
          ? `última ${p.ultimaImportacionFecha.slice(0, 10)}`
          : `${p.mapeoExcel.length} columnas mapeadas`,
        cols: `${Math.max(p.mapeoExcel.length, 6)} col`,
      })),
  );

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => {
        if (!textoBusquedaValido(q)) {
          this.store.resetListado();
          this.seleccionadoId.set(null);
          return;
        }
        this.store.cargar({ q, filtro: 'todos', page: 1 });
      });
    });

    this.compras
      .listarProveedoresCompletos()
      .pipe(catchError(() => of([] as ProveedorLista[])))
      .subscribe((p) => this.proveedores.set(p));
    this.depositosApi
      .listar()
      .pipe(catchError(() => of([] as DepositoInventario[])))
      .subscribe((d) => {
        this.depositos.set(d.filter((x) => x.activo));
        if (!this.depositoTxt() && d[0]) {
          this.depositoTxt.set(d[0].nombre);
        }
      });
    this.config
      .listarListasPrecio()
      .pipe(catchError(() => of([] as ListaPrecioCatalogo[])))
      .subscribe((l) => this.listasApi.set(l));

    try {
      const raw = localStorage.getItem('ventas360.art.reglas');
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          this.reglasOn.set(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }

  protected setTab(tab: TabArt): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  protected setChip(id: ChipArt): void {
    this.chip.set(id);
  }

  protected toggleSel(id: string, ev: Event): void {
    ev.stopPropagation();
    this.sel.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  protected abrirFila(id: string): void {
    const p = (this.estado().data ?? []).find((x) => x.id === id);
    if (!p) {
      return;
    }
    this.esNuevo.set(false);
    this.cargarFicha(p);
    this.seleccionadoId.set(id);
    this.fichaDirty.set(false);
  }

  protected abrirNuevo(): void {
    if (!this.esAdmin()) {
      return;
    }
    this.esNuevo.set(true);
    this.seleccionadoId.set(null);
    this.skuTxt.set('');
    this.nombreTxt.set('');
    this.marcaTxt.set('');
    this.rubroTxt.set('');
    this.eanTxt.set('');
    this.codProvTxt.set('');
    this.proveedorTxt.set('');
    this.costoTxt.set('0');
    this.precioTxt.set('');
    this.stockTxt.set('0');
    this.ivaTxt.set('21');
    this.margenTxt.set('58');
    this.unidadTxt.set('Unidad');
    this.estadoTxt.set('Activo');
    this.promoTxt.set('');
    this.fichaTab.set('General');
    this.fichaDirty.set(false);
  }

  protected marcarDirty(): void {
    this.fichaDirty.set(true);
    const costo = parseNumArt(this.costoTxt());
    const precio = parseNumArt(this.precioTxt());
    const m = margenDe(costo, precio);
    if (m !== null) {
      this.margenTxt.set(String(m));
    }
  }

  protected setMargenFicha(raw: string): void {
    this.margenTxt.set(raw);
    this.fichaDirty.set(true);
    const costo = parseNumArt(this.costoTxt());
    const m = parseNumArt(raw);
    if (costo > 0 && m >= 0) {
      this.precioTxt.set(String(Math.round(costo * (1 + m / 100))));
    }
  }

  protected async guardarFicha(): Promise<void> {
    if (!this.esAdmin()) {
      return;
    }
    const body = this.payloadFicha();
    if (!body) {
      return;
    }
    this.guardando.set(true);
    if (this.esNuevo()) {
      this.store.crear(body).subscribe({
        next: (p) => {
          this.notifications.success('Artículo creado', p.nombre);
          this.guardando.set(false);
          this.esNuevo.set(false);
          this.seleccionadoId.set(p.id);
          this.cargarFicha(p);
          this.fichaDirty.set(false);
        },
        error: () => this.guardando.set(false),
      });
      return;
    }
    const id = this.seleccionadoId();
    if (!id) {
      this.guardando.set(false);
      return;
    }
    const activo = this.estadoTxt() !== 'Descontinuado';
    this.store.actualizar(id, { ...body, activo }).subscribe({
      next: (p) => {
        this.notifications.success('Artículo actualizado', p.nombre);
        this.guardando.set(false);
        this.cargarFicha(p);
        this.fichaDirty.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async duplicar(): Promise<void> {
    if (!this.esAdmin() || this.esNuevo()) {
      return;
    }
    const body = this.payloadFicha();
    if (!body) {
      return;
    }
    body.sku = `${body.sku}-2`.slice(0, 40);
    this.guardando.set(true);
    this.store.crear(body).subscribe({
      next: (p) => {
        this.notifications.success('Artículo duplicado', p.sku);
        this.guardando.set(false);
        this.seleccionadoId.set(p.id);
        this.cargarFicha(p);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected etiqueta(): void {
    this.notifications.success('Etiqueta', 'La impresión de etiquetas se suma en un próximo paso.');
  }

  protected exportar(): void {
    const filas = this.filasVista();
    if (filas.length === 0) {
      this.notifications.warning('Nada para exportar', 'Buscá artículos primero.');
      return;
    }
    const head = 'SKU;Artículo;Rubro;Costo;Venta;Margen;Estado';
    const lines = filas.map(
      (r) => `${r.sku};${r.nombre};${r.prov};${r.costo};${r.venta};${r.marg};${r.estado}`,
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo-articulos.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  protected bulk(accion: string): void {
    const ids = this.sel();
    if (ids.length === 0) {
      return;
    }
    if (accion === 'Desactivar') {
      for (const id of ids) {
        this.store.actualizar(id, { activo: false }).subscribe();
      }
      this.notifications.success('Artículos desactivados', `${ids.length} seleccionado(s)`);
      this.sel.set([]);
      return;
    }
    if (accion === 'Aplicar margen') {
      const m = parseNumArt(this.margenImp()) || 58;
      for (const id of ids) {
        const p = (this.estado().data ?? []).find((x) => x.id === id);
        if (p && p.costo > 0) {
          this.store.actualizar(id, { precio: Math.round(p.costo * (1 + m / 100)) }).subscribe();
        }
      }
      this.notifications.success('Margen aplicado', `${ids.length} artículo(s) · ${m} %`);
      this.sel.set([]);
      return;
    }
    this.notifications.success(accion, 'Usá la ficha del artículo para cambiar rubro o proveedor.');
  }

  protected setPaso(n: number): void {
    this.paso.set(n);
  }

  protected elegirArchivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    this.archivoFile.set(file);
    this.archivoNombre.set(file.name);
    this.archivoSub.set(`${Math.round(file.size / 1024)} KB · mapeo pendiente`);
    this.paso.set(2);
  }

  protected irMapeoDemo(): void {
    this.archivoFile.set(null);
    this.archivoNombre.set('Lista_InsumosDelSur_09-2026.xlsx');
    this.archivoSub.set('simulada · demo · 11 columnas · 412 filas');
    this.paso.set(2);
  }

  protected usarFormato(id: string): void {
    const p = this.proveedores().find((x) => x.id === id);
    if (p) {
      this.archivoNombre.set(p.ultimaImportacionArchivo || `${p.nombre}.xlsx`);
      this.archivoSub.set(`formato de ${p.nombre}`);
      if (p.margenVentaPct) {
        this.margenImp.set(String(Math.round(p.margenVentaPct)));
      }
    }
    this.paso.set(3);
  }

  protected setDestino(letra: string, dest: string): void {
    this.mapeo.update((m) => ({ ...m, [letra]: dest as DestinoCol }));
  }

  protected autoMapear(): void {
    this.mapeo.set(mapeoInicial());
  }

  protected irPreview(): void {
    if (!this.mapeoEstado().ok) {
      return;
    }
    this.paso.set(3);
  }

  protected toggleOpcion(id: string): void {
    this.opciones.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  protected toggleOmitir(i: number): void {
    this.omitidas.update((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  protected importarDemo(): void {
    const n = this.prevResumen().nAplicar;
    this.notifications.success(
      'Importación simulada',
      `${n} líneas de demo. La importación real de Excel está en Compras → Listas.`,
    );
    this.setTab('catalogo');
    this.paso.set(1);
  }

  protected setMargenLista(id: string, v: string): void {
    this.listaMargen.update((m) => ({ ...m, [id]: v }));
  }

  protected toggleRegla(id: string): void {
    this.reglasOn.update((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      try {
        localStorage.setItem('ventas360.art.reglas', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  protected nuevaLista(): void {
    if (!this.auth.puede('configuracion')) {
      this.notifications.warning('Sin acceso', 'Las listas se dan de alta en Configuración.');
      return;
    }
    void this.router.navigate(['/configuracion']);
  }

  protected irEditarLista(): void {
    void this.router.navigate(['/configuracion']);
  }

  protected recalcularLista(nombre: string): void {
    this.notifications.success(
      'Recalcular',
      `El recálculo masivo de ${nombre} se aplica al importar costos.`,
    );
  }

  private cargarFicha(p: Producto): void {
    this.skuTxt.set(p.sku);
    this.nombreTxt.set(p.nombre);
    this.marcaTxt.set(p.marca);
    this.rubroTxt.set(p.rubro);
    this.eanTxt.set(p.codigoBarras);
    this.codProvTxt.set(p.codigoProveedor);
    this.proveedorTxt.set(p.proveedor);
    this.costoTxt.set(String(p.costo));
    this.precioTxt.set(String(p.precio));
    this.stockTxt.set(String(p.stock));
    const m = margenDe(p.costo, p.precio);
    this.margenTxt.set(m === null ? '' : String(m));
    this.estadoTxt.set(p.activo ? (p.stock <= 0 ? 'Sin stock' : 'Activo') : 'Descontinuado');
    this.fichaTab.set('General');
  }

  private payloadFicha(): CrearProducto | null {
    const precio = parseNumArt(this.precioTxt());
    const stock = Number(this.stockTxt());
    const costo = parseNumArt(this.costoTxt());
    const sku = this.skuTxt().trim();
    const nombre = this.nombreTxt().trim();
    if (!sku || !nombre) {
      this.notifications.error('Faltan datos', 'SKU y descripción son obligatorios.');
      this.fichaTab.set('General');
      return null;
    }
    if (!(precio > 0)) {
      this.notifications.error('Precio inválido', 'Debe ser mayor a cero');
      this.fichaTab.set('Precios');
      return null;
    }
    if (!Number.isFinite(costo) || costo < 0) {
      this.notifications.error('Costo inválido', 'Debe ser ≥ 0');
      return null;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      this.notifications.error('Stock inválido', 'Debe ser un entero ≥ 0');
      return null;
    }
    return {
      sku,
      nombre,
      marca: this.marcaTxt(),
      rubro: this.rubroTxt(),
      codigoBarras: this.eanTxt(),
      codigoProveedor: this.codProvTxt(),
      proveedor: this.proveedorTxt(),
      costo,
      precio,
      stock,
    };
  }
}
