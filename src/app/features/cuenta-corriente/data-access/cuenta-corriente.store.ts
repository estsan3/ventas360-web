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
  ComprobanteCxc,
  EstadoCuenta,
  ListaPrecioRef,
  Recibo,
  RegistrarCobro,
  SaldoCliente,
  ZonaRef,
} from './cxc.model';
import { CuentaCorrienteService } from './cuenta-corriente.service';

@Injectable({ providedIn: 'root' })
export class CuentaCorrienteStore {
  private readonly api = inject(CuentaCorrienteService);

  private readonly _saldos = signal<AsyncState<SaldoCliente[]>>(asyncIdle());
  private readonly _estadoCuenta = signal<EstadoCuenta | null>(null);
  private readonly _clientesRef = signal<ClienteRef[]>([]);
  private readonly _zonasRef = signal<ZonaRef[]>([]);
  private readonly _remitos = signal<ComprobanteCxc[]>([]);
  private readonly _facturas = signal<ComprobanteCxc[]>([]);
  private readonly _listaPrecio = signal<ListaPrecioRef | null>(null);
  private readonly _preciosActuales = signal<Map<string, number>>(new Map());

  readonly saldos = this._saldos.asReadonly();
  readonly estadoCuenta = this._estadoCuenta.asReadonly();
  readonly clientesRef = this._clientesRef.asReadonly();
  readonly zonasRef = this._zonasRef.asReadonly();
  readonly remitos = this._remitos.asReadonly();
  readonly facturas = this._facturas.asReadonly();
  readonly listaPrecio = this._listaPrecio.asReadonly();
  readonly preciosActuales = this._preciosActuales.asReadonly();

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
    this.api.listarZonasRef().subscribe((items) => this._zonasRef.set(items));
    this.api.cargarMapaPreciosListaDefault().subscribe(({ lista, precios }) => {
      this._listaPrecio.set(lista);
      this._preciosActuales.set(precios);
    });
  }

  cargarEstado(clienteId: string): void {
    this._estadoCuenta.set(null);
    this._remitos.set([]);
    this._facturas.set([]);
    this.api.estadoCuenta(clienteId).subscribe({
      next: (estado) => this._estadoCuenta.set(estado),
      error: () => this._estadoCuenta.set(null),
    });
    this.api.listarRemitosYFacturasCliente(clienteId).subscribe({
      next: ({ remitos, facturas }) => {
        this._remitos.set(remitos.filter((r) => r.estado !== 'cancelado'));
        this._facturas.set(facturas.filter((f) => f.estado !== 'cancelado'));
      },
      error: () => {
        this._remitos.set([]);
        this._facturas.set([]);
      },
    });
  }

  registrarCobro(body: RegistrarCobro): Observable<Recibo> {
    return this.api.registrarCobroACuenta(body).pipe(
      tap(() => {
        this.cargarSaldos();
        this.cargarEstado(body.clienteId);
      }),
    );
  }
}
