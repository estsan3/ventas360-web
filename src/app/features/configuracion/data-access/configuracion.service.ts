import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DepositoCatalogo, ListaPrecioCatalogo, VendedorCatalogo } from './catalogos.models';
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

interface DepositoDto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface ListaPrecioDto {
  id: string;
  codigo: string;
  nombre: string;
  es_default: boolean;
  activo: boolean;
}

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

  listarVendedores(): Observable<VendedorCatalogo[]> {
    return this.http.get<UsuarioDto[]>(`${this.base}/catalogos/vendedores`).pipe(
      map((items) =>
        items.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: u.rol,
        })),
      ),
    );
  }

  crearVendedor(nombre: string): Observable<VendedorCatalogo> {
    return this.http.post<UsuarioDto>(`${this.base}/catalogos/vendedores`, { nombre }).pipe(
      map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
      })),
    );
  }

  eliminarVendedor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalogos/vendedores/${id}`);
  }

  listarDepositos(): Observable<DepositoCatalogo[]> {
    return this.http.get<DepositoDto[]>(`${this.base}/stock/depositos`).pipe(
      map((items) =>
        items.map((d) => ({
          id: d.id,
          codigo: d.codigo,
          nombre: d.nombre,
          activo: d.activo,
        })),
      ),
    );
  }

  crearDeposito(body: { codigo: string; nombre: string }): Observable<DepositoCatalogo> {
    return this.http.post<DepositoDto>(`${this.base}/stock/depositos`, body).pipe(
      map((d) => ({
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        activo: d.activo,
      })),
    );
  }

  actualizarDeposito(id: string, body: { nombre: string }): Observable<DepositoCatalogo> {
    return this.http.put<DepositoDto>(`${this.base}/stock/depositos/${id}`, body).pipe(
      map((d) => ({
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        activo: d.activo,
      })),
    );
  }

  desactivarDeposito(id: string): Observable<DepositoCatalogo> {
    return this.http.patch<DepositoDto>(`${this.base}/stock/depositos/${id}/desactivar`, {}).pipe(
      map((d) => ({
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        activo: d.activo,
      })),
    );
  }

  listarListasPrecio(): Observable<ListaPrecioCatalogo[]> {
    return this.http.get<ListaPrecioDto[]>(`${this.base}/precios/listas`).pipe(
      map((items) =>
        items.map((l) => ({
          id: l.id,
          codigo: l.codigo,
          nombre: l.nombre,
          esDefault: l.es_default,
          activo: l.activo,
        })),
      ),
    );
  }

  crearListaPrecio(body: {
    codigo: string;
    nombre: string;
    esDefault?: boolean;
  }): Observable<ListaPrecioCatalogo> {
    return this.http
      .post<ListaPrecioDto>(`${this.base}/precios/listas`, {
        codigo: body.codigo,
        nombre: body.nombre,
        es_default: body.esDefault ?? false,
      })
      .pipe(
        map((l) => ({
          id: l.id,
          codigo: l.codigo,
          nombre: l.nombre,
          esDefault: l.es_default,
          activo: l.activo,
        })),
      );
  }

  actualizarListaPrecio(
    id: string,
    body: { nombre?: string; esDefault?: boolean },
  ): Observable<ListaPrecioCatalogo> {
    return this.http
      .put<ListaPrecioDto>(`${this.base}/precios/listas/${id}`, {
        nombre: body.nombre,
        es_default: body.esDefault,
      })
      .pipe(
        map((l) => ({
          id: l.id,
          codigo: l.codigo,
          nombre: l.nombre,
          esDefault: l.es_default,
          activo: l.activo,
        })),
      );
  }

  desactivarListaPrecio(id: string): Observable<ListaPrecioCatalogo> {
    return this.http.patch<ListaPrecioDto>(`${this.base}/precios/listas/${id}/desactivar`, {}).pipe(
      map((l) => ({
        id: l.id,
        codigo: l.codigo,
        nombre: l.nombre,
        esDefault: l.es_default,
        activo: l.activo,
      })),
    );
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
