import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Estados de viaje/despacho del kit Ventas360 (Figma: Componentes → Labels).
 * Mapeo semántico: success=Completado, danger=Retrasado, info=En viaje,
 * warning=Pendiente/Borrador, neutral=otros.
 */
export type BadgeVariant = 'success' | 'danger' | 'info' | 'warning' | 'neutral';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly size = input<'sm' | 'md'>('sm');
}
