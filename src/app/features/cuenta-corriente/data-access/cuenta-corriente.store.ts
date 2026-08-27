import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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

function emptySaldo(clienteId: string): SaldoCliente {
  return {
    clienteId,
    saldo: 0,
    debeTotal: 0,
    haberTotal: 0,
    fechaUltimoMovimiento: null,
    fechaDebeMasAntigua: null,
  };
}

export interface ResultadoBusquedaCxc {
  clientes: ClienteRef[];
  saldos: SaldoCliente[];
}

@Injectable({ providedIn: 'root' })
export class CuentaCorrienteStore {
  private readonly api = inject(CuentaCorrienteService);

  private readonly _saldos = signal<AsyncState<SaldoCliente[]>>(asyncIdle());
  private readonly _busqueda = signal<AsyncState<ResultadoBusquedaCxc>>(asyncIdle());
  private readonly _estadoCuenta = signal<EstadoCuenta | null>(null);
  private readonly _clientesRef = signal<ClienteRef[]>([]);
  private readonly _zonasRef = signal<ZonaRef[]>([]);
  private readonly _zonasCargadas = signal(false);
  private readonly _remitos = signal<ComprobanteCxc[]>([]);
  private readonly _facturas = signal<ComprobanteCxc[]>([]);
  private readonly _listaPrecio = signal<ListaPrecioRef | null>(null);
  private readonly _preciosActuales = signal<Map<string, number>>(new Map());
  private readonly _preciosCargados = signal(false);
  /** Cache de saldos del comercio (se pide una sola vez por sesión de CxC). */
  private saldosCache: SaldoCliente[] | null = null;

  readonly saldos = this._saldos.asReadonly();
  readonly busqueda = this._busqueda.asReadonly();
  readonly estadoCuenta = this._estadoCuenta.asReadonly();
  readonly clientesRef = this._clientesRef.asReadonly();
  readonly zonasRef = this._zonasRef.asReadonly();
  readonly remitos = this._remitos.asReadonly();
  readonly facturas = this._facturas.asReadonly();
  readonly listaPrecio = this._listaPrecio.asReadonly();
  readonly preciosActuales = this._preciosActuales.asReadonly();

  /** Busca clientes por nombre/CUIT; une con saldos (cache tras 1er fetch). */
  buscarPorTexto(q: string): void {
    const termino = q.trim();
    if (termino.length < 3) {
      this._busqueda.set(asyncIdle());
      this._clientesRef.set([]);
      this._saldos.set(asyncIdle());
      return;
    }
    this._busqueda.set(asyncLoading());
    this.api
      .listarClientesRef({ q: termino, pageSize: 50 })
      .pipe(
        switchMap((clientes) => {
          if (clientes.length === 0) {
            return of({ clientes, saldos: [] as SaldoCliente[] });
          }
          const ids = new Set(clientes.map((c) => c.id));
          const desdeCache = this.saldosCache;
          const saldos$ = desdeCache
            ? of(desdeCache)
            : this.api.listarSaldos().pipe(
                tap((todos) => {
                  this.saldosCache = todos;
                }),
              );
          return saldos$.pipe(
            map((todos) => ({
              clientes,
              saldos: todos.filter((s) => ids.has(s.clienteId)),
            })),
            catchError(() => of({ clientes, saldos: [] as SaldoCliente[] })),
          );
        }),
      )
      .subscribe({
        next: (resultado) => {
          this._clientesRef.set(resultado.clientes);
          this._saldos.set(asyncSuccess(resultado.saldos));
          this._busqueda.set(asyncSuccess(resultado));
        },
        error: (error: Error) => {
          this._busqueda.set(asyncError(error.message));
          this._clientesRef.set([]);
          this._saldos.set(asyncError(error.message));
        },
      });
  }

  limpiarBusqueda(): void {
    this._busqueda.set(asyncIdle());
    this._clientesRef.set([]);
    this._saldos.set(asyncIdle());
    this._estadoCuenta.set(null);
    this._remitos.set([]);
    this._facturas.set([]);
  }

  /** Solo resetea el estado del informe (no afecta cliente seleccionado en tab Cuenta). */
  limpiarInformeBusqueda(): void {
    this._busqueda.set(asyncIdle());
  }

