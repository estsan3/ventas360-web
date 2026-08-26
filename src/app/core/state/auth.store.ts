import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { ContextoHost } from '../models/contexto-host';
import { MODULO_POR_RUTA, RUTA_INICIAL_POR_MODULO } from '../models/modulos';
import { User } from '../models/user';
import { AuthService, LoginCredentials } from '../services/auth.service';
import { ContextoHostService } from '../services/contexto-host.service';

/**
 * Estado de sesión compartido (Signals). Vive en core porque cruza features.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthService);
  private readonly contextoApi = inject(ContextoHostService);

  private readonly _user = signal<User | null>(null);
  private readonly _contexto = signal<ContextoHost | null>(null);
  private readonly _restoring = signal(true);

  readonly user = this._user.asReadonly();
  readonly contexto = this._contexto.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly restoring = this._restoring.asReadonly();
  readonly esPlataforma = computed(() => this._contexto()?.tipo === 'plataforma');
  readonly nombreComercio = computed(() => this._contexto()?.tenant?.nombre ?? null);

  puede(...modulos: string[]): boolean {
    const permisos = this._user()?.permisos ?? [];
    return modulos.some((m) => permisos.includes(m));
  }

  puedeRuta(rutaId: string): boolean {
    const modulo = MODULO_POR_RUTA[rutaId];
    return modulo ? this.puede(modulo) : false;
  }

  rutaInicial(): string {
    if (this.esPlataforma()) {
      return '/comercios';
    }
    const permisos = new Set(this._user()?.permisos ?? []);
    const hit = RUTA_INICIAL_POR_MODULO.find((x) => permisos.has(x.modulo));
    return hit?.ruta ?? '/login';
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.api.login(credentials).pipe(tap((user) => this._user.set(user)));
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(tap(() => this._user.set(null)));
  }

  /** Reconstruye la sesión desde la cookie httpOnly al recargar. */
  restoreSession(): Promise<void> {
    this._restoring.set(true);
    return firstValueFrom(
      this.contextoApi.obtener().pipe(
        tap((ctx) => this._contexto.set(ctx)),
        catchError(() => {
          this._contexto.set({ tipo: 'sin_slug', slug: null, tenant: null });
          return of(null);
        }),
        switchMap(() =>
          this.api.me().pipe(
            tap((user) => this._user.set(user)),
            map(() => undefined),
            catchError(() => {
              this._user.set(null);
              return of(undefined);
            }),
          ),
        ),
        finalize(() => this._restoring.set(false)),
      ),
    );
  }
}
