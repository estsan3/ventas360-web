import { Injectable, inject, signal } from '@angular/core';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { DashboardService } from './dashboard.service';
import { Kpis } from './kpi.model';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly api = inject(DashboardService);

  private readonly _kpis = signal<AsyncState<Kpis>>(asyncIdle());
  readonly kpis = this._kpis.asReadonly();

  private cargadoEn = 0;
  private static readonly CACHE_MS = 60_000;

  cargar(): void {
    const estado = this._kpis();
    if (estado.status === 'loading') {
      return;
    }
    const fresco =
      estado.status === 'success' && Date.now() - this.cargadoEn < DashboardStore.CACHE_MS;
    if (fresco) {
      return;
    }
    const prev = estado.data;
    this._kpis.set({ ...asyncLoading(), data: prev });
    this.api.obtenerKpis().subscribe({
      next: (kpis) => {
        this.cargadoEn = Date.now();
        this._kpis.set(asyncSuccess(kpis));
      },
      error: (error: Error) => this._kpis.set({ ...asyncError(error.message), data: prev }),
    });
  }
}
