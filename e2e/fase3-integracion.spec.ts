import { expect, test } from '@playwright/test';

/**
 * Fase 3 — verificación E2E contra API real (mockApi: false + proxy).
 */
test.describe('Fase 3 — integración API real', () => {
  test('login → crear despacho activo → gestión operativa → borrador → mensajería → config', async ({
    page,
  }) => {
    const sufijo = Date.now();
    const nombreActivo = `Campaña E2E Fase3 ${sufijo}`;
    const nombreBorrador = `Borrador E2E Fase3 ${sufijo}`;

    // 1. Login + sesión
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ventas360.com');
    await page.fill('input[type="password"]', 'demo12345');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/gestion-operativa/);

    // 2. Crear despacho activo (fecha llegada opcional en UI)
    await page.click('button[aria-label="Crear despacho"]');
    await page.fill('input[placeholder="Campaña Soja 2026"]', nombreActivo);
    const selects = page.locator('select');
    await selects.nth(0).selectOption({ label: 'Agro SA' });
    await selects.nth(1).selectOption({ label: 'Campo Norte' });
    await page.fill('input[placeholder="Rosario, Santa Fe"]', 'Rosario, Santa Fe');
    await selects.nth(2).selectOption({ index: 1 });
    await selects.nth(3).selectOption({ label: 'Soja' });
    await selects.nth(4).selectOption({ index: 1 });
    await selects.nth(5).selectOption({ index: 1 });
    await page.locator('input[type="date"]').first().fill('2026-09-01');
    await selects.nth(6).selectOption({ label: 'Carlos Ruiz' });
    await page.fill('input[placeholder="Puerto San Martín"]', 'Buenos Aires - Puerto');
    await page.locator('.vtable input[type="number"]').fill('28.5');
    await page.getByRole('button', { name: /Crear Despacho/ }).click();
    await expect(page.getByText('creado correctamente')).toBeVisible({ timeout: 10_000 });

    // 3. Gestión operativa
    await page.click('button[aria-label="Gestión operativa"]');
    await expect(page.getByText(nombreActivo).first()).toBeVisible();

    // 4. Guardar borrador
    await page.click('button[aria-label="Crear despacho"]');
    await page.fill('input[placeholder="Campaña Soja 2026"]', nombreBorrador);
    await selects.nth(0).selectOption({ label: 'Agro SA' });
    await selects.nth(1).selectOption({ label: 'Campo Norte' });
    await page.fill('input[placeholder="Rosario, Santa Fe"]', 'Rosario');
    await selects.nth(2).selectOption({ index: 1 });
    await selects.nth(3).selectOption({ label: 'Maíz' });
    await selects.nth(4).selectOption({ index: 1 });
    await selects.nth(5).selectOption({ index: 1 });
    await page.locator('input[type="date"]').first().fill('2026-09-05');
    await selects.nth(6).selectOption({ label: 'Carlos Ruiz' });
    await page.fill('input[placeholder="Puerto San Martín"]', 'Bahía Blanca');
    await page.locator('.vtable input[type="number"]').fill('20');
    await page.getByRole('button', { name: /Guardar borrador/ }).click();
    await expect(page).toHaveURL(/\/borradores/);
    await expect(page.getByText(nombreBorrador)).toBeVisible();

    // 5. Mensajería
    await page.click('button[aria-label="Mensajería"]');
    await expect(page).toHaveURL(/\/mensajeria/);
    await page.locator('.conv').first().click();
    await page.fill('input[placeholder="Escribe un mensaje..."]', 'Hola desde E2E Fase 3');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    // 6. Configuración — parámetros
    await page.click('button[aria-label="Configuración"]');
    await page.getByRole('tab', { name: 'Parámetros' }).click();
    await page.locator('input[type="number"]').first().fill('1200');
    await page.getByRole('button', { name: /Guardar cambios/ }).click();
    await expect(page.getByText('Parámetros actualizados')).toBeVisible();

    // 7. Logout
    await page.getByRole('tab', { name: 'Mi cuenta' }).click();
    await page.getByRole('button', { name: /Cerrar sesión/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
