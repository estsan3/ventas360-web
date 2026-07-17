# Arquitectura web Ventas360

Guía alineada al prompt de arquitectura Angular (origen Agro360, julio 2026).

**Stack:** Angular standalone · Signals · Vitest · Playwright · Storybook  
**Backend:** FastAPI REST (`withCredentials` + cookie httpOnly)

## Carpetas

Ver `.cursor/rules/arquitectura-angular.mdc`.

## Auth

- Login setea cookie `ventas360_access_token` (httpOnly, SameSite=Lax).
- Front: `authInterceptor` → `withCredentials: true` (sin sessionStorage).
- CORS: origins explícitos (`4200`/`4201`); `allow_credentials=true`.

## data-access por feature

`*.dto.ts` → `*.mapper.ts` → `*.model.ts` → `*.service.ts` → `*.store.ts`

## Rutas

Cada feature exporta `*_ROUTES` en `<dominio>.routes.ts`; `app.routes.ts` solo compone el shell.

## Cross-feature

Prohibido importar stores/services internos de otro feature. Lookups vía HTTP en el propio `*.service.ts` del feature.
