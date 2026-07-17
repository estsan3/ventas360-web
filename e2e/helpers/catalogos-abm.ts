import { expect, Page, test as baseTest } from '@playwright/test';

/** Login demo admin (requiere API en :8000 y mockApi: false). */
export async function loginComoAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@ventas360.com');
  await page.fill('input[type="password"]', 'demo12345');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/gestion-operativa/);
}

export async function irATransportistas(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Transportistas' }).click();
  await expect(page).toHaveURL(/\/transportistas/);
}

export async function irAProductores(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Productores' }).click();
  await expect(page).toHaveURL(/\/productores/);
}

/** Campo de búsqueda del listado principal (no el del modal). */
export async function buscarEnListado(page: Page, texto: string): Promise<void> {
  await page.locator('.page .toolbar').getByRole('textbox', { name: 'Buscar' }).fill(texto);
}

/** Drawer lateral de edición (no el modal de configuración). */
export function drawer(page: Page) {
  return page.locator('aside.drawer');
}

/** Modal de confirmación del sistema. */
export function confirmDialog(page: Page) {
  return page.getByRole('alertdialog');
}

/** Verifica que la API exponga los endpoints ABM (Fase 3.4). */
export async function apiAbmDisponible(
  request: import('@playwright/test').APIRequestContext,
): Promise<boolean> {
  const login = await request.post('http://localhost:8000/api/v1/auth/login', {
    data: { email: 'admin@ventas360.com', password: 'demo12345' },
  });
  if (!login.ok()) {
    return false;
  }
  const body = (await login.json()) as { access_token?: string };
  if (!body.access_token) {
    return false;
  }
  const headers = { Authorization: `Bearer ${body.access_token}` };
  const transportistas = await request.get('http://localhost:8000/api/v1/transportistas', {
    headers,
  });
  const productores = await request.get('http://localhost:8000/api/v1/productores', { headers });
  return transportistas.ok() && productores.ok();
}

export const test = baseTest.extend<{ skipSinApiAbm: void }>({
  skipSinApiAbm: [
    async ({ request }, use) => {
      const disponible = await apiAbmDisponible(request);
      baseTest.skip(
        !disponible,
        'API sin endpoints /transportistas y /productores (levantar ventas360-api actualizado)',
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };
