import { CompraCreadaDto, LineaRemitoParseadaDto, ParsearRemitoResponseDto } from './remito-ia.dto';
import { LineaRemitoParseada, ParsearRemitoResultado } from './remito-ia.model';

export function parsearRemitoToModel(dto: ParsearRemitoResponseDto): ParsearRemitoResultado {
  return {
    numeroRemito: dto.numero_remito,
    fecha: dto.fecha,
    proveedorTexto: dto.proveedor_texto,
    proveedorId: dto.proveedor_id,
    depositoId: dto.deposito_id,
    lineas: dto.lineas.map(lineaToModel),
    sinMatch: dto.sin_match,
    advertencias: dto.advertencias ?? [],
    confianzaExtraccion: dto.confianza_extraccion,
    modoParser: dto.modo_parser,
  };
}

function lineaToModel(dto: LineaRemitoParseadaDto): LineaRemitoParseada {
  return {
    descripcionExtraida: dto.descripcion_extraida,
    skuExtraido: dto.sku_extraido,
    codigoBarrasExtraido: dto.codigo_barras_extraido,
    cantidad: dto.cantidad,
    precioUnitario: dto.precio_unitario,
    productoId: dto.producto_id,
    productoNombre: dto.producto_nombre,
    productoSku: dto.producto_sku,
    matchTipo: dto.match_tipo,
    confianza: dto.confianza,
  };
}

export function compraCreadaId(dto: CompraCreadaDto): string {
  return dto.id;
}
