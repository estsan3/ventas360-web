import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ActualizarProducto, CrearProducto, FiltroActivo, Producto } from './producto.model';
import { PedidoProductoResumen, ProductosService } from './productos.service';

@Injectable({ providedIn: 'root' })
export class ProductosStore {
  private readonly api = inject(ProductosService);

  private readonly _productos = signal<AsyncState<Producto[]>>(asyncIdle());
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _pedidosProducto = signal<PedidoProductoResumen[]>([]);

  readonly productos = this._productos.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pedidosProducto = this._pedidosProducto.asReadonly();

  cargar(opts: { q?: string; filtro?: FiltroActivo; page?: number } = {}): void {
    const actual = this._productos();
    if (actual.status === 'loading') {
      return;
    }
    const page = opts.page ?? this._page();
    const prev = actual.data;
    this._productos.set({ ...asyncLoading(), data: prev });
    this.api.listar({ q: opts.q, filtro: opts.filtro, page, pageSize: 50 }).subscribe({
      next: (pagina) => {
        this._page.set(pagina.page);
        this._total.set(pagina.total);
        this._productos.set(asyncSuccess(pagina.items));
      },
      error: (error: Error) => this._productos.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearProducto): Observable<Producto> {
    return this.api.crear(body).pipe(
      tap((nuevo) => {
        const actual = this._productos();
        if (actual.status === 'success') {
          this._productos.set(asyncSuccess([nuevo, ...(actual.data ?? [])]));
          this._total.update((t) => t + 1);
        }
      }),
    );
  }

  actualizar(id: string, body: ActualizarProducto): Observable<Producto> {
    return this.api.actualizar(id, body).pipe(
      tap((actualizado) => {
        const actual = this._productos();
        if (actual.status === 'success') {
          this._productos.set(
            asyncSuccess((actual.data ?? []).map((p) => (p.id === id ? actualizado : p))),
          );
        }
      }),
    );
  }

  cargarPedidosDelProducto(productoId: string): void {
    this._pedidosProducto.set([]);
    this.api.listarPedidosDelProducto(productoId).subscribe({
      next: (items) => this._pedidosProducto.set(items),
      error: () => this._pedidosProducto.set([]),
    });
  }
}
