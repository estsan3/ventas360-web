import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MovimientoCajaDto {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  medio: 'efectivo' | 'tarjeta' | 'otro';
  monto: number;
  concepto: string;
  referencia_tipo: string;
  referencia_id: string;
}

export interface SaldoCajaDto {
  fecha: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/caja`;

  movimientos(fecha?: string): Observable<MovimientoCajaDto[]> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<MovimientoCajaDto[]>(`${this.base}/movimientos`, { params });
  }

  saldo(fecha?: string): Observable<SaldoCajaDto> {
    let params = new HttpParams();
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http.get<SaldoCajaDto>(`${this.base}/saldo`, { params });
  }

  crear(body: {
    tipo: 'ingreso' | 'egreso';
    medio: 'efectivo' | 'tarjeta' | 'otro';
    monto: number;
    concepto: string;
    fecha?: string;
  }): Observable<MovimientoCajaDto> {
    return this.http.post<MovimientoCajaDto>(`${this.base}/movimientos`, body);
  }
}
