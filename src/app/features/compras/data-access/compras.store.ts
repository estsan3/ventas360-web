import { Injectable, inject, signal } from '@angular/core';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { Compra, CrearCompra } from './compra.model';
import { ComprasService } from './compras.service';

@Injectable({ providedIn: 'root' })
export class ComprasStore {
  private readonly api = inject(ComprasService);
  private readonly _compras = signal<AsyncState<Compra[]>>(asyncIdle());
  readonly compras = this._compras.asReadonly();

  cargar(): void {
    const prev = this._compras().data;
    this._compras.set({ ...asyncLoading(), data: prev });
    this.api.listar().subscribe({
      next: (items) => this._compras.set(asyncSuccess(items)),
      error: (error: Error) => this._compras.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearCompra) {
    return this.api.crear(body);
  }

  confirmar(id: string) {
    return this.api.confirmar(id);
  }

  facturar(id: string) {
    return this.api.facturar(id);
  }
}
