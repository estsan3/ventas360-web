import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponseDto } from '../models/user.dto';
import { userToModel } from '../models/user.mapper';
import { User } from '../models/user';

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Auth vía cookie httpOnly seteada por el backend.
 * Todas las llamadas usan withCredentials (interceptor global).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  login(credentials: LoginCredentials): Observable<User> {
    return this.http
      .post<LoginResponseDto>(`${this.base}/login`, credentials)
      .pipe(map((resp) => userToModel(resp.usuario)));
  }

  me(): Observable<User> {
    return this.http.get<LoginResponseDto['usuario']>(`${this.base}/me`).pipe(map(userToModel));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {});
  }
}
