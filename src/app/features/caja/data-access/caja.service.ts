import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type EstadoCaja = 'sin_abrir' | 'abierta' | 'cerrada';
export type MedioCaja = 'efectivo' | 'tarjeta' | 'cheque' | 'otro';

export interface MovimientoCajaDto {
  id: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  medio: MedioCaja;
  monto: number;
  concepto: string;
  referencia_tipo: string;
  referencia_id: string;
  creado_en: string | null;
}

export interface SaldoCajaDto {
  fecha: string;
  ingresos: number;
  egresos: number;
  saldo: number;
  efectivo_esperado: number;
  estado: EstadoCaja;
  fondo_inicial: number;
  efectivo_contado: number | null;
  diferencia: number | null;
  cheques_esperado: number;
  cheques_contado: number | null;
  cheques_diferencia: number | null;
  tarjetas_esperado: number;
  tarjetas_contado: number | null;
  tarjetas_diferencia: number | null;
  abierta_por: string;
  cerrada_por: string;
  abierta_en: string | null;
  cerrada_en: string | null;
}

export interface ChequeCajaPayload {
  numero: string;
  banco_emisor: string;
  librador?: string;
  fecha?: string | null;
  fecha_vto?: string | null;
  recibido_de?: string;
  destinatario?: string;
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

  abrir(fondoInicial: number): Observable<SaldoCajaDto> {
    return this.http.post<SaldoCajaDto>(`${this.base}/abrir`, {
      fondo_inicial: fondoInicial,
    });
  }

  cerrar(body: {
    efectivo_contado: number;
    cheques_contado: number;
    tarjetas_contado: number;
  }): Observable<SaldoCajaDto> {
    return this.http.post<SaldoCajaDto>(`${this.base}/cerrar`, body);
  }

  crear(body: {
    tipo: 'ingreso' | 'egreso';
    medio: MedioCaja;
    monto: number;
    concepto: string;
    cheque_id?: string | null;
    cheque?: ChequeCajaPayload | null;
    entregado_a?: string;
  }): Observable<MovimientoCajaDto> {
    return this.http.post<MovimientoCajaDto>(`${this.base}/movimientos`, body);
  }
}
