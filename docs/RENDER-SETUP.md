# Runbook: contratar y poner en marcha Render

Pasos operativos para levantar la infra multi-producto (Ventas / Agro / RRHH)
según las decisiones de arquitectura ya tomadas. No propone alternativas.

**Topología objetivo**

| Recurso | Plan | Cantidad |
| --- | --- | --- |
| Workspace | Pro | 1 |
| Postgres | Basic-256mb | 1 instancia, DB `appdb` |
| Web service | Starter | 1 por producto (3) |
| Background worker | Starter | 1 (bot IA) |
| Archivos | Cloudflare R2 | fuera de Render |
| IA | Anthropic API (Haiku) | fuera de Render |

**Orden de trabajo:** cuenta → workspace → Postgres → roles/schemas → R2 →
servicios → Flyway pre-deploy → secrets → smoke test.

---

## 0. Checklist previo (antes de pagar)

- [ ] Cuenta de GitHub con los repos de cada producto (API + front si aplica)
- [ ] Dominios o subdominios listos (o usar `*.onrender.com` al inicio)
- [ ] Tarjeta para billing de Render, Cloudflare R2 y Anthropic
- [ ] Decidir **una sola región** para todo (Postgres + web + worker). Ej.:
  `Oregon (US West)` o la más cercana a los clientes. No se puede mover después
  sin recrear.
- [ ] Nombre de la DB: `appdb` (se fija al crear y **no se puede cambiar**)

---

## 1. Contratar Render (cuenta + workspace Pro)

