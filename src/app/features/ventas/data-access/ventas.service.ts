import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { armarImputacionesDesdeDeudas } from '../../../core/utils/imputacion-cobro';
import { environment } from '../../../../environments/environment';
import {
  ClienteRefDto,
  DepositoRefDto,
  EstadoCuentaDto,
  PaginaItemsDto,
  PedidoDto,
  ProductoRefDto,
  ReciboDto,
  SaldoClienteDto,
  UsuarioRefDto,
  ZonaRefDto,
} from './pedido.dto';
import {
  clienteRefToModel,
  crearPedidoToDto,
  depositoRefToModel,
  pedidoToModel,
  productoRefToModel,
  saldoClienteToModel,
  usuarioRefToModel,
  zonaRefToModel,
} from './pedido.mapper';
import {
  ClienteRef,
  CrearPedido,
  DepositoRef,
  EstadoPedido,
  Pedido,
  ProductoRef,
  ReciboRef,
  RegistrarCobro,
  SaldoClienteRef,
  UsuarioRef,
  ZonaRef,
} from './pedido.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/ventas/pedidos`;
  private readonly api = environment.apiBaseUrl;

  listar(tipo?: string): Observable<Pedido[]> {
    let params = new HttpParams();
    if (tipo?.trim()) {
      params = params.set('tipo', tipo.trim());
    }
    return this.http
      .get<PedidoDto[]>(this.base, { params })
      .pipe(map((items) => items.map(pedidoToModel)));
  }

  obtener(id: string): Observable<Pedido> {
    return this.http.get<PedidoDto>(`${this.base}/${id}`).pipe(map(pedidoToModel));
  }

  crear(body: CrearPedido): Observable<Pedido> {
    return this.http.post<PedidoDto>(this.base, crearPedidoToDto(body)).pipe(map(pedidoToModel));
  }

  cambiarEstado(id: string, estado: EstadoPedido): Observable<Pedido> {
    return this.http
      .patch<PedidoDto>(`${this.base}/${id}/estado`, { estado })
      .pipe(map(pedidoToModel));
  }

  confirmarRemito(id: string): Observable<Pedido> {
    return this.http
      .post<PedidoDto>(`${this.base}/${id}/confirmar-remito`, {})
      .pipe(map(pedidoToModel));
  }

  facturarRemito(id: string): Observable<Pedido> {
    return this.http.post<PedidoDto>(`${this.base}/${id}/facturar`, {}).pipe(map(pedidoToModel));
  }

  listarClientesRef(): Observable<ClienteRef[]> {
    return this.buscarClientes('', { activo: true, pageSize: 200 });
  }

  /** Búsqueda de clientes (nombre, email, teléfono, CUIT). */
  buscarClientes(
    q: string,
    opts: { activo?: boolean | null; pageSize?: number; page?: number } = {},
  ): Observable<ClienteRef[]> {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 1))
      .set('page_size', String(opts.pageSize ?? 50));
    const qTrim = q.trim();
    if (qTrim) {
      params = params.set('q', qTrim);
    }
    if (opts.activo !== undefined && opts.activo !== null) {
      params = params.set('activo', String(opts.activo));
    }
    return this.http
      .get<PaginaItemsDto<ClienteRefDto>>(`${this.api}/clientes`, { params })
      .pipe(map((pagina) => pagina.items.map(clienteRefToModel)));
  }

  obtenerSaldoCliente(clienteId: string): Observable<SaldoClienteRef> {
    return this.http
      .get<SaldoClienteDto>(`${this.api}/cxc/clientes/${clienteId}/saldo`)
      .pipe(map(saldoClienteToModel));
  }

  /** Cobro a cuenta corriente (imputación FIFO a remitos/facturas). */
  registrarCobroACuenta(body: RegistrarCobro): Observable<ReciboRef> {
    return this.http
      .get<EstadoCuentaDto>(`${this.api}/cxc/clientes/${body.clienteId}/estado-cuenta`)
      .pipe(
        switchMap((estado) => {
          const saldoDeudor = Math.max(0, Math.round(estado.saldo * 100) / 100);
          if (saldoDeudor <= 0) {
            return throwError(() => new Error('El cliente no tiene saldo deudor'));
          }
          const montoPedido = Math.round(body.monto * 100) / 100;
          if (montoPedido <= 0) {
            return throwError(() => new Error('El monto del cobro debe ser mayor a cero'));
          }
          const monto = Math.min(montoPedido, saldoDeudor);
          const deudas = (estado.movimientos ?? [])
            .filter((m) => m.tipo === 'debe' && !!m.referencia_id)
            .map((m) => ({
              referenciaId: m.referencia_id,
              monto: m.monto,
              fecha: m.fecha,
            }));
          const imputaciones = armarImputacionesDesdeDeudas(deudas, monto);
          if (imputaciones.length === 0) {
            return throwError(
              () => new Error('No hay comprobantes pendientes para imputar el cobro'),
            );
          }
          return this.http
            .post<ReciboDto>(`${this.api}/cobranzas/recibos`, {
              cliente_id: body.clienteId,
              monto,
              medio: body.medio,
              observacion: body.observacion ?? '',
              imputaciones: imputaciones.map((i) => ({
                factura_id: i.facturaId,
                monto: i.monto,
              })),
            })
            .pipe(
              map((r): ReciboRef => ({
                id: r.id,
                clienteId: r.cliente_id,
                fecha: r.fecha,
                monto: r.monto,
                medio: r.medio,
                observacion: r.observacion,
              })),
            );
        }),
      );
  }

  listarZonasRef(): Observable<ZonaRef[]> {
    return this.http
      .get<PaginaItemsDto<ZonaRefDto>>(`${this.api}/zonas`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((pagina) => pagina.items.map(zonaRefToModel)));
  }

  listarUsuariosRef(): Observable<UsuarioRef[]> {
    return this.http
      .get<UsuarioRefDto[]>(`${this.api}/usuarios`)
      .pipe(map((items) => items.map(usuarioRefToModel)));
  }

  listarProductosRef(): Observable<ProductoRef[]> {
    return this.http
      .get<PaginaItemsDto<ProductoRefDto>>(`${this.api}/productos`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((pagina) => pagina.items.map(productoRefToModel)));
  }

  listarDepositosRef(): Observable<DepositoRef[]> {
    return this.http
      .get<DepositoRefDto[]>(`${this.api}/stock/depositos`)
      .pipe(map((items) => items.map(depositoRefToModel)));
  }
}
