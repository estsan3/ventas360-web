import { ContextoHostDto } from './contexto-host.dto';
import { ContextoHost } from './contexto-host';

export function contextoHostToModel(dto: ContextoHostDto): ContextoHost {
  return {
    tipo: dto.tipo,
    slug: dto.slug ?? null,
    tenant: dto.tenant
      ? { id: dto.tenant.id, slug: dto.tenant.slug, nombre: dto.tenant.nombre }
      : null,
  };
}
