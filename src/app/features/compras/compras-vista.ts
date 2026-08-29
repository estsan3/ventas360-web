import { Compra, TipoCompra } from './data-access/compra.model';

export type TabCompras = 'oc' | 'prov' | 'rec' | 'fact';
export type ChipOc = 'todas' | 'abiertas' | 'enviada' | 'parcial' | 'recibida';
export type ChipRec = 'todas' | 'pendientes' | 'ingresados';
export type ProvSub = 'lista' | 'condiciones' | 'movs';
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'accent';

export function tabDesdeQuery(raw: string | null): TabCompras {
  if (raw === 'pedidos' || raw === 'oc') {
    return 'oc';
  }
  if (raw === 'proveedores' || raw === 'listas' || raw === 'prov') {
    return 'prov';
  }
  if (raw === 'remitos' || raw === 'rec') {
    return 'rec';
  }
  if (raw === 'facturas' || raw === 'fact') {
    return 'fact';
  }
  return 'oc';
}

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

export function numeroCompra(tipo: TipoCompra, numero: string | null, id: string): string {
  if (numero?.trim()) {
    return numero.trim();
  }
  const corto = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  if (tipo === 'factura_compra') {
    return `FC-${corto}`;
  }
  if (tipo === 'pedido_compra') {
    return `OC-${corto}`;
  }
  return `REM-${corto}`;
}

export function etiquetaIva(cond: string): string {
  const map: Record<string, string> = {
    responsable_inscripto: 'Resp. inscripto',
    monotributo: 'Monotributo',
    exento: 'Exento',
    consumidor_final: 'Consumidor final',
  };
  return map[cond] ?? cond;
}

export function estadoPedidoVista(estado: string): { label: string; tone: BadgeTone } {
  if (estado === 'borrador') {
    return { label: 'Borrador', tone: 'muted' };
  }
  if (estado === 'emitido') {
    return { label: 'Enviada', tone: 'info' };
  }
  if (estado === 'parcial') {
    return { label: 'Parcial', tone: 'warn' };
  }
  if (estado === 'recibido') {
    return { label: 'Recibida', tone: 'ok' };
  }
  return { label: estado, tone: 'muted' };
}

export function estadoRemitoVista(estado: string): { label: string; tone: BadgeTone } {
  if (estado === 'borrador') {
    return { label: 'Por revisar', tone: 'warn' };
  }
  if (estado === 'confirmado') {
    return { label: 'Ingresado a stock', tone: 'ok' };
  }
  return { label: estado, tone: 'muted' };
}

export function estadoFacturaVista(estado: string): { label: string; tone: BadgeTone } {
  if (estado === 'borrador') {
    return { label: 'Por conciliar', tone: 'warn' };
  }
  if (estado === 'confirmado' || estado === 'facturado') {
    return { label: 'Registrada', tone: 'ok' };
  }
  return { label: estado, tone: 'muted' };
}

export function chipPedido(estado: string): ChipOc | 'todas' {
  if (estado === 'emitido') {
    return 'enviada';
  }
  if (estado === 'parcial') {
    return 'parcial';
  }
  if (estado === 'recibido') {
    return 'recibida';
  }
  return 'todas';
}

export function pedidoAbierto(c: Compra): boolean {
  return (
    c.tipo === 'pedido_compra' &&
    (c.estado === 'borrador' || c.estado === 'emitido' || c.estado === 'parcial')
  );
}

export function pctRecibido(c: Compra): { txt: string; tone: BadgeTone } {
  const ped = c.cantidadPedida || 0;
  const rec = c.cantidadRecibida || 0;
  if (ped <= 0) {
    return { txt: '—', tone: 'muted' };
  }
  const p = Math.round((rec / ped) * 100);
  if (p >= 100) {
    return { txt: '100 %', tone: 'ok' };
  }
  if (p <= 0) {
    return { txt: '0 %', tone: 'muted' };
  }
  return { txt: `${p} %`, tone: 'warn' };
}
