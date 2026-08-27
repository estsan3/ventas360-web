import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CompraCreadaDto, ParsearRemitoResponseDto } from './remito-ia.dto';
import { compraCreadaId, parsearRemitoToModel } from './remito-ia.mapper';
import { ParsearRemitoResultado } from './remito-ia.model';

@Injectable({ providedIn: 'root' })
export class RemitoIaService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBaseUrl;

  parsearRemito(
    archivo: File,
    opts: { proveedorId: string; depositoId: string },
  ): Observable<ParsearRemitoResultado> {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('proveedor_id', opts.proveedorId);
    form.append('deposito_id', opts.depositoId);
    return this.http
      .post<ParsearRemitoResponseDto>(`${this.api}/compras/remitos/parsear`, form)
      .pipe(map(parsearRemitoToModel));
  }

  crearRemitoBorrador(body: {
    proveedorId: string;
    depositoId: string;
    lineas: { productoId: string; cantidad: number; precioUnitario?: number }[];
  }): Observable<string> {
    return this.http
      .post<CompraCreadaDto>(`${this.api}/compras`, {
        proveedor_id: body.proveedorId,
        tipo: 'remito_compra',
        deposito_id: body.depositoId,
        lineas: body.lineas.map((l) => {
          const linea: { producto_id: string; cantidad: number; precio_unitario?: number } = {
            producto_id: l.productoId,
            cantidad: l.cantidad,
          };
          if (l.precioUnitario !== undefined) {
            linea.precio_unitario = l.precioUnitario;
          }
          return linea;
        }),
      })
      .pipe(map(compraCreadaId));
  }
}
