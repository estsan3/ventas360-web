# Ventas360 Web

Backoffice Angular de **Ventas360**: gestión de ventas/comercio con agentes de IA.

Arquitectura: feature-based, smart/dumb, Signals, dto≠modelo, cookie httpOnly.  
Detalle: [docs/ARQUITECTURA-WEB.md](docs/ARQUITECTURA-WEB.md) y `.cursor/rules/arquitectura-angular.mdc`.

## Inicio rápido

```bash
npm install
npm start -- --port 4201
```

Abrir [http://localhost:4201/](http://localhost:4201/).

Proxy: `/api` → `http://localhost:8001/api/v1` (`proxy.conf.json`), con cookies.

API en paralelo:

```bash
cd ../ventas360-api && poetry run uvicorn app.main:app --reload --port 8001
```

CORS del API debe incluir `http://localhost:4201` (ya en default).

### Login demo

| Campo    | Valor                 |
| -------- | --------------------- |
| Email    | `admin@ventas360.com` |
| Password | `demo12345`           |

## Rutas

| Ruta             | Descripción                 |
| ---------------- | --------------------------- |
| `/login`         | Autenticación (cookie)      |
| `/dashboard`     | Resumen                     |
| `/clientes`      | ABM clientes + config modal |
| `/productos`     | Catálogo productos          |
| `/ventas`        | Pedidos + estados           |
| `/configuracion` | Perfil y logout             |

## Scripts

| Comando             | Descripción |
| ------------------- | ----------- |
| `npm start`         | Dev server  |
| `npm run build`     | Build prod  |
| `npm test`          | Vitest      |
| `npm run storybook` | UI kit      |
