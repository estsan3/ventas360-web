import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { EstadoPedido, Pedido } from '../ventas/data-access/pedido.model';
import { VentasStore } from '../ventas/data-access/ventas.store';

export type FiltroPresupuesto = 'todos' | 'vigente' | 'aceptado' | 'vencido';

export interface FilaPresupuesto {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  vendedor: string;
  total: string;
  validez: string;
  estado: string;
  estadoRaw: EstadoPedido;
  accion: string;
  accionTono: 'primary' | 'muted';
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function etiquetaEstado(estado: EstadoPedido): string {
  const map: Partial<Record<EstadoPedido, string>> = {
    borrador: 'Borrador',
    vigente: 'Vigente',
    aceptado: 'Aceptado',
    vencido: 'Vencido',
    convertido: 'Convertido',
    cancelado: 'Cancelado',
  };
  return map[estado] ?? estado;
}

@Component({
  selector: 'app-presupuestos-page',
  templateUrl: './presupuestos-page.html',
  styleUrl: './presupuestos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresupuestosPage {
  private readonly router = inject(Router);
  private readonly store = inject(VentasStore);
  private readonly notifications = inject(NotificationStore);

  protected readonly chip = signal<FiltroPresupuesto>('todos');
  protected readonly detalle = signal<Pedido | null>(null);
  protected readonly estado = this.store.pedidos;

  protected readonly contadores = computed(() => {
    const items = this.estado().data ?? [];
    const c = { todos: items.length, vigente: 0, aceptado: 0, vencido: 0 };
    for (const p of items) {
      if (p.estado === 'vigente') {
        c.vigente += 1;
      } else if (p.estado === 'aceptado') {
        c.aceptado += 1;
      } else if (p.estado === 'vencido') {
        c.vencido += 1;
      }
    }
    return c;
  });

  protected readonly filas = computed(() => {
    const f = this.chip();
    const clientes = new Map(this.store.clientesRef().map((x) => [x.id, x.nombre]));
    return (this.estado().data ?? [])
      .filter((p) => {
        if (f === 'todos') {
          return true;
        }
        return p.estado === f;
      })
      .map((p): FilaPresupuesto => {
        const puedeConvertir = p.estado === 'aceptado' || p.estado === 'vigente';
        return {
          id: p.id,
          numero: `PRE-${p.id.slice(0, 8).toUpperCase()}`,
          fecha: formatearFecha(p.fecha),
          cliente: clientes.get(p.clienteId) ?? p.clienteId.slice(0, 8),
          vendedor: '—',
          total: formatearMoneda(p.total),
          validez: '—',
          estado: etiquetaEstado(p.estado),
          estadoRaw: p.estado,
          accion: puedeConvertir ? (p.estado === 'aceptado' ? 'Convertir' : 'Aceptar') : 'Ver',
          accionTono: puedeConvertir ? 'primary' : 'muted',
        };
      });
  });

  protected readonly detalleVista = computed(() => {
    const p = this.detalle();
    if (!p) {
      return null;
    }
    const cliente =
      this.store.clientesRef().find((c) => c.id === p.clienteId)?.nombre ?? p.clienteId.slice(0, 8);
    return {
      titulo: `Presupuesto PRE-${p.id.slice(0, 8).toUpperCase()}`,
      subtitulo: `${formatearFecha(p.fecha)} · ${cliente} · ${etiquetaEstado(p.estado)}`,
      neto: formatearMoneda(p.neto),
      iva: formatearMoneda(p.iva),
      total: formatearMoneda(p.total),
      lineas: p.lineas.map((l) => ({
        id: l.id,
        descripcion: l.descripcion || l.productoId,
        cantidad: l.cantidad,
        precio: formatearMoneda(l.precioUnitario),
        subtotal: formatearMoneda(l.cantidad * l.precioUnitario),
      })),
    };
  });

  constructor() {
    this.store.cargar('presupuesto');
    this.store.cargarReferencias();
  }

  protected setChip(v: FiltroPresupuesto): void {
    this.chip.set(v);
  }

  protected irNuevo(): void {
    this.router.navigate(['/ventas/presupuesto']);
  }

  protected onAccion(row: FilaPresupuesto): void {
    const presupuesto = (this.estado().data ?? []).find((p) => p.id === row.id);
    if (!presupuesto) {
      return;
    }
    this.ejecutarAccion(presupuesto);
  }

  protected abrirDetalleDesdeFila(id: string): void {
    const presupuesto = (this.estado().data ?? []).find((p) => p.id === id);
    if (presupuesto) {
      this.abrirDetalle(presupuesto);
    }
  }

  protected abrirDetalle(pedido: Pedido): void {
    this.detalle.set(pedido);
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  private ejecutarAccion(presupuesto: Pedido): void {
    if (presupuesto.estado === 'vigente') {
      this.store.cambiarEstado(presupuesto.id, 'aceptado').subscribe({
        next: () => {
          this.notifications.success('Presupuesto aceptado', 'Listo para convertir');
          this.store.cargar('presupuesto');
        },
      });
      return;
    }
    if (presupuesto.estado === 'aceptado') {
      this.store.cambiarEstado(presupuesto.id, 'convertido').subscribe({
        next: () => {
          this.notifications.success('Presupuesto convertido', 'Pasó a pedido');
          this.store.cargar('presupuesto');
        },
      });
    }
  }
}
