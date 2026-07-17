import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CompraDto } from './compra.dto';
import { compraToModel, crearCompraToDto } from './compra.mapper';
import { Compra, CrearCompra } from './compra.model';

interface PaginaRef {
  items: { id: string; nombre: string; precio?: number }[];
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/compras`;
  private readonly api = environment.apiBaseUrl;

  listar(): Observable<Compra[]> {
    return this.http.get<CompraDto[]>(this.base).pipe(map((items) => items.map(compraToModel)));
  }

  crear(body: CrearCompra): Observable<Compra> {
    return this.http.post<CompraDto>(this.base, crearCompraToDto(body)).pipe(map(compraToModel));
  }

  confirmar(id: string): Observable<Compra> {
    return this.http.post<CompraDto>(`${this.base}/${id}/confirmar`, {}).pipe(map(compraToModel));
  }

  facturar(id: string): Observable<Compra> {
    return this.http.post<CompraDto>(`${this.base}/${id}/facturar`, {}).pipe(map(compraToModel));
  }

  listarProveedoresRef(): Observable<{ id: string; nombre: string }[]> {
    return this.http
      .get<PaginaRef>(`${this.api}/proveedores`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((p) => p.items.map((i) => ({ id: i.id, nombre: i.nombre }))));
  }

  listarProductosRef(): Observable<{ id: string; nombre: string; precio: number }[]> {
    return this.http
      .get<PaginaRef>(`${this.api}/productos`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(
        map((p) => p.items.map((i) => ({ id: i.id, nombre: i.nombre, precio: i.precio ?? 0 }))),
      );
  }

  listarDepositosRef(): Observable<{ id: string; nombre: string }[]> {
    return this.http
      .get<{ id: string; nombre: string; codigo: string }[]>(`${this.api}/stock/depositos`)
      .pipe(map((items) => items.map((d) => ({ id: d.id, nombre: `${d.codigo} · ${d.nombre}` }))));
  }
}
