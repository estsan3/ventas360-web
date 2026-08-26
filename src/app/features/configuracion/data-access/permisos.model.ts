export interface CeldaPermiso {
  modulo: string;
  etiqueta: string;
  vendedor: boolean;
  encargado: boolean;
  administrador: boolean;
}

export type RolEditable = 'vendedor' | 'encargado';
