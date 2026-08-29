import { CondicionIva } from './data-access/cliente.model';

export type TabCli = 'cartera' | 'ficha' | 'listas';
export type ChipCli = 'todos' | 'mora' | 'limite' | 'inactivos' | 'bloq' | 'nuevos';
export type SubFicha = 'cond' | 'cred' | 'dir' | 'hist';
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'muted' | 'ink';

export const DIAS_INACTIVIDAD = 60;
export const DIAS_MORA = 15;

export const ETIQUETAS_IVA: Record<CondicionIva, string> = {
  consumidor_final: 'Consumidor final',
  responsable_inscripto: 'Resp. inscripto',
  monotributo: 'Monotributo',
  exento: 'Exento',
};

export function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function formatearMoney(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatearMoneyDec(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function moraTone(dias: number): BadgeTone {
  if (dias <= 0) {
    return 'ok';
  }
  if (dias <= DIAS_MORA) {
    return 'muted';
  }
  if (dias <= 60) {
    return 'warn';
  }
  return 'danger';
}

export function etiquetaIva(iva: CondicionIva | string): string {
  return ETIQUETAS_IVA[iva as CondicionIva] ?? iva;
}

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function pct(n: number): string {
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}
