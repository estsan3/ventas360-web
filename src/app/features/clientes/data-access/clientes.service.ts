import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClienteDto, ClientesPaginaDto } from './cliente.dto';
import {
  actualizarClienteToDto,
  clienteToModel,
  clientesPaginaToModel,
  crearClienteToDto,
} from './cliente.mapper';
import {
  ActualizarCliente,
  Cliente,
  ClientesPagina,
  CrearCliente,
  FiltroActivo,
} from './cliente.model';
import { PedidoResumenDto } from './pedido-resumen.dto';
import { pedidoResumenToModel } from './pedido-resumen.mapper';
import { PedidoResumen } from './pedido-resumen.model';

export interface ListarClientesParams {
  q?: string;
  filtro?: FiltroActivo;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/clientes`;
  private readonly api = environment.apiBaseUrl;

  listar(params: ListarClientesParams = {}): Observable<ClientesPagina> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 1))
      .set('page_size', String(params.pageSize ?? 50));
    if (params.q?.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }
    if (params.filtro === 'activos') {
      httpParams = httpParams.set('activo', 'true');
    } else if (params.filtro === 'inactivos') {
      httpParams = httpParams.set('activo', 'false');
    }
    return this.http
      .get<ClientesPaginaDto>(this.base, { params: httpParams })
      .pipe(map(clientesPaginaToModel));
  }

  obtener(id: string): Observable<Cliente> {
    return this.http.get<ClienteDto>(`${this.base}/${id}`).pipe(map(clienteToModel));
  }

  crear(body: CrearCliente): Observable<Cliente> {
    return this.http.post<ClienteDto>(this.base, crearClienteToDto(body)).pipe(map(clienteToModel));
  }

  actualizar(id: string, body: ActualizarCliente): Observable<Cliente> {
    return this.http
      .put<ClienteDto>(`${this.base}/${id}`, actualizarClienteToDto(body))
      .pipe(map(clienteToModel));
  }

  desactivar(id: string): Observable<Cliente> {
    return this.http
      .patch<ClienteDto>(`${this.base}/${id}/desactivar`, {})
      .pipe(map(clienteToModel));
  }

  /** Pedidos del cliente vía HTTP propio (sin importar el feature ventas). */
  listarPedidosDelCliente(clienteId: string): Observable<PedidoResumen[]> {
    return this.http
      .get<PedidoResumenDto[]>(`${this.api}/ventas/pedidos`)
      .pipe(
        map((items) => items.filter((p) => p.cliente_id === clienteId).map(pedidoResumenToModel)),
      );
  }
}
