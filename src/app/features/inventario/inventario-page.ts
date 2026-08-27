import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { DepositoInventario, DepositosService } from './data-access/depositos.service';
import { LineaRemitoParseada, ParsearRemitoResultado } from './data-access/remito-ia.model';
import { RemitoIaService } from './data-access/remito-ia.service';
import { InventarioItem, StockService } from './data-access/stock.service';

export type TabStock = 'toma' | 'recepcion' | 'alertas';

export interface FilaConteo {
  articuloId: string;
  codigo: string;
  articulo: string;
  ubicacion: string;
  sistema: number;
  conteo: string;
  costoUnit: number;
  alerta: boolean;
}

interface RemitoVista {
  id: string;
  remito: string;
  fecha: string;
  proveedor: string;
  renglones: number;
  estado: string;
  estadoTone: 'warn' | 'ok' | 'info' | 'neutral';
  puedeConfirmar: boolean;
  cargaIa: boolean;
}

interface AlertaStock {
  articulo: string;
  codigo: string;
  alerta: string;
  alertaTone: 'danger' | 'ok' | 'neutral' | 'warn';
  stock: number;
  minMax: string;
  accion: string;
  accionPrimary: boolean;
}

const STOCK_MINIMO = 5;

function claveToma(tenantId: string, depositoId: string): string {
  return `ventas360.toma.${tenantId}.${depositoId}`;
}

