import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthStore } from '../../core/state/auth.store';
import { NotificationStore } from '../../notifications/state/notification.store';
import { Badge } from '../../shared/ui/badge/badge';
import { Button } from '../../shared/ui/button/button';
import { Icon } from '../../shared/ui/icon/icon';
import { TextInput } from '../../shared/ui/input/text-input';
import { SelectInput, SelectOption } from '../../shared/ui/select/select-input';
import { Table, TableColumn } from '../../shared/ui/table/table';
import { TableCellDef } from '../../shared/ui/table/table-cell-def';
import { ZonasStore } from '../zonas/data-access/zonas.store';
import {
  DepositoCatalogo,
  ListaPrecioCatalogo,
  VendedorCatalogo,
} from './data-access/catalogos.models';
import { ConfiguracionService } from './data-access/configuracion.service';
import { Talonario } from './data-access/parametros.model';
import { Usuario } from './data-access/usuario.model';
import { UsuariosStore } from './data-access/usuarios.store';

type SeccionConfig =
  'negocio' | 'talonarios' | 'zonas' | 'vendedores' | 'depositos' | 'listas' | 'usuarios';

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
  private readonly zonasStore = inject(ZonasStore);
  private readonly usuariosStore = inject(UsuariosStore);
  private readonly notifications = inject(NotificationStore);
  private readonly confirmDialog = inject(ConfirmDialogService);

  protected readonly authStore = inject(AuthStore);
  protected readonly seccion = signal<SeccionConfig>('negocio');
  protected readonly guardando = signal(false);
  protected readonly talonarios = signal<Talonario[]>([]);
  protected readonly editandoTipo = signal<TipoTalonario | null>(null);
  protected readonly vendedores = signal<VendedorCatalogo[]>([]);
  protected readonly depositos = signal<DepositoCatalogo[]>([]);
  protected readonly listas = signal<ListaPrecioCatalogo[]>([]);
  protected readonly editandoZonaId = signal<string | null>(null);
  protected readonly editandoDepositoId = signal<string | null>(null);
  protected readonly editandoListaId = signal<string | null>(null);

  protected readonly esAdmin = computed(() => this.authStore.user()?.rol === 'administrador');

  protected readonly menuItems: { id: SeccionConfig; label: string }[] = [
    { id: 'negocio', label: 'Negocio' },
    { id: 'talonarios', label: 'Talonarios' },
    { id: 'zonas', label: 'Zonas' },
    { id: 'vendedores', label: 'Vendedores' },
    { id: 'depositos', label: 'Depósitos' },
    { id: 'listas', label: 'Listas de precio' },
    { id: 'usuarios', label: 'Usuarios' },
  ];

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

  protected readonly rolOptions: SelectOption[] = [
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'administrador', label: 'Administrador' },
  ];

  protected readonly columnasTalonarios: TableColumn[] = [
    { key: 'tipo', label: 'Tipo', width: '120px' },
    { key: 'prefijo', label: 'Prefijo', width: '100px' },
    { key: 'proximo', label: 'Próximo N°', width: '120px' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '80px', align: 'right' },
  ];

  protected readonly columnasZonas: TableColumn[] = [
    { key: 'codigo', label: 'Código', width: '100px' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '120px', align: 'right' },
  ];

  protected readonly columnasVendedores: TableColumn[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'acciones', label: '', width: '80px', align: 'right' },
  ];

  protected readonly columnasDepositos: TableColumn[] = [
    { key: 'codigo', label: 'Código', width: '100px' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '120px', align: 'right' },
  ];

  protected readonly columnasListas: TableColumn[] = [
    { key: 'codigo', label: 'Código', width: '100px' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'default', label: 'Default', width: '90px' },
    { key: 'estado', label: 'Estado', width: '110px' },
    { key: 'acciones', label: '', width: '120px', align: 'right' },
  ];

  protected readonly columnasUsuarios: TableColumn[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'rol', label: 'Rol', width: '130px' },
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

  protected readonly filasZonas = computed(() =>
    (this.zonasStore.zonas().data ?? []).map((z) => ({
      id: z.id,
      codigo: z.codigo || '—',
      nombre: z.nombre,
      estado: z.activo ? 'Activo' : 'Inactivo',
      activo: z.activo,
    })),
  );

  protected readonly filasVendedores = computed(() =>
    this.vendedores().map((v) => ({
      id: v.id,
      nombre: v.nombre,
      email: v.email || '—',
    })),
  );

  protected readonly filasDepositos = computed(() =>
    this.depositos().map((d) => ({
      id: d.id,
      codigo: d.codigo,
      nombre: d.nombre,
      estado: d.activo ? 'Activo' : 'Inactivo',
      activo: d.activo,
    })),
  );

  protected readonly filasListas = computed(() =>
    this.listas().map((l) => ({
      id: l.id,
      codigo: l.codigo,
      nombre: l.nombre,
      default: l.esDefault ? 'Sí' : '—',
      estado: l.activo ? 'Activo' : 'Inactivo',
      activo: l.activo,
    })),
  );

  protected readonly filasUsuarios = computed(() =>
    (this.usuariosStore.usuarios().data ?? []).map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol === 'administrador' ? 'Administrador' : 'Vendedor',
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

  protected readonly formZona = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    codigo: [''],
  });

  protected readonly formVendedor = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  protected readonly formDeposito = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
  });

  protected readonly formLista = this.fb.nonNullable.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    esDefault: [false],
  });

  protected readonly formUsuario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    dni: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    rol: ['vendedor' as Usuario['rol'], Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.cargarParametros();
  }

  protected seleccionar(id: SeccionConfig): void {
    this.seccion.set(id);
    if (id === 'zonas') {
      this.zonasStore.cargar({ filtro: 'todos' });
    } else if (id === 'vendedores') {
      this.cargarVendedores();
    } else if (id === 'depositos') {
      this.cargarDepositos();
    } else if (id === 'listas') {
      this.cargarListas();
    } else if (id === 'usuarios') {
      this.usuariosStore.cargar();
    }
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

  protected nuevaZona(): void {
    this.editandoZonaId.set(null);
    this.formZona.reset({ nombre: '', codigo: '' });
  }

  protected editarZona(id: string): void {
    const z = (this.zonasStore.zonas().data ?? []).find((x) => x.id === id);
    if (!z) {
      return;
    }
    this.editandoZonaId.set(id);
    this.formZona.reset({ nombre: z.nombre, codigo: z.codigo });
  }

  protected guardarZona(): void {
    if (!this.esAdmin() || this.formZona.invalid) {
      this.formZona.markAllAsTouched();
      return;
    }
    const raw = this.formZona.getRawValue();
    const id = this.editandoZonaId();
    this.guardando.set(true);
    const req = id ? this.zonasStore.actualizar(id, raw) : this.zonasStore.crear(raw);
    req.subscribe({
      next: () => {
        this.notifications.success(id ? 'Zona actualizada' : 'Zona creada', raw.nombre);
        this.editandoZonaId.set(null);
        this.formZona.reset({ nombre: '', codigo: '' });
        this.guardando.set(false);
        this.zonasStore.cargar({ filtro: 'todos' });
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async desactivarZona(id: string): Promise<void> {
    const z = (this.zonasStore.zonas().data ?? []).find((x) => x.id === id);
    if (!z?.activo) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Desactivar zona',
      mensaje: `¿Desactivar ${z.nombre}?`,
      textoConfirmar: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.zonasStore.desactivar(id).subscribe((zona) => {
      this.notifications.warning('Zona desactivada', zona.nombre);
    });
  }

  protected cargarVendedores(): void {
    this.api.listarVendedores().subscribe((items) => this.vendedores.set(items));
  }

  protected crearVendedor(): void {
    if (!this.esAdmin() || this.formVendedor.invalid) {
      this.formVendedor.markAllAsTouched();
      return;
    }
    const nombre = this.formVendedor.getRawValue().nombre.trim();
    this.guardando.set(true);
    this.api.crearVendedor(nombre).subscribe({
      next: () => {
        this.notifications.success('Vendedor creado', nombre);
        this.formVendedor.reset({ nombre: '' });
        this.guardando.set(false);
        this.cargarVendedores();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async eliminarVendedor(id: string): Promise<void> {
    const v = this.vendedores().find((x) => x.id === id);
    if (!v) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Eliminar vendedor',
      mensaje: `¿Eliminar a ${v.nombre}?`,
      textoConfirmar: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.api.eliminarVendedor(id).subscribe({
      next: () => {
        this.notifications.warning('Vendedor eliminado', v.nombre);
        this.cargarVendedores();
      },
    });
  }

  protected cargarDepositos(): void {
    this.api.listarDepositos().subscribe((items) => this.depositos.set(items));
  }

  protected nuevoDeposito(): void {
    this.editandoDepositoId.set(null);
    this.formDeposito.reset({ codigo: '', nombre: '' });
    this.formDeposito.controls.codigo.enable();
  }

  protected editarDeposito(id: string): void {
    const d = this.depositos().find((x) => x.id === id);
    if (!d) {
      return;
    }
    this.editandoDepositoId.set(id);
    this.formDeposito.reset({ codigo: d.codigo, nombre: d.nombre });
    this.formDeposito.controls.codigo.disable();
  }

  protected guardarDeposito(): void {
    if (!this.esAdmin() || this.formDeposito.invalid) {
      this.formDeposito.markAllAsTouched();
      return;
    }
    const raw = this.formDeposito.getRawValue();
    const id = this.editandoDepositoId();
    this.guardando.set(true);
    const req = id
      ? this.api.actualizarDeposito(id, { nombre: raw.nombre })
      : this.api.crearDeposito(raw);
    req.subscribe({
      next: () => {
        this.notifications.success(id ? 'Depósito actualizado' : 'Depósito creado', raw.nombre);
        this.nuevoDeposito();
        this.guardando.set(false);
        this.cargarDepositos();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async desactivarDeposito(id: string): Promise<void> {
    const d = this.depositos().find((x) => x.id === id);
    if (!d?.activo) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Desactivar depósito',
      mensaje: `¿Desactivar ${d.nombre}?`,
      textoConfirmar: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.api.desactivarDeposito(id).subscribe(() => {
      this.notifications.warning('Depósito desactivado', d.nombre);
      this.cargarDepositos();
    });
  }

  protected cargarListas(): void {
    this.api.listarListasPrecio().subscribe((items) => this.listas.set(items));
  }

  protected nuevaLista(): void {
    this.editandoListaId.set(null);
    this.formLista.reset({ codigo: '', nombre: '', esDefault: false });
    this.formLista.controls.codigo.enable();
  }

  protected editarLista(id: string): void {
    const l = this.listas().find((x) => x.id === id);
    if (!l) {
      return;
    }
    this.editandoListaId.set(id);
    this.formLista.reset({ codigo: l.codigo, nombre: l.nombre, esDefault: l.esDefault });
    this.formLista.controls.codigo.disable();
  }

  protected guardarLista(): void {
    if (!this.esAdmin() || this.formLista.invalid) {
      this.formLista.markAllAsTouched();
      return;
    }
    const raw = this.formLista.getRawValue();
    const id = this.editandoListaId();
    this.guardando.set(true);
    const req = id
      ? this.api.actualizarListaPrecio(id, { nombre: raw.nombre, esDefault: raw.esDefault })
      : this.api.crearListaPrecio(raw);
    req.subscribe({
      next: () => {
        this.notifications.success(id ? 'Lista actualizada' : 'Lista creada', raw.nombre);
        this.nuevaLista();
        this.guardando.set(false);
        this.cargarListas();
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async desactivarLista(id: string): Promise<void> {
    const l = this.listas().find((x) => x.id === id);
    if (!l?.activo) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Desactivar lista',
      mensaje: `¿Desactivar ${l.nombre}?`,
      textoConfirmar: 'Desactivar',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.api.desactivarListaPrecio(id).subscribe(() => {
      this.notifications.warning('Lista desactivada', l.nombre);
      this.cargarListas();
    });
  }

  protected crearUsuario(): void {
    if (!this.esAdmin() || this.formUsuario.invalid) {
      this.formUsuario.markAllAsTouched();
      return;
    }
    const raw = this.formUsuario.getRawValue();
    this.guardando.set(true);
    this.usuariosStore.crear(raw).subscribe({
      next: () => {
        this.notifications.success('Usuario creado', raw.nombre);
        this.formUsuario.reset({
          nombre: '',
          dni: '',
          email: '',
          rol: 'vendedor',
          password: '',
        });
        this.guardando.set(false);
      },
      error: () => this.guardando.set(false),
    });
  }

  protected async darDeBajaUsuario(id: string): Promise<void> {
    const u = (this.usuariosStore.usuarios().data ?? []).find((x) => x.id === id);
    if (!u) {
      return;
    }
    const ok = await this.confirmDialog.abrir({
      titulo: 'Dar de baja usuario',
      mensaje: `¿Dar de baja a ${u.nombre}?`,
      textoConfirmar: 'Dar de baja',
      variant: 'danger',
    });
    if (!ok) {
      return;
    }
    this.usuariosStore.darDeBaja(id).subscribe(() => {
      this.notifications.warning('Usuario dado de baja', u.nombre);
    });
  }

  protected cerrarSesion(): void {
    this.authStore.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
