import { Injectable, inject, signal } from '@angular/core';
import { IaService } from '../data-access/ia.service';
import { AccionesDia, ResumenDia } from '../data-access/ia.model';

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: string };

@Injectable({ providedIn: 'root' })
export class IaStore {
  private readonly api = inject(IaService);

  private readonly _acciones = signal<AsyncState<AccionesDia>>({ status: 'idle' });
  private readonly _resumen = signal<AsyncState<ResumenDia>>({ status: 'idle' });

  readonly acciones = this._acciones.asReadonly();
  readonly resumen = this._resumen.asReadonly();

  /** Una sola llamada a /ai/resumen-dia (evita recalcular KPIs 2 veces). */
  cargarDashboard(): void {
    this._acciones.set({ status: 'loading' });
    this._resumen.set({ status: 'loading' });
    this.api.resumenDia(true).subscribe({
      next: (data) => {
        this._resumen.set({ status: 'ready', data });
        this._acciones.set({
          status: 'ready',
          data: {
            acciones: data.acciones,
            generadoEn: data.generadoEn ?? new Date().toISOString(),
          },
        });
      },
      error: (err: Error) => {
        const msg = err.message ?? 'Error al cargar IA del día';
        this._resumen.set({ status: 'error', error: msg });
        this._acciones.set({ status: 'error', error: msg });
      },
    });
  }
}
