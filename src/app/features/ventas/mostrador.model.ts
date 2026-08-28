import { MedioCobro } from './data-access/pedido.model';

export type TipoMedioMos = 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque' | 'ctacte';
export type CompMos = 'factura_a' | 'factura_b' | 'remito' | 'ticket';
export type TonoCc = 'ok' | 'debe' | 'favor' | 'warn' | 'cf' | 'muted';

export const MEDIOS_MOS: { tipo: TipoMedioMos; label: string }[] = [
  { tipo: 'efectivo', label: 'Efectivo' },
  { tipo: 'tarjeta', label: 'Tarjeta' },
  { tipo: 'transferencia', label: 'Transferencia' },
  { tipo: 'cheque', label: 'Cheque' },
  { tipo: 'ctacte', label: 'Cuenta corriente' },
];

export const BILLETES_MOS = [5000, 10000, 20000, 50000];

export const TARJETAS_MOS = ['Visa débito', 'Visa crédito', 'Mastercard', 'Naranja'];
export const CUOTAS_MOS = ['1', '3', '6', '12'];

export interface PagoMos {
  id: string;
  tipo: TipoMedioMos;
  montoTxt: string;
  recibidoTxt: string;
  chequeNumero: string;
  chequeBanco: string;
  chequeFecha: string;
  chequeLibrador: string;
  tarjeta: string;
  cuotas: string;
  lote: string;
  mpId: string;
  mpPendiente: boolean;
  cuentaDestino: string;
}

export interface TicketMos {
  titulo: string;
  sub: string;
  lineas: { label: string; value: string; tono?: 'ok' | 'warn' | 'muted' }[];
}

export function nuevoPagoMos(tipo: TipoMedioMos, seq: number, librador = ''): PagoMos {
  return {
    id: `p-${seq}`,
    tipo,
    montoTxt: '',
    recibidoTxt: '',
    chequeNumero: '',
    chequeBanco: '',
    chequeFecha: '',
    chequeLibrador: librador,
    tarjeta: TARJETAS_MOS[0],
    cuotas: '1',
    lote: '',
    mpId: '',
    mpPendiente: false,
    cuentaDestino: '',
  };
}

export function parseNumMos(raw: string): number {
  const t = raw.trim().replace(/\s/g, '');
  if (!t) {
    return 0;
  }
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function moneyMos(n: number): string {
  return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dtoPct(dto: string): number {
  const t = dto.trim().replace('%', '').replace('—', '').replace('-', '');
  if (!t) {
    return 0;
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export function medioCobroDesdeTipo(tipo: TipoMedioMos): MedioCobro {
  if (tipo === 'tarjeta') {
    return 'tarjeta';
  }
  if (tipo === 'cheque') {
    return 'cheque';
  }
  if (tipo === 'transferencia') {
    return 'transferencia';
  }
  return 'efectivo';
}

export function labelMedio(tipo: TipoMedioMos): string {
  return MEDIOS_MOS.find((m) => m.tipo === tipo)?.label ?? tipo;
}

export interface AcreditacionMp {
  id: string;
  hora: string;
  importe: number;
  pagador: string;
  ref: string;
}

function horaHace(minutos: number): string {
  const d = new Date(Date.now() - minutos * 60_000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Acreditaciones demo (no hay webhook de Mercado Pago). Se consumen al emitir la venta. */
export function acreditacionesMpDemo(): AcreditacionMp[] {
  return [
    {
      id: 'mp-1',
      hora: horaHace(8),
      importe: 9400,
      pagador: 'ANA L. PEREZ',
      ref: 'Op. 78412500112 · alias ana.perez',
    },
    {
      id: 'mp-2',
      hora: horaHace(18),
      importe: 33192,
      pagador: 'MARCOS D. GONZALEZ',
      ref: 'Op. 78412330991 · CVU ****4417',
    },
    {
      id: 'mp-3',
      hora: horaHace(29),
      importe: 12400,
      pagador: 'ROSA I. MENDEZ',
      ref: 'Op. 78412298455 · alias rosa.kiosco',
    },
    {
      id: 'mp-4',
      hora: horaHace(52),
      importe: 96800,
      pagador: 'GONZALEZ HNOS SRL',
      ref: 'Op. 78411977123 · CVU ****2210',
    },
    {
      id: 'mp-5',
      hora: horaHace(66),
      importe: 4200,
      pagador: 'J. P. SOSA',
      ref: 'Op. 78411840677 · alias jpsosa.mp',
    },
  ];
}
