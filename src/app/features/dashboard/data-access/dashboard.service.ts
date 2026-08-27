import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { KpisDto } from './kpi.dto';
import { kpisToModel } from './kpi.mapper';
import { Kpis } from './kpi.model';

export interface RemitoCompraDash {
  id: string;
  comprobante: string;
  fecha: string;
  proveedor: string;
  estado: string;
  renglones: number;
  total: number;
  pendienteStock: boolean;
}

interface CompraDto {
  id: string;
  tipo: string;
  proveedor_id: string;
  estado: string;
  total: number;
  numero: string | null;
  fecha: string;
  lineas: unknown[];
}

interface ProveedorPaginaDto {
  items: { id: string; nombre: string }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  obtenerKpis(): Observable<Kpis> {
    return this.http.get<KpisDto>(`${this.api}/reporteria/kpis`).pipe(map(kpisToModel));
  }

  listarRemitosCompra(): Observable<RemitoCompraDash[]> {
    return forkJoin({
      remitos: this.http.get<CompraDto[]>(`${this.api}/compras`, {
        params: { tipo: 'remito_compra' },
      }),
      proveedores: this.http
        .get<ProveedorPaginaDto>(`${this.api}/proveedores`, {
          params: { page_size: '200', activo: 'true' },
        })
        .pipe(catchError(() => of({ items: [] as { id: string; nombre: string }[] }))),
    }).pipe(
      map(({ remitos, proveedores }) => {
        const nombres = Object.fromEntries(proveedores.items.map((p) => [p.id, p.nombre]));
        return remitos
          .map((c) => ({
            id: c.id,
            comprobante:
              c.numero?.trim() || `REM ${c.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
            fecha: c.fecha,
            proveedor: nombres[c.proveedor_id] ?? 'Proveedor',
            estado: c.estado,
            renglones: c.lineas?.length ?? 0,
            total: c.total,
            pendienteStock: c.estado === 'borrador',
          }))
          .sort((a, b) => {
            // Pendientes primero, luego por fecha desc
            if (a.pendienteStock !== b.pendienteStock) {
              return a.pendienteStock ? -1 : 1;
            }
            return b.fecha.localeCompare(a.fecha);
          });
      }),
    );
  }
}
