import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContextoHostDto } from '../models/contexto-host.dto';
import { contextoHostToModel } from '../models/contexto-host.mapper';
import { ContextoHost } from '../models/contexto-host';

@Injectable({ providedIn: 'root' })
export class ContextoHostService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<ContextoHost> {
    return this.http
      .get<ContextoHostDto>(`${environment.apiBaseUrl}/tenants/contexto`)
      .pipe(map(contextoHostToModel));
  }
}
