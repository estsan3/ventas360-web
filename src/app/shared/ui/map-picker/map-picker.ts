import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

const CENTRO_ARG = { lat: -33.89, lng: -60.57 };
const ICON_DEFAULT = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/**
 * Selector de coordenadas con Leaflet + OpenStreetMap.
 */
@Component({
  selector: 'app-map-picker',
  templateUrl: './map-picker.html',
  styleUrl: './map-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPicker implements AfterViewInit, OnDestroy {
  readonly latitud = input<number | null>(null);
  readonly longitud = input<number | null>(null);
  readonly soloLectura = input(false);
  readonly altura = input('240px');
  readonly etiqueta = input('Ubicación en mapa');

  readonly coordenadasChange = output<{ latitud: number; longitud: number }>();

  private readonly contenedor = viewChild<ElementRef<HTMLElement>>('mapa');

  private mapa?: L.Map;
  private marcador?: L.Marker;

  constructor() {
    effect(() => {
      const lat = this.latitud();
      const lng = this.longitud();
      if (!this.mapa || lat == null || lng == null) {
        return;
      }
      this.actualizarMarcador(lat, lng, false);
    });
  }

  ngAfterViewInit(): void {
    const el = this.contenedor()?.nativeElement;
    if (!el) {
      return;
    }
    const lat = this.latitud() ?? CENTRO_ARG.lat;
    const lng = this.longitud() ?? CENTRO_ARG.lng;

    this.mapa = L.map(el, { scrollWheelZoom: !this.soloLectura() }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.mapa);

    this.actualizarMarcador(lat, lng, false);

    if (!this.soloLectura()) {
      this.mapa.on('click', (e: L.LeafletMouseEvent) => {
        this.actualizarMarcador(e.latlng.lat, e.latlng.lng, true);
      });
    }

    setTimeout(() => this.mapa?.invalidateSize(), 0);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }

  private actualizarMarcador(lat: number, lng: number, emitir: boolean): void {
    if (!this.mapa) {
      return;
    }
    if (this.marcador) {
      this.marcador.setLatLng([lat, lng]);
    } else {
      this.marcador = L.marker([lat, lng], { icon: ICON_DEFAULT, draggable: !this.soloLectura() })
        .addTo(this.mapa)
        .on('dragend', () => {
          const pos = this.marcador?.getLatLng();
          if (pos) {
            this.coordenadasChange.emit({
              latitud: Number(pos.lat.toFixed(6)),
              longitud: Number(pos.lng.toFixed(6)),
            });
          }
        });
    }
    if (emitir) {
      this.coordenadasChange.emit({
        latitud: Number(lat.toFixed(6)),
        longitud: Number(lng.toFixed(6)),
      });
    }
  }
}
