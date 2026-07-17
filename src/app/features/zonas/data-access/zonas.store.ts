import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ActualizarZona, CrearZona, FiltroActivoZona, Zona } from './zona.model';
import { ZonasService } from './zonas.service';

@Injectable({ providedIn: 'root' })
export class ZonasStore {
  private readonly api = inject(ZonasService);

  private readonly _zonas = signal<AsyncState<Zona[]>>(asyncIdle());
  private readonly _total = signal(0);

  readonly zonas = this._zonas.asReadonly();
  readonly total = this._total.asReadonly();

  cargar(opts: { q?: string; filtro?: FiltroActivoZona; page?: number } = {}): void {
    const actual = this._zonas();
    if (actual.status === 'loading') {
      return;
    }
    const prev = actual.data;
    this._zonas.set({ ...asyncLoading(), data: prev });
    this.api
      .listar({ q: opts.q, filtro: opts.filtro ?? 'todos', page: opts.page ?? 1, pageSize: 200 })
      .subscribe({
        next: (pagina) => {
          this._total.set(pagina.total);
          this._zonas.set(asyncSuccess(pagina.items));
        },
        error: (error: Error) => this._zonas.set({ ...asyncError(error.message), data: prev }),
      });
  }

  crear(body: CrearZona): Observable<Zona> {
    return this.api.crear(body).pipe(
      tap((nueva) => {
        const actual = this._zonas();
        if (actual.status === 'success') {
          this._zonas.set(asyncSuccess([nueva, ...(actual.data ?? [])]));
          this._total.update((t) => t + 1);
        }
      }),
    );
  }

  actualizar(id: string, body: ActualizarZona): Observable<Zona> {
    return this.api.actualizar(id, body).pipe(
      tap((actualizada) => {
        const actual = this._zonas();
        if (actual.status === 'success') {
          this._zonas.set(
            asyncSuccess((actual.data ?? []).map((z) => (z.id === id ? actualizada : z))),
          );
        }
      }),
    );
  }

  desactivar(id: string): Observable<Zona> {
    return this.api.desactivar(id).pipe(
      tap((actualizada) => {
        const actual = this._zonas();
        if (actual.status === 'success') {
          this._zonas.set(
            asyncSuccess((actual.data ?? []).map((z) => (z.id === id ? actualizada : z))),
          );
        }
      }),
    );
  }
}
