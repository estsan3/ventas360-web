export type TabStock = 'articulos' | 'remitos' | 'inventario' | 'reglas';
export type RemSub = 'carga' | 'listado';
export type EstadoAlerta = 'Todos' | 'min' | 'max' | 'baja' | 'alta' | 'quebrado';
export type TomaFiltro = 'Todos' | 'pend' | 'dif';
export type RemFiltro = 'Todos' | 'pend' | 'ok';
export type IdRegla = 'min' | 'max' | 'baja' | 'alta' | 'vencer' | 'quebrado';
export type CanalAlerta = 'panel' | 'mail' | 'mostrador' | 'compra';
export type SevRegla = 'Crítica' | 'Media' | 'Informativa';

export const MIN_CHARS_STOCK = 3;
export const STOCK_MIN_DEFAULT = 5;

export interface ParamRegla {
  k: string;
  label: string;
  v: string;
  u: string;
  w: string;
}

export interface ReglaAlerta {
  id: IdRegla;
  nombre: string;
  sev: SevRegla;
  on: boolean;
  alcance: string;
  desc: string;
  params: ParamRegla[];
}

export interface ChipAlerta {
  id: string;
  label: string;
  tono: 'ok' | 'warn' | 'danger' | 'info';
}

export interface ArticuloStock {
  articuloId: string;
  codigo: string;
  nombre: string;
  sub: string;
  rubro: string;
  depositoId: string;
  deposito: string;
  stock: number;
  min: number;
  max: number;
  costo: number;
  codigoBarras: string;
}

export function umbralMin(): number {
  return STOCK_MIN_DEFAULT;
}

export function umbralMax(stock: number): number {
  return Math.max(24, stock > 0 ? Math.round(stock * 2.5) : 40);
}

export function moneyStk(n: number): string {
  const neg = n < 0;
  const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(
    Math.abs(Math.round(n)),
  );
  return `${neg ? '−$ ' : '$ '}${fmt}`;
}

