import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Button } from '../../shared/ui/button/button';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { SideDrawer } from '../../shared/ui/side-drawer/side-drawer';
import { TipoCompra } from './data-access/compra.model';
import { ComprasService } from './data-access/compras.service';
import { ComprasStore } from './data-access/compras.store';
import {
  CAMPOS_MAPEO_OPTS,
  COLUMNAS_EXCEL,
  ImportarListaResultado,
  MapeoColumna,
  PoliticaPrecioVenta,
  ProveedorLista,
  etiquetaCampo,
} from './data-access/lista-proveedor.model';

type TabCompras = 'facturas' | 'pedidos' | 'proveedores' | 'listas';
type BadgeTone = 'warn' | 'ok' | 'danger' | 'info' | 'neutral';

interface FilaFacturaVista {
  id: string;
  comprobante: string;
  fecha: string;
  proveedor: string;
  total: string;
  estadoLabel: string;
  estadoTone: BadgeTone;
  puedeConfirmar: boolean;
  puedeFacturar: boolean;
}

interface FilaProveedorVista {
  id: string;
  nombre: string;
  cuit: string;
  rubro: string;
  contacto: string;
  saldo: string;
}

function formatearFechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function etiquetaEstado(tipo: TipoCompra, estado: string): { label: string; tone: BadgeTone } {
  if (estado === 'borrador') {
    return { label: 'Borrador', tone: 'neutral' };
  }
  if (estado === 'facturado') {
    return { label: 'Facturado', tone: 'ok' };
  }
  if (estado === 'confirmado' && tipo === 'remito_compra') {
    return { label: 'En stock', tone: 'info' };
  }
  if (estado === 'confirmado') {
    return { label: 'A pagar', tone: 'warn' };
  }
  return { label: estado, tone: 'neutral' };
}

function comprobanteLabel(tipo: TipoCompra, numero: string | null, id: string): string {
  if (numero?.trim()) {
    return numero.trim();
  }
  const corto = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return tipo === 'factura_compra' ? `FC ${corto}` : `REM ${corto}`;
}

