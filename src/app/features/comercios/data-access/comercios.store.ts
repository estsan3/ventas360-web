import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ComerciosService } from './comercios.service';
import { Comercio, ComercioDetalle, NuevoComercio, UsuarioComercio } from './comercio.model';

@Injectable({ providedIn: 'root' })
export class ComerciosStore {
  private readonly api = inject(ComerciosService);
  private readonly _comercios = signal<AsyncState<Comercio[]>>(asyncIdle());

  readonly comercios = this._comercios.asReadonly();

  cargar(): void {
    if (this._comercios().status === 'loading') {
      return;
    }
    this._comercios.set(asyncLoading());
    this.api.listar().subscribe({
      next: (items) => this._comercios.set(asyncSuccess(items)),
      error: (error: Error) => this._comercios.set(asyncError(error.message)),
    });
  }

  obtener(id: string): Observable<ComercioDetalle> {
    return this.api.obtener(id);
  }

  crear(datos: NuevoComercio): Observable<Comercio> {
    return this.api.crear(datos).pipe(
      tap((nuevo) => {
        const actual = this._comercios();
        if (actual.status === 'success') {
          this._comercios.set(asyncSuccess([nuevo, ...(actual.data ?? [])]));
        }
      }),
    );
  }

  setActivo(id: string, activo: boolean): Observable<Comercio> {
    return this.api.actualizar(id, { activo }).pipe(
      tap((actualizado) => {
        this._reemplazar(actualizado);
      }),
    );
  }

  cambiarPassword(
    tenantId: string,
    usuarioId: string,
    password: string,
  ): Observable<UsuarioComercio> {
    return this.api.cambiarPassword(tenantId, usuarioId, password);
  }

  private _reemplazar(actualizado: Comercio): void {
    const actual = this._comercios();
    if (actual.status === 'success') {
      this._comercios.set(
        asyncSuccess(
          (actual.data ?? []).map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c)),
        ),
      );
    }
  }
}
