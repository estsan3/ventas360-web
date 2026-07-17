import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CrearPedido, EstadoPedido, Pedido } from './pedido.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/ventas/pedidos`;

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.base);
  }

  obtener(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.base}/${id}`);
  }

  crear(body: CrearPedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.base, body);
  }

  cambiarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}/estado`, { estado });
  }
}
