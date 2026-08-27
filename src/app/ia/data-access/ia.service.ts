import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AccionesDiaResponseDto,
  InterpretarMostradorResponseDto,
  ResumenDiaResponseDto,
} from './ia.dto';
import { accionesDiaToModel, interpretarMostradorToModel, resumenDiaToModel } from './ia.mapper';
import { AccionesDia, InterpretarMostradorResultado, ResumenDia } from './ia.model';

@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/ai`;

  interpretarMostrador(
    texto: string,
    depositoId?: string,
  ): Observable<InterpretarMostradorResultado> {
    return this.http
      .post<InterpretarMostradorResponseDto>(`${this.base}/mostrador/interpretar`, {
        texto,
        deposito_id: depositoId ?? null,
      })
      .pipe(map(interpretarMostradorToModel));
  }

  accionesDelDia(): Observable<AccionesDia> {
    return this.http
      .get<AccionesDiaResponseDto>(`${this.base}/acciones`)
      .pipe(map(accionesDiaToModel));
  }

  resumenDia(narrativa = true): Observable<ResumenDia> {
    const params = new HttpParams().set('narrativa', narrativa ? 'true' : 'false');
    return this.http
      .get<ResumenDiaResponseDto>(`${this.base}/resumen-dia`, { params })
      .pipe(map(resumenDiaToModel));
  }
}
