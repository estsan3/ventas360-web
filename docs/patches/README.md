# Patch API · Suite IA (`cursor/remito-foto-ia-a8b6`)

El bot de Cursor **no tiene permiso de push** a `ventas360-api`.  
Aplicá este patch en tu máquina y abrí el PR de la API.

## Contenido

2 commits:

1. `feat(compras): parsear remito desde foto con Claude Haiku`
2. `feat(ia): mostrador, acciones del día, resumen y webhook n8n`

## Aplicar y abrir PR

```bash
cd ventas360-api
git fetch origin
git checkout main
git pull origin main
git checkout -b cursor/remito-foto-ia-a8b6

# Desde el clone de ventas360-web (o descargá el patch del PR):
git am /ruta/a/ventas360-web/docs/patches/ventas360-api-ia-a8b6.patch

poetry install
poetry run pytest tests/test_api_ia.py tests/test_bo_ia.py tests/test_api_parsear_remito.py tests/test_bo_remito_vision.py -v

git push -u origin cursor/remito-foto-ia-a8b6
gh pr create --base main --head cursor/remito-foto-ia-a8b6 \
  --title "feat(ia): remito foto, mostrador, acciones, resumen y webhook n8n" \
  --body "## Pair con ventas360-web PR #2

### Endpoints
- \`POST /compras/remitos/parsear\`
- \`POST /ai/mostrador/interpretar\`
- \`GET /ai/acciones\`
- \`GET /ai/resumen-dia\`
- \`GET /ai/webhook/resumen-dia\` (n8n)

### Env
\`\`\`
VENTAS360_ANTHROPIC_API_KEY=
VENTAS360_N8N_WEBHOOK_SECRET=
VENTAS360_AI_HABILITADA=true
VENTAS360_REMITO_PARSE_MODO=auto
\`\`\`

Mergear **antes o junto** con el PR web #2.
"
```

Orden de merge recomendado: **API primero**, luego **web**.
