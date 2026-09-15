# Checklist de lanzamiento: Ventas360 en Render (multi-tenant)

Objetivo: salir **solo con Ventas**, prod siempre on, stage on-demand.
Repo principal de trabajo: **`ventas360-api`**. Front (`ventas360-web`) al final.

Convención: cada ítem = **1 PR** (mergeable solo). Orden = dependencias.

Referencias: [RENDER-SETUP.md](./RENDER-SETUP.md) (infra), arquitectura ya
decidida (schema `ventas`, roles migrator/app, RLS, Flyway, R2, IA async).

---

## Estado actual (punto de partida)

| Área | Hoy | Target |
| --- | --- | --- |
| Tenancy | ContextVar + filtros SQLAlchemy | + RLS + `set_config` |
| `tenant_id` | `String(36)` | `uuid NOT NULL` (negocio) |
| Schema | tablas prefijadas en `public` | schema Postgres `ventas` |
| Migraciones | `create_all` + ALTER ad-hoc | Flyway pre-deploy |
| Archivos | memoria / paths locales | Cloudflare R2 |
| IA | Claude sync en el request | worker async + costo/tenant |
| Deploy | Docker local | Render prod + stage Suspend |

---

## Fase 0 — Issues de tracking (crear en `ventas360-api`)

Crear un epic o milestone **“Launch Render multi-tenant”** y estos issues
(copiar títulos):

1. `infra: Flyway + schema ventas + roles migrator/app`
2. `db: migrar tenant_id a uuid NOT NULL en tablas de negocio`
3. `db: índices compuestos que empiezan por tenant_id`
4. `db: RLS ENABLE+FORCE + policies por tenant`
5. `api: set_config app.tenant_id en checkout del pool`
6. `api: pool size por env; apagar create_all/seed en prod`
7. `api: adaptador Cloudflare R2 (upload/download por tenant)`
8. `api: AFIP certs fuera del filesystem del contenedor`
9. `api: cola + worker IA async; meter tokens/costo por tenant`
10. `api: feature-flag IA sync off en prod`
11. `ops: env example + health checks listos para Render`
12. `web: deploy same-origin /api + smoke subdominio real` (en `ventas360-web`)

---

## Fase 1 — PRs en `ventas360-api` (bloqueantes)

### PR-A — Bootstrap Flyway (sin cambiar lógica de negocio)

**Issue:** `infra: Flyway + schema ventas + roles…`

- Carpeta `flyway/` + `flyway/ventas.conf` (`flyway.schemas=ventas`)
- SQL inicial: `CREATE SCHEMA` solo si hace falta; **tablas sin prefijo de
  schema** en el SQL (`CREATE TABLE pedido`, no `ventas.pedido`)
- Decisión de naming documentada en el PR:
  - **Opción recomendada:** renombrar `ventas_pedido` → `pedido` dentro del
    schema `ventas` (search_path), **o**
  - Mantener nombres prefijados `ventas_pedido` *dentro* de schema `ventas`
    (menos churn ORM; menos “limpio”)
- Script/docs de bootstrap de roles `ventas_migrator` / `ventas_app`
- CI o job local: `flyway migrate` contra Postgres de prueba
- **No** apagar aún `crear_tablas()` (conviven en esta PR)

**Done when:** `flyway_schema_history` aparece en schema `ventas` en un PG local.

---

### PR-B — Apagar create_all en prod + pool por env

**Issue:** `api: pool size por env; apagar create_all/seed en prod`

- `VENTAS360_ENTORNO=prod` → no `crear_tablas()`, no seed
- `VENTAS360_DB_POOL_SIZE` (default 5, max 10)
- `DATABASE_URL` / `VENTAS360_DATABASE_URL` apunta a user **`ventas_app`**
- Documentar URL de Flyway (user **`ventas_migrator`**) solo en pre-deploy

**Done when:** arranque en prod no toca DDL; pool acotado.

---

### PR-C — `tenant_id` uuid + índices

**Issues:** `db: migrar tenant_id…` + `db: índices compuestos…`

- Migración Flyway: columnas a `uuid` (cast desde string demo si hace falta)
- Mixin ORM `ConTenant` → `Uuid` / `UUID`
- Toda tabla de negocio: `tenant_id uuid NOT NULL`
- Excepción documentada: usuarios plataforma / tabla `tenants` (sin
  `tenant_id` de fila de negocio)
- Índices hot-path: `(tenant_id, …)` — al menos uniques y FKs de listados
- Actualizar seeds/tests (`tnt-demo` → uuid fijos)

