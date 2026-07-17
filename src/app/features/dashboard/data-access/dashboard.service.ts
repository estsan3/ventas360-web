import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { KpisDto } from './kpi.dto';
import { kpisToModel } from './kpi.mapper';
import { Kpis } from './kpi.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  obtenerKpis(): Observable<Kpis> {
    return this.http
      .get<KpisDto>(`${environment.apiBaseUrl}/reporteria/kpis`)
      .pipe(map(kpisToModel));
  }
}
