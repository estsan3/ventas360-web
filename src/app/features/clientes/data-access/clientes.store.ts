import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ActualizarCliente, Cliente, CrearCliente, FiltroActivo } from './cliente.model';
import { ClientesService } from './clientes.service';
import { PedidoResumen } from './pedido-resumen.model';

@Injectable({ providedIn: 'root' })
export class ClientesStore {
  private readonly api = inject(ClientesService);

  private readonly _clientes = signal<AsyncState<Cliente[]>>(asyncIdle());
  private readonly _total = signal(0);
  private readonly _page = signal(1);
  private readonly _pedidosCliente = signal<PedidoResumen[]>([]);

  readonly clientes = this._clientes.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pedidosCliente = this._pedidosCliente.asReadonly();

  cargar(opts: { q?: string; filtro?: FiltroActivo; page?: number } = {}): void {
    if (this._clientes().status === 'loading') {
      return;
    }
    const page = opts.page ?? this._page();
    const prev = this._clientes().data;
    this._clientes.set({ ...asyncLoading(), data: prev });
    this.api.listar({ q: opts.q, filtro: opts.filtro, page, pageSize: 50 }).subscribe({
      next: (pagina) => {
        this._page.set(pagina.page);
        this._total.set(pagina.total);
        this._clientes.set(asyncSuccess(pagina.items));
      },
      error: (error: Error) => this._clientes.set({ ...asyncError(error.message), data: prev }),
    });
  }

  crear(body: CrearCliente): Observable<Cliente> {
    return this.api.crear(body).pipe(
      tap((nuevo) => {
        const actual = this._clientes();
        if (actual.status === 'success') {
          this._clientes.set(asyncSuccess([nuevo, ...(actual.data ?? [])]));
          this._total.update((t) => t + 1);
        }
      }),
    );
  }

  actualizar(id: string, body: ActualizarCliente): Observable<Cliente> {
    return this.api.actualizar(id, body).pipe(
      tap((actualizado) => {
        const actual = this._clientes();
        if (actual.status === 'success') {
          this._clientes.set(
            asyncSuccess((actual.data ?? []).map((c) => (c.id === id ? actualizado : c))),
          );
        }
      }),
    );
  }

  desactivar(id: string): Observable<Cliente> {
    return this.api.desactivar(id).pipe(
      tap((actualizado) => {
        const actual = this._clientes();
        if (actual.status === 'success') {
          this._clientes.set(
            asyncSuccess((actual.data ?? []).map((c) => (c.id === id ? actualizado : c))),
          );
        }
      }),
    );
  }

  cargarPedidosDelCliente(clienteId: string): void {
    this._pedidosCliente.set([]);
    this.api.listarPedidosDelCliente(clienteId).subscribe({
      next: (items) => this._pedidosCliente.set(items),
      error: () => this._pedidosCliente.set([]),
    });
  }
}
