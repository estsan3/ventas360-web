import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { CrearPedido, EstadoPedido, Pedido } from './pedido.model';
import { VentasService } from './ventas.service';

@Injectable({ providedIn: 'root' })
export class VentasStore {
  private readonly api = inject(VentasService);

  private readonly _pedidos = signal<AsyncState<Pedido[]>>(asyncIdle());

  readonly pedidos = this._pedidos.asReadonly();

  cargar(): void {
    if (this._pedidos().status === 'loading') {
      return;
    }
    const prev = this._pedidos().data;
    this._pedidos.set({ ...asyncLoading(), data: prev });
    this.api.listar().subscribe({
      next: (items) => this._pedidos.set(asyncSuccess(items)),
      error: (error: Error) => this._pedidos.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearPedido): Observable<Pedido> {
    return this.api.crear(body).pipe(
      tap((nuevo) => {
        const actual = this._pedidos();
        if (actual.status === 'success') {
          this._pedidos.set(asyncSuccess([nuevo, ...(actual.data ?? [])]));
        }
      }),
    );
  }

  cambiarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    return this.api.cambiarEstado(id, estado).pipe(
      tap((actualizado) => {
        const actual = this._pedidos();
        if (actual.status === 'success') {
          this._pedidos.set(
            asyncSuccess((actual.data ?? []).map((p) => (p.id === id ? actualizado : p))),
          );
        }
      }),
    );
  }
}
