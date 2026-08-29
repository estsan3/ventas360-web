import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-comprobantes-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './comprobantes-page.html',
  styleUrl: './comprobantes-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprobantesPage {}