**Done when:** tests de aislamiento verdes con uuid; sin `String(36)` en negocio.

---

### PR-D — RLS + `set_config` en el pool

**Issues:** `db: RLS…` + `api: set_config…`

- Flyway: `ENABLE ROW LEVEL SECURITY` + `FORCE` en tablas tenant-scoped
- Policy: `tenant_id = current_setting('app.tenant_id', true)::uuid`
- Al obtener conexión/sesión (asyncpg/SQLAlchemy):  
  `SELECT set_config('app.tenant_id', :tid, true)`
- Mantener filtros SQLAlchemy como defensa en profundidad
- Test: query sin `set_config` → 0 filas; con tenant A no ve tenant B

**Done when:** test de RLS pasa contra Postgres (no solo SQLite).

---

### PR-E — Cloudflare R2

**Issues:** `api: adaptador R2…` + `api: AFIP certs…`

- Cliente S3-compatible (boto3 / aioboto3) vía env: endpoint, keys, bucket
- Keys con prefijo `{tenant_id}/…`
- Remitos / Excel / uploads dejan de vivir solo en memoria+tmp local
- Certificados AFIP: secret file en Render **o** objeto R2 privado + carga al
  arranque en memoria (sin disco persistente)

**Done when:** upload/download smoke en stage; contenedor sin volumen.

---

## Fase 2 — PRs IA (si el bot sale día 1; si no, diferir y flag off)

### PR-F — Cola + worker + metering

**Issues:** `api: cola + worker IA…` + `api: feature-flag…`

- Tabla `ia_job` / `ia_consumo` con `tenant_id` (Flyway)
- HTTP encola; **Background Worker** Render procesa
- Registro de tokens + costo estimado por `tenant_id`
- Flag `VENTAS360_IA_SYNC=false` en prod (prohibido Claude en el request)
- Health del worker + reintentos básicos

**Done when:** un parse de remito / chat no bloquea el handler HTTP.

Si el bot **no** sale día 1: solo PR del flag off + UI “próximamente”; PR-F después.

---

## Fase 3 — Render (ops, no necesariamente código)

Hacer **después** de PR-A…PR-D (y PR-E si hay uploads). Checklist corto:

1. [ ] Workspace Pro + Project `stage` / `prod`
2. [ ] `appdb-prod` + `appdb-stage` (Basic-256mb); bootstrap roles/schemas
3. [ ] Env groups `ventas-*-prod` / `ventas-*-stage` (+ R2 + Anthropic)
4. [ ] Web service `ventas-api-prod` (siempre on); Pre-Deploy = Flyway
5. [ ] Web service `ventas-api-stage` → probar → **Suspend**
6. [ ] Worker IA prod (si aplica); stage Suspend / no crear aún
7. [ ] Custom domain + subdominios de comercios
8. [ ] Smoke: health, login cookie, RLS, R2, (job IA)

Detalle: [RENDER-SETUP.md](./RENDER-SETUP.md) § “Modo día 1”.

---

## Fase 4 — Front (`ventas360-web`) — PRs chicos

### PR-W1 — Prod same-origin

- Confirmar `environment.production.ts` → `apiBaseUrl: '/api'`
- Dockerfile/nginx ya proxea; verificar paths de health si hace falta
- Sin secretos en el bundle

### PR-W2 — Smoke subdominio real

- Probar `https://demo.tudominio.com` (no solo `*.localhost`)
- Cookie Secure + SameSite en prod (lo setea la API)
- Checklist manual E2E: login → venta → (upload) → logout

---

## Orden de merge (resumen)

```text
PR-A Flyway bootstrap
  → PR-B prod sin DDL + pool
  → PR-C uuid + índices
  → PR-D RLS + set_config
  → PR-E R2
  → [PR-F worker IA]   ← opcional día 1
  → Render prod + stage Suspend
  → PR-W1 / PR-W2 front
```

No paralelizar A→D: cada uno asume el anterior.

---

## Criterio de “listo para clientes”

- [ ] Login cookie en dominio real
- [ ] Dos tenants de prueba: A no ve datos de B (RLS verificado)
- [ ] Flyway en pre-deploy verde en prod
- [ ] Uploads en R2 (si el flujo lo usa)
- [ ] IA sync deshabilitada en prod (o worker midiendo costo)
- [ ] Stage Suspend excepto cuando probás
- [ ] Seed/demo off; secrets solo en Render env groups

Cuando eso esté verde, Agro/RRHH se suman **copiando el mismo patrón**
(schema propio + roles + servicios), no reabriendo el diseño.
