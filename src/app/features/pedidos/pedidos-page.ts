import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { EstadoPedido, Pedido } from '../ventas/data-access/pedido.model';
import { VentasStore } from '../ventas/data-access/ventas.store';

export type ChipPedido = 'todos' | 'pendiente' | 'preparado' | 'facturado';

export interface FilaPedido {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  vendedor: string;
  total: string;
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
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function etiquetaEstado(estado: EstadoPedido): string {
  const map: Partial<Record<EstadoPedido, string>> = {
    borrador: 'Pendiente',
    confirmado: 'Preparado',
    entregado: 'Facturado',
    facturado: 'Facturado',
    cancelado: 'Cancelado',
  };
  return map[estado] ?? estado;
}

function chipDeEstado(estado: EstadoPedido): Exclude<ChipPedido, 'todos'> | null {
  if (estado === 'borrador') {
    return 'pendiente';
  }
  if (estado === 'confirmado') {
    return 'preparado';
  }
  if (estado === 'entregado' || estado === 'facturado') {
    return 'facturado';
  }
  return null;
}

@Component({
  selector: 'app-pedidos-page',
  templateUrl: './pedidos-page.html',
  styleUrl: './pedidos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  private readonly router = inject(Router);
  private readonly store = inject(VentasStore);
  private readonly notifications = inject(NotificationStore);

  protected readonly chip = signal<ChipPedido>('todos');
  protected readonly detalle = signal<Pedido | null>(null);
  protected readonly estado = this.store.pedidos;

  protected readonly contadores = computed(() => {
    const items = this.estado().data ?? [];
    const c = { todos: items.length, pendiente: 0, preparado: 0, facturado: 0 };
    for (const p of items) {
      const chip = chipDeEstado(p.estado);
      if (chip) {
        c[chip] += 1;
      }
    }
    return c;
  });

  protected readonly filas = computed(() => {
    const c = this.chip();
    const clientes = new Map(this.store.clientesRef().map((x) => [x.id, x.nombre]));
    return (this.estado().data ?? [])
      .filter((p) => {
        if (c === 'todos') {
          return true;
        }
        return chipDeEstado(p.estado) === c;
      })
      .map((p): FilaPedido => {
        const puedeConfirmar = p.estado === 'borrador';
        return {
          id: p.id,
          numero: `PED-${p.id.slice(0, 8).toUpperCase()}`,
          fecha: formatearFecha(p.fecha),
          cliente: clientes.get(p.clienteId) ?? p.clienteId.slice(0, 8),
          vendedor: '—',
          total: formatearMoneda(p.total),
          estado: etiquetaEstado(p.estado),
          estadoRaw: p.estado,
          accion: puedeConfirmar ? 'Confirmar' : 'Ver',
          accionTono: puedeConfirmar ? 'primary' : 'muted',
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
      titulo: `Pedido PED-${p.id.slice(0, 8).toUpperCase()}`,
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
    this.store.cargar('pedido');
    this.store.cargarReferencias();
  }

  protected setChip(v: ChipPedido): void {
    this.chip.set(v);
  }

  protected irNuevo(): void {
    this.router.navigate(['/ventas/pedido']);
  }

  protected onAccion(row: FilaPedido): void {
    const pedido = (this.estado().data ?? []).find((p) => p.id === row.id);
    if (!pedido) {
      return;
    }
    if (pedido.estado === 'borrador') {
      this.store.cambiarEstado(pedido.id, 'confirmado').subscribe({
        next: () => {
          this.notifications.success('Pedido confirmado', 'Pasó a preparado');
          this.store.cargar('pedido');
        },
      });
    }
  }

  protected abrirDetalleDesdeFila(id: string): void {
    const pedido = (this.estado().data ?? []).find((p) => p.id === id);
    if (pedido) {
      this.abrirDetalle(pedido);
    }
  }

  protected abrirDetalle(pedido: Pedido): void {
    this.detalle.set(pedido);
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }
}
