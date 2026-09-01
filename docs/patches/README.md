# Patch API · Talonario presupuesto (`cursor/talonarios-presupuesto-aa66`)

El bot de Cursor **no tiene permiso de push** a `ventas360-api`.
Aplicá este patch en tu máquina y abrí el PR de la API.

## Por qué no alcanza con borrar el seed

`presupuesto` es un tipo de comprobante de primer nivel (`VentasService.crear` le asigna número de talonario). El modelo ORM ya documenta `pedido | remito | factura | presupuesto`. El seed de casuística inserta `tal-presupuesto` (`PRE-`, próximo 100) a propósito, no por error.

Borrar esa fila:

- no repara bases ya sembradas (el GET sigue en 500)
- deja presupuestos nuevos sin numerador (`numero = null`)
- oculta el desfasaje del contrato

Hay que **ampliar el schema y el BO**, no recortar el seed. El patch también agrega el `import Talonario` que faltaba en `seed_casuistica.py` (sin eso el seed revienta en `NameError`).

## Aplicar y abrir PR

```bash
cd ventas360-api
git fetch origin
git checkout main
git pull origin main
git checkout -b cursor/talonarios-presupuesto-aa66

git am /ruta/a/ventas360-web/docs/patches/ventas360-api-talonario-presupuesto-aa66.patch

poetry run pytest tests/test_bo_parametros.py tests/test_api_reporteria_fase_a.py -v

git push -u origin cursor/talonarios-presupuesto-aa66
gh pr create --base main --head cursor/talonarios-presupuesto-aa66 \
  --title "fix(parametros): aceptar presupuesto como tipo de talonario" \
  --body "El GET /parametros/talonarios devolvía 500 porque el seed de casuística siembra tipo_comprobante=presupuesto y TalonarioResponse no lo admitía. Pair con el PR de ventas360-web."
```

Orden de merge: **API primero**, luego web (el front ya tipa presupuesto; sin el API el listado sigue en error, ahora distinguido del vacío).

---

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
