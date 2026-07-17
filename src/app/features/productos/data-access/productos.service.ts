import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { actualizarProductoToDto, crearProductoToDto, productoToModel } from './producto.mapper';
import { ActualizarProducto, CrearProducto, Producto } from './producto.model';
import { ProductoDto } from './producto.dto';

export interface PedidoProductoResumen {
  id: string;
  fecha: string;
  cliente: string;
  estadoLabel: string;
  cantidad: number;
}

interface PedidoApiDto {
  id: string;
  cliente_id: string;
  estado: string;
  fecha: string;
  lineas: { id: string; producto_id: string; cantidad: number }[];
}

interface ClienteApiDto {
  id: string;
  nombre: string;
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

  listar(): Observable<Producto[]> {
    return this.http.get<ProductoDto[]>(this.base).pipe(map((items) => items.map(productoToModel)));
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
      clientes: this.http.get<ClienteApiDto[]>(`${this.api}/clientes`),
    }).pipe(
      map(({ pedidos, clientes }) => {
        const nombres = new Map(clientes.map((c) => [c.id, c.nombre]));
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
