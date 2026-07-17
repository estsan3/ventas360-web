import { Injectable, inject, signal } from '@angular/core';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { CrearProveedor, Proveedor } from './proveedor.model';
import { ProveedoresService } from './proveedores.service';

@Injectable({ providedIn: 'root' })
export class ProveedoresStore {
  private readonly api = inject(ProveedoresService);

  private readonly _proveedores = signal<AsyncState<Proveedor[]>>(asyncIdle());
  readonly proveedores = this._proveedores.asReadonly();

  cargar(q = ''): void {
    const prev = this._proveedores().data;
    this._proveedores.set({ ...asyncLoading(), data: prev });
    this.api.listar({ q }).subscribe({
      next: (pagina) => this._proveedores.set(asyncSuccess(pagina.items)),
      error: (error: Error) => this._proveedores.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearProveedor) {
    return this.api.crear(body);
  }
}
