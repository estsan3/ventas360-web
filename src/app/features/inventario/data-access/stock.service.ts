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
  marca: string;
  rubro: string;
  codigoBarras: string;
}

export interface LineaRemitoCompra {
  id: string;
  productoId: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface RemitoCompraItem {
  id: string;
  comprobante: string;
  fecha: string;
  proveedorId: string;
  estado: string;
  renglones: number;
  total: number;
  lineas: LineaRemitoCompra[];
}

interface InventarioItemDto {
  articulo_id: string;
  sku: string;
  nombre: string;
  deposito_id: string;
  cantidad: number;
  costo: number;
  precio: number;
  marca?: string;
  rubro?: string;
  codigo_barras?: string;
}

interface LineaCompraDto {
  id: string;
  producto_id: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
}

interface CompraDto {
  id: string;
  tipo: string;
  proveedor_id: string;
  estado: string;
  total: number;
  numero: string | null;
  fecha: string;
  lineas: LineaCompraDto[];
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
            marca: i.marca ?? '',
            rubro: i.rubro ?? '',
            codigoBarras: i.codigo_barras ?? '',
          })),
        ),
      );
  }

  listarRemitosCompra(): Observable<RemitoCompraItem[]> {
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
            lineas: (c.lineas ?? []).map((l) => ({
              id: l.id,
              productoId: l.producto_id,
              descripcion: l.descripcion ?? '',
              cantidad: l.cantidad,
              precioUnitario: l.precio_unitario,
            })),
          })),
        ),
      );
  }

  confirmarCompra(id: string): Observable<unknown> {
    return this.http.post(`${this.api}/compras/${id}/confirmar`, {});
  }

  cerrarToma(
    depositoId: string,
    conteos: { articuloId: string; cantidad: number }[],
  ): Observable<{ ajustados: number; sinCambio: number }> {
    return this.http
      .post<{ ajustados: number; sin_cambio: number }>(`${this.api}/stock/tomas`, {
        deposito_id: depositoId,
        conteos: conteos.map((c) => ({
          articulo_id: c.articuloId,
          cantidad: c.cantidad,
        })),
      })
      .pipe(map((r) => ({ ajustados: r.ajustados, sinCambio: r.sin_cambio })));
  }

  mapProveedores(): Observable<Record<string, string>> {
    return this.http
      .get<ProveedorPaginaDto>(`${this.api}/proveedores`, {
        params: { page_size: '200', activo: 'true' },
      })
      .pipe(map((p) => Object.fromEntries(p.items.map((i) => [i.id, i.nombre]))));
  }
}
