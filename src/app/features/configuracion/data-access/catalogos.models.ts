/** Modelos para ABMs de configuración (vendedores, depósitos, listas). */

export interface VendedorCatalogo {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface DepositoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface ListaPrecioCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  esDefault: boolean;
  activo: boolean;
}
