import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { armarImputacionesDesdeDeudas } from '../../../core/utils/imputacion-cobro';
import { environment } from '../../../../environments/environment';
import {
  ClienteRefDto,
  ComprobanteCxcDto,
  EstadoCuentaDto,
  ListaPrecioDto,
  PaginaItemsDto,
  PrecioArticuloDto,
  ReciboDto,
  SaldoClienteDto,
  ZonaRefDto,
} from './cxc.dto';
import {
  clienteRefToModel,
  comprobanteCxcToModel,
  crearReciboToDto,
  estadoCuentaToModel,
  listaPrecioToModel,
  reciboToModel,
  saldoToModel,
  zonaRefToModel,
} from './cxc.mapper';
import {
  ClienteRef,
  ComprobanteCxc,
  CrearRecibo,
  EstadoCuenta,
  ListaPrecioRef,
  Recibo,
  RegistrarCobro,
  SaldoCliente,
  ZonaRef,
} from './cxc.model';

@Injectable({ providedIn: 'root' })
export class CuentaCorrienteService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  listarSaldos(): Observable<SaldoCliente[]> {
    return this.http
      .get<SaldoClienteDto[]>(`${this.api}/cxc/saldos`)
      .pipe(map((items) => items.map(saldoToModel)));
  }

  estadoCuenta(clienteId: string): Observable<EstadoCuenta> {
    return this.http
      .get<EstadoCuentaDto>(`${this.api}/cxc/clientes/${clienteId}/estado-cuenta`)
      .pipe(map(estadoCuentaToModel));
  }

  crearRecibo(body: CrearRecibo): Observable<Recibo> {
    return this.http
      .post<ReciboDto>(`${this.api}/cobranzas/recibos`, crearReciboToDto(body))
      .pipe(map(reciboToModel));
  }

  /** Cobro a cuenta: imputa FIFO sobre movimientos debe (remito/factura). */
  registrarCobroACuenta(body: RegistrarCobro): Observable<Recibo> {
    return this.estadoCuenta(body.clienteId).pipe(
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
        const deudas = estado.movimientos
          .filter((m) => m.tipo === 'debe' && !!m.referenciaId)
          .map((m) => ({
            referenciaId: m.referenciaId,
            monto: m.monto,
            fecha: m.fecha,
          }));
        const imputaciones = armarImputacionesDesdeDeudas(deudas, monto);
        if (imputaciones.length === 0) {
          return throwError(
            () => new Error('No hay comprobantes pendientes para imputar el cobro'),
          );
        }
        return this.crearRecibo({
          clienteId: body.clienteId,
          monto,
          medio: body.medio,
          observacion: body.observacion,
          imputaciones,
        });
      }),
    );
  }

  listarClientesRef(): Observable<ClienteRef[]> {
    return this.http
      .get<PaginaItemsDto<ClienteRefDto>>(`${this.api}/clientes`, {
        params: new HttpParams().set('page_size', '200'),
      })
      .pipe(map((p) => p.items.map(clienteRefToModel)));
  }

  listarZonasRef(): Observable<ZonaRef[]> {
    return this.http
      .get<PaginaItemsDto<ZonaRefDto>>(`${this.api}/zonas`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((p) => p.items.map(zonaRefToModel)));
  }

  listarComprobantesCliente(
    clienteId: string,
    tipo: 'remito' | 'factura',
  ): Observable<ComprobanteCxc[]> {
    return this.http
      .get<ComprobanteCxcDto[]>(`${this.api}/ventas/pedidos`, {
        params: new HttpParams().set('tipo', tipo).set('cliente_id', clienteId),
      })
      .pipe(map((items) => items.map(comprobanteCxcToModel)));
  }

  listarRemitosYFacturasCliente(clienteId: string): Observable<{
    remitos: ComprobanteCxc[];
    facturas: ComprobanteCxc[];
  }> {
    return forkJoin({
      remitos: this.listarComprobantesCliente(clienteId, 'remito'),
      facturas: this.listarComprobantesCliente(clienteId, 'factura'),
    });
  }

  /** Carga la lista default y un mapa articulo_id → precio vigente. */
  cargarMapaPreciosListaDefault(): Observable<{
    lista: ListaPrecioRef | null;
    precios: Map<string, number>;
  }> {
    return this.http.get<ListaPrecioDto[]>(`${this.api}/precios/listas`).pipe(
      switchMap((listas) => {
        const activas = listas.map(listaPrecioToModel).filter((l) => l.activo);
        const lista = activas.find((l) => l.esDefault) ?? activas[0] ?? null;
        if (!lista) {
          return of({ lista: null, precios: new Map<string, number>() });
        }
        return this.http
          .get<PrecioArticuloDto[]>(`${this.api}/precios/listas/${lista.id}/articulos`)
          .pipe(
            map((arts) => {
              const precios = new Map<string, number>();
              for (const a of arts) {
                precios.set(a.articulo_id, a.precio);
              }
              return { lista, precios };
            }),
          );
      }),
    );
  }
}
