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

  cargar(): void {
    if (this._kpis().status === 'loading') {
      return;
    }
    const prev = this._kpis().data;
    this._kpis.set({ ...asyncLoading(), data: prev });
    this.api.obtenerKpis().subscribe({
      next: (kpis) => this._kpis.set(asyncSuccess(kpis)),
      error: (error: Error) => this._kpis.set({ ...asyncError(error.message), data: prev }),
    });
  }
}
