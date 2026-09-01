export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'accent' | 'muted' | 'ink';

export function formatearMoney(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatearCorto(valor: number): string {
  const a = Math.abs(valor);
  if (a >= 1_000_000) {
    return `$ ${(valor / 1_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (a >= 1000) {
    return `$ ${Math.round(valor / 1000)} k`;
  }
  return formatearMoney(valor);
}

export function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return String(iso).slice(0, 10);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function diasDesde(iso: string | null | undefined): number {
  if (!iso) {
    return 0;
  }
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function haceMinutos(iso: string | null | undefined): string {
  if (!iso) {
    return 'datos del comercio';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return 'datos del comercio';
  }
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (min < 1) {
    return 'recién actualizado';
  }
  if (min === 1) {
    return 'procesado hace 1 min';
  }
  return `procesado hace ${min} min`;
}

export function pctBar(n: number, max: number): string {
  if (max <= 0) {
    return '3px';
  }
  return `${Math.max(3, Math.round((n / max) * 68))}px`;
}
