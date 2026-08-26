export interface CeldaPermisoDto {
  modulo: string;
  etiqueta: string;
  vendedor: boolean;
  encargado: boolean;
  administrador: boolean;
}

export interface MatrizPermisosDto {
  items: CeldaPermisoDto[];
}
