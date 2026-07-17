import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../shared/ui/icon/icon';
import { KpiCard } from '../../shared/ui/kpi-card/kpi-card';

@Component({
  selector: 'app-dashboard-page',
  imports: [KpiCard, Icon],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
