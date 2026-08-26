export interface TenantPublicoDto {
  id: string;
  slug: string;
  nombre: string;
}

export interface ContextoHostDto {
  tipo: 'plataforma' | 'comercio' | 'sin_slug';
  slug?: string | null;
  tenant?: TenantPublicoDto | null;
}
