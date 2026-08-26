import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TenantCreadoDto, TenantDetalleDto, TenantDto, TenantUsuarioDto } from './comercio.dto';
import {
  comercioCreadoToModel,
  comercioDetalleToModel,
  comercioToModel,
  nuevoComercioToDto,
  usuarioComercioToModel,
} from './comercio.mapper';
import {
  Comercio,
  ComercioCreado,
  ComercioDetalle,
  NuevoComercio,
  UsuarioComercio,
} from './comercio.model';

@Injectable({ providedIn: 'root' })
export class ComerciosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/tenants`;

  listar(): Observable<Comercio[]> {
    return this.http.get<TenantDto[]>(this.base).pipe(map((items) => items.map(comercioToModel)));
  }

  obtener(id: string): Observable<ComercioDetalle> {
    return this.http.get<TenantDetalleDto>(`${this.base}/${id}`).pipe(map(comercioDetalleToModel));
  }

  crear(datos: NuevoComercio): Observable<ComercioCreado> {
    return this.http
      .post<TenantCreadoDto>(this.base, nuevoComercioToDto(datos))
      .pipe(map(comercioCreadoToModel));
  }

  actualizar(id: string, datos: { nombre?: string; activo?: boolean }): Observable<Comercio> {
    return this.http.patch<TenantDto>(`${this.base}/${id}`, datos).pipe(map(comercioToModel));
  }

  cambiarPassword(
    tenantId: string,
    usuarioId: string,
    password: string,
  ): Observable<UsuarioComercio> {
    return this.http
      .patch<TenantUsuarioDto>(`${this.base}/${tenantId}/usuarios/${usuarioId}/password`, {
        password,
      })
      .pipe(map(usuarioComercioToModel));
  }
}
