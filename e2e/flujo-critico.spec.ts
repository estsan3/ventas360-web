import { test } from '@playwright/test';

/**
 * El flujo crítico legado (despachos / gestión operativa) pertenece a Agro360.
 * Ventas360 usa e2e/login.spec.ts.
 */
test.describe.skip('legado Agro360 — omitido en Ventas360', () => {
  test('placeholder', async () => {
    /* intentionally skipped */
  });
});
