# IA + n8n en AWS

Ventas360 expone IA por REST. n8n corre aparte (ECS/EC2) y llama a la API.

## Endpoints IA

| Método | Ruta                               | Auth                                   | Uso                         |
| ------ | ---------------------------------- | -------------------------------------- | --------------------------- |
| POST   | `/api/v1/ai/mostrador/interpretar` | JWT cookie/Bearer + módulo `mostrador` | Mostrador: texto → borrador |
| GET    | `/api/v1/ai/acciones`              | JWT + módulo `inicio`                  | Centro de acciones (reglas) |
| GET    | `/api/v1/ai/resumen-dia`           | JWT + módulo `inicio`                  | KPIs + narrativa IA         |
| GET    | `/api/v1/ai/webhook/resumen-dia`   | Secreto + tenant slug                  | **n8n** (sin login)         |
| POST   | `/api/v1/compras/remitos/parsear`  | JWT + módulo `compras`                 | Foto remito compra          |

## Variables API (Secrets Manager)

```env
VENTAS360_ANTHROPIC_API_KEY=sk-ant-...
VENTAS360_ANTHROPIC_MODEL=claude-haiku-4-5-20251001
VENTAS360_REMITO_PARSE_MODO=auto
VENTAS360_AI_HABILITADA=true
VENTAS360_N8N_WEBHOOK_SECRET=un-secreto-largo-aleatorio
```

Sin `ANTHROPIC_API_KEY` → modo **mock** (demo local).

## Webhook n8n → Ventas360

Headers obligatorios:

```
X-Ventas360-Webhook-Secret: <VENTAS360_N8N_WEBHOOK_SECRET>
X-Tenant-Slug: demo
```

Ejemplo nodo **HTTP Request** (cron 20:00):

```
GET https://api.tudominio.com/api/v1/ai/webhook/resumen-dia?narrativa=true
```

Respuesta:

```json
{
  "metricas": { "ventas_dia": 5, "monto_ventas_dia": 120000, ... },
  "narrativa": "Hoy registraste 5 ventas...",
  "acciones_destacadas": ["Cobrar cuentas vencidas", ...]
}
```

### Workflows listos para importar

Ver carpeta [`docs/n8n/`](./n8n/README.md):

| Archivo                                  | Canal                     |
| ---------------------------------------- | ------------------------- |
| `n8n/ventas360-cierre-dia-whatsapp.json` | WhatsApp (Meta Cloud API) |
| `n8n/ventas360-cierre-dia-email.json`    | Email SMTP / SES          |

Import: n8n → Workflows → **Import from File**.

Alternativa con JWT (sin webhook secret): nodo **HTTP Request** login + Bearer en siguientes nodos.

## AWS (referencia mínima)

```
Internet
   │
   ├─ CloudFront → S3 (Angular ventas360-web)
   │
   ├─ ALB → ECS Fargate (ventas360-api :8000)
   │         └─ RDS Postgres
   │
   └─ ALB → ECS (n8n :5678)  ← opcional, misma VPC
```

- API y n8n en la **misma VPC**; n8n llama a la API por URL interna del ALB o `api.tudominio.com`.
- Secreto n8n y Anthropic en **Secrets Manager**; inyectar en task definition ECS.
- n8n **no** está en el path del mostrador (solo async: resúmenes, alertas, WhatsApp).

## Probar local

```bash
# Terminal 1 — API
cd ventas360-api && poetry run uvicorn app.main:app --reload --port 8001

# Terminal 2 — Web
cd ventas360-web && npm start

# Tests IA
cd ventas360-api && poetry run pytest tests/test_api_ia.py tests/test_bo_ia.py -v

# Webhook local
curl -s "http://localhost:8001/api/v1/ai/webhook/resumen-dia" \
  -H "X-Tenant-Slug: demo" \
  -H "X-Ventas360-Webhook-Secret: tu-secreto"
```

Login web: `http://demo.localhost:4201` · `admin@ventas360.com` / `demo12345`

- **Inicio**: acciones del día + resumen IA
- **Mostrador**: barra “Asistente IA”
- **Inventario → Recepción**: foto remito
