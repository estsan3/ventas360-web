import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UsuarioDto } from './usuario.dto';
import { nuevoUsuarioToDto, usuarioToModel } from './usuario.mapper';
import { NuevoUsuario, Usuario } from './usuario.model';

export type TipoCatalogo = 'productores' | 'choferes' | 'vendedores' | 'materiales';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  // --- Usuarios ---
  getUsuarios(): Observable<Usuario[]> {
    return this.http
      .get<UsuarioDto[]>(`${this.base}/usuarios`)
      .pipe(map((items) => items.map(usuarioToModel)));
  }

  crearUsuario(usuario: NuevoUsuario): Observable<Usuario> {
    return this.http
      .post<UsuarioDto>(`${this.base}/usuarios`, nuevoUsuarioToDto(usuario))
      .pipe(map(usuarioToModel));
  }

  darDeBaja(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/usuarios/${id}`);
  }

  // --- Catálogos maestros ---
  agregarCatalogo(tipo: TipoCatalogo, body: Record<string, string>): Observable<unknown> {
    return this.http.post(`${this.base}/catalogos/${tipo}`, body);
  }

  agregarCampo(productorId: string, nombre: string): Observable<unknown> {
    return this.http.post(`${this.base}/catalogos/productores/${productorId}/campos`, { nombre });
  }

  eliminarCatalogo(tipo: TipoCatalogo, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalogos/${tipo}/${encodeURIComponent(id)}`);
  }

  crearTransportista(body: { nombre: string; cuit?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/catalogos/transportistas`, body);
  }

  agregarCamion(
    transportistaId: string,
    body: { dominio: string; modelo?: string },
  ): Observable<unknown> {
    return this.http.post(
      `${this.base}/catalogos/transportistas/${transportistaId}/camiones`,
      body,
    );
  }

  crearChoferEnTransportista(
    transportistaId: string,
    body: { nombre: string },
  ): Observable<unknown> {
    return this.http.post(
      `${this.base}/catalogos/transportistas/${transportistaId}/choferes`,
      body,
    );
  }

  eliminarTransportista(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalogos/transportistas/${id}`);
  }

  eliminarCamion(transportistaId: string, camionId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/catalogos/transportistas/${transportistaId}/camiones/${camionId}`,
    );
  }
}
