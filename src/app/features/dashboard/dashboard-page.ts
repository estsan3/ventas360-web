import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Icon } from '../../shared/ui/icon/icon';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';
import { StateWrapper } from '../../shared/ui/state-wrapper/state-wrapper';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { DashboardStore } from './data-access/dashboard.store';

const COLUMNAS_TOP: TableColumn[] = [
  { key: 'descripcion', label: 'Artículo' },
  { key: 'cantidad', label: 'Cant.', align: 'right', width: '80px' },
  { key: 'montoFmt', label: 'Monto', align: 'right', width: '120px' },
];

function formatearMoneda(valor: number, moneda: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda || 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

@Component({
  selector: 'app-dashboard-page',
  imports: [KpiCard, Icon, StateWrapper, Table],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly store = inject(DashboardStore);

  protected readonly estado = this.store.kpis;
  protected readonly columnasTop = COLUMNAS_TOP;

  protected readonly kpis = computed(() => this.estado().data);

  protected readonly filasTop = computed(() => {
    const k = this.kpis();
    if (!k) {
      return [];
    }
    return k.topArticulos.map(
      (a) =>
        ({
          ...a,
          montoFmt: formatearMoneda(a.monto, k.moneda),
        }) as Record<string, unknown>,
    );
  });

  constructor() {
    this.store.cargar();
  }

  protected fmt(valor: number): string {
    const moneda = this.kpis()?.moneda ?? 'ARS';
    return formatearMoneda(valor, moneda);
  }
}
