import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface InventarioItem {
  articuloId: string;
  sku: string;
  nombre: string;
  depositoId: string;
  cantidad: number;
  costo: number;
  precio: number;
}

interface InventarioItemDto {
  articulo_id: string;
  sku: string;
  nombre: string;
  deposito_id: string;
  cantidad: number;
  costo: number;
  precio: number;
}

interface CompraDto {
  id: string;
  tipo: string;
  proveedor_id: string;
  estado: string;
  total: number;
  numero: string | null;
  fecha: string;
  lineas: unknown[];
}

interface ProveedorPaginaDto {
  items: { id: string; nombre: string }[];
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listarInventario(depositoId: string): Observable<InventarioItem[]> {
    return this.http
      .get<InventarioItemDto[]>(`${this.api}/stock/depositos/${depositoId}/inventario`)
      .pipe(
        map((items) =>
          items.map((i) => ({
            articuloId: i.articulo_id,
            sku: i.sku,
            nombre: i.nombre,
            depositoId: i.deposito_id,
            cantidad: i.cantidad,
            costo: i.costo,
            precio: i.precio,
          })),
        ),
      );
  }

  listarRemitosCompra(): Observable<
    {
      id: string;
      comprobante: string;
      fecha: string;
      proveedorId: string;
      estado: string;
      renglones: number;
      total: number;
    }[]
  > {
    return this.http
      .get<CompraDto[]>(`${this.api}/compras`, { params: { tipo: 'remito_compra' } })
      .pipe(
        map((items) =>
          items.map((c) => ({
            id: c.id,
            comprobante:
              c.numero?.trim() || `REM ${c.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
            fecha: c.fecha,
            proveedorId: c.proveedor_id,
            estado: c.estado,
            renglones: c.lineas?.length ?? 0,
            total: c.total,
          })),
        ),
      );
  }

  confirmarCompra(id: string): Observable<unknown> {
    return this.http.post(`${this.api}/compras/${id}/confirmar`, {});
  }

  mapProveedores(): Observable<Record<string, string>> {
    return this.http
      .get<ProveedorPaginaDto>(`${this.api}/proveedores`, {
        params: { page_size: '200', activo: 'true' },
      })
      .pipe(map((p) => Object.fromEntries(p.items.map((i) => [i.id, i.nombre]))));
  }
}
