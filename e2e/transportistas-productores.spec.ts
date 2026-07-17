import {
  buscarEnListado,
  confirmDialog,
  drawer,
  expect,
  irAProductores,
  irATransportistas,
  loginComoAdmin,
  test,
} from './helpers/catalogos-abm';

/**
 * E2E transportistas + productores contra API real.
 *
 * Requisitos:
 * - API: docker compose up (localhost:8000)
 * - Front: npm start (localhost:4200, proxy /api → API)
 * - environment.mockApi = false
 */
test.describe('Transportistas y productores — integración API', () => {
  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('transportistas: alta, config modal, camión y confirmación al cerrar', async ({ page }) => {
    const sufijo = Date.now();
    const nombreFantasia = `E2E Transporte ${sufijo}`;
    const patente = `E2${String(sufijo).slice(-3)}CD`;

    await irATransportistas(page);

    // Alta de empresa
    await page.getByRole('button', { name: /Nueva empresa/i }).click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Nombre fantasía').fill(nombreFantasia);
    await drawer(page).getByLabel('Razón social').fill(`${nombreFantasia} SRL`);
    await drawer(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Empresa creada')).toBeVisible({ timeout: 10_000 });

    // Modal de configuración abierto tras crear
    await expect(page.getByRole('dialog').filter({ hasText: 'Configuración' })).toBeVisible();

    // Alta de camión dentro del modal
    await page.getByRole('button', { name: /Agregar camión/i }).click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Dominio').fill(patente);
    await drawer(page).getByLabel('Modelo').fill('Scania E2E');
    await drawer(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Camión agregado')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(patente)).toBeVisible({ timeout: 10_000 });

    // Confirmación al cerrar drawer con cambios sin guardar
    await page
      .locator('tr', { hasText: patente })
      .getByRole('button', { name: 'Editar camión' })
      .click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Modelo').fill('Scania modificado E2E');
    await drawer(page).getByRole('button', { name: 'Cancelar' }).click();

    await expect(confirmDialog(page)).toBeVisible();
    await expect(confirmDialog(page)).toContainText('Cambios sin guardar');
    await confirmDialog(page).getByRole('button', { name: 'Seguir editando' }).click();
    await expect(drawer(page)).toBeVisible();

    await drawer(page).getByRole('button', { name: 'Cancelar' }).click();
    await confirmDialog(page).getByRole('button', { name: 'Cerrar sin guardar' }).click();
    await expect(drawer(page)).toBeHidden();

    // Listado principal muestra la empresa creada
    await page.locator('button.modal__backdrop').click();
    await buscarEnListado(page, nombreFantasia);
    await expect(page.getByText(nombreFantasia).first()).toBeVisible();
  });

  test('productores: alta, config modal, campo y confirmación al cerrar', async ({ page }) => {
    const sufijo = Date.now();
    const nombreFantasia = `E2E Productor ${sufijo}`;
    const nombreCampo = `Campo E2E ${sufijo}`;

    await irAProductores(page);

    // Alta de productor
    await page.getByRole('button', { name: /Nuevo productor/i }).click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Nombre fantasía').fill(nombreFantasia);
    await drawer(page).getByLabel('Razón social').fill(`${nombreFantasia} SA`);
    await drawer(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Productor creado')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('dialog').filter({ hasText: 'Configuración' })).toBeVisible();

    // Alta de campo
    await page.getByRole('button', { name: /Agregar campo/i }).click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Nombre').fill(nombreCampo);
    await drawer(page).getByLabel('Código interno').fill(`C-${sufijo}`);
    await drawer(page).getByLabel('Latitud').fill('-33.12');
    await drawer(page).getByLabel('Longitud').fill('-60.45');
    await drawer(page).getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Campo agregado')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(nombreCampo)).toBeVisible({ timeout: 10_000 });

    // Confirmación al cerrar edición de campo
    await page
      .locator('tr', { hasText: nombreCampo })
      .getByRole('button', { name: 'Editar campo' })
      .click();
    await expect(drawer(page)).toBeVisible();
    await drawer(page).getByLabel('Localidad').fill('Pergamino E2E');
    await drawer(page).getByRole('button', { name: 'Cancelar' }).click();

    await expect(confirmDialog(page)).toBeVisible();
    await confirmDialog(page).getByRole('button', { name: 'Seguir editando' }).click();
    await expect(drawer(page)).toBeVisible();

    await drawer(page).getByRole('button', { name: 'Cancelar' }).click();
    await confirmDialog(page).getByRole('button', { name: 'Cerrar sin guardar' }).click();
    await expect(drawer(page)).toBeHidden();

    // Seed visible + búsqueda del nuevo productor
    await page.locator('button.modal__backdrop').click();
    await buscarEnListado(page, 'Agro SA');
    await expect(page.getByText('Agro SA').first()).toBeVisible();
    await buscarEnListado(page, nombreFantasia);
    await expect(page.getByText(nombreFantasia).first()).toBeVisible();
  });

  test('transportistas seed: abrir config de Transportes del Plata', async ({ page }) => {
    await irATransportistas(page);
    await buscarEnListado(page, 'Transportes del Plata');
    await page.getByRole('button', { name: 'Configurar empresa' }).first().click();
    await expect(
      page.getByRole('dialog').filter({ hasText: 'Transportes del Plata' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Camiones' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choferes' })).toBeVisible();
  });
});
