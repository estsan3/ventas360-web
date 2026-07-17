import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { ConfiguracionService } from './data-access/configuracion.service';
import { Talonario } from './data-access/parametros.model';

@Component({
  selector: 'app-configuracion-page',
  imports: [Button, Icon, ReactiveFormsModule, TextInput, SelectInput],
  templateUrl: './configuracion-page.html',
  styleUrl: './configuracion-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionPage {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ConfiguracionService);
  private readonly notifications = inject(NotificationStore);

  protected readonly authStore = inject(AuthStore);
  protected readonly guardando = signal(false);
  protected readonly talonarios = signal<Talonario[]>([]);

  protected readonly esAdmin = computed(() => this.authStore.user()?.rol === 'administrador');

  protected readonly monedaOptions: SelectOption[] = [
    { value: 'ARS', label: 'ARS' },
    { value: 'USD', label: 'USD' },
  ];

  protected readonly formNegocio = this.fb.nonNullable.group({
    ivaPorcentaje: ['21', Validators.required],
    moneda: ['ARS' as 'ARS' | 'USD', Validators.required],
  });

  protected readonly formOperativos = this.fb.nonNullable.group({
    sucursalCodigo: ['CENTRAL', Validators.required],
    sucursalNombre: ['Casa central', Validators.required],
    condicionesPago: ['contado,30_dias,60_dias', Validators.required],
  });

  constructor() {
    this.cargarParametros();
  }

  protected cargarParametros(): void {
    this.api.obtenerNegocio().subscribe((n) => {
      this.formNegocio.reset({
        ivaPorcentaje: String(n.ivaPorcentaje),
        moneda: n.moneda,
      });
    });
    this.api.obtenerOperativos().subscribe((o) => {
      this.formOperativos.reset({
        sucursalCodigo: o.sucursalCodigo,
        sucursalNombre: o.sucursalNombre,
        condicionesPago: o.condicionesPago.join(','),
      });
    });
    this.api.listarTalonarios().subscribe((items) => this.talonarios.set(items));
  }

  protected guardarNegocio(): void {
    if (!this.esAdmin() || this.formNegocio.invalid) {
      return;
    }
    const raw = this.formNegocio.getRawValue();
    const iva = Number(raw.ivaPorcentaje);
    if (!Number.isFinite(iva) || iva < 0) {
      this.notifications.error('IVA inválido', 'Debe ser un número ≥ 0');
      return;
    }
    this.guardando.set(true);
    this.api.guardarNegocio({ ivaPorcentaje: iva, moneda: raw.moneda }).subscribe({
      next: () => {
        this.notifications.success('Parámetros guardados', 'Negocio actualizado');
        this.guardando.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected guardarOperativos(): void {
    if (!this.esAdmin() || this.formOperativos.invalid) {
      return;
    }
    const raw = this.formOperativos.getRawValue();
    const condiciones = raw.condicionesPago
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    this.guardando.set(true);
    this.api
      .guardarOperativos({
        sucursalCodigo: raw.sucursalCodigo,
        sucursalNombre: raw.sucursalNombre,
        condicionesPago: condiciones,
      })
      .subscribe({
        next: () => {
          this.notifications.success('Parámetros guardados', 'Operativos actualizados');
          this.guardando.set(false);
        },
        error: () => this.guardando.set(false),
      });
  }

  protected cerrarSesion(): void {
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
