# Runbook: contratar y poner en marcha Render (stage + prod)

Pasos operativos para levantar la infra multi-producto (Ventas / Agro / RRHH)
con **dos ambientes** (`stage` y `prod`), según las decisiones de arquitectura
ya tomadas. No propone alternativas de hosting/DB.

**Topología objetivo**

| Recurso | Plan | Stage | Prod | Total |
| --- | --- | --- | --- | --- |
| Workspace | Pro | — (compartido) | — | 1 |
| Project / Environment | — | `stage` | `prod` | 1 project, 2 envs |
| Postgres | Basic-256mb | 1 × DB `appdb` | 1 × DB `appdb` | **2 instancias** |
| Web service | Starter | 3 (uno por producto) | 3 | **6** |
| Background worker | Starter | 1 (bot IA) | 1 | **2** |
| Archivos | Cloudflare R2 | bucket o prefijo `stage/` | bucket o prefijo `prod/` | fuera de Render |
| IA | Anthropic (Haiku) | key o proyecto stage | key prod | fuera de Render |

Misma lógica de aislamiento en **cada** Postgres:

- Producto → schema (`ventas` / `agro` / `rrhh`) + roles `*_migrator` / `*_app`
- Cliente → `tenant_id` + RLS
- Stage y prod **nunca** comparten instancia Postgres (evita mezclar datos,
  historial Flyway y conexiones)

**Orden de trabajo:** cuenta → workspace Pro → Project stage/prod → Postgres
×2 → roles/schemas en cada DB → R2 → Anthropic → env groups por ambiente →
servicios ×2 → Flyway pre-deploy → smoke test stage → promover a prod.

---

## Modo día 1 (recomendado): solo Ventas + stage on-demand

Salís solo con **Ventas** (el producto más listo). **Prod siempre prendido**.
**Stage apagado** la mayor parte del tiempo; lo prendés solo cuando querés
probar antes de tocar prod.

### Qué significa “stage on-demand”

No es un plan distinto de Render. Es un **hábito operativo**:

1. Los servicios de stage (`ventas-api-stage`, `ia-worker-stage`) existen, pero
   están **Suspended**.
2. Suspendido = no corre, no cobra compute (Starter se prorratea por segundo).
3. Cuando vas a probar: Dashboard → seleccionás los servicios stage →
   **Resume** → esperás el deploy → probás → **Suspend** de nuevo.
4. La Postgres `appdb-stage` **sí sigue cobrando** (~USD 6/mes) mientras exista:
   así no perdés schemas, roles ni datos de prueba cada vez. Si un mes no
   vas a usar stage en absoluto, podés borrar esa DB y recrearla después
   (más barato, más laburo).

Flujo típico de un cambio:

```text
código → Resume stage → deploy branch develop → probar → Suspend stage
       → merge a main → deploy prod (siempre on)
```

### Topología día 1 (solo Ventas)

| Recurso | Estado | ~USD/mes |
| --- | --- | --- |
| Workspace Pro | siempre | 25 |
| Postgres `appdb-prod` | siempre on | 6 + storage |
| Web `ventas-api-prod` | siempre on | 7 |
| Worker `ia-worker-prod` | siempre on (si el bot ya va) | 7 |
| Postgres `appdb-stage` | siempre on (datos de prueba) | 6 + storage |
| Web `ventas-api-stage` | **Suspended** salvo al probar | ~0 si apagado; 7 prorrateado los días on |
| Worker `ia-worker-stage` | opcional; Suspended o ni crearlo aún | 0–7 |
| Agro / RRHH (stage y prod) | **no crear todavía** | 0 |

**Piso fijo típico día 1:** ~USD **44–51** (Pro + 2 Postgres + ventas-prod
[+ worker-prod]). Stage web casi gratis si está suspendido la mayor parte del mes.

### Qué crear día 1 (checklist corto)

1. [ ] Workspace Pro + Project con envs `stage` / `prod`
2. [ ] `appdb-prod` + `appdb-stage` (Basic-256mb, DB `appdb`)
3. [ ] En **cada** DB: solo schema `ventas` + roles `ventas_migrator` /
   `ventas_app` (agro/rrhh después)
4. [ ] R2 (prod + stage o prefijos) + Anthropic
5. [ ] Env groups `ventas-secrets-prod` / `ventas-secrets-stage` (+ R2/IA)
6. [ ] `ventas-api-prod` (branch `main`, siempre on) + Flyway pre-deploy
7. [ ] `ventas-api-stage` (branch `develop`, **Suspend** al terminar la 1ª prueba)
8. [ ] `ia-worker-prod` si el bot ya está; worker-stage solo si lo necesitás
9. [ ] Smoke stage → Suspend stage → smoke prod

Agro/RRHH: repetir el mismo patrón cuando cada producto esté listo (schema +
roles + web prod + web stage suspendible).

---

## 0. Checklist previo (antes de pagar)

- [ ] Cuenta de GitHub con los repos de cada producto (API + front si aplica)
- [ ] Convención de branches: `develop` (o `staging`) → **stage**, `main` → **prod**
- [ ] Dominios: ej. `api-stage.tudominio.com` / `api.tudominio.com` (o
  `*.onrender.com` al inicio)
- [ ] Tarjeta para billing de Render, Cloudflare R2 y Anthropic
- [ ] **Una sola región** para stage y prod (Postgres + webs + workers). Ej.:
  `Oregon (US West)`. No se puede mover después sin recrear.
- [ ] Nombre de DB en cada instancia: `appdb` (se fija al crear y **no cambia**)

---

## 1. Contratar Render (cuenta + workspace Pro)

