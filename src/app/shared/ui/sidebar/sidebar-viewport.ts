/**
 * El token SCSS `$breakpoint-tablet` se publica en `:root` como
 * `--breakpoint-tablet`. matchMedia lo lee para no hardcodear 768px.
 */
export const CSS_VAR_BREAKPOINT_TABLET = '--breakpoint-tablet';

export function leerBreakpointTablet(): string {
  if (typeof document === 'undefined') {
    return '';
  }
  return getComputedStyle(document.documentElement)
    .getPropertyValue(CSS_VAR_BREAKPOINT_TABLET)
    .trim();
}

/** Compacto = tablet vertical y mobile (`max-width` inclusive del token). */
export function querySidebarCompacta(cssVarValue: string): string {
  const px = cssVarValue.trim() || '768px';
  return `(max-width: ${px})`;
}

export function sidebarExpandidaPorDefecto(viewportCompacto: boolean): boolean {
  return !viewportCompacto;
}
