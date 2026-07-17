import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClienteRefDto, PedidoDto, ProductoRefDto } from './pedido.dto';
import {
  clienteRefToModel,
  crearPedidoToDto,
  pedidoToModel,
  productoRefToModel,
} from './pedido.mapper';
import { ClienteRef, CrearPedido, EstadoPedido, Pedido, ProductoRef } from './pedido.model';

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

  /** Lookups para formularios de este feature (sin importar otros features). */
  listarClientesRef(): Observable<ClienteRef[]> {
    return this.http
      .get<ClienteRefDto[]>(`${this.api}/clientes`)
      .pipe(map((items) => items.map(clienteRefToModel)));
  }

  listarProductosRef(): Observable<ProductoRef[]> {
    return this.http
      .get<ProductoRefDto[]>(`${this.api}/productos`)
      .pipe(map((items) => items.map(productoRefToModel)));
  }
}
