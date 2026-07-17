import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepositoInventario {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface DepositoDto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class DepositosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/stock/depositos`;

  listar(): Observable<DepositoInventario[]> {
    return this.http.get<DepositoDto[]>(this.base).pipe(
      map((items) =>
        items.map((d) => ({
          id: d.id,
          codigo: d.codigo,
          nombre: d.nombre,
          activo: d.activo,
        })),
      ),
    );
  }
}