function leerConteos(tenantId: string, depositoId: string): Record<string, string> {
  if (!tenantId || !depositoId || typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(claveToma(tenantId, depositoId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
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

function csvCelda(valor: string | number): string {
  const t = String(valor);
  if (/[",;\n]/.test(t)) {
    return `"${t.replaceAll('"', '""')}"`;
  }
  return t;
}

function formatearFechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function formatearValor(n: number): string {
  const abs = Math.abs(n);
  const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(abs);
  if (n < 0) {
    return `− $ ${fmt}`;
  }
  if (n > 0) {
    return `+ $ ${fmt}`;
  }
  return '—';
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
  private readonly remitoIa = inject(RemitoIaService);
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthStore);
  private readonly confirm = inject(ConfirmDialogService);

  protected readonly tab = signal<TabStock>('toma');
  protected readonly depositos = signal<DepositoInventario[]>([]);
  protected readonly depActivo = signal<string>('');
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly cerrando = signal(false);
  protected readonly filas = signal<FilaConteo[]>([]);
  protected readonly remitos = signal<RemitoVista[]>([]);
  protected readonly nombresProv = signal<Record<string, string>>({});
  protected readonly proveedores = signal<{ id: string; nombre: string }[]>([]);
  protected readonly proveedorIa = signal('');
  protected readonly parseando = signal(false);
  protected readonly creandoRemito = signal(false);
  protected readonly previewIa = signal<ParsearRemitoResultado | null>(null);
  protected readonly lineasIa = signal<LineaRemitoParseada[]>([]);
  protected readonly nombreArchivoIa = signal('');

  protected readonly filasVista = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const rows = this.filas();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (r) =>
        r.codigo.toLowerCase().includes(q) ||
        r.articulo.toLowerCase().includes(q) ||
        r.ubicacion.toLowerCase().includes(q),
    );
  });

  protected readonly alertas = computed((): AlertaStock[] =>
    this.filas()
      .filter((f) => f.sistema <= STOCK_MINIMO)
      .map((f) => ({
        articulo: f.articulo,
        codigo: f.codigo,
        alerta: f.sistema === 0 ? 'Sin stock' : 'Bajo mínimo',
        alertaTone: f.sistema === 0 ? 'danger' : 'warn',
        stock: f.sistema,
        minMax: `${STOCK_MINIMO} / —`,
        accion: 'Ver en compras',
        accionPrimary: true,
      })),
  );

  protected readonly kpisAlertas = computed(() => {
    const a = this.alertas();
    return {
      sinStock: a.filter((x) => x.stock === 0).length,
      bajoMinimo: a.filter((x) => x.stock > 0).length,
      total: a.length,
    };
  });

  protected readonly depositoActivoNombre = computed(() => {
    const id = this.depActivo();
    return this.depositos().find((d) => d.id === id)?.nombre ?? 'Depósito';
  });

  protected readonly lineasIaMatcheadas = computed(
    () => this.lineasIa().filter((l) => l.productoId).length,
  );

  protected readonly puedeCrearRemitoIa = computed(() => {
    const prov = this.proveedorIa();
    const dep = this.depActivo();
    const lineas = this.lineasIa().filter((l) => l.productoId && l.cantidad > 0);
    return Boolean(prov && dep && lineas.length > 0 && !this.creandoRemito());
  });

  protected readonly contados = computed(
    () => this.filas().filter((f) => f.conteo.trim() !== '').length,
  );

  protected readonly conDiferencia = computed(
    () => this.filas().filter((f) => this.tieneDif(f)).length,
  );

  constructor() {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'toma' || tab === 'recepcion' || tab === 'alertas') {
      this.tab.set(tab);
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
    this.depositosApi.listar().subscribe({
      next: (items) => {
        const activos = items.filter((d) => d.activo);
        const lista = activos.length > 0 ? activos : items;
        this.depositos.set(lista);
        const central =
          lista.find((d) => d.codigo.toUpperCase() === 'CENTRAL') ??
          lista.find((d) => d.nombre.toLowerCase().includes('central')) ??
          lista[0];
        if (central) {
          this.setDep(central.id);
        }
      },
      error: () => this.depositos.set([]),
    });
    this.cargarRemitos();
  }

  protected setDep(id: string): void {
    this.depActivo.set(id);
    this.cargarInventario(id);
  }

  protected setTab(tab: TabStock): void {
    this.tab.set(tab);
    if (tab === 'recepcion') {
      this.cargarRemitos();
    }
    if (tab === 'toma' && this.depActivo()) {
      this.cargarInventario(this.depActivo());
    }
  }

  private tenantId(): string {
    return this.auth.contexto()?.tenant?.id ?? this.auth.contexto()?.slug ?? 'local';
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
        this.filas.set(
          items.map((i) => {
            const fila = this.aFila(i);
            return { ...fila, conteo: guardados[i.articuloId] ?? '' };
          }),
        );
        this.cargando.set(false);
      },
      error: () => {
        this.filas.set([]);
        this.cargando.set(false);
      },
    });
  }

  private cargarRemitos(): void {
    this.stockApi.listarRemitosCompra().subscribe({
      next: (items) => {
        this.remitos.set(
          items.map((r) => {
            const tone =
              r.estado === 'borrador'
                ? 'warn'
                : r.estado === 'confirmado' || r.estado === 'facturado'
                  ? 'ok'
                  : 'neutral';
            return {
              id: r.id,
              remito: r.comprobante,
              fecha: formatearFechaCorta(r.fecha),
              proveedor: this.nombresProv()[r.proveedorId] ?? r.proveedorId,
              renglones: r.renglones,
              estado:
                r.estado === 'borrador'
                  ? 'Pendiente de confirmar'
                  : r.estado === 'confirmado'
                    ? 'Stock actualizado'
                    : r.estado === 'facturado'
                      ? 'Facturado'
                      : r.estado,
              estadoTone: tone as RemitoVista['estadoTone'],
              puedeConfirmar: r.estado === 'borrador',
              cargaIa: false,
            };
          }),
        );
      },
      error: () => this.remitos.set([]),
    });
  }

  private aFila(i: InventarioItem): FilaConteo {
    return {
      articuloId: i.articuloId,
      codigo: i.sku,
      articulo: i.nombre,
      ubicacion: this.depositoActivoNombre(),
      sistema: i.cantidad,
      conteo: '',
      costoUnit: i.costo,
      alerta: i.cantidad <= STOCK_MINIMO,
    };
  }

  protected actualizarConteo(articuloId: string, valor: string): void {
    this.filas.update((rows) => {
      const next = rows.map((r) => (r.articuloId === articuloId ? { ...r, conteo: valor } : r));
      guardarConteos(this.tenantId(), this.depActivo(), next);
      return next;
    });
  }

  protected exportarValorizado(): void {
    const rows = this.filas();
    if (rows.length === 0) {
      this.notifications.warning('Nada para exportar', 'No hay artículos en este depósito.');
      return;
    }
    const encabezado = [
      'Código',
      'Artículo',
      'Depósito',
      'Sistema',
      'Conteo',
      'Diferencia',
      'Costo',
      'Valor sistema',
      'Valor conteo',
      'Valor diferencia',
    ];
    const lineas = [encabezado.map(csvCelda).join(';')];
    for (const r of rows) {
      const conteo = r.conteo.trim() === '' ? '' : Number(r.conteo);
      const dif = typeof conteo === 'number' && Number.isFinite(conteo) ? conteo - r.sistema : '';
      const valorSis = r.sistema * r.costoUnit;
      const valorCon =
        typeof conteo === 'number' && Number.isFinite(conteo) ? conteo * r.costoUnit : '';
      const valorDif =
        typeof conteo === 'number' && Number.isFinite(conteo)
          ? (conteo - r.sistema) * r.costoUnit
          : '';
      lineas.push(
        [
          r.codigo,
          r.articulo,
          r.ubicacion,
          r.sistema,
          conteo === '' ? '' : conteo,
          dif,
          r.costoUnit,
          valorSis,
          valorCon,
          valorDif,
        ]
          .map(csvCelda)
          .join(';'),
      );
    }
    const blob = new Blob(['\uFEFF' + lineas.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const dep = this.depositoActivoNombre().replaceAll(/\s+/g, '-').toLowerCase();
    const hoy = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `toma-${dep}-${hoy}.csv`;
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
    const ok = await this.confirm.abrir({
      titulo: 'Cerrar toma y ajustar',
      mensaje:
        conDif === 0
          ? `Hay ${contados.length} artículos contados, todos coinciden con el sistema. ¿Cerrar la toma?`
          : `Se van a ajustar ${conDif} artículo${conDif === 1 ? '' : 's'} con diferencia. Los no contados no se tocan.`,
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
        error: () => {
          this.cerrando.set(false);
        },
      });
  }

  protected confirmarRemito(id: string): void {
    this.stockApi.confirmarCompra(id).subscribe({
      next: () => {
        this.notifications.success('Remito confirmado', 'Stock ingresado al depósito');
        this.cargarRemitos();
        if (this.depActivo()) {
          this.cargarInventario(this.depActivo());
        }
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
      this.notifications.warning('Sin depósito', 'Elegí el depósito de recepción.');
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
    this.lineasIa.set([]);
    this.remitoIa.parsearRemito(archivo, { proveedorId, depositoId }).subscribe({
      next: (resultado) => {
        this.parseando.set(false);
        this.previewIa.set(resultado);
        this.lineasIa.set(resultado.lineas.map((l) => ({ ...l })));
        const modo =
          resultado.modoParser === 'anthropic'
            ? 'Claude Haiku'
            : 'demo (configurá API key para IA real)';
        this.notifications.success('Remito leído', `${resultado.lineas.length} líneas · ${modo}`);
      },
      error: () => {
        this.parseando.set(false);
      },
    });
  }

  protected actualizarCantidadIa(index: number, valor: string): void {
    const cantidad = Math.max(1, Math.trunc(Number(valor)) || 1);
    this.lineasIa.update((rows) => rows.map((r, i) => (i === index ? { ...r, cantidad } : r)));
  }

  protected descartarPreviewIa(): void {
    this.previewIa.set(null);
    this.lineasIa.set([]);
    this.nombreArchivoIa.set('');
  }

  protected async crearRemitoDesdeIa(): Promise<void> {
    const proveedorId = this.proveedorIa();
    const depositoId = this.depActivo();
    const lineas = this.lineasIa().filter((l) => l.productoId && l.cantidad > 0);
    if (!proveedorId || !depositoId || lineas.length === 0) {
      return;
    }
    const sinMatch = this.lineasIa().length - lineas.length;
    const ok = await this.confirm.abrir({
      titulo: 'Crear remito borrador',
      mensaje:
        sinMatch > 0
          ? `Se creará un remito con ${lineas.length} líneas. ${sinMatch} línea(s) sin artículo quedan fuera. Después podés confirmarlo para ingresar stock.`
          : `Se creará un remito borrador con ${lineas.length} líneas. Confirmalo cuando revises las cantidades.`,
      textoConfirmar: 'Crear remito',
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
          cantidad: l.cantidad,
          ...(l.precioUnitario != null ? { precioUnitario: l.precioUnitario } : {}),
        })),
      })
      .subscribe({
        next: () => {
          this.creandoRemito.set(false);
          this.descartarPreviewIa();
          this.notifications.success(
            'Remito creado',
            'Revisá el borrador y confirmá para impactar stock.',
          );
          this.cargarRemitos();
        },
        error: () => {
          this.creandoRemito.set(false);
        },
      });
  }

  protected irCompras(): void {
    void this.router.navigateByUrl('/compras');
  }

  protected diferencia(row: FilaConteo): { texto: string; tono: 'ok' | 'neg' | 'pos' | 'muted' } {
    if (row.conteo.trim() === '') {
      return { texto: 'Sin contar', tono: 'muted' };
    }
    const n = Number(row.conteo);
    if (!Number.isFinite(n)) {
      return { texto: 'Sin contar', tono: 'muted' };
    }
    const d = n - row.sistema;
    if (d === 0) {
      return { texto: '0', tono: 'ok' };
    }
    if (d < 0) {
      return { texto: `−${Math.abs(d)}`, tono: 'neg' };
    }
    return { texto: `+${d}`, tono: 'pos' };
  }

  protected valorDif(row: FilaConteo): { texto: string; tono: 'neg' | 'pos' | 'muted' } {
    if (row.conteo.trim() === '') {
      return { texto: '—', tono: 'muted' };
    }
    const n = Number(row.conteo);
    if (!Number.isFinite(n)) {
      return { texto: '—', tono: 'muted' };
    }
    const d = n - row.sistema;
    if (d === 0 || row.costoUnit === 0) {
      return { texto: '—', tono: 'muted' };
    }
    const valor = d * row.costoUnit;
    return {
      texto: formatearValor(valor),
      tono: valor < 0 ? 'neg' : 'pos',
    };
  }

  protected tieneDif(row: FilaConteo): boolean {
    return this.diferencia(row).tono === 'neg' || this.diferencia(row).tono === 'pos';
  }
}
