import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  AsyncState,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
} from '../../../core/models/async-state';
import { ConfiguracionService } from './configuracion.service';
import { NuevoUsuario, Usuario } from './usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosStore {
  private readonly api = inject(ConfiguracionService);

  private readonly _usuarios = signal<AsyncState<Usuario[]>>(asyncIdle());

  readonly usuarios = this._usuarios.asReadonly();

  cargar(): void {
    if (this._usuarios().status === 'loading') {
      return;
    }
    this._usuarios.set(asyncLoading());
    this.api.getUsuarios().subscribe({
      next: (usuarios) => this._usuarios.set(asyncSuccess(usuarios)),
      error: (error: Error) => this._usuarios.set(asyncError(error.message)),
    });
  }

  crear(usuario: NuevoUsuario): Observable<Usuario> {
    return this.api.crearUsuario(usuario).pipe(
      tap((nuevo) => {
        const actual = this._usuarios();
        if (actual.status === 'success') {
          this._usuarios.set(asyncSuccess([...(actual.data ?? []), nuevo]));
        }
      }),
    );
  }

  darDeBaja(id: string): Observable<void> {
    return this.api.darDeBaja(id).pipe(
      tap(() => {
        const actual = this._usuarios();
        if (actual.status === 'success') {
          this._usuarios.set(asyncSuccess((actual.data ?? []).filter((u) => u.id !== id)));
        }
      }),
    );
  }
}
