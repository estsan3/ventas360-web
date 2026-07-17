import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Contrato del backend (snake_case) */
interface PreferenciasDto {
  viaje_retrasado: boolean;
  viaje_completado: boolean;
  mensaje_chofer: boolean;
}

export interface Preferencias {
  viajeRetrasado: boolean;
  viajeCompletado: boolean;
  mensajeChofer: boolean;
}

function toPreferencias(dto: PreferenciasDto): Preferencias {
  return {
    viajeRetrasado: dto.viaje_retrasado,
    viajeCompletado: dto.viaje_completado,
    mensajeChofer: dto.mensaje_chofer,
  };
}

/**
 * Preferencias de notificación del usuario. Vive en notifications/:
 * Configuración las edita, los emisores de notificaciones las consultan.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasStore {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/preferencias`;

  private readonly _preferencias = signal<Preferencias>({
    viajeRetrasado: true,
    viajeCompletado: true,
    mensajeChofer: true,
  });
  private cargado = false;

  readonly preferencias = this._preferencias.asReadonly();

  cargar(): void {
    if (this.cargado) {
      return;
    }
    this.cargado = true;
    this.http.get<PreferenciasDto>(this.base).subscribe({
      next: (dto) => this._preferencias.set(toPreferencias(dto)),
      error: () => (this.cargado = false),
    });
  }

  actualizar(preferencias: Preferencias): Observable<PreferenciasDto> {
    return this.http
      .put<PreferenciasDto>(this.base, {
        viaje_retrasado: preferencias.viajeRetrasado,
        viaje_completado: preferencias.viajeCompletado,
        mensaje_chofer: preferencias.mensajeChofer,
      })
      .pipe(tap((dto) => this._preferencias.set(toPreferencias(dto))));
  }
}
