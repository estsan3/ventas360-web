import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ActualizarProducto, CrearProducto, Producto } from './producto.model';
import { ProductosService } from './productos.service';

@Injectable({ providedIn: 'root' })
export class ProductosStore {
  private readonly api = inject(ProductosService);

  private readonly _productos = signal<AsyncState<Producto[]>>(asyncIdle());

  readonly productos = this._productos.asReadonly();

  cargar(): void {
    if (this._productos().status === 'loading') {
      return;
    }
    const prev = this._productos().data;
    this._productos.set({ ...asyncLoading(), data: prev });
    this.api.listar().subscribe({
      next: (items) => this._productos.set(asyncSuccess(items)),
      error: (error: Error) => this._productos.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearProducto): Observable<Producto> {
    return this.api.crear(body).pipe(
      tap((nuevo) => {
        const actual = this._productos();
        if (actual.status === 'success') {
          this._productos.set(asyncSuccess([...(actual.data ?? []), nuevo]));
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
}
