import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ActualizarProducto, CrearProducto, Producto } from './producto.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/productos`;

  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.base);
  }

  obtener(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  crear(body: CrearProducto): Observable<Producto> {
    return this.http.post<Producto>(this.base, body);
  }

  actualizar(id: string, body: ActualizarProducto): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/${id}`, body);
  }
}
