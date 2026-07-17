import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ClienteRefDto,
  EstadoCuentaDto,
  FacturaRefDto,
  PaginaItemsDto,
  ReciboDto,
  SaldoClienteDto,
} from './cxc.dto';
import {
  clienteRefToModel,
  crearReciboToDto,
  estadoCuentaToModel,
  facturaRefToModel,
  reciboToModel,
  saldoToModel,
} from './cxc.mapper';
import {
  ClienteRef,
  CrearRecibo,
  EstadoCuenta,
  FacturaRef,
  Recibo,
  SaldoCliente,
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

  listarClientesRef(): Observable<ClienteRef[]> {
    return this.http
      .get<PaginaItemsDto<ClienteRefDto>>(`${this.api}/clientes`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((p) => p.items.map(clienteRefToModel)));
  }

  listarFacturasCliente(clienteId: string): Observable<FacturaRef[]> {
    return this.http
      .get<FacturaRefDto[]>(`${this.api}/ventas/pedidos`, {
        params: new HttpParams().set('tipo', 'factura'),
      })
      .pipe(
        map((items) =>
          items
            .filter((f) => f.cliente_id === clienteId && f.estado === 'confirmado')
            .map(facturaRefToModel),
        ),
      );
  }
}
