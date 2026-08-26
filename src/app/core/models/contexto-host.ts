export interface TenantPublico {
  id: string;
  slug: string;
  nombre: string;
}

export interface ContextoHost {
  tipo: 'plataforma' | 'comercio' | 'sin_slug';
  slug: string | null;
  tenant: TenantPublico | null;
}