export function parseNumStk(v: string): number {
  const n = Number(String(v).replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function normStk(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function reglasBase(): ReglaAlerta[] {
  return [
    {
      id: 'min',
      nombre: 'Stock bajo el mínimo',
      sev: 'Crítica',
      on: true,
      alcance: 'Todos los depósitos',
      desc: 'La existencia queda por debajo del mínimo definido en la ficha del artículo. Es la alerta que dispara la reposición.',
      params: [
        {
          k: 'margen',
          label: 'el stock esté a',
          v: '0',
          u: 'unidades o menos del mínimo',
          w: '56px',
        },
      ],
    },
    {
      id: 'max',
      nombre: 'Stock sobre el máximo',
      sev: 'Media',
      on: true,
      alcance: 'Todos los depósitos',
      desc: 'Hay más mercadería de la que el artículo debería tener. Sirve para frenar compras y detectar capital inmovilizado.',
      params: [
        { k: 'exceso', label: 'el stock supere el máximo en', v: '10', u: '% o más', w: '56px' },
      ],
    },
    {
      id: 'baja',
      nombre: 'Baja rotación',
      sev: 'Media',
      on: true,
      alcance: 'Todos los depósitos',
      desc: 'Mercadería que no se mueve: candidata a liquidación, devolución al proveedor o traslado a otra sucursal.',
      params: [
        { k: 'dias', label: 'no se venda en', v: '90', u: 'días', w: '60px' },
        { k: 'unid', label: 'o se vendan menos de', v: '3', u: 'unidades', w: '52px' },
      ],
    },
    {
      id: 'alta',
      nombre: 'Alta rotación',
      sev: 'Informativa',
      on: true,
      alcance: 'Todos los depósitos',
      desc: 'Se vende más rápido de lo que se repone. Conviene subir el mínimo y el punto de pedido antes de quedarse sin stock.',
      params: [
        {
          k: 'dias',
          label: 'el stock actual alcance para menos de',
          v: '7',
          u: 'días de venta',
          w: '56px',
        },
      ],
    },
    {
      id: 'vencer',
      nombre: 'Próximo a vencer',
      sev: 'Crítica',
      on: false,
      alcance: 'Rubro con lote',
      desc: 'Para artículos con lote y fecha de vencimiento cargados. Requiere que el remito informe el lote al recibirlo.',
      params: [
        { k: 'dias', label: 'falten', v: '30', u: 'días o menos para el vencimiento', w: '56px' },
      ],
    },
    {
      id: 'quebrado',
      nombre: 'Quiebre de stock con demanda',
      sev: 'Crítica',
      on: true,
      alcance: 'Todos los depósitos',
      desc: 'Existencia en cero. Es venta perdida, no stock sobrante.',
      params: [
        {
          k: 'dias',
          label: 'el stock sea 0 y haya tenido ventas en los últimos',
          v: '30',
          u: 'días',
          w: '56px',
        },
      ],
    },
  ];
}

export const CANALES_DEF: { id: CanalAlerta; label: string; sub: string }[] = [
  { id: 'panel', label: 'Panel de la pantalla de stock', sub: 'Badge y chips en la grilla' },
  { id: 'mail', label: 'Mail diario al encargado', sub: 'Resumen de 08:00 con lo crítico' },
  {
    id: 'mostrador',
    label: 'Aviso en el mostrador al vender',
    sub: 'Cuando el artículo queda bajo mínimo',
  },
  { id: 'compra', label: 'Sugerencia de orden de compra', sub: 'Agrupa faltantes por proveedor' },
];

export function paramRegla(reglas: ReglaAlerta[], id: IdRegla, k: string, def: number): number {
  const r = reglas.find((x) => x.id === id);
  const p = r?.params.find((y) => y.k === k);
  return p ? parseNumStk(p.v) : def;
}

export function alertaActiva(reglas: ReglaAlerta[], id: IdRegla): boolean {
  return reglas.find((x) => x.id === id)?.on ?? false;
}

export function alertasDe(a: ArticuloStock, reglas: ReglaAlerta[]): ChipAlerta[] {
  const out: ChipAlerta[] = [];
  const tol = paramRegla(reglas, 'min', 'margen', 0);
  const exceso = paramRegla(reglas, 'max', 'exceso', 10);
  if (alertaActiva(reglas, 'quebrado') && a.stock === 0) {
    out.push({ id: 'quebrado', label: 'Quiebre', tono: 'danger' });
  } else if (alertaActiva(reglas, 'min') && a.stock < a.min - tol) {
    out.push({ id: 'min', label: 'Bajo mínimo', tono: 'danger' });
  }
  if (alertaActiva(reglas, 'max') && a.stock > a.max * (1 + exceso / 100)) {
    out.push({ id: 'max', label: 'Sobre máximo', tono: 'warn' });
  }
  return out;
}

export function tabDesdeQuery(raw: string | null): TabStock {
  if (raw === 'recepcion' || raw === 'remitos') {
    return 'remitos';
  }
  if (raw === 'alertas' || raw === 'reglas') {
    return 'reglas';
  }
  if (raw === 'toma' || raw === 'inventario') {
    return 'inventario';
  }
  return 'articulos';
}

export function csvCelda(valor: string | number): string {
  const t = String(valor);
  if (/[",;\n]/.test(t)) {
    return `"${t.replaceAll('"', '""')}"`;
  }
  return t;
}

export function formatearFechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function etiquetaRemito(estado: string): {
  label: string;
  tono: 'warn' | 'ok' | 'danger' | 'info' | 'neutral';
} {
  if (estado === 'borrador') {
    return { label: 'Pendiente de validar', tono: 'warn' };
  }
  if (estado === 'confirmado') {
    return { label: 'Ingresado a stock', tono: 'ok' };
  }
  if (estado === 'facturado') {
    return { label: 'Facturado', tono: 'ok' };
  }
  return { label: estado, tono: 'neutral' };
}

export function matchIaChip(
  tipo: string | null,
  hayProducto: boolean,
): {
  chip: string;
  tono: 'ok' | 'warn' | 'info';
  accion: string;
} {
  if (!hayProducto) {
    return { chip: 'Alta nueva', tono: 'info', accion: 'Asociar' };
  }
  if (tipo === 'probable' || tipo === 'fuzzy') {
    return { chip: 'Confirmar', tono: 'warn', accion: 'Confirmar' };
  }
  return { chip: 'OK', tono: 'ok', accion: 'Cambiar' };
}
