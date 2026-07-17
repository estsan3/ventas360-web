import { expect, test } from '@playwright/test';

/**
 * Flujo crítico end-to-end: login → crear despacho con viaje →
 * verlo reflejado en gestión operativa → cerrar sesión.
 * Corre contra la API real (environment.mockApi = false).
 */
test('login → crear despacho → gestión operativa → logout', async ({ page }) => {
  // --- Login ---
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@ventas360.com');
  await page.fill('input[type="password"]', 'demo12345');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/gestion-operativa/);

  // --- Crear despacho con un viaje (formulario con tabs + tabla editable) ---
  await page.click('button[aria-label="Crear despacho"]');
  await expect(page).toHaveURL(/\/despachos/);
  const nombreCampana = `Campaña E2E ${Date.now()}`;
  await page.fill('input[placeholder="Campaña Soja 2026"]', nombreCampana);
  const selects = page.locator('select');
  await selects.nth(0).selectOption({ label: 'Agro SA' }); // productor
  await selects.nth(1).selectOption({ label: 'Campo Norte' }); // campo
  await page.fill('input[placeholder="Rosario, Santa Fe"]', 'Rosario, Santa Fe');
  await selects.nth(2).selectOption({ index: 1 }); // entrada campo
  await selects.nth(3).selectOption({ label: 'Soja' }); // material
  await selects.nth(4).selectOption({ index: 1 }); // administrador
  await selects.nth(5).selectOption({ index: 1 }); // vendedor
  await page.locator('input[type="date"]').first().fill('2026-09-01');

  // Fila inicial de la tabla editable de viajes
  await selects.nth(6).selectOption({ label: 'Carlos Ruiz' }); // chofer (autocompleta dominio)
  await page.fill('input[placeholder="Puerto San Martín"]', 'Buenos Aires - Puerto');
  await page.locator('.vtable input[type="number"]').fill('28.5');

  await page.getByRole('button', { name: /Crear Despacho/ }).click();
  await expect(page.getByText('creado correctamente')).toBeVisible();

  // --- Verlo en gestión operativa (comunicación vía store + recarga) ---
  await page.click('button[aria-label="Gestión operativa"]');
  await expect(page.getByText(nombreCampana)).toBeVisible();

  // --- Logout desde configuración ---
  await page.click('button[aria-label="Configuración"]');
  await page.getByRole('tab', { name: 'Mi cuenta' }).click();
  await page.getByRole('button', { name: /Cerrar sesión/ }).click();
  await expect(page).toHaveURL(/\/login/);
});
