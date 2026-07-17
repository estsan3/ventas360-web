import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logo Ventas360 (Figma: Componentes → Logo): "Agro" + chip verde "360".
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly size = input<'sm' | 'md'>('md');
  /** true: solo el chip "360" (para sidebar colapsada) */
  readonly compact = input(false);
}
