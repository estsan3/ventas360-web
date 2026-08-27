/** Mínimo de caracteres para disparar búsquedas de listados. */
export const MIN_CHARS_BUSQUEDA = 3;

export function textoBusquedaValido(q: string): boolean {
  return q.trim().length >= MIN_CHARS_BUSQUEDA;
}
