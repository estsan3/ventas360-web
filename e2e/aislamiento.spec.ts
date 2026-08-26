import { APIRequestContext, expect, test } from '@playwright/test';

const API = 'http://127.0.0.1:8001/api/v1';
const PASSWORD = 'demo12345';

async function loginApi(request: APIRequestContext, origin: string, email: string) {
  const login = await request.post(`${API}/auth/login`, {
    headers: { Origin: origin },
    data: { email, password: PASSWORD },
  });
  expect(login.status()).toBe(200);
  return {
    token: (await login.json()).access_token as string,
    origin,
  };
}

test.describe('Aislamiento entre comercios', () => {
  test('Norte no ve en Clientes el dato secreto de Sur', async ({ page, request }) => {
    const sufijo = `${Date.now()}`;
    const superLogin = await request.post(`${API}/auth/login`, {
      headers: { Origin: 'http://admin.localhost:4201' },
      data: { email: 'super@ventas360.com', password: PASSWORD },
    });
    expect(superLogin.status()).toBe(200);
    const superToken = (await superLogin.json()).access_token as string;
    const plataforma = {
      Authorization: `Bearer ${superToken}`,
      Origin: 'http://admin.localhost:4201',
    };

    const altaSur = await request.post(`${API}/tenants`, {
      headers: plataforma,
      data: {
        nombre: `Iso Sur ${sufijo}`,
        slug: `iso-sur-${sufijo}`,
        administrador: {
          nombre: 'Admin Sur',
          dni: '30111999',
          email: `ana-sur-${sufijo}@iso.demo`,
          password: PASSWORD,
        },
      },
    });
    expect(altaSur.status()).toBe(201);
    const sur = await altaSur.json();
    const originSur = `http://${sur.slug}.localhost:4201`;
    const sesionSur = await loginApi(request, originSur, sur.administrador.email);

    const secreto = `AAA-SECRETO-SUR-${sufijo}`;
    const crear = await request.post(`${API}/clientes`, {
      headers: {
        Authorization: `Bearer ${sesionSur.token}`,
        Origin: originSur,
      },
      data: {
        nombre: secreto,
        email: `secreto-sur-${sufijo}@iso.demo`,
        telefono: '1',
      },
    });
    expect(crear.status()).toBe(201);

    await page.goto('http://demo.localhost:4201/login');
    await page.getByLabel('Correo electrónico').fill('admin@ventas360.com');
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto('http://demo.localhost:4201/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText(secreto)).toHaveCount(0);

    await page.goto(`${originSur}/login`);
    await page.getByLabel('Correo electrónico').fill(sur.administrador.email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await page.goto(`${originSur}/clientes`);
    await expect(page.getByText(secreto)).toBeVisible();
  });
});