1. Ir a [https://dashboard.render.com/register](https://dashboard.render.com/register)
   e iniciar sesión con GitHub (mismo GitHub de los repos).
2. Crear / seleccionar el **workspace** de la agencia (uno solo para stage,
   prod y los tres productos).
3. **Billing → Update Plan → Pro** (~USD 25/mes flat). Pro habilita servicios
   pagos, pre-deploy y audit logs básicos.
4. Agregar método de pago.
5. **Settings → Members**: invitá solo a quien opere infra.

> No uses instancias Free “para stage”: se duermen y no sirven para probar
> el mismo flujo que prod.

---

## 2. Project con ambientes stage y prod

En Render, un **Project** agrupa servicios por aplicación y ambiente.

1. Dashboard → **New → Project** (o Projects en el menú).
2. Nombre: `saas-agencia` (o el nombre de la agencia).
3. Crear dos environments:
   - `stage`
   - `prod`
4. A partir de acá, **cada** Postgres, web y worker se crea **dentro** del
   environment correspondiente. Los Environment Groups se pueden scopear al
   environment para que stage no pueda linkear secrets de prod.

Convención de nombres (obligatoria para no confundirse):

| Tipo | Stage | Prod |
| --- | --- | --- |
| Postgres | `appdb-stage` | `appdb-prod` |
| Web Ventas | `ventas-api-stage` | `ventas-api-prod` |
| Web Agro | `agro-api-stage` | `agro-api-prod` |
| Web RRHH | `rrhh-api-stage` | `rrhh-api-prod` |
| Worker IA | `ia-worker-stage` | `ia-worker-prod` |

---

## 3. Crear Postgres ×2 (una instancia por ambiente)

Repetir el alta **dos veces** (una en env `stage`, otra en `prod`).

1. Dentro del environment → **New → Postgres**.
2. Completar:

| Campo | Stage | Prod |
| --- | --- | --- |
| Name | `appdb-stage` | `appdb-prod` |
| Database | **`appdb`** | **`appdb`** |
| User | default Render (admin) | default Render (admin) |
| Region | la región elegida | **la misma** |
| PostgreSQL Version | 16 o 17 (igual en ambos) | igual que stage |
| Instance type | **Basic-256mb** | **Basic-256mb** |
| Storage | 1 GB (o 5 GB) | 1 GB (o 5 GB); se puede subir, **no bajar** |

3. **Create Database** → esperar **Available**.
4. En cada DB → **Info / Connections** y anotar:

| URL | Uso |
| --- | --- |
| **Internal Database URL** | webs/worker del **mismo** environment |
| **External Database URL** | laptop / `psql` / bootstrap |

```text
postgresql://USER:PASSWORD@HOST:5432/appdb
```

Las apps en Render usan siempre la **Internal** de **su** ambiente. Stage no
debe conocer el host de prod.

5. Confirmar backups/exports activos en ambas instancias pagas.

---

## 4. Bootstrap de schemas y roles (en cada Postgres)

Ejecutar el mismo script **dos veces**: una contra External de stage, otra
contra External de prod. Passwords **distintos** por ambiente.

Conectate como el usuario admin de esa instancia.

### 4.1 Schemas (idénticos en stage y prod)

```sql
CREATE SCHEMA IF NOT EXISTS ventas;
CREATE SCHEMA IF NOT EXISTS agro;
CREATE SCHEMA IF NOT EXISTS rrhh;
```

Los nombres de schema **no** llevan sufijo `-stage`/`-prod`: el aislamiento
entre ambientes es la **instancia**, no el nombre del schema. Así
`flyway.schemas=ventas` funciona igual en ambos.

### 4.2 Roles por producto (migrator + app)

Ejemplo para `ventas` (repetir `agro_*` → `agro`, `rrhh_*` → `rrhh`):

```sql
-- Passwords distintos en stage vs prod; guardar en el gestor de secretos
CREATE ROLE ventas_migrator LOGIN PASSWORD '<SECRET_MIGRATOR_DE_ESTE_AMBIENTE>';
CREATE ROLE ventas_app      LOGIN PASSWORD '<SECRET_APP_DE_ESTE_AMBIENTE>';

GRANT CONNECT ON DATABASE appdb TO ventas_migrator, ventas_app;
GRANT USAGE, CREATE ON SCHEMA ventas TO ventas_migrator;
GRANT USAGE ON SCHEMA ventas TO ventas_app;

ALTER ROLE ventas_migrator SET search_path = ventas;
ALTER ROLE ventas_app      SET search_path = ventas;

ALTER DEFAULT PRIVILEGES FOR ROLE ventas_migrator IN SCHEMA ventas
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ventas_app;

ALTER DEFAULT PRIVILEGES FOR ROLE ventas_migrator IN SCHEMA ventas
  GRANT USAGE, SELECT ON SEQUENCES TO ventas_app;
```

### 4.3 Connection strings

Misma DB/host/puerto del ambiente; **solo cambia el usuario**. Schema **no**
va en la URL (`search_path`).

```text
# Stage (Internal)
postgresql://ventas_app:<SECRET_STAGE>@<INTERNAL_HOST_STAGE>:5432/appdb
postgresql://ventas_migrator:<SECRET_STAGE>@<INTERNAL_HOST_STAGE>:5432/appdb

# Prod (Internal)
postgresql://ventas_app:<SECRET_PROD>@<INTERNAL_HOST_PROD>:5432/appdb
postgresql://ventas_migrator:<SECRET_PROD>@<INTERNAL_HOST_PROD>:5432/appdb
```

### 4.4 Verificación

```sql
SHOW search_path;   -- ventas
SELECT current_user; -- ventas_app
```

---

## 5. Cloudflare R2 (por ambiente)

1. Crear **dos buckets** (recomendado) o uno con prefijos `stage/` y `prod/`:
   - `saas-stage`
   - `saas-prod`
2. API tokens separados (o el mismo con scope mínimo); anotar Account ID,
   keys, endpoint S3.
3. Nada de disco persistente en los contenedores de Render.

---

## 6. Anthropic (IA)

1. [console.anthropic.com](https://console.anthropic.com) → API keys.
2. Ideal: **dos keys** (`stage` / `prod`) para cortar stage si se dispara el
   gasto sin tocar prod. Modelo inicial: Haiku.
3. Solo en env vars del worker (y de la API que encola). Nunca en el front.

---

## 7. Environment Groups (scoped por ambiente)

Dashboard → **Environment Groups**. Crear grupos **dentro** de cada
environment (Manage → Move group al env) para que prod no se linkee a stage
por error.

| Grupo | Stage | Prod |
| --- | --- | --- |
| R2 | `r2-stage` | `r2-prod` |
| Ventas | `ventas-secrets-stage` | `ventas-secrets-prod` |
| Agro | `agro-secrets-stage` | `agro-secrets-prod` |
| RRHH | `rrhh-secrets-stage` | `rrhh-secrets-prod` |
| IA | `ia-secrets-stage` | `ia-secrets-prod` |

Contenido típico por grupo de producto:

- `DATABASE_URL` → Internal del ambiente, user `*_app`
- `FLYWAY_URL` → Internal del ambiente, user `*_migrator`
- `DB_POOL_SIZE=5` (máx. 5–10; el límite lo comparte esa instancia entre 3
  webs + worker + Flyway/admin)
- Cookie/sesión secrets **distintos** stage vs prod
- `APP_ENV=stage` o `APP_ENV=prod`

---

## 8. Web services (3 por ambiente = 6)

Por cada celda de la matriz producto × ambiente:

1. En el environment correcto → **New → Web Service**.
2. Repo de GitHub del producto.
3. Configurar:

| Campo | Stage | Prod |
| --- | --- | --- |
| Name | `ventas-api-stage` (etc.) | `ventas-api-prod` (etc.) |
| Region | la región fija | la misma |
| Branch | `develop` / `staging` | `main` |
| Runtime | Docker o native | igual |
| Instance type | **Starter** | **Starter** |
| Build Command | el del producto | el del producto |
| **Pre-Deploy Command** | Flyway migrate (§9) | Flyway migrate (§9) |
| Start Command | proceso HTTP | proceso HTTP |
| Health Check Path | `/health` | `/health` |
| Autodeploy | on (branch stage) | on (`main`) o manual si preferís |

4. **Environment** → linkear solo grupos del **mismo** ambiente.
5. `DATABASE_URL` = Internal `*_app` de **esa** Postgres.
6. **Create Web Service**.

Custom domains después: `api-stage.…` / `api.…` (o subdominios por producto).

### Front (si aplica)

Static Site o nginx/Docker por ambiente. El front **no** recibe `DATABASE_URL`.
Apuntar el front-stage al API-stage.

---

## 9. Flyway como Pre-Deploy (igual en stage y prod)

Config por producto (sin sufijo de ambiente; el ambiente lo da la URL):

```properties
flyway.url=${FLYWAY_URL}
flyway.user=${FLYWAY_USER}
flyway.password=${FLYWAY_PASSWORD}
flyway.schemas=ventas
flyway.defaultSchema=ventas
```

- `flyway.schemas=<producto>` → `flyway_schema_history` dentro del schema.
- SQL **sin** prefijo de schema (`CREATE TABLE clientes`).
- Pre-Deploy del web Starter; si falla, no se publica esa versión.
- Sin `undo` (feature paga).

```bash
flyway -configFiles=flyway/ventas.conf migrate
```

Flujo recomendado de migraciones:

1. Merge a branch de stage → deploy stage → Flyway corre en **appdb-stage**.
2. Verificar stage.
3. Merge a `main` → deploy prod → Flyway corre en **appdb-prod** (mismo SQL,
   otra instancia / otro historial).

---

## 10. Background workers (1 por ambiente = 2)

| Campo | Stage | Prod |
| --- | --- | --- |
| Name | `ia-worker-stage` | `ia-worker-prod` |
| Region | misma | misma |
| Plan | Starter | Starter |
| Branch | stage | `main` |
| Env group | `ia-secrets-stage` + DB del producto | `ia-secrets-prod` + DB |

El web encola; el worker llama a Haiku y registra tokens/costo por
`tenant_id`. Nunca bloquear el handler HTTP con la llamada a Claude.

---

## 11. Primer deploy y smoke test

### Stage primero

1. Push a la branch de stage → Events: Build → Pre-deploy (Flyway) → Live.
2. Contra External de **stage**:

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('ventas','agro','rrhh');

SELECT * FROM ventas.flyway_schema_history ORDER BY installed_rank;
```

3. Health del `*-api-stage`, login, RLS + `set_config('app.tenant_id', …, true)`,
   upload R2 stage, job IA stage.

### Luego prod

4. Solo cuando stage esté verde: merge a `main` / deploy prod.
5. Repetir checks contra **appdb-prod** y URLs `*-prod`.
6. Confirmar que stage y prod tienen historiales Flyway **independientes**.

---

## 12. Coste mensual aproximado

### Día 1 — solo Ventas + stage on-demand (recomendado)

| Ítem | ~USD/mes |
| --- | --- |
| Workspace Pro | 25 |
| Postgres prod + stage | 12 + storage |
| `ventas-api-prod` Starter | 7 |
| `ia-worker-prod` Starter (si aplica) | 7 |
| `ventas-api-stage` Suspended | ~0 (solo días Resume) |
| **Piso fijo** | **~44–51** + storage/bandwidth |

### Full — 3 productos × stage+prod siempre on

| Ítem | ~USD/mes |
| --- | --- |
| Workspace Pro | 25 |
| 2 × Postgres Basic-256mb + storage | 12 + storage |
| 6 × Web Starter | 42 |
| 2 × Worker Starter | 14 |
| **Piso fijo Render** | **~93** + storage/bandwidth |

No mezclar stage y prod en la misma Postgres para “ahorrar 6 dólares”.

---

## 13. Operación diaria (mínimo viable)

- **Promote:** feature → branch stage → validar → `main` → prod.
- **Secrets:** rotar por ambiente; nunca copiar `DATABASE_URL` de prod a stage.
- **Pools:** 5 por app; cada Postgres (~100 conexiones) la comparten solo los
  servicios **de ese** ambiente (3 webs + worker + admin/Flyway).
- **Backups:** exports / PITR en prod con prioridad; stage regenerable.
- **Dump por producto:** `pg_dump --schema=ventas` contra la instancia del
  ambiente que corresponda.
- **Incidentes:** si stage se rompe, no redeployar prod “a ciegas”; si prod
  falla, stage sigue siendo el banco de prueba.

---

## 14. Orden resumido (copiar y tachar)

**Preferí la checklist “Modo día 1” al inicio del doc** si salís solo con
Ventas. Versión full (3 productos, stage siempre disponible):

1. [ ] Cuenta Render + workspace **Pro** + pago
2. [ ] Project `saas-agencia` con environments **`stage`** y **`prod`**
3. [ ] Postgres `appdb-stage` y `appdb-prod` (Basic-256mb, DB `appdb`, misma región)
4. [ ] En **cada** DB: schemas + roles `*_migrator` / `*_app` + `search_path` + default privileges (passwords distintos)
5. [ ] Anotar Internal/External de stage y de prod (sin schema en la URL)
6. [ ] R2 stage + R2 prod (o prefijos) + tokens
7. [ ] API keys Anthropic stage + prod (Haiku)
8. [ ] Env groups scoped por ambiente (producto + R2 + IA)
9. [ ] Webs Starter: prod siempre on; stage **Suspended** salvo al probar
10. [ ] Pre-Deploy = Flyway (`flyway.schemas=<producto>`, user migrator del ambiente)
11. [ ] Worker IA: prod on; stage on-demand o diferido
12. [ ] Smoke test **stage** → **Suspend** stage
13. [ ] Promote a **prod** + smoke test prod
14. [ ] Custom domains (opcional) stage vs prod

Cuando la cuenta Render esté verde, el trabajo de código para **sacar
Ventas360** está en [VENTAS-LAUNCH-CHECKLIST.md](./VENTAS-LAUNCH-CHECKLIST.md)
(PRs ordenados en `ventas360-api`: Flyway → uuid → RLS → R2 → worker IA → front).