  /** Selección desde combobox: un cliente + su saldo (sin listado). */
  seleccionarCliente(cliente: ClienteRef): void {
    this._clientesRef.set([cliente]);
    this._busqueda.set(asyncIdle());
    this.api.obtenerSaldo(cliente.id).subscribe({
      next: (saldo) => this._saldos.set(asyncSuccess([saldo])),
      error: () => this._saldos.set(asyncSuccess([{ ...emptySaldo(cliente.id) }])),
    });
    this.cargarEstado(cliente.id);
  }

  limpiarSeleccion(): void {
    this._clientesRef.set([]);
    this._saldos.set(asyncIdle());
    this._estadoCuenta.set(null);
    this._remitos.set([]);
    this._facturas.set([]);
  }

  /** Informes: carga saldos + clientes (opcional q) para filtrar en pantalla. */
  buscarInforme(q?: string): void {
    const termino = q?.trim() ?? '';
    this._busqueda.set(asyncLoading());
    if (termino.length >= 3) {
      this.api
        .listarClientesRef({ q: termino, pageSize: 200 })
        .pipe(
          switchMap((clientes) => {
            if (clientes.length === 0) {
              return of({ clientes, saldos: [] as SaldoCliente[] });
            }
            const ids = new Set(clientes.map((c) => c.id));
            return this.api.listarSaldos().pipe(
              tap((todos) => {
                this.saldosCache = todos;
              }),
              map((todos) => ({
                clientes,
                saldos: todos.filter((s) => ids.has(s.clienteId)),
              })),
              catchError(() => of({ clientes, saldos: [] as SaldoCliente[] })),
            );
          }),
        )
        .subscribe({
          next: (resultado) => this.aplicarResultadoInforme(resultado),
          error: (error: Error) => {
            this._busqueda.set(asyncError(error.message));
            this._clientesRef.set([]);
            this._saldos.set(asyncError(error.message));
          },
        });
      return;
    }

    this.api
      .listarSaldos()
      .pipe(
        switchMap((saldos) => {
          this.saldosCache = saldos;
          const ids = new Set(saldos.map((s) => s.clienteId));
          return this.api.listarClientesRef({ pageSize: 200 }).pipe(
            map((clientes) => ({
              clientes: clientes.filter((c) => ids.has(c.id)),
              saldos,
            })),
          );
        }),
        catchError((error: Error) => {
          this._busqueda.set(asyncError(error.message));
          throw error;
        }),
      )
      .subscribe({
        next: (resultado) => this.aplicarResultadoInforme(resultado),
        error: () => {
          this._clientesRef.set([]);
          this._saldos.set(asyncIdle());
        },
      });
  }

  private aplicarResultadoInforme(resultado: ResultadoBusquedaCxc): void {
    this._clientesRef.set(resultado.clientes);
    this._saldos.set(asyncSuccess(resultado.saldos));
    this._busqueda.set(asyncSuccess(resultado));
  }

  /** Refresca saldos del comercio (p. ej. tras un cobro). */
  cargarSaldos(): void {
    const ids = new Set(this._clientesRef().map((c) => c.id));
    this.api.listarSaldos().subscribe({
      next: (items) => {
        this.saldosCache = items;
        this._saldos.set(asyncSuccess(items.filter((s) => ids.has(s.clienteId))));
      },
      error: (error: Error) => this._saldos.set(asyncError(error.message)),
    });
  }

  cargarZonasSiHaceFalta(): void {
    if (this._zonasCargadas() || this._zonasRef().length > 0) {
      return;
    }
    this._zonasCargadas.set(true);
    this.api.listarZonasRef().subscribe({
      next: (items) => this._zonasRef.set(items),
      error: () => {
        this._zonasCargadas.set(false);
        this._zonasRef.set([]);
      },
    });
  }

  cargarPreciosSiHaceFalta(): void {
    if (this._preciosCargados()) {
      return;
    }
    this._preciosCargados.set(true);
    this.api.cargarMapaPreciosListaDefault().subscribe({
      next: ({ lista, precios }) => {
        this._listaPrecio.set(lista);
        this._preciosActuales.set(precios);
      },
      error: () => this._preciosCargados.set(false),
    });
  }

  cargarEstado(clienteId: string): void {
    this._estadoCuenta.set(null);
    this._remitos.set([]);
    this._facturas.set([]);
    this.cargarPreciosSiHaceFalta();
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
