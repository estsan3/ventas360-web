/** Subconjunto del pedido solo para el modal de cliente (lookup HTTP propio). */
export interface PedidoResumenDto {
  id: string;
  cliente_id: string;
  estado: string;
  total: number;
  fecha: string;
  lineas: unknown[];
}
