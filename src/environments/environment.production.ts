/**
 * Producción: mismo origen o API detrás de reverse proxy.
 * Ajustar apiBaseUrl en el deploy si el front y la API están en hosts distintos
 * (entonces CORS + cookie SameSite deben estar alineados en el backend).
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  mockApi: false,
};
