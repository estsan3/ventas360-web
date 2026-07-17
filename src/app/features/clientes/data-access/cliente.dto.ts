/** Forma exacta de la API (`ClienteResponse`). */
export interface ClienteDto {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
}

export interface CrearClienteDto {
  nombre: string;
  email: string;
  telefono: string;
}

export type ActualizarClienteDto = Partial<CrearClienteDto>;
