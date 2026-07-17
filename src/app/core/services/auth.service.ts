import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user';
import { AuthTokenService } from './auth-token.service';

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Respuesta del backend FastAPI (POST /auth/login). */
interface LoginResponseDto {
  access_token: string;
  token_type: string;
  usuario: User;
}

/**
 * Llamadas HTTP de autenticación con JWT Bearer.
 * El token se guarda en sessionStorage y lo adjunta el authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(AuthTokenService);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  login(credentials: LoginCredentials): Observable<User> {
    return this.http.post<LoginResponseDto>(`${this.base}/login`, credentials).pipe(
      tap((resp) => this.tokens.guardar(resp.access_token)),
      map((resp) => resp.usuario),
    );
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`);
  }

  logout(): Observable<void> {
    this.tokens.limpiar();
    return this.http.post<void>(`${this.base}/logout`, {});
  }
}
