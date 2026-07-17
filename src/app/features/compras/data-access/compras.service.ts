import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CompraDto } from './compra.dto';
import { compraToModel, crearCompraToDto } from './compra.mapper';
import { Compra, CrearCompra } from './compra.model';
import { ImportarListaDto, ProveedorListaDto } from './lista-proveedor.dto';
import {
  CrearProveedorLista,
  ImportarListaResultado,
  MapeoColumna,
  PoliticaPrecioVenta,
  ProveedorLista,
} from './lista-proveedor.model';

interface PaginaRef {
  items: { id: string; nombre: string; precio?: number; costo?: number }[];
}

interface PaginaProveedores {
  items: ProveedorListaDto[];
  total: number;
}

interface SaldoCxpDto {
  proveedor_id: string;
  debe: number;
  haber: number;
  saldo: number;
}

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/compras`;
  private readonly api = environment.apiBaseUrl;

  listar(tipo?: string): Observable<Compra[]> {
    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipo', tipo);
    }
    return this.http
      .get<CompraDto[]>(this.base, { params })
      .pipe(map((items) => items.map(compraToModel)));
  }

  crear(body: CrearCompra): Observable<Compra> {
    return this.http.post<CompraDto>(this.base, crearCompraToDto(body)).pipe(map(compraToModel));
  }

  confirmar(id: string): Observable<Compra> {
    return this.http.post<CompraDto>(`${this.base}/${id}/confirmar`, {}).pipe(map(compraToModel));
  }

  facturar(id: string): Observable<Compra> {
    return this.http.post<CompraDto>(`${this.base}/${id}/facturar`, {}).pipe(map(compraToModel));
  }

  listarProveedoresCompletos(): Observable<ProveedorLista[]> {
    return this.http
      .get<PaginaProveedores>(`${this.api}/proveedores`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(map((p) => p.items.map(proveedorListaToModel)));
  }

  crearProveedor(body: CrearProveedorLista): Observable<ProveedorLista> {
    return this.http
      .post<ProveedorListaDto>(`${this.api}/proveedores`, {
        nombre: body.nombre,
        cuit: body.cuit,
        observaciones: body.observaciones,
        mapeo_excel: body.mapeoExcel,
        excel_fila_inicio: body.excelFilaInicio,
        politica_precio_venta: body.politicaPrecioVenta,
        margen_venta_pct: body.margenVentaPct,
      })
      .pipe(map(proveedorListaToModel));
  }

  importarLista(
    proveedorId: string,
    archivo: File,
    opts: {
      mapeo: MapeoColumna[];
      filaInicio: number;
      politica: PoliticaPrecioVenta;
      margenPct: number;
      dryRun: boolean;
    },
  ): Observable<ImportarListaResultado> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('mapeo', JSON.stringify(opts.mapeo));
    form.append('fila_inicio', String(opts.filaInicio));
    form.append('politica_precio_venta', opts.politica);
    form.append('margen_venta_pct', String(opts.margenPct));
    const params = new HttpParams().set('dry_run', opts.dryRun ? 'true' : 'false');
    return this.http
      .post<ImportarListaDto>(`${this.api}/proveedores/${proveedorId}/listas/importar`, form, {
        params,
      })
      .pipe(map(importarToModel));
  }

  listarSaldosCxp(): Observable<Record<string, number>> {
    return this.http
      .get<SaldoCxpDto[]>(`${this.api}/cxp/saldos`)
      .pipe(map((items) => Object.fromEntries(items.map((s) => [s.proveedor_id, s.saldo]))));
  }

  listarProveedoresRef(): Observable<{ id: string; nombre: string }[]> {
    return this.listarProveedoresCompletos().pipe(
      map((items) => items.map((p) => ({ id: p.id, nombre: p.nombre }))),
    );
  }

  listarProductosRef(): Observable<
    { id: string; nombre: string; precio: number; costo: number }[]
  > {
    return this.http
      .get<PaginaRef>(`${this.api}/productos`, {
        params: new HttpParams().set('page_size', '200').set('activo', 'true'),
      })
      .pipe(
        map((p) =>
          p.items.map((i) => ({
            id: i.id,
            nombre: i.nombre,
            precio: i.precio ?? 0,
            costo: i.costo ?? 0,
          })),
        ),
      );
  }

  listarDepositosRef(): Observable<{ id: string; nombre: string }[]> {
    return this.http
      .get<{ id: string; nombre: string; codigo: string }[]>(`${this.api}/stock/depositos`)
      .pipe(map((items) => items.map((d) => ({ id: d.id, nombre: `${d.codigo} · ${d.nombre}` }))));
  }
}

function proveedorListaToModel(dto: ProveedorListaDto): ProveedorLista {
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    telefono: dto.telefono,
    cuit: dto.cuit,
    condicionIva: dto.condicion_iva,
    observaciones: dto.observaciones,
    activo: dto.activo,
    mapeoExcel: dto.mapeo_excel?.length
      ? dto.mapeo_excel
      : [
          { columna: 'A', campo: 'codigo_producto' },
          { columna: 'B', campo: 'descripcion' },
          { columna: 'C', campo: 'precio_costo' },
        ],
    excelFilaInicio: dto.excel_fila_inicio ?? 2,
    politicaPrecioVenta: dto.politica_precio_venta ?? 'solo_costo',
    margenVentaPct: dto.margen_venta_pct ?? 30,
    ultimaImportacionFecha: dto.ultima_importacion_fecha,
    ultimaImportacionArchivo: dto.ultima_importacion_archivo ?? '',
    ultimaImportacionActualizados: dto.ultima_importacion_actualizados ?? 0,
    ultimaImportacionNuevos: dto.ultima_importacion_nuevos ?? 0,
    ultimaImportacionSinMatch: dto.ultima_importacion_sin_match ?? 0,
  };
}

function importarToModel(dto: ImportarListaDto): ImportarListaResultado {
  return {
    proveedorId: dto.proveedor_id,
    archivo: dto.archivo,
    dryRun: dto.dry_run,
    actualizados: dto.actualizados,
    nuevos: dto.nuevos,
    sinMatch: dto.sin_match,
    omitidas: dto.omitidas ?? [],
    sinMatchCodigos: dto.sin_match_codigos ?? [],
    previewCols: dto.preview_cols ?? [],
    previewRows: dto.preview_rows ?? [],
  };
}
