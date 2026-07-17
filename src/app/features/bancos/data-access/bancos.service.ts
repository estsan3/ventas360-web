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

export interface ValorBancarioDto {
  id: string;
  tipo: 'cheque_tercero' | 'cheque_propio';
  estado: string;
  monto: number;
  fecha: string;
  fecha_vto: string | null;
  numero: string;
  librador: string;
  banco_emisor: string;
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

  valores(estado?: string): Observable<ValorBancarioDto[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<ValorBancarioDto[]>(`${this.base}/valores`, { params });
  }

  crearValor(body: {
    tipo: 'cheque_tercero' | 'cheque_propio';
    monto: number;
    numero?: string;
    librador?: string;
    banco_emisor?: string;
    observacion?: string;
  }): Observable<ValorBancarioDto> {
    return this.http.post<ValorBancarioDto>(`${this.base}/valores`, body);
  }

  depositar(valorId: string, cuentaId?: string): Observable<ValorBancarioDto> {
    return this.http.post<ValorBancarioDto>(`${this.base}/valores/${valorId}/depositar`, {
      cuenta_id: cuentaId ?? null,
    });
  }
}
