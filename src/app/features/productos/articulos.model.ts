import { Producto } from './data-access/producto.model';

export type TabArt = 'catalogo' | 'importar' | 'listas';
export type FichaTab = 'General' | 'Precios' | 'Stock';
export type ChipArt = 'Todos' | 'sinsku' | 'sinean' | 'margen';
export type SkuModo = 'propio' | 'prov' | 'ean';
export type TonoArt = 'ok' | 'warn' | 'danger' | 'muted' | 'info';

export const MIN_CHARS_ART = 3;

export const CHIPS_ART: { id: ChipArt; label: string }[] = [
  { id: 'Todos', label: 'Todos' },
  { id: 'sinsku', label: 'Sin SKU propio' },
  { id: 'sinean', label: 'Sin código de barras' },
  { id: 'margen', label: 'Margen bajo' },
];

export const DESTINOS_COL = [
  'Ignorar',
  'Código del proveedor',
  'Descripción',
  'Marca',
  'Rubro',
  'Precio de lista',
  'Descuento %',
  'Costo neto',
  'IVA %',
  'Código de barras',
  'Unidades por bulto',
  'Precio de venta sugerido',
] as const;

export type DestinoCol = (typeof DESTINOS_COL)[number];

export const COLS_DEMO: { letra: string; enc: string; muestra: string; sugerido: DestinoCol }[] = [
  {
    letra: 'A',
    enc: 'CODIGO',
    muestra: 'TAP-8X1-100 · ALB-LAT-20 · MAN-12-25',
    sugerido: 'Código del proveedor',
  },
  {
    letra: 'B',
    enc: 'DETALLE',
    muestra: 'TORNILLO AUTOPERF. 8X1 CAJA X100',
    sugerido: 'Descripción',
  },
  { letra: 'C', enc: 'MARCA', muestra: 'BULONEX · ALBA · REHAU', sugerido: 'Marca' },
  { letra: 'D', enc: 'RUBRO', muestra: 'FIJACIONES · PINTURAS · JARDIN', sugerido: 'Rubro' },
  {
    letra: 'E',
    enc: 'P. LISTA',
    muestra: '7.320,00 · 51.360,00 · 22.320,00',
    sugerido: 'Precio de lista',
  },
  { letra: 'F', enc: 'DTO', muestra: '16,67 · 16,67 · 16,67', sugerido: 'Descuento %' },
  { letra: 'G', enc: 'IVA', muestra: '21 · 21 · 21', sugerido: 'IVA %' },
  {
    letra: 'H',
    enc: 'EAN13',
    muestra: '7790000184000 · 7790000321200',
    sugerido: 'Código de barras',
  },
  { letra: 'I', enc: 'BULTO', muestra: '12 · 1 · 6', sugerido: 'Unidades por bulto' },
  { letra: 'J', enc: 'OBS', muestra: 'REPOSICION · NUEVO · —', sugerido: 'Ignorar' },
  { letra: 'K', enc: 'VIGENCIA', muestra: '01/09/2026', sugerido: 'Ignorar' },
];

export interface PreviewImportLinea {
  nom: string;
  codProv: string;
  costo: number;
  ant: number;
  sku: string;
  accion: AccionImport;
}

export type AccionImport =
  'Actualiza costo' | 'Alta nueva' | 'Sin cambios' | 'Sin SKU propio' | 'Omitida';

export const PREV_DEMO: PreviewImportLinea[] = [
  {
    nom: 'Tornillo autoperf. 8x1 caja x100',
    codProv: 'TAP-8X1-100',
    costo: 6100,
    ant: 5400,
    sku: 'FER-000142',
    accion: 'Actualiza costo',
  },
  {
    nom: 'Pintura látex interior 20 l blanco',
    codProv: 'ALB-LAT-20',
    costo: 42800,
    ant: 38900,
    sku: 'FER-000390',
    accion: 'Actualiza costo',
  },
  {
    nom: 'Manguera reforzada 1/2" x 25 m',
    codProv: 'MAN-12-25',
    costo: 18600,
    ant: 18600,
    sku: 'FER-000411',
    accion: 'Sin cambios',
  },
  {
    nom: 'Cerradura doble paleta reforzada',
    codProv: 'CER-DP-R',
    costo: 29900,
    ant: 27400,
    sku: 'FER-000502',
    accion: 'Actualiza costo',
  },
  {
    nom: 'Amoladora angular 4,5" 900W',
    codProv: 'AMO-45-900',
    costo: 96400,
    ant: 0,
    sku: '',
    accion: 'Alta nueva',
  },
  {
    nom: 'Disco de corte metal 4,5" (x10)',
    codProv: 'DIS-45-MET',
    costo: 12300,
    ant: 0,
    sku: '',
    accion: 'Alta nueva',
  },
  {
    nom: 'Candado bronce 40 mm',
    codProv: 'CAN-BR-40',
    costo: 8900,
    ant: 0,
    sku: '',
    accion: 'Alta nueva',
  },
  {
    nom: 'Bulonería surtida x kg',
    codProv: 'BUL-SURT-KG',
    costo: 8400,
    ant: 8400,
    sku: '',
    accion: 'Sin SKU propio',
  },
  {
    nom: 'Silicona neutra 280 ml',
    codProv: 'SIL-NEU-280',
    costo: 6700,
    ant: 7900,
    sku: '',
    accion: 'Alta nueva',
  },
  {
    nom: 'Cinta métrica 5 m',
    codProv: 'CIN-MET-5',
    costo: 5200,
    ant: 4100,
    sku: 'FER-000601',
    accion: 'Actualiza costo',
  },
];

