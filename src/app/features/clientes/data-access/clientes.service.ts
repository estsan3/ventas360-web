import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarCliente, Cliente, CrearCliente } from './cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/clientes`;

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.base);
  }

  obtener(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}/${id}`);
  }

  crear(body: CrearCliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.base, body);
  }

  actualizar(id: string, body: ActualizarCliente): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/${id}`, body);
  }

  desactivar(id: string): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.base}/${id}/desactivar`, {});
  }
}
