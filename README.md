# Ventas360 Web

Backoffice Angular de **Ventas360**: gestión de ventas/comercio con agentes de IA.

Arquitectura: feature-based, smart/dumb, Signals, dto≠modelo, cookie httpOnly.  
Detalle: [docs/ARQUITECTURA-WEB.md](docs/ARQUITECTURA-WEB.md) y `.cursor/rules/arquitectura-angular.mdc`.

## Inicio rápido

```bash
npm install
npm start
```

Abrir el comercio en [http://demo.localhost:4201/](http://demo.localhost:4201/) y la plataforma en [http://admin.localhost:4201/](http://admin.localhost:4201/). En macOS `*.localhost` apunta a 127.0.0.1 (no hace falta `/etc/hosts`).

`http://localhost:4201` no alcanza: el login usa el subdominio como slug del comercio.

Proxy: `/api` → `http://localhost:8001/api/v1` (`proxy.conf.json`), con cookies. El GET same-origin no manda `Origin`; el front y el proxy envían `X-Forwarded-Host` con el subdominio para que la API clasifique el comercio.

API en paralelo:

```bash
cd ../ventas360-api && poetry run uvicorn app.main:app --reload --port 8001
```

### Login demo

| Host                   | Email                 | Password    |
| ---------------------- | --------------------- | ----------- |
| `demo.localhost:4201`  | `admin@ventas360.com` | `demo12345` |
| `admin.localhost:4201` | `super@ventas360.com` | `demo12345` |

## Rutas

| Ruta             | Descripción               |
| ---------------- | ------------------------- |
| `/login`         | Autenticación (cookie)    |
| `/dashboard`     | Inicio                    |
| `/ventas`        | Mostrador                 |
| `/configuracion` | Negocio, usuarios, matriz |
| `/comercios`     | Plataforma (`admin.*`)    |

## Scripts

| Comando             | Descripción |
| ------------------- | ----------- |
| `npm start`         | Dev server  |
| `npm run build`     | Build prod  |
| `npm test`          | Vitest      |
| `npm run storybook` | UI kit      |
