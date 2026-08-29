import { EstadoPedido, Pedido, TipoComprobante } from '../ventas/data-access/pedido.model';

export type TabVentas = 'pre' | 'ped' | 'rem' | 'fac';
export type ChipVentas =
  | 'todos'
  | 'enviado'
  | 'aceptado'
  | 'vencido'
  | 'para_preparar'
  | 'preparado'
  | 'bloqueado'
  | 'faltante'
  | 'para_facturar'
  | 'en_reparto'
  | 'devuelto'
  | 'emitida'
  | 'vencida'
  | 'sin_cae'
  | 'nc'
  | 'vence_semana';
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'accent' | 'ink';

export function tabDesdeRuta(raw: string | null): TabVentas {
  if (raw === 'pedidos' || raw === 'ped') {
    return 'ped';
  }
  if (raw === 'remitos' || raw === 'rem') {
    return 'rem';
  }
  if (raw === 'facturas' || raw === 'fac') {
    return 'fac';
  }
  return 'pre';
}

export function rutaDeTab(tab: TabVentas): string {
  return { pre: 'presupuestos', ped: 'pedidos', rem: 'remitos', fac: 'facturas' }[tab];
}

export function tipoDeTab(tab: TabVentas): TipoComprobante {
  const map: Record<TabVentas, TipoComprobante> = {
    pre: 'presupuesto',
    ped: 'pedido',
    rem: 'remito',
    fac: 'factura',
  };
  return map[tab];
}

export function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return String(iso).slice(0, 10);
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

export function numeroDoc(p: Pedido): string {
  if (p.numero?.trim()) {
    return p.numero.trim();
  }
  const corto = p.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const pref: Record<TipoComprobante, string> = {
    presupuesto: 'PRE',
    pedido: 'PV',
    remito: 'RV',
    factura: 'FC',
  };
  if (p.tipo === 'factura' && p.letra) {
    return `${p.letra}-${String(p.puntoVenta ?? 1).padStart(5, '0')}-${String(p.cbteNro ?? 0).padStart(8, '0')}`;
  }
  return `${pref[p.tipo]}-${corto}`;
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

export function etiquetaEstadoVista(
  tipo: TipoComprobante,
  estado: EstadoPedido,
): {
  label: string;
  tone: BadgeTone;
} {
  if (tipo === 'presupuesto') {
    const map: Partial<Record<EstadoPedido, { label: string; tone: BadgeTone }>> = {
      borrador: { label: 'Borrador', tone: 'muted' },
      vigente: { label: 'Enviado', tone: 'info' },
      aceptado: { label: 'Aceptado', tone: 'ok' },
      vencido: { label: 'Vencido', tone: 'warn' },
      convertido: { label: 'Convertido', tone: 'ok' },
      cancelado: { label: 'Rechazado', tone: 'danger' },
    };
    return map[estado] ?? { label: estado, tone: 'muted' };
  }
  if (tipo === 'pedido') {
    const map: Partial<Record<EstadoPedido, { label: string; tone: BadgeTone }>> = {
      borrador: { label: 'Para preparar', tone: 'info' },
      confirmado: { label: 'Preparado', tone: 'accent' },
      entregado: { label: 'Remitido', tone: 'ok' },
      facturado: { label: 'Cerrado', tone: 'ok' },
      cancelado: { label: 'Cancelado', tone: 'danger' },
    };
    return map[estado] ?? { label: estado, tone: 'muted' };
  }
  if (tipo === 'remito') {
    const map: Partial<Record<EstadoPedido, { label: string; tone: BadgeTone }>> = {
      borrador: { label: 'En reparto', tone: 'info' },
      confirmado: { label: 'Para facturar', tone: 'accent' },
      facturado: { label: 'Facturado', tone: 'ok' },
      cancelado: { label: 'Devuelto', tone: 'danger' },
    };
    return map[estado] ?? { label: estado, tone: 'muted' };
  }
  const map: Partial<Record<EstadoPedido, { label: string; tone: BadgeTone }>> = {
    borrador: { label: 'Sin CAE', tone: 'danger' },
    confirmado: { label: 'Emitida', tone: 'info' },
    cancelado: { label: 'Anulada', tone: 'danger' },
  };
  return map[estado] ?? { label: estado, tone: 'muted' };
}

export function chipMatch(
  tab: TabVentas,
  chip: ChipVentas,
  p: Pedido,
  extras?: { bloqueado?: boolean; faltante?: boolean; venceIso?: string },
): boolean {
  if (chip === 'todos') {
    return true;
  }
  if (tab === 'pre') {
    if (chip === 'enviado') {
      return p.estado === 'vigente';
    }
    if (chip === 'aceptado') {
      return p.estado === 'aceptado';
    }
    if (chip === 'vencido') {
      return p.estado === 'vencido';
    }
    if (chip === 'vence_semana' && extras?.venceIso) {
      const d = new Date(extras.venceIso);
      const lim = new Date();
      lim.setDate(lim.getDate() + 7);
      return d <= lim;
    }
  }
  if (tab === 'ped') {
    if (chip === 'para_preparar') {
      return p.estado === 'borrador' && !extras?.bloqueado;
    }
    if (chip === 'preparado') {
      return p.estado === 'confirmado';
    }
    if (chip === 'bloqueado') {
      return !!extras?.bloqueado;
    }
    if (chip === 'faltante') {
      return !!extras?.faltante;
    }
  }
  if (tab === 'rem') {
    if (chip === 'para_facturar') {
      return p.estado === 'confirmado';
    }
    if (chip === 'en_reparto') {
      return p.estado === 'borrador';
    }
    if (chip === 'devuelto') {
      return p.estado === 'cancelado';
    }
  }
  if (tab === 'fac') {
    if (chip === 'emitida') {
      return p.estado === 'confirmado' && !!p.cae && !facturaVencida(p);
    }
    if (chip === 'vencida') {
      return facturaVencida(p);
    }
    if (chip === 'sin_cae') {
      return !p.cae;
    }
    if (chip === 'nc') {
      return false;
    }
  }
  return false;
}

export function facturaVencida(p: Pedido): boolean {
  const vto = p.caeVencimiento || sumarDias(p.fecha, 30);
  const d = new Date(vto);
  if (Number.isNaN(d.getTime())) {
    return false;
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return d < hoy && p.estado === 'confirmado';
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

export function tipoTxt(tab: TabVentas): string {
  return {
    pre: 'Presupuesto',
    ped: 'Pedido de venta',
    rem: 'Remito de venta',
    fac: 'Comprobante fiscal',
  }[tab];
}
