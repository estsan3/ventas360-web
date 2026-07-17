export interface PedidoResumen {
  id: string;
  clienteId: string;
  estado: string;
  total: number;
  fecha: string;
  lineasCount: number;
}
