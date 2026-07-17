import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductoDto, ProductosPaginaDto } from './producto.dto';
import {
  actualizarProductoToDto,
  crearProductoToDto,
  productoToModel,
  productosPaginaToModel,
} from './producto.mapper';
import {
  ActualizarProducto,
  CrearProducto,
  FiltroActivo,
  Producto,
  ProductosPagina,
} from './producto.model';

export interface PedidoProductoResumen {
  id: string;
  fecha: string;
  cliente: string;
  estadoLabel: string;
  cantidad: number;
}

export interface ListarProductosParams {
  q?: string;
  filtro?: FiltroActivo;
  page?: number;
  pageSize?: number;
}

interface PedidoApiDto {
  id: string;
  cliente_id: string;
  estado: string;
  fecha: string;
  lineas: { id: string; producto_id: string; cantidad: number }[];
}

/** Shape mínimo del listado paginado de clientes (sin importar el feature). */
interface ClientesPaginaApiDto {
  items: { id: string; nombre: string }[];
}

const ETIQUETAS: Record<string, string> = {
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/productos`;
  private readonly api = environment.apiBaseUrl;

  listar(params: ListarProductosParams = {}): Observable<ProductosPagina> {
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
      .get<ProductosPaginaDto>(this.base, { params: httpParams })
      .pipe(map(productosPaginaToModel));
  }

  obtener(id: string): Observable<Producto> {
    return this.http.get<ProductoDto>(`${this.base}/${id}`).pipe(map(productoToModel));
  }

  crear(body: CrearProducto): Observable<Producto> {
    return this.http
      .post<ProductoDto>(this.base, crearProductoToDto(body))
      .pipe(map(productoToModel));
  }

  actualizar(id: string, body: ActualizarProducto): Observable<Producto> {
    return this.http
      .put<ProductoDto>(`${this.base}/${id}`, actualizarProductoToDto(body))
      .pipe(map(productoToModel));
  }

  /** Pedidos que incluyen el artículo (HTTP propio del feature). */
  listarPedidosDelProducto(productoId: string): Observable<PedidoProductoResumen[]> {
    return forkJoin({
      pedidos: this.http.get<PedidoApiDto[]>(`${this.api}/ventas/pedidos`),
      clientes: this.http.get<ClientesPaginaApiDto>(`${this.api}/clientes`, {
        params: new HttpParams().set('page_size', '200'),
      }),
    }).pipe(
      map(({ pedidos, clientes }) => {
        const nombres = new Map(clientes.items.map((c) => [c.id, c.nombre]));
        return pedidos.flatMap((p) =>
          p.lineas
            .filter((l) => l.producto_id === productoId)
            .map((l) => ({
              id: `${p.id}-${l.id}`,
              fecha: p.fecha,
              cliente: nombres.get(p.cliente_id) ?? p.cliente_id,
              estadoLabel: ETIQUETAS[p.estado] ?? p.estado,
              cantidad: l.cantidad,
            })),
        );
      }),
    );
  }
}
