import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-tesoreria-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './tesoreria-page.html',
  styleUrl: './tesoreria-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TesoreriaPage {}
