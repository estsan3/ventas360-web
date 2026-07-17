# Ventas360 Web

Backoffice web de **Ventas360**: gestión de ventas retail con agentes de IA. Panel para administradores y vendedores con dashboard, clientes, productos y ventas.

## Inicio rápido

```bash
npm install
npm start
```

Abrir [http://localhost:4200/](http://localhost:4200/).

El dev server usa proxy hacia la API en `http://localhost:8000` (ver `proxy.conf.json`).

### Login demo

| Campo    | Valor                 |
| -------- | --------------------- |
| Email    | `admin@ventas360.com` |
| Password | `demo12345`           |

## Rutas

| Ruta             | Descripción                           |
| ---------------- | ------------------------------------- |
| `/login`         | Autenticación                         |
| `/dashboard`     | Resumen de ventas (default)           |
| `/clientes`      | Gestión de clientes (placeholder)     |
| `/productos`     | Catálogo de productos (placeholder)   |
| `/ventas`        | Registro de ventas (placeholder)      |
| `/configuracion` | Perfil del usuario y cierre de sesión |

## Scripts

| Comando         | Descripción      |
| --------------- | ---------------- |
| `npm start`     | Dev server       |
| `npm run build` | Build producción |
| `npm test`      | Tests unitarios  |
| `npm run lint`  | ESLint           |
