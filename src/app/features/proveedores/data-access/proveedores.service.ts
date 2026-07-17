import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CrearProveedorDto, ProveedorDto, ProveedoresPaginaDto } from './proveedor.dto';
import {
  actualizarProveedorToDto,
  crearProveedorToDto,
  proveedorToModel,
} from './proveedor.mapper';
import { ActualizarProveedor, CrearProveedor, Proveedor } from './proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/proveedores`;

  listar(opts: { q?: string; page?: number } = {}): Observable<{
    items: Proveedor[];
    total: number;
  }> {
    let params = new HttpParams().set('page', String(opts.page ?? 1)).set('page_size', '50');
    if (opts.q) {
      params = params.set('q', opts.q);
    }
    return this.http.get<ProveedoresPaginaDto>(this.base, { params }).pipe(
      map((p) => ({
        items: p.items.map(proveedorToModel),
        total: p.total,
      })),
    );
  }

  crear(body: CrearProveedor): Observable<Proveedor> {
    return this.http
      .post<ProveedorDto>(this.base, crearProveedorToDto(body) as CrearProveedorDto)
      .pipe(map(proveedorToModel));
  }

  actualizar(id: string, body: ActualizarProveedor): Observable<Proveedor> {
    return this.http
      .put<ProveedorDto>(`${this.base}/${id}`, actualizarProveedorToDto(body))
      .pipe(map(proveedorToModel));
  }

  desactivar(id: string): Observable<Proveedor> {
    return this.http
      .patch<ProveedorDto>(`${this.base}/${id}/desactivar`, {})
      .pipe(map(proveedorToModel));
  }
}