export const REDONDEOS = [
  'Redondear a $ 100',
  'Redondear a $ 10',
  'Terminar en 900',
  'Sin redondeo',
] as const;

export const OPCIONES_IMP: { id: string; label: string }[] = [
  {
    id: 'actualizar',
    label: 'Actualizar el costo de los artículos que ya existen (match por código de proveedor)',
  },
  { id: 'ean', label: 'Completar el código de barras si el artículo no lo tiene cargado' },
  {
    id: 'recalcular',
    label: 'Recalcular el precio de venta con el margen, incluso si fue editado a mano',
  },
  { id: 'altas', label: 'Dar de alta los artículos nuevos en estado inactivo hasta revisarlos' },
];

export const REGLAS_PRECIO: { id: string; label: string; sub: string }[] = [
  {
    id: 'avisar',
    label: 'Avisar si un costo sube más de 10 %',
    sub: 'No se aplica automáticamente: queda para revisión manual.',
  },
  {
    id: 'historial',
    label: 'Guardar historial de costos y precios',
    sub: 'Permite ver la evolución y volver atrás una importación.',
  },
  {
    id: 'auto',
    label: 'Recalcular todas las listas al cambiar un costo',
    sub: 'Mantiene el margen de cada lista sin tocar nada a mano.',
  },
  {
    id: 'congelar',
    label: 'Respetar precios editados a mano',
    sub: 'Los precios marcados como fijos no se recalculan.',
  },
];

export function moneyArt(n: number): string {
  return `$ ${Math.round(Math.abs(n)).toLocaleString('es-AR')}`;
}

export function parseNumArt(raw: string): number {
  const t = String(raw)
    .trim()
    .replace(/[$\s%]/g, '');
  if (!t) {
    return 0;
  }
  if (t.includes(',')) {
    const n = Number(t.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function margenDe(costo: number, venta: number): number | null {
  if (!(costo > 0) || !(venta > 0)) {
    return null;
  }
  return Math.round((venta / costo - 1) * 100);
}

export function estadoArticulo(p: Producto): { label: string; tono: TonoArt } {
  if (!p.activo) {
    return { label: 'Descontinuado', tono: 'muted' };
  }
  if (!p.sku?.trim()) {
    return { label: 'Sin SKU', tono: 'info' };
  }
  if (p.stock <= 0) {
    return { label: 'Sin stock', tono: 'warn' };
  }
  return { label: 'Activo', tono: 'ok' };
}

export function tabDesdeQuery(raw: string | null | undefined): TabArt {
  if (raw === 'importar' || raw === 'listas') {
    return raw;
  }
  return 'catalogo';
}

export function mapeoInicial(): Record<string, DestinoCol> {
  const m: Record<string, DestinoCol> = {};
  for (const c of COLS_DEMO) {
    m[c.letra] = c.sugerido;
  }
  return m;
}

export function redondearVenta(v: number, modo: string): number {
  if (modo === 'Redondear a $ 100') {
    return Math.round(v / 100) * 100;
  }
  if (modo === 'Redondear a $ 10') {
    return Math.round(v / 10) * 10;
  }
  if (modo === 'Terminar en 900') {
    return Math.floor(v / 1000) * 1000 + 900;
  }
  return Math.round(v);
}

export function skuEjemplo(modo: SkuModo, prefijo: string, desde: string, digitos: string): string {
  if (modo === 'prov') {
    return 'TAP-8X1-100 · ALB-LAT-20';
  }
  if (modo === 'ean') {
    return '7790000184000 · 7790000321200';
  }
  const d = Math.max(parseNumArt(digitos) || 6, 1);
  const n = parseNumArt(desde) || 0;
  const a = `${prefijo || 'FER'}-${String(n).padStart(d, '0')}`;
  const b = `${prefijo || 'FER'}-${String(n + 1).padStart(d, '0')}`;
  return `${a} · ${b}`;
}

export function skuGenerado(
  modo: SkuModo,
  linea: PreviewImportLinea,
  i: number,
  prefijo: string,
  desde: string,
  digitos: string,
): string {
  if (linea.sku) {
    return linea.sku;
  }
  if (modo === 'prov') {
    return linea.codProv;
  }
  if (modo === 'ean') {
    return '—';
  }
  const d = Math.max(parseNumArt(digitos) || 6, 1);
  const n = (parseNumArt(desde) || 0) + i;
  return `${prefijo || 'FER'}-${String(n).padStart(d, '0')}`;
}
