import { expect, test } from '@playwright/test';

const EMAIL = 'admin@ventas360.com';
const PASSWORD = 'demo12345';

test.describe('Autenticación Ventas360', () => {
  test('API login + me (cookie) responden 200', async ({ request }) => {
    const login = await request.post('http://127.0.0.1:8001/api/v1/auth/login', {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.usuario.email).toBe(EMAIL);
    expect(login.headers()['set-cookie'] ?? '').toContain('ventas360_access_token');

    const me = await request.get('http://127.0.0.1:8001/api/v1/auth/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(EMAIL);
  });

  test('proxy nginx /api/auth/login y /me', async ({ request }) => {
    const login = await request.post('http://localhost:4201/api/auth/login', {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(login.status()).toBe(200);
    expect((await login.json()).usuario.email).toBe(EMAIL);

    const me = await request.get('http://localhost:4201/api/auth/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(EMAIL);
  });

  test('UI: login → dashboard → logout', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();

    await page.getByLabel('Correo electrónico').fill(EMAIL);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText(/Dashboard|Ventas/i).first()).toBeVisible();

    // Persistencia de cookie: recarga
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto('/configuracion');
    await page.getByRole('button', { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
