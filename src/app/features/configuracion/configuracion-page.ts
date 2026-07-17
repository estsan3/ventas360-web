import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { ConfiguracionService } from './data-access/configuracion.service';
import { Talonario } from './data-access/parametros.model';

type TipoTalonario = Talonario['tipoComprobante'];

@Component({
  selector: 'app-configuracion-page',
  imports: [Badge, Button, Icon, ReactiveFormsModule, TextInput, SelectInput, Table, TableCellDef],
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
  protected readonly editandoTipo = signal<TipoTalonario | null>(null);

  protected readonly esAdmin = computed(() => this.authStore.user()?.rol === 'administrador');

  protected readonly monedaOptions: SelectOption[] = [
    { value: 'ARS', label: 'ARS' },
    { value: 'USD', label: 'USD' },
  ];

  protected readonly tipoTalonarioOptions: SelectOption[] = [
    { value: 'pedido', label: 'Pedido' },
    { value: 'remito', label: 'Remito' },
    { value: 'factura', label: 'Factura' },
  ];

  protected readonly activoOptions: SelectOption[] = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ];

  protected readonly columnasTalonarios: TableColumn[] = [
    { key: 'tipo', label: 'Tipo', width: '120px' },
    { key: 'prefijo', label: 'Prefijo', width: '100px' },
    { key: 'proximo', label: 'Próximo N°', width: '120px' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '80px', align: 'right' },
  ];

  protected readonly filasTalonarios = computed(() =>
    this.talonarios().map((t) => ({
      id: t.id,
      tipo: t.tipoComprobante,
      tipoLabel: this.etiquetaTipo(t.tipoComprobante),
      prefijo: t.prefijo || '—',
      proximo: t.proximoNumero,
      estado: t.activo ? 'Activo' : 'Inactivo',
      activo: t.activo,
      tipoComprobante: t.tipoComprobante,
    })),
  );

  protected readonly formNegocio = this.fb.nonNullable.group({
    ivaPorcentaje: ['21', Validators.required],
    moneda: ['ARS' as 'ARS' | 'USD', Validators.required],
  });

  protected readonly formOperativos = this.fb.nonNullable.group({
    sucursalCodigo: ['CENTRAL', Validators.required],
    sucursalNombre: ['Casa central', Validators.required],
    condicionesPago: ['contado,30_dias,60_dias', Validators.required],
  });

  protected readonly formTalonario = this.fb.nonNullable.group({
    tipoComprobante: ['pedido' as TipoTalonario, Validators.required],
    prefijo: [''],
    proximoNumero: [1, [Validators.required, Validators.min(1)]],
    activo: ['true', Validators.required],
  });

  constructor() {
    this.cargarParametros();
  }

  protected etiquetaTipo(tipo: TipoTalonario): string {
    const map: Record<TipoTalonario, string> = {
      pedido: 'Pedido',
      remito: 'Remito',
      factura: 'Factura',
    };
    return map[tipo];
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

  protected editarTalonario(tipo: TipoTalonario): void {
    const actual = this.talonarios().find((t) => t.tipoComprobante === tipo);
    this.editandoTipo.set(tipo);
    this.formTalonario.reset({
      tipoComprobante: tipo,
      prefijo: actual?.prefijo ?? '',
      proximoNumero: actual?.proximoNumero ?? 1,
      activo: actual?.activo === false ? 'false' : 'true',
    });
  }

  protected nuevoTalonario(): void {
    const usados = new Set(this.talonarios().map((t) => t.tipoComprobante));
    const libre = (['pedido', 'remito', 'factura'] as TipoTalonario[]).find((t) => !usados.has(t));
    this.editandoTipo.set(libre ?? 'pedido');
    this.formTalonario.reset({
      tipoComprobante: libre ?? 'pedido',
      prefijo: '',
      proximoNumero: 1,
      activo: 'true',
    });
  }

  protected cancelarTalonario(): void {
    this.editandoTipo.set(null);
  }

  protected guardarTalonario(): void {
    if (!this.esAdmin() || this.formTalonario.invalid) {
      this.formTalonario.markAllAsTouched();
      return;
    }
    const raw = this.formTalonario.getRawValue();
    const proximo = Number(raw.proximoNumero);
    if (!Number.isInteger(proximo) || proximo < 1) {
      this.notifications.error('Número inválido', 'El próximo número debe ser ≥ 1');
      return;
    }
    const existente = this.talonarios().find((t) => t.tipoComprobante === raw.tipoComprobante);
    this.guardando.set(true);
    this.api
      .guardarTalonario({
        id: existente?.id ?? '',
        tipoComprobante: raw.tipoComprobante,
        prefijo: raw.prefijo.trim(),
        proximoNumero: proximo,
        activo: raw.activo === 'true',
      })
      .subscribe({
        next: (guardado) => {
          this.talonarios.update((lista) => {
            const idx = lista.findIndex((t) => t.tipoComprobante === guardado.tipoComprobante);
            if (idx === -1) {
              return [...lista, guardado];
            }
            const copia = [...lista];
            copia[idx] = guardado;
            return copia;
          });
          this.notifications.success('Talonario guardado', 'Numerador actualizado');
          this.editandoTipo.set(null);
          this.guardando.set(false);
        },
        error: () => this.guardando.set(false),
      });
  }

  protected cerrarSesion(): void {
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
