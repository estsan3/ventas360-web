import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, firstValueFrom, map, of, tap } from 'rxjs';
import { User } from '../models/user';
import { AuthService, LoginCredentials } from '../services/auth.service';

/**
 * Estado de sesión compartido (Signals). Vive en core porque cruza features.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthService);

  private readonly _user = signal<User | null>(null);
  private readonly _restoring = signal(true);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly restoring = this._restoring.asReadonly();

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
      this.api.me().pipe(
        tap((user) => this._user.set(user)),
        map(() => undefined),
        catchError(() => {
          this._user.set(null);
          return of(undefined);
        }),
        finalize(() => this._restoring.set(false)),
      ),
    );
  }
}
