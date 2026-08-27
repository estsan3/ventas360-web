# Workflows n8n · Ventas360

Importables desde **n8n → Workflows → Import from File**.

| Archivo                                                                      | Qué hace                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`ventas360-cierre-dia-whatsapp.json`](./ventas360-cierre-dia-whatsapp.json) | Cron 20:00 → resumen IA → WhatsApp (Meta Cloud API) si hay urgencias |
| [`ventas360-cierre-dia-email.json`](./ventas360-cierre-dia-email.json)       | Cron 20:00 → resumen IA → email SMTP                                 |

## Variables de entorno (n8n)

En Settings → Variables (o en el compose/task de ECS):

```env
VENTAS360_API_URL=https://api.tudominio.com
VENTAS360_N8N_WEBHOOK_SECRET=mismo-secreto-que-la-api
VENTAS360_TENANT_SLUG=demo

# Solo WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_TO=54911XXXXXXXX

# Solo Email
VENTAS360_MAIL_FROM=noreply@tudominio.com
VENTAS360_MAIL_TO=dueno@comercio.com
```

En la API (Secrets Manager / `.env`):

```env
VENTAS360_N8N_WEBHOOK_SECRET=mismo-secreto-que-la-api
```

## Importar WhatsApp

1. n8n → **Import from File** → `ventas360-cierre-dia-whatsapp.json`
2. Workflow **Settings → Timezone** = `America/Argentina/Buenos_Aires`
3. Completá las variables de entorno
4. **Execute workflow** (manual) para probar
5. Activá el workflow

Flujo:

```
Cron 20:00
  → GET /api/v1/ai/webhook/resumen-dia?narrativa=true
  → Armar mensaje (texto + flag urgente)
  → IF urgente (CxC vencida | sin stock | remitos por facturar)
       → POST Meta Graph API (WhatsApp)
       → (sino) NoOp
```

Para **enviar siempre** (aunque no haya urgencias): borrá el nodo IF y conectá `Armar mensaje` → `Enviar WhatsApp`.

### WhatsApp Cloud API (Meta)

1. [Meta for Developers](https://developers.facebook.com/) → App → WhatsApp → API Setup
2. Copiá **Phone number ID** y un **Access token** (permanente en prod)
3. `WHATSAPP_TO` = número del dueño en formato internacional sin `+` (ej. `5491122334455`)
4. Fuera de la ventana de 24h de conversación, Meta exige un **template** aprobado: cambiá el body del HTTP a `type: "template"` cuando lo tengas

Ejemplo de mensaje generado:

```
📊 Ventas360 · Cierre del día

Hoy registraste 5 venta(s) por $120.000. Hay 2 pedido(s) por confirmar.

• Ventas: 5 ($120.000)
• Pedidos pendientes: 2
• Remitos por facturar: 1
• A cobrar: $48.200 (vencido $12.400)
• Bajo stock: 3 · Sin stock: 1

*Prioridades:*
· Cobrar cuentas vencidas
· Facturar remitos confirmados
· Artículos sin stock
```

## Importar Email

1. Importá `ventas360-cierre-dia-email.json`
2. Creá credencial **SMTP** (o Amazon SES SMTP) y asociála al nodo “Enviar email”
3. Seteá `VENTAS360_MAIL_FROM` / `VENTAS360_MAIL_TO`
4. Ejecutá una vez y activá

## Probar el webhook sin n8n

```bash
curl -s "http://localhost:8001/api/v1/ai/webhook/resumen-dia?narrativa=true" \
  -H "X-Tenant-Slug: demo" \
  -H "X-Ventas360-Webhook-Secret: tu-secreto" | jq
```

Si responde `401`, el secreto no coincide o no está configurado en la API.

## Multi-comercio

Duplicá el workflow por tenant o parametrizá `VENTAS360_TENANT_SLUG` / `WHATSAPP_TO` por ejecución (n8n sub-workflows o un listado de comercios en un nodo previo).
