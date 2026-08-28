import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CuentaBancariaDto {
  id: string;
  codigo: string;
  nombre: string;
  banco: string;
  cbu: string;
  es_default: boolean;
  activo: boolean;
  saldo: number;
}

export interface MovimientoBancarioDto {
  id: string;
  cuenta_id: string;
  fecha: string;
  tipo: 'credito' | 'debito';
  monto: number;
  concepto: string;
}

export type TipoValor = 'cheque_tercero' | 'cheque_propio';
export type EstadoValor = 'en_cartera' | 'depositado' | 'cobrado' | 'rechazado' | 'entregado';

export interface ValorBancarioDto {
  id: string;
  tipo: TipoValor;
  estado: EstadoValor | string;
  monto: number;
  fecha: string;
  fecha_vto: string | null;
  numero: string;
  librador: string;
  banco_emisor: string;
  recibido_de: string;
  entregado_a: string;
  fecha_entrega: string | null;
  origen: string;
  origen_id: string;
  cuenta_destino_id: string | null;
  observacion: string;
}

@Injectable({ providedIn: 'root' })
export class BancosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/bancos`;

  cuentas(): Observable<CuentaBancariaDto[]> {
    return this.http.get<CuentaBancariaDto[]>(`${this.base}/cuentas`);
  }

  movimientos(cuentaId?: string): Observable<MovimientoBancarioDto[]> {
    let params = new HttpParams();
    if (cuentaId) {
      params = params.set('cuenta_id', cuentaId);
    }
    return this.http.get<MovimientoBancarioDto[]>(`${this.base}/movimientos`, { params });
  }

  valores(
    opts: { estado?: string; tipo?: string; q?: string } = {},
  ): Observable<ValorBancarioDto[]> {
    let params = new HttpParams();
    if (opts.estado) {
      params = params.set('estado', opts.estado);
    }
    if (opts.tipo) {
      params = params.set('tipo', opts.tipo);
    }
    if (opts.q?.trim()) {
      params = params.set('q', opts.q.trim());
    }
    return this.http.get<ValorBancarioDto[]>(`${this.base}/valores`, { params });
  }

  crearValor(body: {
    tipo: TipoValor;
    monto: number;
    numero?: string;
    librador?: string;
    banco_emisor?: string;
    recibido_de?: string;
    fecha?: string | null;
    fecha_vto?: string | null;
    observacion?: string;
  }): Observable<ValorBancarioDto> {
    return this.http.post<ValorBancarioDto>(`${this.base}/valores`, body);
  }

  depositar(valorId: string, cuentaId?: string): Observable<ValorBancarioDto> {
    return this.http.post<ValorBancarioDto>(`${this.base}/valores/${valorId}/depositar`, {
      cuenta_id: cuentaId ?? null,
    });
  }

  entregar(
    valorId: string,
    destinatario: string,
    fecha?: string | null,
  ): Observable<ValorBancarioDto> {
    return this.http.post<ValorBancarioDto>(`${this.base}/valores/${valorId}/entregar`, {
      destinatario,
      fecha: fecha ?? null,
    });
  }
}
