/**
 * Desarrollo local: proxy reescribe /api → http://localhost:8001/api/v1
 * (ver proxy.conf.json). No commitear secrets.
 */
export const environment = {
  production: false,
  apiBaseUrl: '/api',
  mockApi: false,
};
