/** Forma exacta del usuario en respuestas auth de la API. */
export interface UserDto {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  rol: string;
  tenant_id?: string | null;
  permisos?: string[];
}

export interface LoginResponseDto {
  access_token: string;
  token_type: string;
  usuario: UserDto;
}
