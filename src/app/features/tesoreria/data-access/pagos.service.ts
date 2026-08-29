import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type MedioPago = 'efectivo' | 'transferencia' | 'cheque';

export interface LineaPagoDto {
  id: string;
  medio: string;
  monto: number;
  cheque_id: string;
}

export interface PagoDto {
  id: string;
  proveedor_id: string;
  fecha: string;
  monto: number;
  medio: string;
  observacion: string;
  lineas: LineaPagoDto[];
}

export interface CrearPagoBody {
  proveedor_id: string;
  monto: number;
  medio: MedioPago;
  destinatario?: string;
  observacion?: string;
  cheque_id?: string;
  cheque?: {
    numero: string;
    banco_emisor: string;
    librador?: string;
    fecha_vto?: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/pagos`;

  listar(proveedorId?: string): Observable<PagoDto[]> {
    let params = new HttpParams();
    if (proveedorId) {
      params = params.set('proveedor_id', proveedorId);
    }
    return this.http.get<PagoDto[]>(this.base, { params });
  }

  crear(body: CrearPagoBody): Observable<PagoDto> {
    return this.http.post<PagoDto>(this.base, body);
  }
}