1. Ir a [https://dashboard.render.com/register](https://dashboard.render.com/register)
   e iniciar sesión con GitHub (recomendado: mismo GitHub de los repos).
2. Crear / seleccionar el **workspace** de la agencia (un solo workspace para
   los tres productos).
3. **Billing → Update Plan → Pro** (~USD 25/mes flat, sin cargo por asiento).
   Pro habilita lo que necesitás a esta escala (servicios pagos, pre-deploy,
   audit logs básicos).
4. Agregar método de pago.
5. En **Settings → Members**, invitá solo a quien deba operar infra (por ahora
   vos).

> No crees servicios Free “para probar” en producción: se duermen y no sirven
> para el modelo multi-tenant con Postgres pago.

---

## 2. Crear la instancia Postgres (una sola)

1. Dashboard → **New → Postgres**.
2. Completar:

| Campo | Valor |
| --- | --- |
| Name | `appdb` (o `saas-shared-pg`; es solo etiqueta) |
| Database | **`appdb`** (obligatorio: no cambia después) |
| User | dejar el default de Render (superuser/admin de la instancia) |
| Region | la misma que vas a usar en web/worker |
| PostgreSQL Version | 16 o 17 (estable; evitar “latest” sin pin si preferís control) |
| Instance type | **Basic-256mb** |
| Storage | 1 GB al inicio (o 5 GB si preferís margen); se puede subir, **no bajar** |

3. **Create Database** y esperar estado **Available**.
4. Abrir la DB → **Info / Connections** y anotar:

| URL | Uso |
| --- | --- |
| **Internal Database URL** | apps y worker en Render (misma región, red privada) |
| **External Database URL** | tu laptop / Flyway local / `psql` desde fuera |

Formato típico:

```text
postgresql://USER:PASSWORD@HOST:5432/appdb
```

El host **interno** y el **externo** son distintos. Las apps en Render deben
usar siempre la **Internal**.

5. (Opcional) Dashboard → Postgres → **Backups**: confirmar que PITR / exports
   están activos en el plan pago (Basic incluye recovery/exports según tier).

---

## 3. Bootstrap de schemas y roles (una sola vez)

Conectate como el usuario admin de Render (External URL) con `psql` o un
cliente SQL. Ejecutá en este orden.

### 3.1 Schemas

```sql
CREATE SCHEMA IF NOT EXISTS ventas;
CREATE SCHEMA IF NOT EXISTS agro;
CREATE SCHEMA IF NOT EXISTS rrhh;
```

### 3.2 Roles por producto (migrator + app)

Repetir el patrón para `ventas`, `agro`, `rrhh`. Ejemplo para `ventas`
(cambiar passwords por secretos fuertes; no los dejes en el repo):

```sql
-- Passwords: generar fuera del repo y guardar en un gestor (1Password, etc.)
CREATE ROLE ventas_migrator LOGIN PASSWORD '<SECRET_MIGRATOR>';
CREATE ROLE ventas_app      LOGIN PASSWORD '<SECRET_APP>';

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

Hacer lo mismo para `agro_*` → schema `agro` y `rrhh_*` → schema `rrhh`.

### 3.3 Connection strings (misma DB, distinto usuario)

Patrón (Internal, para Render):

```text
postgresql://ventas_migrator:<SECRET>@<INTERNAL_HOST>:5432/appdb
postgresql://ventas_app:<SECRET>@<INTERNAL_HOST>:5432/appdb
```

Misma host/DB/puerto; **solo cambia el usuario (y password)**. El schema **no**
va en la URL: lo resuelve `search_path`.

Guardá estas URLs en el gestor de secretos. Todavía no las pegues en el repo.

### 3.4 Verificación rápida

```sql
-- Como ventas_app
SHOW search_path;          -- debe ser ventas
SELECT current_user;       -- ventas_app
```

---

## 4. Cloudflare R2 (archivos; no va en el disco de Render)

1. Cuenta Cloudflare → **R2** → Create bucket (uno por producto o uno con
   prefijos `ventas/`, `agro/`, `rrhh/`).
2. Crear API token con permiso de lectura/escritura al bucket.
3. Anotar: `Account ID`, `Access Key ID`, `Secret Access Key`,
   `Bucket`, endpoint S3-compatible.
4. Nada de volúmenes persistentes en los web services de Render.

---

## 5. Anthropic (IA)

1. [https://console.anthropic.com](https://console.anthropic.com) → API key.
2. Empezar con modelo Haiku.
3. La key va solo como env var del **worker** (y de la API si encola jobs).
   Nunca en el front ni en el repo.

---

## 6. Environment Groups en Render

Dashboard → **Environment Groups** → crear grupos (evita copiar secrets 3 veces):

| Grupo | Contenido típico |
| --- | --- |
| `shared-infra` | región lógica, flags comunes, no secrets de producto |
| `r2-shared` o por producto | keys R2 / bucket / endpoint |
| `ventas-secrets` | `DATABASE_URL` (user `ventas_app`), JWT/cookie secrets, etc. |
| `agro-secrets` | idem con `agro_app` |
| `rrhh-secrets` | idem con `rrhh_app` |
| `ia-secrets` | `ANTHROPIC_API_KEY`, cola/config del worker |

Para cada producto vas a linkear: grupo de producto + R2 + (worker) IA.

Variables que **sí** van por servicio (no en grupo compartido si chocan):

- `DATABASE_URL` → connection del rol `*_app` (Internal)
- `DATABASE_MIGRATE_URL` o `FLYWAY_URL` → rol `*_migrator` (solo para pre-deploy)
- `DB_POOL_SIZE=5` (máx. 5–10; el límite es de la instancia y lo comparten todos)
- Secrets de cookie/sesión del producto

---

## 7. Crear los web services (uno por producto)

Por cada producto (`ventas-api`, `agro-api`, `rrhh-api`):

1. **New → Web Service**.
2. Conectar el repo de GitHub correspondiente.
3. Configurar:

| Campo | Valor |
| --- | --- |
| Name | `ventas-api` / `agro-api` / `rrhh-api` |
| Region | **la misma que Postgres** |
| Branch | `main` (o la de producción) |
| Runtime | Docker **o** native (Python/Node según el repo) |
| Instance type | **Starter** |
| Build Command | el del producto (ej. Poetry/npm) |
| **Pre-Deploy Command** | Flyway migrate de ese producto (ver §8) |
| Start Command | proceso HTTP (ej. `uvicorn ...`) |
| Health Check Path | `/health` o el que exponga la API |

4. **Environment** → linkear el env group del producto + R2.
5. Setear `DATABASE_URL` con el usuario `*_app` (Internal URL).
6. **Create Web Service**.

Repetir para los tres productos. Cada uno tiene su propio subdomain
`*.onrender.com`; después se agregan custom domains si hace falta.

### Front estático (si aplica)

Si el Angular se sirve aparte: **Static Site** o el mismo web service vía
nginx/Docker. El front **no** recibe `DATABASE_URL`.

---

## 8. Flyway como Pre-Deploy (no dentro del código de la app)

Por producto, una config Flyway con:

```properties
flyway.url=${FLYWAY_URL}
flyway.user=${FLYWAY_USER}
flyway.password=${FLYWAY_PASSWORD}
flyway.schemas=ventas
flyway.defaultSchema=ventas
```

- `flyway.schemas=<producto>` → `flyway_schema_history` vive **dentro** del
  schema del producto.
- SQL **sin** prefijo de schema (`CREATE TABLE clientes`, no `ventas.clientes`).
- Corre como **Pre-Deploy Command** del web service Starter (disponible en
  planes pagos). Si falla, Render **no** levanta la nueva versión.
- Sin `undo` (feature paga de Flyway).

Ejemplo de pre-deploy (ajustar al path real del repo):

```bash
flyway -configFiles=flyway/ventas.conf migrate
```

En Docker, el CLI de Flyway debe estar en la imagen **o** usar una imagen
oficial de Flyway en un job; lo habitual con un solo servicio es incluir el
CLI en el build y llamarlo en pre-deploy con `FLYWAY_URL` del rol
`*_migrator`.

Env vars del pre-deploy (mismo servicio, distintas del runtime app):

| Variable | Valor |
| --- | --- |
| `FLYWAY_URL` | Internal URL con user `ventas_migrator` |
| `FLYWAY_USER` / `FLYWAY_PASSWORD` | o embeber en la URL |
| `DATABASE_URL` | Internal URL con user `ventas_app` (runtime) |

---

## 9. Background worker (bot IA)

1. **New → Background Worker**.
2. Mismo repo o repo del worker; misma región.
3. Plan **Starter**.
4. Start command: el proceso que consume la cola / jobs (nunca HTTP blocking
   hacia Claude en el request del web).
5. Env: `ANTHROPIC_API_KEY`, `DATABASE_URL` del producto que registra consumo
   (o DB compartida con tabla de consumo por `tenant_id`), pool chico.
6. El web encola trabajo; el worker llama a Haiku y escribe tokens/costo por
   `tenant_id`.

---

## 10. Primer deploy y smoke test

1. Push a `main` (o Manual Deploy) de un producto.
2. Verificar en Events: Build → **Pre-deploy (Flyway)** → Deploy Live.
3. Con `psql` (External) como admin:

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('ventas','agro','rrhh');

-- Historial Flyway dentro del schema
SELECT * FROM ventas.flyway_schema_history ORDER BY installed_rank;
```

4. Hit al health check público del web service.
5. Probar una query autenticada con tenant: confirmar que
   `set_config('app.tenant_id', ..., true)` + RLS filtra bien.
6. Subir un archivo de prueba a R2 desde la API.
7. Encolar un job IA de prueba y ver fila de consumo.

---

## 11. Coste mensual aproximado (orden de magnitud)

| Ítem | ~USD/mes |
| --- | --- |
| Workspace Pro | 25 |
| Postgres Basic-256mb + storage | 6 + storage |
| 3 × Web Starter | 21 |
| 1 × Worker Starter | 7 |
| R2 + Anthropic | uso variable |
| **Piso fijo Render** | **~59** + storage/bandwidth |

Ajustar cuando haya tráfico real (bandwidth Pro incluye poco; custom domains
tienen cupo en Pro).

---

## 12. Operación diaria (mínimo viable)

- **Deploys:** autodeploy desde `main`; Flyway en pre-deploy.
- **Secrets:** solo Dashboard / env groups; rotar passwords de roles en
  Postgres + actualizar URLs en Render.
- **Conexiones:** no subir el pool por encima de 5–10 por app; Basic-256mb
  tiene límite bajo (~100) compartido entre 3 webs + worker + admin/Flyway.
- **Backups:** exports periódicos + `pg_dump --schema=ventas` si necesitás
  sacar un producto.
- **Monitoreo:** Events + logs de Render; alertas de Anthropic por gasto.

---

## 13. Orden resumido (copiar y tachar)

1. [ ] Cuenta Render + workspace **Pro** + pago
2. [ ] Postgres **Basic-256mb**, DB **`appdb`**, región fija
3. [ ] Schemas `ventas` / `agro` / `rrhh`
4. [ ] Roles `*_migrator` + `*_app` + `search_path` + default privileges
5. [ ] Anotar Internal/External URLs (sin schema en la URL)
6. [ ] Bucket R2 + API token
7. [ ] API key Anthropic (Haiku)
8. [ ] Environment Groups por producto + R2 + IA
9. [ ] 3 Web Services Starter (misma región), `DATABASE_URL` = `*_app`
10. [ ] Pre-Deploy = Flyway con `flyway.schemas=<producto>` y user migrator
11. [ ] 1 Background Worker Starter para IA
12. [ ] Deploy + verificar `flyway_schema_history` + health + R2 + consumo IA

Cuando esto esté verde, el siguiente trabajo es código de app (RLS policies,
`set_config` en el pool, tablas con `tenant_id`, índices que empiezan por
`tenant_id`) — fuera del alcance de “contratar y poner Render”.
