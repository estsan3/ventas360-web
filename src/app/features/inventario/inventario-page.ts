import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { DepositoInventario, DepositosService } from './data-access/depositos.service';
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
  private readonly notifications = inject(NotificationStore);
  private readonly router = inject(Router);

  protected readonly tab = signal<TabStock>('toma');
  protected readonly depositos = signal<DepositoInventario[]>([]);
  protected readonly depActivo = signal<string>('');
  protected readonly busqueda = signal('');
  protected readonly cargando = signal(false);
  protected readonly filas = signal<FilaConteo[]>([]);
  protected readonly remitos = signal<RemitoVista[]>([]);
  protected readonly nombresProv = signal<Record<string, string>>({});

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

  protected readonly contados = computed(
    () => this.filas().filter((f) => f.conteo.trim() !== '').length,
  );

  protected readonly conDiferencia = computed(
    () => this.filas().filter((f) => this.tieneDif(f)).length,
  );

  constructor() {
    this.stockApi.mapProveedores().subscribe({
      next: (m) => this.nombresProv.set(m),
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

  private cargarInventario(depositoId: string): void {
    if (!depositoId) {
      this.filas.set([]);
      return;
    }
    this.cargando.set(true);
    this.stockApi.listarInventario(depositoId).subscribe({
      next: (items) => {
        this.filas.set(items.map((i) => this.aFila(i)));
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

  protected actualizarConteo(codigo: string, valor: string): void {
    this.filas.update((rows) =>
      rows.map((r) => (r.codigo === codigo ? { ...r, conteo: valor } : r)),
    );
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
