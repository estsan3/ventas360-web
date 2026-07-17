import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { MapPicker } from '../map-picker/map-picker';

/**
 * Popup de mapa para elegir coordenadas (Leaflet + enlace a Google Maps).
 */
@Component({
  selector: 'app-map-picker-modal',
  imports: [Button, Icon, MapPicker],
  templateUrl: './map-picker-modal.html',
  styleUrl: './map-picker-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPickerModal {
  readonly abierto = input(false);
  readonly titulo = input('Elegir ubicación en el mapa');
  readonly latitud = input<number | null>(null);
  readonly longitud = input<number | null>(null);

  readonly confirmar = output<{ latitud: number; longitud: number }>();
  readonly cerrar = output<void>();

  protected readonly latPreview = signal<number | null>(null);
  protected readonly lngPreview = signal<number | null>(null);

  constructor() {
    effect(() => {
      if (this.abierto()) {
        this.latPreview.set(this.latitud());
        this.lngPreview.set(this.longitud());
      }
    });
  }

  protected onCoordenadasChange(event: { latitud: number; longitud: number }): void {
    this.latPreview.set(event.latitud);
    this.lngPreview.set(event.longitud);
  }

  protected confirmarUbicacion(): void {
    const lat = this.latPreview();
    const lng = this.lngPreview();
    if (lat == null || lng == null) {
      return;
    }
    this.confirmar.emit({ latitud: lat, longitud: lng });
  }

  protected abrirGoogleMaps(): void {
    const lat = this.latPreview();
    const lng = this.lngPreview();
    if (lat == null || lng == null) {
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  }
}
