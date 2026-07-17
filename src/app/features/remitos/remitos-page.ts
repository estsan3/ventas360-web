import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { EstadoPedido, Pedido } from '../ventas/data-access/pedido.model';
import { VentasStore } from '../ventas/data-access/ventas.store';

export type ChipRemito = 'todos' | 'a_entregar' | 'entregado' | 'sin_facturar';

export interface FilaRemito {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  ruta: string;
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
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function etiquetaEstado(estado: EstadoPedido): string {
  const map: Partial<Record<EstadoPedido, string>> = {
    borrador: 'A entregar',
    confirmado: 'Sin facturar',
    facturado: 'Facturado',
    cancelado: 'Cancelado',
  };
  return map[estado] ?? estado;
}

function chipDeEstado(estado: EstadoPedido): Exclude<ChipRemito, 'todos'> | null {
  if (estado === 'borrador') {
    return 'a_entregar';
  }
  if (estado === 'confirmado') {
    return 'sin_facturar';
  }
  if (estado === 'facturado') {
    return 'entregado';
  }
  return null;
}

@Component({
  selector: 'app-remitos-page',
  templateUrl: './remitos-page.html',
  styleUrl: './remitos-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemitosPage {
  private readonly router = inject(Router);
  private readonly store = inject(VentasStore);
  private readonly notifications = inject(NotificationStore);

  protected readonly chip = signal<ChipRemito>('todos');
  protected readonly detalle = signal<Pedido | null>(null);
  protected readonly estado = this.store.pedidos;

  protected readonly contadores = computed(() => {
    const items = this.estado().data ?? [];
    const c = { todos: items.length, a_entregar: 0, entregado: 0, sin_facturar: 0 };
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
    const depositos = new Map(this.store.depositosRef().map((x) => [x.id, x.nombre]));
    return (this.estado().data ?? [])
      .filter((p) => {
        if (c === 'todos') {
          return true;
        }
        return chipDeEstado(p.estado) === c;
      })
      .map((p): FilaRemito => {
        const dep = p.depositoId ? (depositos.get(p.depositoId) ?? 'Depósito') : 'Suc. Central';
        const puedeFacturar = p.estado === 'confirmado';
        const puedeConfirmar = p.estado === 'borrador';
        return {
          id: p.id,
          numero: `REM-${p.id.slice(0, 8).toUpperCase()}`,
          fecha: formatearFecha(p.fecha),
          cliente: clientes.get(p.clienteId) ?? p.clienteId.slice(0, 8),
          ruta: `${dep} → Cliente`,
          total: formatearMoneda(p.total),
          estado: etiquetaEstado(p.estado),
          estadoRaw: p.estado,
          accion: puedeFacturar ? 'Facturar' : puedeConfirmar ? 'Confirmar' : 'Ver',
          accionTono: puedeFacturar || puedeConfirmar ? 'primary' : 'muted',
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
    const dep = p.depositoId
      ? (this.store.depositosRef().find((d) => d.id === p.depositoId)?.nombre ?? 'Depósito')
      : 'Suc. Central';
    return {
      titulo: `Remito REM-${p.id.slice(0, 8).toUpperCase()}`,
      subtitulo: `${formatearFecha(p.fecha)} · ${cliente} · ${dep} · ${etiquetaEstado(p.estado)}`,
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
    this.store.cargar('remito');
    this.store.cargarReferencias();
  }

  protected setChip(v: ChipRemito): void {
    this.chip.set(v);
  }

  protected irNuevo(): void {
    this.router.navigate(['/ventas/remito']);
  }

  protected onAccion(row: FilaRemito): void {
    const remito = (this.estado().data ?? []).find((p) => p.id === row.id);
    if (!remito) {
      return;
    }
    this.ejecutarAccion(remito);
  }

  protected abrirDetalleDesdeFila(id: string): void {
    const remito = (this.estado().data ?? []).find((p) => p.id === id);
    if (remito) {
      this.abrirDetalle(remito);
    }
  }

  protected abrirDetalle(pedido: Pedido): void {
    this.detalle.set(pedido);
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
  }

  private ejecutarAccion(remito: Pedido): void {
    if (remito.estado === 'confirmado') {
      this.store.facturarRemito(remito.id, 'remito').subscribe({
        next: () => {
          this.notifications.success('Remito facturado', 'Se generó la factura');
        },
      });
      return;
    }
    if (remito.estado === 'borrador') {
      this.store.confirmarRemito(remito.id).subscribe({
        next: () => {
          this.notifications.success('Remito confirmado', 'Listo para facturar');
          this.store.cargar('remito');
        },
      });
    }
  }
}
