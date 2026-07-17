import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ParametrosNegocioDto, ParametrosOperativosDto, TalonarioDto } from './parametros.dto';
import {
  negocioToDto,
  negocioToModel,
  operativosToDto,
  operativosToModel,
  talonarioToModel,
  talonarioToUpsertDto,
} from './parametros.mapper';
import { ParametrosNegocio, ParametrosOperativos, Talonario } from './parametros.model';
import { UsuarioDto } from './usuario.dto';
import { nuevoUsuarioToDto, usuarioToModel } from './usuario.mapper';
import { NuevoUsuario, Usuario } from './usuario.model';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

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

  obtenerNegocio(): Observable<ParametrosNegocio> {
    return this.http.get<ParametrosNegocioDto>(`${this.base}/parametros`).pipe(map(negocioToModel));
  }

  guardarNegocio(datos: ParametrosNegocio): Observable<ParametrosNegocio> {
    return this.http
      .put<ParametrosNegocioDto>(`${this.base}/parametros`, negocioToDto(datos))
      .pipe(map(negocioToModel));
  }

  obtenerOperativos(): Observable<ParametrosOperativos> {
    return this.http
      .get<ParametrosOperativosDto>(`${this.base}/parametros/operativos`)
      .pipe(map(operativosToModel));
  }

  guardarOperativos(datos: ParametrosOperativos): Observable<ParametrosOperativos> {
    return this.http
      .put<ParametrosOperativosDto>(`${this.base}/parametros/operativos`, operativosToDto(datos))
      .pipe(map(operativosToModel));
  }

  listarTalonarios(): Observable<Talonario[]> {
    return this.http
      .get<TalonarioDto[]>(`${this.base}/parametros/talonarios`)
      .pipe(map((items) => items.map(talonarioToModel)));
  }

  guardarTalonario(datos: Talonario): Observable<Talonario> {
    return this.http
      .put<TalonarioDto>(`${this.base}/parametros/talonarios`, talonarioToUpsertDto(datos))
      .pipe(map(talonarioToModel));
  }
}
