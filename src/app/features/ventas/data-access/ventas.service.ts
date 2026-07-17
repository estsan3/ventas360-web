import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClienteRefDto,
  DepositoRefDto,
  PaginaItemsDto,
  PedidoDto,
  ProductoRefDto,
} from './pedido.dto';
import {
  clienteRefToModel,
  crearPedidoToDto,
  depositoRefToModel,
  pedidoToModel,
  productoRefToModel,
} from './pedido.mapper';
import {
  ClienteRef,
  CrearPedido,
  DepositoRef,
  EstadoPedido,
  Pedido,
  ProductoRef,
} from './pedido.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/ventas/pedidos`;
  private readonly api = environment.apiBaseUrl;

  listar(): Observable<Pedido[]> {
    return this.http.get<PedidoDto[]>(this.base).pipe(map((items) => items.map(pedidoToModel)));
  }

  obtener(id: string): Observable<Pedido> {
    return this.http.get<PedidoDto>(`${this.base}/${id}`).pipe(map(pedidoToModel));
  }

  crear(body: CrearPedido): Observable<Pedido> {
    return this.http.post<PedidoDto>(this.base, crearPedidoToDto(body)).pipe(map(pedidoToModel));
  }

  cambiarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    return this.http
      .patch<PedidoDto>(`${this.base}/${id}/estado`, { estado })
      .pipe(map(pedidoToModel));
  }

  confirmarRemito(id: string): Observable<Pedido> {
    return this.http
      .post<PedidoDto>(`${this.base}/${id}/confirmar-remito`, {})
      .pipe(map(pedidoToModel));
  }

  facturarRemito(id: string): Observable<Pedido> {
    return this.http.post<PedidoDto>(`${this.base}/${id}/facturar`, {}).pipe(map(pedidoToModel));
  }

  listarClientesRef(): Observable<ClienteRef[]> {
    return this.http
      .get<PaginaItemsDto<ClienteRefDto>>(`${this.api}/clientes`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((pagina) => pagina.items.map(clienteRefToModel)));
  }

  listarProductosRef(): Observable<ProductoRef[]> {
    return this.http
      .get<PaginaItemsDto<ProductoRefDto>>(`${this.api}/productos`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((pagina) => pagina.items.map(productoRefToModel)));
  }

  listarDepositosRef(): Observable<DepositoRef[]> {
    return this.http
      .get<DepositoRefDto[]>(`${this.api}/stock/depositos`)
      .pipe(map((items) => items.map(depositoRefToModel)));
  }
}