@Component({
  selector: 'app-compras-page',
  imports: [
    Button,
    FormsModule,
    ReactiveFormsModule,
    TextInput,
    SelectInput,
    SideDrawer,
    SlicePipe,
  ],
  templateUrl: './compras-page.html',
  styleUrl: './compras-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ComprasService);
  private readonly notifications = inject(NotificationStore);
  protected readonly store = inject(ComprasStore);

  protected readonly tab = signal<TabCompras>('facturas');
  protected readonly drawerAbierto = signal(false);
  protected readonly nuevoProveedorOpen = signal(false);
  protected readonly guardando = signal(false);
  protected readonly importando = signal(false);
  protected readonly proveedoresOpts = signal<SelectOption[]>([]);
  protected readonly productosOpts = signal<SelectOption[]>([]);
  protected readonly depositosOpts = signal<SelectOption[]>([]);
  private readonly nombresProv = signal<Record<string, string>>({});
  private readonly saldosCxp = signal<Record<string, number>>({});

  protected readonly proveedores = signal<ProveedorLista[]>([]);
  protected readonly listaProvId = signal('');
  protected readonly mapeoImport = signal<MapeoColumna[]>([]);
  protected readonly filaInicio = signal(2);
  protected readonly politicaVenta = signal<PoliticaPrecioVenta>('solo_costo');
  protected readonly margenPct = signal(30);
  protected readonly archivoSeleccionado = signal<File | null>(null);
  protected readonly preview = signal<ImportarListaResultado | null>(null);

  protected readonly nuevoNombre = signal('');
  protected readonly nuevoCuit = signal('');
  protected readonly nuevoRubro = signal('');
  protected readonly nuevoProvMapeo = signal<MapeoColumna[]>([
    { columna: 'A', campo: 'codigo_producto' },
    { columna: 'B', campo: 'descripcion' },
    { columna: 'C', campo: 'precio_costo' },
  ]);
  protected readonly nuevoFilaInicio = signal(2);

  protected readonly camposMapeoOpts = CAMPOS_MAPEO_OPTS;
  protected readonly columnasExcel = COLUMNAS_EXCEL;
  protected readonly etiquetaCampo = etiquetaCampo;

  protected readonly tipoOptions: SelectOption[] = [
    { value: 'remito_compra', label: 'Remito de mercadería' },
    { value: 'factura_compra', label: 'Factura de compra' },
  ];

  protected readonly politicaOpts: SelectOption[] = [
    { value: 'solo_costo', label: 'Solo actualizar costo' },
    { value: 'margen_fijo', label: 'Aplicar margen fijo' },
    { value: 'copiar_lista', label: 'Copiar precio de lista' },
  ];

  protected readonly estado = computed(() => this.store.compras());

  protected readonly listaActiva = computed(() => {
    const id = this.listaProvId();
    return this.proveedores().find((p) => p.id === id) ?? null;
  });

  protected readonly filasFacturas = computed((): FilaFacturaVista[] =>
    (this.estado().data ?? [])
      .filter((c) => c.tipo === 'factura_compra' || c.tipo === 'remito_compra')
      .map((c) => {
        const est = etiquetaEstado(c.tipo, c.estado);
        return {
          id: c.id,
          comprobante: comprobanteLabel(c.tipo, c.numero, c.id),
          fecha: formatearFechaCorta(c.fecha),
          proveedor: this.nombresProv()[c.proveedorId] ?? c.proveedorId,
          total: this.formatear(c.total),
          estadoLabel: est.label,
          estadoTone: est.tone,
          puedeConfirmar: c.estado === 'borrador',
          puedeFacturar: c.tipo === 'remito_compra' && c.estado === 'confirmado',
        };
      }),
  );

  protected readonly filasProveedores = computed((): FilaProveedorVista[] =>
    this.proveedores().map((p) => {
      const saldo = this.saldosCxp()[p.id];
      return {
        id: p.id,
        nombre: p.nombre,
        cuit: p.cuit,
        rubro: p.observaciones?.trim() || '—',
        contacto: [p.telefono, p.email].filter(Boolean).join(' · ') || '—',
        saldo: saldo === undefined ? '—' : this.formatear(saldo),
      };
    }),
  );

  protected readonly form = this.fb.nonNullable.group({
    tipo: ['remito_compra' as TipoCompra, Validators.required],
    proveedorId: ['', Validators.required],
    depositoId: ['', Validators.required],
    productoId: ['', Validators.required],
    cantidad: ['1', [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.store.cargar();
    this.recargarProveedores();
    this.api.listarProductosRef().subscribe((items) => {
      this.productosOpts.set(items.map((p) => ({ value: p.id, label: p.nombre })));
    });
    this.api.listarDepositosRef().subscribe((items) => {
      this.depositosOpts.set(items.map((d) => ({ value: d.id, label: d.nombre })));
    });
    this.api.listarSaldosCxp().subscribe({
      next: (s) => this.saldosCxp.set(s),
      error: () => this.saldosCxp.set({}),
    });
  }

  protected recargarProveedores(): void {
    this.api.listarProveedoresCompletos().subscribe((items) => {
      this.proveedores.set(items);
      this.proveedoresOpts.set(items.map((p) => ({ value: p.id, label: p.nombre })));
      this.nombresProv.set(Object.fromEntries(items.map((p) => [p.id, p.nombre])));
      const actual = this.listaProvId();
      if (!actual || !items.some((p) => p.id === actual)) {
        this.seleccionarProveedorLista(items[0]?.id ?? '');
      } else {
        this.seleccionarProveedorLista(actual);
      }
    });
  }

  protected seleccionarProveedorLista(id: string): void {
    this.listaProvId.set(id);
    const prov = this.proveedores().find((p) => p.id === id);
    if (!prov) {
      this.mapeoImport.set([]);
      this.preview.set(null);
      this.archivoSeleccionado.set(null);
      return;
    }
    this.mapeoImport.set(prov.mapeoExcel.map((m) => ({ ...m })));
    this.filaInicio.set(prov.excelFilaInicio);
    this.politicaVenta.set(prov.politicaPrecioVenta);
    this.margenPct.set(prov.margenVentaPct);
    this.preview.set(null);
    this.archivoSeleccionado.set(null);
  }

  protected onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoSeleccionado.set(file);
    this.preview.set(null);
    if (file) {
      this.previsualizar();
    }
  }

  protected previsualizar(): void {
    const provId = this.listaProvId();
    const archivo = this.archivoSeleccionado();
    if (!provId || !archivo) {
      return;
    }
    this.importando.set(true);
    this.api
      .importarLista(provId, archivo, {
        mapeo: this.mapeoImport(),
        filaInicio: this.filaInicio(),
        politica: this.politicaVenta(),
        margenPct: this.margenPct(),
        dryRun: true,
      })
      .subscribe({
        next: (res) => {
          this.preview.set(res);
          this.importando.set(false);
        },
        error: () => this.importando.set(false),
      });
  }

  protected importarLista(): void {
    const provId = this.listaProvId();
    const archivo = this.archivoSeleccionado();
    if (!provId || !archivo) {
      this.notifications.error('Sin archivo', 'Seleccioná un Excel del proveedor');
      return;
    }
    this.importando.set(true);
    this.api
      .importarLista(provId, archivo, {
        mapeo: this.mapeoImport(),
        filaInicio: this.filaInicio(),
        politica: this.politicaVenta(),
        margenPct: this.margenPct(),
        dryRun: false,
      })
      .subscribe({
        next: (res) => {
          this.preview.set(res);
          this.importando.set(false);
          this.notifications.success(
            'Lista importada',
            `${res.actualizados} actualizados · ${res.nuevos} nuevos · ${res.sinMatch} sin match`,
          );
          this.recargarProveedores();
          this.api.listarProductosRef().subscribe((items) => {
            this.productosOpts.set(items.map((p) => ({ value: p.id, label: p.nombre })));
          });
        },
        error: () => this.importando.set(false),
      });
  }

  protected actualizarMapeoCampo(idx: number, campo: string): void {
    this.mapeoImport.update((rows) => rows.map((r, i) => (i === idx ? { ...r, campo } : r)));
  }

  protected actualizarMapeoColumna(idx: number, columna: string): void {
    this.mapeoImport.update((rows) => rows.map((r, i) => (i === idx ? { ...r, columna } : r)));
  }

  protected abrirAlta(): void {
    this.tab.set('facturas');
    const dep = this.depositosOpts()[0]?.value ?? '';
    const prov = this.proveedoresOpts()[0]?.value ?? '';
    const prod = this.productosOpts()[0]?.value ?? '';
    this.form.reset({
      tipo: 'remito_compra',
      proveedorId: prov,
      depositoId: dep,
      productoId: prod,
      cantidad: '1',
    });
    this.drawerAbierto.set(true);
  }

  protected agregarFilaMapeoNuevo(): void {
    const next = COLUMNAS_EXCEL[this.nuevoProvMapeo().length] ?? 'E';
    this.nuevoProvMapeo.update((rows) => [...rows, { columna: next, campo: 'precio_lista' }]);
  }

  protected quitarFilaMapeoNuevo(idx: number): void {
    this.nuevoProvMapeo.update((rows) => rows.filter((_, i) => i !== idx));
  }

  protected actualizarNuevoMapeo(idx: number, key: 'columna' | 'campo', value: string): void {
    this.nuevoProvMapeo.update((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  }

  protected guardarProveedor(): void {
    const nombre = this.nuevoNombre().trim();
    if (!nombre) {
      this.notifications.error('Datos incompletos', 'La razón social es obligatoria');
      return;
    }
    this.guardando.set(true);
    this.api
      .crearProveedor({
        nombre,
        cuit: this.nuevoCuit().trim(),
        observaciones: this.nuevoRubro().trim(),
        mapeoExcel: this.nuevoProvMapeo(),
        excelFilaInicio: this.nuevoFilaInicio(),
        politicaPrecioVenta: 'solo_costo',
        margenVentaPct: 30,
      })
      .subscribe({
        next: (prov) => {
          this.notifications.success('Proveedor creado', prov.nombre);
          this.nuevoProveedorOpen.set(false);
          this.nuevoNombre.set('');
          this.nuevoCuit.set('');
          this.nuevoRubro.set('');
          this.guardando.set(false);
          this.recargarProveedores();
          this.listaProvId.set(prov.id);
        },
        error: () => this.guardando.set(false),
      });
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const cantidad = Number(raw.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      this.notifications.error('Cantidad inválida', 'Debe ser un entero ≥ 1');
      return;
    }
    this.guardando.set(true);
    this.store
      .crear({
        tipo: raw.tipo,
        proveedorId: raw.proveedorId,
        depositoId: raw.depositoId,
        lineas: [
          {
            productoId: raw.productoId,
            cantidad,
            // Sin precio: la API usa producto.costo (lista del proveedor).
          },
        ],
      })
      .subscribe({
        next: () => {
          this.notifications.success(
            raw.tipo === 'remito_compra' ? 'Remito creado' : 'Factura creada',
            'Quedó en borrador — confirmá para impactar stock',
          );
          this.drawerAbierto.set(false);
          this.guardando.set(false);
          this.store.cargar();
        },
        error: () => this.guardando.set(false),
      });
  }

  protected confirmar(id: string): void {
    this.store.confirmar(id).subscribe({
      next: () => {
        this.notifications.success('Compra confirmada', 'Stock ingresado al depósito');
        this.store.cargar();
        this.api.listarSaldosCxp().subscribe({ next: (s) => this.saldosCxp.set(s) });
      },
    });
  }

  protected facturar(id: string): void {
    this.store.facturar(id).subscribe({
      next: () => {
        this.notifications.success('Factura de compra', 'Imputada en CxP');
        this.store.cargar();
        this.api.listarSaldosCxp().subscribe({ next: (s) => this.saldosCxp.set(s) });
      },
    });
  }

  private formatear(valor: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(valor);
  }
}
