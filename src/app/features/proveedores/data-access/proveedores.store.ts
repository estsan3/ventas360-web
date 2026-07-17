import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ActualizarProveedor, CrearProveedor, Proveedor } from './proveedor.model';
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

  crear(body: CrearProveedor): Observable<Proveedor> {
    return this.api.crear(body).pipe(
      tap((nuevo) => {
        const actual = this._proveedores();
        if (actual.status === 'success') {
          this._proveedores.set(asyncSuccess([nuevo, ...(actual.data ?? [])]));
        }
      }),
    );
  }

  actualizar(id: string, body: ActualizarProveedor): Observable<Proveedor> {
    return this.api.actualizar(id, body).pipe(
      tap((actualizado) => {
        const actual = this._proveedores();
        if (actual.status === 'success') {
          this._proveedores.set(
            asyncSuccess((actual.data ?? []).map((p) => (p.id === id ? actualizado : p))),
          );
        }
      }),
    );
  }

  desactivar(id: string): Observable<Proveedor> {
    return this.api.desactivar(id).pipe(
      tap((actualizado) => {
        const actual = this._proveedores();
        if (actual.status === 'success') {
          this._proveedores.set(
            asyncSuccess((actual.data ?? []).map((p) => (p.id === id ? actualizado : p))),
          );
        }
      }),
    );
  }
}
