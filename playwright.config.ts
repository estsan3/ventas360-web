import { defineConfig } from '@playwright/test';

/**
 * E2E contra el stack Docker (web :4201 → API :8001).
 * Levantá antes: `cd ../ventas360-api && docker compose up -d`
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4201',
    viewport: { width: 1280, height: 900 },
    trace: 'on-first-retry',
  },
  // No arranca ng serve: usa el contenedor ventas360-web.
});
