export function estaEnTesoreria(url: string): boolean {
  return url.split('?')[0].startsWith('/tesoreria');
}
