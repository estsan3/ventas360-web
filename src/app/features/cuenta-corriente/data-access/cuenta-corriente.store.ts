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
  CrearRecibo,
  EstadoCuenta,
  FacturaRef,
  Recibo,
  SaldoCliente,
} from './cxc.model';
import { CuentaCorrienteService } from './cuenta-corriente.service';

@Injectable({ providedIn: 'root' })
export class CuentaCorrienteStore {
  private readonly api = inject(CuentaCorrienteService);

  private readonly _saldos = signal<AsyncState<SaldoCliente[]>>(asyncIdle());
  private readonly _estadoCuenta = signal<EstadoCuenta | null>(null);
  private readonly _clientesRef = signal<ClienteRef[]>([]);
  private readonly _facturasRef = signal<FacturaRef[]>([]);

  readonly saldos = this._saldos.asReadonly();
  readonly estadoCuenta = this._estadoCuenta.asReadonly();
  readonly clientesRef = this._clientesRef.asReadonly();
  readonly facturasRef = this._facturasRef.asReadonly();

  cargarSaldos(): void {
    if (this._saldos().status === 'loading') {
      return;
    }
    const prev = this._saldos().data;
    this._saldos.set({ ...asyncLoading(), data: prev });
    this.api.listarSaldos().subscribe({
      next: (items) => this._saldos.set(asyncSuccess(items)),
      error: (error: Error) => this._saldos.set({ ...asyncError(error.message), data: prev }),
    });
  }

  cargarReferencias(): void {
    this.api.listarClientesRef().subscribe((items) => this._clientesRef.set(items));
  }

  cargarEstado(clienteId: string): void {
    this._estadoCuenta.set(null);
    this.api.estadoCuenta(clienteId).subscribe({
      next: (estado) => this._estadoCuenta.set(estado),
      error: () => this._estadoCuenta.set(null),
    });
    this.api.listarFacturasCliente(clienteId).subscribe((items) => this._facturasRef.set(items));
  }

  crearRecibo(body: CrearRecibo): Observable<Recibo> {
    return this.api.crearRecibo(body).pipe(
      tap(() => {
        this.cargarSaldos();
        this.cargarEstado(body.clienteId);
      }),
    );
  }
}
