import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationStore } from '../../notifications/state/notification.store';
import { RemitoIaService } from '../inventario/data-access/remito-ia.service';
import { TipoCompra } from './data-access/compra.model';
import { ComprasService } from './data-access/compras.service';
import { ComprasStore } from './data-access/compras.store';
import { ListaProveedorItem, ProveedorLista } from './data-access/lista-proveedor.model';
import {
  BadgeTone,
  ChipOc,
  ChipRec,
  ProvSub,
  TabCompras,
  estadoFacturaVista,
  estadoPedidoVista,
  estadoRemitoVista,
  etiquetaIva,
  formatearFechaCorta,
  formatearMoney,
  formatearMoneyDec,
  numeroCompra,
  pedidoAbierto,
  pctRecibido,
  tabDesdeQuery,
} from './compras-vista';

interface MovCxp {
  id: string;
  tipo: string;
  monto: number;
  concepto: string;
  fecha: string;
}

@Component({
  selector: 'app-compras-page',
  imports: [FormsModule],
  templateUrl: './compras-page.html',
  styleUrl: './compras-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComprasPage {
  private readonly api = inject(ComprasService);
  private readonly store = inject(ComprasStore);
  private readonly notifications = inject(NotificationStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly remitoIa = inject(RemitoIaService);

  protected readonly tab = signal<TabCompras>('oc');
  protected readonly chipOc = signal<ChipOc>('todas');
  protected readonly chipRec = signal<ChipRec>('todas');
  protected readonly qOc = signal('');
  protected readonly qProv = signal('');
  protected readonly ocSelId = signal<string | null>(null);
  protected readonly recSelId = signal<string | null>(null);
  protected readonly factSelId = signal<string | null>(null);
  protected readonly provSelId = signal<string | null>(null);
  protected readonly provSub = signal<ProvSub>('lista');
  protected readonly proveedores = signal<ProveedorLista[]>([]);
  protected readonly saldosCxp = signal<Record<string, number>>({});
  protected readonly itemsLista = signal<ListaProveedorItem[]>([]);
  protected readonly movsCxp = signal<MovCxp[]>([]);
  protected readonly depositos = signal<{ id: string; nombre: string }[]>([]);
  protected readonly recDepositoId = signal('');
  protected readonly guardando = signal(false);
  protected readonly importando = signal(false);
  protected readonly altaOpen = signal(false);
  protected readonly altaPaso = signal(1);
  protected readonly ordenOpen = signal(false);
  protected readonly iaOpen = signal(false);
  protected readonly iaParseando = signal(false);

  protected readonly altaCuit = signal('');
  protected readonly altaNombre = signal('');
  protected readonly altaEmail = signal('');
  protected readonly altaTel = signal('');
  protected readonly altaIva = signal('responsable_inscripto');
  protected readonly altaRubro = signal('Ferretería');
  protected readonly altaContacto = signal('');
  protected readonly altaCond = signal('Cuenta 30 días');
  protected readonly altaDesc = signal('0');
  protected readonly altaArchivo = signal<File | null>(null);

  protected readonly ordenProvId = signal('');
  protected readonly ordenDepId = signal('');
  protected readonly ordenTipo = signal<TipoCompra>('pedido_compra');
  protected readonly ordenOrigenId = signal('');
  protected readonly ordenLineas = signal<
    { productoId: string; codigoProveedor: string; cantidad: string }[]
  >([{ productoId: '', codigoProveedor: '', cantidad: '1' }]);
  protected readonly itemsPedido = signal<ListaProveedorItem[]>([]);

  protected readonly iaProvId = signal('');
  protected readonly iaDepId = signal('');
  protected readonly iaArchivo = signal<File | null>(null);

  protected readonly altaSkuId = signal<string | null>(null);
  protected readonly altaSku = signal('');

  protected readonly estado = computed(() => this.store.compras());
  protected readonly todas = computed(() => this.estado().data ?? []);
  protected readonly pedidos = computed(() =>
    this.todas().filter((c) => c.tipo === 'pedido_compra'),
  );
  protected readonly remitos = computed(() =>
    this.todas().filter((c) => c.tipo === 'remito_compra'),
  );
  protected readonly facturas = computed(() =>
    this.todas().filter((c) => c.tipo === 'factura_compra'),
  );

  protected readonly nombresProv = computed(() =>
    Object.fromEntries(this.proveedores().map((p) => [p.id, p.nombre])),
  );

  protected readonly contextoTxt = computed(() => {
    const n = this.proveedores().length;
    const abiertas = this.pedidos().filter(pedidoAbierto).length;
    return `${n} proveedores · ${abiertas} órdenes abiertas`;
  });

  protected readonly badgeOc = computed(() => this.pedidos().filter(pedidoAbierto).length);
  protected readonly badgeProv = computed(
    () => this.proveedores().filter((p) => !p.ultimaImportacionFecha).length,
  );
  protected readonly badgeRec = computed(
    () => this.remitos().filter((r) => r.estado === 'borrador').length,
  );
  protected readonly badgeFact = computed(
    () => this.facturas().filter((f) => f.estado === 'borrador').length,
  );

  protected readonly ocKpis = computed(() => {
    const ocs = this.pedidos();
    const abiertas = ocs.filter(pedidoAbierto);
    const enviadas = ocs.filter((o) => o.estado === 'emitido');
    const parciales = ocs.filter((o) => o.estado === 'parcial');
    const recSinFact = ocs.filter((o) => o.estado === 'recibido' && !this.facturaDePedido(o.id));
    return [
      {
        id: 'abiertas' as ChipOc,
        label: 'Órdenes abiertas',
        value: String(abiertas.length),
        hint: 'borradores, enviadas y parciales',
        tone: 'ink' as const,
      },
      {
        id: 'enviada' as ChipOc,
        label: 'Enviadas sin confirmar',
        value: String(enviadas.length),
        hint: 'esperando al proveedor',
        tone: 'accent' as const,
      },
      {
        id: 'parcial' as ChipOc,
        label: 'Entregas parciales',
        value: String(parciales.length),
        hint: 'falta mercadería',
        tone: 'warn' as const,
      },
      {
        id: 'recibida' as ChipOc,
        label: 'Recibidas sin facturar',
        value: String(recSinFact.length),
        hint: 'remito sin factura',
        tone: 'accent' as const,
      },
      {
        id: 'todas' as ChipOc,
        label: 'Comprometido',
        value: formatearMoney(abiertas.reduce((n, o) => n + o.total, 0)),
        hint: 'en órdenes abiertas',
        tone: 'ink' as const,
      },
    ];
  });

  protected readonly ocFiltradas = computed(() => {
    const chip = this.chipOc();
    const q = this.qOc().trim().toLowerCase();
    return this.pedidos().filter((o) => {
      if (chip === 'abiertas' && !pedidoAbierto(o)) {
        return false;
      }
      if (chip === 'enviada' && o.estado !== 'emitido') {
        return false;
      }
      if (chip === 'parcial' && o.estado !== 'parcial') {
        return false;
      }
      if (chip === 'recibida' && o.estado !== 'recibido') {
        return false;
      }
      if (!q) {
        return true;
      }
      const num = numeroCompra(o.tipo, o.numero, o.id).toLowerCase();
      const prov = (this.nombresProv()[o.proveedorId] ?? '').toLowerCase();
      const arts = o.lineas.map((l) => l.descripcion.toLowerCase()).join(' ');
      return num.includes(q) || prov.includes(q) || arts.includes(q);
    });
  });

  protected readonly ocRows = computed(() => {
    const selId = this.ocSelId() ?? this.ocFiltradas()[0]?.id;
    return this.ocFiltradas().map((o) => {
      const est = estadoPedidoVista(o.estado);
      const rec = pctRecibido(o);
      const sel = o.id === selId;
      return {
        id: o.id,
        numero: numeroCompra(o.tipo, o.numero, o.id),
        prov: this.nombresProv()[o.proveedorId] ?? o.proveedorId.slice(0, 8),
        sub: `${o.lineas.length} art. · ${o.observaciones || 'sin nota'}`,
        fecha: formatearFechaCorta(o.fecha),
        entrega: formatearFechaCorta(o.fechaEntrega),
        lineas: String(o.lineas.length),
        recTxt: rec.txt,
        recTone: rec.tone,
        total: formatearMoneyDec(o.total),
        estado: est.label,
        tone: est.tone,
        sel,
      };
    });
  });

  protected readonly ocCountTxt = computed(() => {
    const n = this.ocFiltradas().length;
    return n === 1 ? '1 orden' : `${n} órdenes`;
  });
  protected readonly ocTotalFmt = computed(() =>
    formatearMoney(this.ocFiltradas().reduce((n, o) => n + o.total, 0)),
  );
  protected readonly ocVacio = computed(
    () => this.estado().status !== 'loading' && this.ocRows().length === 0,
  );

  protected readonly ocSel = computed(() => {
    const id = this.ocSelId();
    const o = this.pedidos().find((x) => x.id === id) ?? this.ocFiltradas()[0] ?? null;
    if (!o) {
      return null;
    }
    const est = estadoPedidoVista(o.estado);
    const rems = this.remitos().filter((r) => r.origenId === o.id);
    const facts = this.facturasDePedido(o.id);
    const recPorProd = this.recibidoPorProducto(o.id);
    const lineas = o.lineas.map((l) => {
      const rec = recPorProd.get(l.productoId || l.codigoProveedor) ?? 0;
      const pend = Math.max(l.cantidad - rec, 0);
      return {
        id: l.id,
        nombre: l.descripcion,
        sub: l.codigoProveedor || l.productoId.slice(0, 8),
        pedido: l.cantidad,
        recibido: rec,
        pend,
        pendTone: (pend > 0 ? 'warn' : 'ok') as BadgeTone,
        subtotal: formatearMoneyDec(l.cantidad * l.precioUnitario),
        dif: rec !== l.cantidad,
      };
    });
    const cta =
      o.estado === 'borrador'
        ? { label: 'Emitir orden', acc: 'emitir' as const }
        : o.estado === 'emitido' || o.estado === 'parcial'
          ? { label: 'Cargar remito', acc: 'remito' as const }
          : facts.length === 0
            ? { label: 'Cargar factura', acc: 'factura' as const }
            : { label: 'Ver factura', acc: 'verfact' as const };
    const hayPend = lineas.some((l) => l.pend > 0);
    return {
      id: o.id,
      numero: numeroCompra(o.tipo, o.numero, o.id),
      estado: est.label,
      tone: est.tone,
      prov: this.nombresProv()[o.proveedorId] ?? 'Proveedor',
      meta: `${formatearFechaCorta(o.fecha)} · entrega ${formatearFechaCorta(o.fechaEntrega)}`,
      lineas,
      totales: [
        { label: 'Neto', value: formatearMoneyDec(o.neto) },
        { label: `IVA ${o.ivaPorcentaje} %`, value: formatearMoneyDec(o.iva) },
        { label: 'Total', value: formatearMoneyDec(o.total), strong: true },
      ],
      notaTxt: hayPend
        ? 'Hay líneas pendientes de recepción. El remito puede ser parcial.'
        : o.estado === 'borrador'
          ? 'Borrador: emitila para que el proveedor la tome.'
          : 'Orden completa. El stock entra con el remito; la CxP con la factura.',
      notaTone: (hayPend ? 'warn' : o.estado === 'borrador' ? 'muted' : 'ok') as BadgeTone,
      traza: [
        {
          label: 'Orden emitida',
          value: formatearFechaCorta(o.fecha),
          on: o.estado !== 'borrador',
        },
        {
          label: 'Remitos recibidos',
          value: rems.length
            ? rems.map((r) => numeroCompra(r.tipo, r.numero, r.id)).join(', ')
            : 'ninguno',
          on: rems.length > 0,
        },
        {
          label: 'Facturas asociadas',
          value: facts.length
            ? facts.map((f) => numeroCompra(f.tipo, f.numero, f.id)).join(', ')
            : 'ninguna',
          on: facts.length > 0,
        },
        {
          label: 'Impacto en stock',
          value: rems.some((r) => r.estado === 'confirmado') ? 'ingresado' : 'pendiente',
          on: rems.some((r) => r.estado === 'confirmado'),
        },
      ],
      cta,
    };
  });

  protected readonly provList = computed(() => {
    const q = this.qProv().trim().toLowerCase();
    return this.proveedores()
      .filter((p) => {
        if (!q) {
          return true;
        }
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.cuit.toLowerCase().includes(q) ||
          p.observaciones.toLowerCase().includes(q)
        );
      })
      .map((p) => {
        const saldo = this.saldosCxp()[p.id] ?? 0;
        const listaN = p.ultimaImportacionFecha
          ? p.ultimaImportacionActualizados + p.ultimaImportacionNuevos
          : 0;
        return {
          id: p.id,
          nombre: p.nombre,
          saldoFmt: saldo ? formatearMoney(saldo) : '—',
          listaTxt: listaN ? `Lista · ${listaN}` : 'Sin lista',
          listaTone: (listaN ? 'ok' : 'accent') as BadgeTone,
          rubro: p.observaciones?.trim() || etiquetaIva(p.condicionIva),
          sel: this.provSelId() === p.id,
        };
      });
  });

  protected readonly provCountTxt = computed(() => {
    const n = this.provList().length;
    return n === 1 ? '1 proveedor' : `${n} proveedores`;
  });

  protected readonly provFicha = computed(() => {
    const id = this.provSelId();
    const p = this.proveedores().find((x) => x.id === id) ?? this.proveedores()[0] ?? null;
    if (!p) {
      return null;
    }
    const saldo = this.saldosCxp()[p.id] ?? 0;
    const listaN = p.ultimaImportacionFecha
      ? p.ultimaImportacionActualizados + p.ultimaImportacionNuevos + p.ultimaImportacionSinMatch
      : 0;
    const sinVincular = p.ultimaImportacionSinMatch;
    const tieneLista = !!p.ultimaImportacionFecha;
    const items = this.itemsLista();
    return {
      id: p.id,
      nombre: p.nombre,
      estado: p.activo ? (tieneLista ? 'Activo' : 'Sin lista') : 'Inactivo',
      estTone: (p.activo ? (tieneLista ? 'ok' : 'warn') : 'danger') as BadgeTone,
      meta: `${p.cuit || 'sin CUIT'} · ${etiquetaIva(p.condicionIva)}`,
      kpis: [
        {
          label: 'Saldo a pagar',
          value: saldo ? formatearMoney(saldo) : '—',
          hint: 'cuenta corriente',
          tone: saldo ? 'danger' : 'ok',
        },
        {
          label: 'Lista vigente',
          value: tieneLista ? formatearFechaCorta(p.ultimaImportacionFecha) : 'sin cargar',
          hint: tieneLista ? `${listaN} artículos` : 'cargá la lista para comprar',
          tone: tieneLista ? 'ok' : 'accent',
        },
        {
          label: 'Descuento',
          value: `${p.margenVentaPct} %`,
          hint: 'margen de venta',
          tone: 'ink',
        },
        { label: 'Mail', value: p.email || '—', hint: 'pedidos', tone: 'ink' },
        { label: 'Teléfono', value: p.telefono || '—', hint: 'contacto', tone: 'ink' },
        {
          label: 'Sin vincular',
          value: String(sinVincular),
          hint: 'solo en lista, sin SKU propio',
          tone: sinVincular ? 'accent' : 'ok',
        },
      ],
      listaTitulo: tieneLista
        ? `${p.ultimaImportacionArchivo || 'Lista'} · ${formatearFechaCorta(p.ultimaImportacionFecha)}`
        : 'Todavía no hay lista de precios',
      listaSub: tieneLista
        ? `${p.ultimaImportacionActualizados} en catálogo · ${p.ultimaImportacionNuevos} nuevos · ${p.ultimaImportacionSinMatch} sin match`
        : 'Importá un Excel o PDF del proveedor para comprar con sus códigos.',
      listaRows: items.map((it) => ({
        id: it.id,
        codProv: it.codigoProveedor,
        nombre: it.nombre,
        sub: [it.marca, it.rubro].filter(Boolean).join(' · ') || '—',
        unidad: 'un.',
        costo: formatearMoneyDec(it.costo || it.precioLista),
        ultimo: '—',
        varTxt: '—',
        neto: formatearMoneyDec(it.costo || it.precioLista),
        chip: it.enCatalogo ? 'En catálogo' : 'Sin vincular',
        chipTone: (it.enCatalogo ? 'ok' : 'accent') as BadgeTone,
        accionar: !it.enCatalogo,
      })),
      reglaTxt:
        p.politicaPrecioVenta === 'margen_fijo'
          ? `Al aplicar, el precio de venta se recalcula con margen ${p.margenVentaPct} %.`
          : p.politicaPrecioVenta === 'copiar_lista'
            ? 'Al aplicar, el precio de venta copia el de lista.'
            : 'Al aplicar, solo se actualiza el costo. El precio de venta no cambia.',
      bloques: [
        {
          titulo: 'Identificación fiscal',
          filas: [
            { label: 'CUIT', value: p.cuit || '—' },
            { label: 'Condición frente al IVA', value: etiquetaIva(p.condicionIva) },
            {
              label: 'Comprobantes que emite',
              value:
                p.condicionIva === 'monotributo' ? 'Factura C (sin crédito fiscal)' : 'Factura A',
            },
          ],
        },
        {
          titulo: 'Comercial',
          filas: [
            { label: 'Contacto', value: p.telefono || '—' },
            { label: 'Mail de pedidos', value: p.email || '—' },
            { label: 'Notas', value: p.observaciones || '—' },
          ],
        },
      ],
      movs: this.movsVista(),
      saldoFmt: formatearMoney(saldo),
      movNota: 'Debe = facturas de compra. Haber = pagos a proveedor.',
    };
  });

  protected readonly recFiltrados = computed(() => {
    const chip = this.chipRec();
    return this.remitos().filter((r) => {
      if (chip === 'pendientes') {
        return r.estado === 'borrador';
      }
      if (chip === 'ingresados') {
        return r.estado === 'confirmado';
      }
      return true;
    });
  });

  protected readonly recRows = computed(() =>
    this.recFiltrados().map((r) => {
      const est = estadoRemitoVista(r.estado);
      const oc = r.origenId ? this.pedidos().find((o) => o.id === r.origenId) : null;
      return {
        id: r.id,
        numero: numeroCompra(r.tipo, r.numero, r.id),
        prov: this.nombresProv()[r.proveedorId] ?? 'Proveedor',
        fecha: formatearFechaCorta(r.fecha),
        estado: est.label,
        tone: est.tone,
        ocTxt: oc ? numeroCompra(oc.tipo, oc.numero, oc.id) : 'Sin orden',
        ocTone: (oc ? 'info' : 'accent') as BadgeTone,
        total: formatearMoneyDec(r.total),
        sel: (this.recSelId() ?? this.recFiltrados()[0]?.id) === r.id,
      };
    }),
  );

  protected readonly recSel = computed(() => {
    const id = this.recSelId();
    const r = this.remitos().find((x) => x.id === id) ?? this.recFiltrados()[0] ?? null;
    if (!r) {
      return null;
    }
    const est = estadoRemitoVista(r.estado);
    const oc = r.origenId ? this.pedidos().find((o) => o.id === r.origenId) : null;
    const pedPor = new Map(
      (oc?.lineas ?? []).map((l) => [l.productoId || l.codigoProveedor, l.cantidad]),
    );
    let difs = 0;
    let nuevos = 0;
    const lineas = r.lineas.map((l) => {
      const key = l.productoId || l.codigoProveedor;
      const ped = pedPor.get(key) ?? 0;
      const rec = l.cantidad;
      const dif = rec - ped;
      if (ped === 0) {
        nuevos += 1;
      } else if (dif !== 0) {
        difs += 1;
      }
      const chip = ped === 0 ? 'Sin asociar' : dif === 0 ? 'OK' : dif > 0 ? 'De más' : 'Faltante';
      return {
        id: l.id,
        nombre: l.descripcion,
        codigoTxt: l.codigoProveedor || l.productoId.slice(0, 8) || '—',
        pedido: ped || '—',
        recibido: rec,
        dif: ped ? (dif > 0 ? `+${dif}` : String(dif)) : '—',
        difTone: (dif === 0 || ped === 0 ? (ped === 0 ? 'accent' : 'ok') : 'warn') as BadgeTone,
        costo: formatearMoneyDec(l.precioUnitario),
        subtotal: formatearMoneyDec(rec * l.precioUnitario),
        chip,
        chipTone: (chip === 'OK' ? 'ok' : chip === 'Sin asociar' ? 'accent' : 'warn') as BadgeTone,
        aviso: ped === 0,
        avisoTxt: 'No estaba en la orden. Revisá antes de ingresar.',
      };
    });
    const puedeIngresar = r.estado === 'borrador';
    return {
      id: r.id,
      numero: numeroCompra(r.tipo, r.numero, r.id),
      estado: est.label,
      tone: est.tone,
      meta: `${this.nombresProv()[r.proveedorId] ?? ''} · ${formatearFechaCorta(r.fecha)}${oc ? ` · ${numeroCompra(oc.tipo, oc.numero, oc.id)}` : ''}`,
      resumen: [
        { label: 'Líneas', value: String(r.lineas.length), tone: 'ink' as const },
        {
          label: 'Con diferencia',
          value: String(difs),
          tone: difs ? ('warn' as const) : ('ok' as const),
        },
        {
          label: 'Sin asociar',
          value: String(nuevos),
          tone: nuevos ? ('accent' as const) : ('ok' as const),
        },
        {
          label: 'Unidades',
          value: String(r.lineas.reduce((n, l) => n + l.cantidad, 0)),
          tone: 'ink' as const,
        },
      ],
      lineas,
      notaTxt: puedeIngresar
        ? 'Al confirmar, esas unidades ingresan al depósito elegido. La cuenta del proveedor se mueve con la factura.'
        : 'Ya ingresó a stock. Si hay diferencia de precio, se ve en la factura.',
      notaTone: (puedeIngresar ? 'warn' : 'ok') as BadgeTone,
      totalPedido: oc ? formatearMoneyDec(oc.total) : '—',
      totalRecibido: formatearMoneyDec(r.total),
      ctaLabel: puedeIngresar ? 'Ingresar a stock' : 'Ya ingresado',
      puedeIngresar,
      depositoId: r.depositoId ?? this.recDepositoId(),
    };
  });

  protected readonly factKpis = computed(() => {
    const facts = this.facturas();
    const porConciliar = facts.filter((f) => f.estado === 'borrador');
    const recSinFact = this.pedidos().filter(
      (o) => o.estado === 'recibido' && !this.facturaDePedido(o.id),
    );
    const ivaMes = facts.reduce((n, f) => n + f.iva, 0);
    const aPagar = facts.filter((f) => f.estado === 'confirmado' || f.estado === 'facturado');
    return [
      {
        label: 'A pagar',
        value: formatearMoney(aPagar.reduce((n, f) => n + f.total, 0)),
        hint: `${aPagar.length} comprobantes registrados`,
        tone: 'danger' as const,
      },
      {
        label: 'Por conciliar',
        value: String(porConciliar.length),
        hint: 'borrador, sin imputar CxP',
        tone: 'warn' as const,
      },
      {
        label: 'Recibido sin facturar',
        value: formatearMoney(recSinFact.reduce((n, o) => n + o.total, 0)),
        hint: 'remitos esperando factura',
        tone: 'accent' as const,
      },
      {
        label: 'Crédito fiscal',
        value: formatearMoney(ivaMes),
        hint: 'IVA compras (comprobantes cargados)',
        tone: 'ink' as const,
      },
    ];
  });

  protected readonly factRows = computed(() =>
    this.facturas().map((f) => {
      const est = estadoFacturaVista(f.estado);
      const rem = f.origenId ? this.remitos().find((r) => r.id === f.origenId) : null;
      const vto = this.vtoFactura(f.fecha);
      return {
        id: f.id,
        numero: numeroCompra(f.tipo, f.numero, f.id),
        prov: this.nombresProv()[f.proveedorId] ?? 'Proveedor',
        fecha: formatearFechaCorta(f.fecha),
        vto,
        remTxt: rem ? numeroCompra(rem.tipo, rem.numero, rem.id) : 'sin remito',
        remTone: (rem ? 'info' : 'accent') as BadgeTone,
        total: formatearMoneyDec(f.total),
        estado: est.label,
        tone: est.tone,
        sel: (this.factSelId() ?? this.facturas()[0]?.id) === f.id,
      };
    }),
  );

  protected readonly factCountTxt = computed(() => {
    const n = this.facturas().length;
    return n === 1 ? '1 factura' : `${n} facturas`;
  });

  protected readonly factSel = computed(() => {
    const id = this.factSelId();
    const f = this.facturas().find((x) => x.id === id) ?? this.facturas()[0] ?? null;
    if (!f) {
      return null;
    }
    const est = estadoFacturaVista(f.estado);
    const rem = f.origenId ? this.remitos().find((r) => r.id === f.origenId) : null;
    const oc = rem?.origenId ? this.pedidos().find((o) => o.id === rem.origenId) : null;
    const conc = f.lineas.map((l) => {
      const key = l.productoId || l.codigoProveedor;
      const ocCant =
        oc?.lineas.find((x) => (x.productoId || x.codigoProveedor) === key)?.cantidad ?? 0;
      const remCant =
        rem?.lineas.find((x) => (x.productoId || x.codigoProveedor) === key)?.cantidad ?? 0;
      const aviso = ocCant && l.cantidad !== ocCant;
      return {
        id: l.id,
        nombre: l.descripcion,
        oc: ocCant || '—',
        rem: remCant || '—',
        fact: l.cantidad,
        factTone: (aviso ? 'warn' : 'ok') as BadgeTone,
        aviso,
        avisoTxt: aviso ? `La factura (${l.cantidad}) no calza con la orden (${ocCant}).` : '',
      };
    });
    const puedeRegistrar = f.estado === 'borrador';
    return {
      id: f.id,
      numero: numeroCompra(f.tipo, f.numero, f.id),
      estado: est.label,
      tone: est.tone,
      prov: this.nombresProv()[f.proveedorId] ?? 'Proveedor',
      meta: `${formatearFechaCorta(f.fecha)} · vence ${this.vtoFactura(f.fecha)}${rem ? ` · ${numeroCompra(rem.tipo, rem.numero, rem.id)}` : ''}`,
      conc,
      totales: [
        { label: 'Neto', value: formatearMoneyDec(f.neto) },
        { label: `IVA ${f.ivaPorcentaje} %`, value: formatearMoneyDec(f.iva) },
        { label: 'Total', value: formatearMoneyDec(f.total), strong: true },
      ],
      notaTxt: puedeRegistrar
        ? 'Al registrar se imputa el debe en la cuenta corriente del proveedor. El stock ya entró con el remito.'
        : 'Registrada en CxP. El pago se carga en Tesorería.',
      notaTone: (puedeRegistrar ? 'warn' : 'ok') as BadgeTone,
      impactos: [
        {
          titulo: 'Stock',
          detalle:
            rem?.estado === 'confirmado'
              ? 'Ya ingresó con el remito. La factura no lo mueve de nuevo.'
              : 'Pendiente: primero confirmá el remito.',
        },
        {
          titulo: 'Cuenta corriente',
          detalle: puedeRegistrar
            ? 'Se genera un debe por el total de la factura.'
            : 'Ya imputada.',
        },
        {
          titulo: 'Libro IVA',
          detalle: 'Crédito fiscal según la alícuota del comprobante.',
        },
      ],
      ctaLabel: puedeRegistrar ? 'Registrar factura' : 'Ir a pagar',
      puedeRegistrar,
    };
  });

  constructor() {
    this.tab.set(tabDesdeQuery(this.route.snapshot.queryParamMap.get('tab')));
    if (this.route.snapshot.queryParamMap.get('tab') === 'listas') {
      this.provSub.set('lista');
    }
    this.boot();
  }

  private boot(): void {
    this.store.cargar();
    this.api.listarProveedoresCompletos().subscribe((items) => {
      this.proveedores.set(items);
      if (!this.provSelId() && items[0]) {
        this.seleccionarProv(items[0].id);
      }
      if (!this.ordenProvId() && items[0]) {
        this.ordenProvId.set(items[0].id);
        this.iaProvId.set(items[0].id);
      }
    });
    this.api.listarSaldosCxp().subscribe({ next: (s) => this.saldosCxp.set(s) });
    this.api.listarDepositosRef().subscribe((d) => {
      this.depositos.set(d);
      if (d[0]) {
        this.ordenDepId.set(d[0].id);
        this.iaDepId.set(d[0].id);
        this.recDepositoId.set(d[0].id);
      }
    });
  }

  protected setTab(tab: TabCompras): void {
    this.tab.set(tab);
    void this.router.navigate([], { queryParams: { tab }, queryParamsHandling: 'merge' });
  }

  protected setChipOc(c: ChipOc): void {
    this.chipOc.set(c);
  }

  protected setChipRec(c: ChipRec): void {
    this.chipRec.set(c);
  }

  protected abrirOc(id: string): void {
    this.ocSelId.set(id);
  }

  protected abrirRec(id: string): void {
    this.recSelId.set(id);
  }

  protected abrirFact(id: string): void {
    this.factSelId.set(id);
  }

  protected seleccionarProv(id: string): void {
    this.provSelId.set(id);
    this.api.listarItemsLista(id, { pageSize: 200 }).subscribe({
      next: (items) => this.itemsLista.set(items),
      error: () => this.itemsLista.set([]),
    });
    this.api.estadoCuenta(id).subscribe({
      next: (e) => this.movsCxp.set(e.movimientos),
      error: () => this.movsCxp.set([]),
    });
  }

  protected setProvSub(s: ProvSub): void {
    this.provSub.set(s);
  }

  protected ctaOc(): void {
    const oc = this.ocSel();
    if (!oc) {
      return;
    }
    if (oc.cta.acc === 'emitir') {
      this.store.emitir(oc.id).subscribe({
        next: () => {
          this.notifications.success(
            'Pedido emitido',
            'Ya podés recibir mercadería contra esta OC',
          );
          this.store.cargar();
        },
      });
      return;
    }
    if (oc.cta.acc === 'remito') {
      this.prepararDesdePedido(oc.id, 'remito_compra');
      return;
    }
    if (oc.cta.acc === 'factura') {
      const rem = this.remitos().find((r) => r.origenId === oc.id && r.estado === 'confirmado');
      if (rem) {
        this.facturarRemito(rem.id);
      } else {
        this.notifications.warning(
          'Sin remito',
          'Confirmá un remito de esta orden antes de facturar',
        );
      }
      return;
    }
    const fact = this.facturasDePedido(oc.id)[0];
    if (fact) {
      this.factSelId.set(fact.id);
      this.setTab('fact');
    }
  }

  protected imprimirOc(): void {
    this.notifications.success('Imprimir', 'Usa la vista de impresión del navegador (Cmd+P)');
    window.print();
  }

  protected duplicarOc(): void {
    const oc = this.pedidos().find((o) => o.id === this.ocSel()?.id);
    if (!oc) {
      return;
    }
    this.ordenTipo.set('pedido_compra');
    this.ordenProvId.set(oc.proveedorId);
    this.ordenOrigenId.set('');
    this.ordenLineas.set(
      oc.lineas.map((l) => ({
        productoId: l.productoId,
        codigoProveedor: l.codigoProveedor,
        cantidad: String(l.cantidad),
      })),
    );
    this.cargarItemsPedido(oc.proveedorId);
    this.ordenOpen.set(true);
  }

  protected abrirNuevaOrden(tipo: TipoCompra = 'pedido_compra', proveedorId?: string): void {
    this.ordenTipo.set(tipo);
    this.ordenOrigenId.set('');
    if (proveedorId) {
      this.ordenProvId.set(proveedorId);
    }
    this.ordenLineas.set([{ productoId: '', codigoProveedor: '', cantidad: '1' }]);
    if (this.ordenProvId()) {
      this.cargarItemsPedido(this.ordenProvId());
    }
    this.ordenOpen.set(true);
  }

  protected sugerirFaltantes(): void {
    void this.router.navigate(['/inventario'], { queryParams: { tab: 'articulos' } });
  }

  protected irCtaCteProv(): void {
    this.provSub.set('movs');
  }

  protected irPagar(): void {
    void this.router.navigate(['/tesoreria/pagos']);
  }

  protected confirmarRemito(): void {
    const rec = this.recSel();
    if (!rec?.puedeIngresar) {
      return;
    }
    this.store.confirmar(rec.id).subscribe({
      next: () => {
        this.notifications.success('Remito confirmado', 'Stock ingresado al depósito');
        this.store.cargar();
      },
    });
  }

  protected registrarFactura(): void {
    const f = this.factSel();
    if (!f) {
      return;
    }
    if (f.puedeRegistrar) {
      this.store.confirmar(f.id).subscribe({
        next: () => {
          this.notifications.success(
            'Factura registrada',
            'Imputada en cuenta corriente del proveedor',
          );
          this.store.cargar();
          this.api.listarSaldosCxp().subscribe({ next: (s) => this.saldosCxp.set(s) });
        },
      });
      return;
    }
    this.irPagar();
  }

  protected facturarRemito(id: string): void {
    this.store.facturar(id).subscribe({
      next: () => {
        this.notifications.success('Factura de compra', 'Imputada en CxP');
        this.store.cargar();
        this.api.listarSaldosCxp().subscribe({ next: (s) => this.saldosCxp.set(s) });
        this.setTab('fact');
      },
    });
  }

  protected onOrdenProv(id: string): void {
    this.ordenProvId.set(id);
    this.cargarItemsPedido(id);
  }

  protected agregarLineaOrden(): void {
    this.ordenLineas.update((rows) => [
      ...rows,
      { productoId: '', codigoProveedor: '', cantidad: '1' },
    ]);
  }

  protected quitarLineaOrden(idx: number): void {
    this.ordenLineas.update((rows) => rows.filter((_, i) => i !== idx));
  }

  protected patchLineaOrden(
    idx: number,
    key: 'productoId' | 'codigoProveedor' | 'cantidad',
    value: string,
  ): void {
    this.ordenLineas.update((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  protected guardarOrden(): void {
    const lineas = this.ordenLineas()
      .map((l) => ({
        productoId: l.productoId || undefined,
        codigoProveedor: l.codigoProveedor || undefined,
        cantidad: Number(l.cantidad),
      }))
      .filter(
        (l) =>
          (l.productoId || l.codigoProveedor) && Number.isInteger(l.cantidad) && l.cantidad >= 1,
      );
    if (!this.ordenProvId() || lineas.length === 0) {
      this.notifications.error('Datos incompletos', 'Elegí proveedor y al menos una línea');
      return;
    }
    const tipo = this.ordenTipo();
    if (tipo !== 'pedido_compra' && !this.ordenDepId()) {
      this.notifications.error('Depósito', 'El remito y la factura necesitan depósito');
      return;
    }
    this.guardando.set(true);
    this.store
      .crear({
        tipo,
        proveedorId: this.ordenProvId(),
        depositoId: this.ordenDepId(),
        origenId: this.ordenOrigenId() || undefined,
        lineas,
      })
      .subscribe({
        next: () => {
          this.notifications.success(
            tipo === 'pedido_compra'
              ? 'Orden creada'
              : tipo === 'remito_compra'
                ? 'Remito creado'
                : 'Factura creada',
            tipo === 'pedido_compra'
              ? 'Quedó en borrador. Emitila cuando esté lista.'
              : 'Quedó en borrador.',
          );
          this.guardando.set(false);
          this.ordenOpen.set(false);
          this.store.cargar();
          this.setTab(tipo === 'pedido_compra' ? 'oc' : tipo === 'remito_compra' ? 'rec' : 'fact');
        },
        error: () => this.guardando.set(false),
      });
  }

  protected abrirAlta(): void {
    this.altaPaso.set(1);
    this.altaCuit.set('');
    this.altaNombre.set('');
    this.altaEmail.set('');
    this.altaTel.set('');
    this.altaIva.set('responsable_inscripto');
    this.altaRubro.set('Ferretería');
    this.altaContacto.set('');
    this.altaCond.set('Cuenta 30 días');
    this.altaDesc.set('0');
    this.altaArchivo.set(null);
    this.altaOpen.set(true);
  }

  protected altaPrev(): void {
    this.altaPaso.update((n) => Math.max(1, n - 1));
  }

  protected altaNext(): void {
    if (this.altaPaso() < 3) {
      if (this.altaPaso() === 1 && !this.altaNombre().trim()) {
        this.notifications.error('Razón social', 'Es obligatoria para dar de alta');
        return;
      }
      this.altaPaso.update((n) => n + 1);
      return;
    }
    this.guardarProveedor();
  }

  protected onAltaArchivo(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.altaArchivo.set(file);
  }

  protected onListaArchivo(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    const id = this.provFicha()?.id;
    if (!file || !id) {
      return;
    }
    this.importando.set(true);
    this.api
      .importarLista(id, file, {
        mapeo: [
          { columna: 'A', campo: 'codigo_producto' },
          { columna: 'B', campo: 'descripcion' },
          { columna: 'C', campo: 'precio_costo' },
        ],
        filaInicio: 2,
        politica: 'solo_costo',
        margenPct: 30,
        dryRun: false,
      })
      .subscribe({
        next: (res) => {
          this.importando.set(false);
          this.notifications.success(
            'Lista importada',
            `${res.actualizados} en catálogo · ${res.sinMatch} sin match`,
          );
          this.boot();
          this.seleccionarProv(id);
        },
        error: () => this.importando.set(false),
      });
  }

  protected empezarAltaSku(itemId: string): void {
    this.altaSkuId.set(itemId);
    this.altaSku.set('');
  }

  protected confirmarAltaSku(): void {
    const itemId = this.altaSkuId();
    const provId = this.provFicha()?.id;
    const sku = this.altaSku().trim();
    if (!itemId || !provId || !sku) {
      this.notifications.error('SKU requerido', 'Definí el código de tu catálogo');
      return;
    }
    this.api.altaArticuloDesdeLista(provId, itemId, sku).subscribe({
      next: (item) => {
        this.notifications.success('Artículo creado', `${sku} · ${item.nombre}`);
        this.altaSkuId.set(null);
        this.seleccionarProv(provId);
      },
    });
  }

  protected abrirIa(): void {
    this.iaArchivo.set(null);
    this.iaOpen.set(true);
  }

  protected onIaArchivo(ev: Event): void {
    this.iaArchivo.set((ev.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected parsearIa(): void {
    const file = this.iaArchivo();
    if (!file || !this.iaProvId() || !this.iaDepId()) {
      this.notifications.error('Falta archivo', 'Elegí foto, proveedor y depósito');
      return;
    }
    this.iaParseando.set(true);
    this.remitoIa
      .parsearRemito(file, { proveedorId: this.iaProvId(), depositoId: this.iaDepId() })
      .subscribe({
        next: (res) => {
          const lineas = res.lineas
            .filter((l) => l.productoId && l.cantidad >= 1)
            .map((l) => ({ productoId: l.productoId as string, cantidad: l.cantidad }));
          if (lineas.length === 0) {
            this.iaParseando.set(false);
            this.notifications.warning(
              'Sin match',
              'Ninguna línea se vinculó a un artículo del catálogo',
            );
            return;
          }
          this.remitoIa
            .crearRemitoBorrador({
              proveedorId: this.iaProvId(),
              depositoId: this.iaDepId(),
              lineas,
            })
            .subscribe({
              next: () => {
                this.iaParseando.set(false);
                this.iaOpen.set(false);
                this.notifications.success(
                  'Remito en borrador',
                  `${lineas.length} líneas desde la foto`,
                );
                this.store.cargar();
                this.setTab('rec');
              },
              error: () => this.iaParseando.set(false),
            });
        },
        error: () => this.iaParseando.set(false),
      });
  }

  private guardarProveedor(): void {
    const nombre = this.altaNombre().trim();
    if (!nombre) {
      this.notifications.error('Razón social', 'Es obligatoria');
      return;
    }
    this.guardando.set(true);
    this.api
      .crearProveedor({
        nombre,
        cuit: this.altaCuit().trim(),
        email: this.altaEmail().trim(),
        telefono: this.altaTel().trim(),
        condicionIva: this.altaIva(),
        observaciones: [this.altaRubro(), this.altaCond(), this.altaContacto()]
          .filter(Boolean)
          .join(' · '),
        mapeoExcel: [
          { columna: 'A', campo: 'codigo_producto' },
          { columna: 'B', campo: 'descripcion' },
          { columna: 'C', campo: 'precio_costo' },
        ],
        excelFilaInicio: 2,
        politicaPrecioVenta: 'solo_costo',
        margenVentaPct: Number(this.altaDesc()) || 30,
      })
      .subscribe({
        next: (prov) => {
          this.guardando.set(false);
          this.altaOpen.set(false);
          this.notifications.success('Proveedor creado', prov.nombre);
          this.proveedores.update((list) => [prov, ...list]);
          this.seleccionarProv(prov.id);
          this.setTab('prov');
          const archivo = this.altaArchivo();
          if (archivo) {
            this.api
              .importarLista(prov.id, archivo, {
                mapeo: prov.mapeoExcel,
                filaInicio: 2,
                politica: 'solo_costo',
                margenPct: 30,
                dryRun: false,
              })
              .subscribe({
                next: () => this.seleccionarProv(prov.id),
              });
          }
        },
        error: () => this.guardando.set(false),
      });
  }

  private prepararDesdePedido(pedidoId: string, tipo: TipoCompra): void {
    const pedido = this.pedidos().find((p) => p.id === pedidoId);
    if (!pedido) {
      return;
    }
    this.ordenTipo.set(tipo);
    this.ordenProvId.set(pedido.proveedorId);
    this.ordenDepId.set(pedido.depositoId ?? this.ordenDepId());
    this.ordenOrigenId.set(pedido.id);
    this.ordenLineas.set(
      pedido.lineas.map((l) => ({
        productoId: l.productoId,
        codigoProveedor: l.codigoProveedor,
        cantidad: String(l.cantidad),
      })),
    );
    this.cargarItemsPedido(pedido.proveedorId);
    this.ordenOpen.set(true);
  }

  private cargarItemsPedido(proveedorId: string): void {
    this.api.listarItemsLista(proveedorId, { pageSize: 200 }).subscribe({
      next: (items) => this.itemsPedido.set(items),
      error: () => this.itemsPedido.set([]),
    });
  }

  private facturaDePedido(pedidoId: string) {
    return this.facturasDePedido(pedidoId)[0] ?? null;
  }

  private facturasDePedido(pedidoId: string) {
    const remIds = new Set(
      this.remitos()
        .filter((r) => r.origenId === pedidoId)
        .map((r) => r.id),
    );
    return this.facturas().filter((f) => f.origenId && remIds.has(f.origenId));
  }

  private recibidoPorProducto(pedidoId: string): Map<string, number> {
    const map = new Map<string, number>();
    for (const rem of this.remitos().filter((r) => r.origenId === pedidoId)) {
      for (const l of rem.lineas) {
        const key = l.productoId || l.codigoProveedor;
        map.set(key, (map.get(key) ?? 0) + l.cantidad);
      }
    }
    return map;
  }

  private vtoFactura(fechaIso: string): string {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) {
      return '—';
    }
    d.setDate(d.getDate() + 30);
    return formatearFechaCorta(d.toISOString());
  }

  private movsVista() {
    const movs = this.movsCxp();
    let correr = 0;
    const ordered = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return ordered
      .map((m) => {
        const debe = m.tipo === 'debe' ? m.monto : 0;
        const haber = m.tipo === 'haber' ? m.monto : 0;
        correr += debe - haber;
        return {
          id: m.id,
          fecha: formatearFechaCorta(m.fecha),
          tipo: m.tipo === 'debe' ? 'FC' : 'PAGO',
          tipoTone: (m.tipo === 'debe' ? 'warn' : 'ok') as BadgeTone,
          detalle: m.concepto,
          debe: debe ? formatearMoneyDec(debe) : '—',
          haber: haber ? formatearMoneyDec(haber) : '—',
          saldo: formatearMoneyDec(correr),
        };
      })
      .reverse();
  }
}
