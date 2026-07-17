import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import {
  ClienteRef,
  CrearPedido,
  DepositoRef,
  EstadoPedido,
  Pedido,
  ProductoRef,
} from './pedido.model';
import { VentasService } from './ventas.service';

@Injectable({ providedIn: 'root' })
export class VentasStore {
  private readonly api = inject(VentasService);

  private readonly _pedidos = signal<AsyncState<Pedido[]>>(asyncIdle());
  private readonly _clientesRef = signal<ClienteRef[]>([]);
  private readonly _productosRef = signal<ProductoRef[]>([]);
  private readonly _depositosRef = signal<DepositoRef[]>([]);

  readonly pedidos = this._pedidos.asReadonly();
  readonly clientesRef = this._clientesRef.asReadonly();
  readonly productosRef = this._productosRef.asReadonly();
  readonly depositosRef = this._depositosRef.asReadonly();

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

  cargarReferencias(): void {
    this.api.listarClientesRef().subscribe((items) => this._clientesRef.set(items));
    this.api.listarProductosRef().subscribe((items) => this._productosRef.set(items));
    this.api.listarDepositosRef().subscribe((items) => this._depositosRef.set(items));
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
    return this.api
      .cambiarEstado(id, estado)
      .pipe(tap((actualizado) => this._reemplazar(actualizado)));
  }

  confirmarRemito(id: string): Observable<Pedido> {
    return this.api.confirmarRemito(id).pipe(tap((actualizado) => this._reemplazar(actualizado)));
  }

  facturarRemito(id: string): Observable<Pedido> {
    return this.api.facturarRemito(id).pipe(
      tap(() => {
        this.cargar();
      }),
    );
  }

  private _reemplazar(actualizado: Pedido): void {
    const actual = this._pedidos();
    if (actual.status === 'success') {
      this._pedidos.set(
        asyncSuccess((actual.data ?? []).map((p) => (p.id === actualizado.id ? actualizado : p))),
      );
    }
  }
}
