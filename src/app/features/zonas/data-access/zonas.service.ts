import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ZonaDto, ZonasPaginaDto } from './zona.dto';
import {
  actualizarZonaToDto,
  crearZonaToDto,
  zonaToModel,
  zonasPaginaToModel,
} from './zona.mapper';
import { ActualizarZona, CrearZona, FiltroActivoZona, Zona, ZonasPagina } from './zona.model';

export interface ListarZonasParams {
  q?: string;
  filtro?: FiltroActivoZona;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ZonasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/zonas`;

  listar(params: ListarZonasParams = {}): Observable<ZonasPagina> {
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
      .get<ZonasPaginaDto>(this.base, { params: httpParams })
      .pipe(map(zonasPaginaToModel));
  }

  crear(body: CrearZona): Observable<Zona> {
    return this.http.post<ZonaDto>(this.base, crearZonaToDto(body)).pipe(map(zonaToModel));
  }

  actualizar(id: string, body: ActualizarZona): Observable<Zona> {
    return this.http
      .put<ZonaDto>(`${this.base}/${id}`, actualizarZonaToDto(body))
      .pipe(map(zonaToModel));
  }

  desactivar(id: string): Observable<Zona> {
    return this.http.patch<ZonaDto>(`${this.base}/${id}/desactivar`, {}).pipe(map(zonaToModel));
  }
}
