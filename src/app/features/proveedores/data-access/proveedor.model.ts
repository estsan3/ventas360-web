export type CondicionIva = 'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final';

export interface Proveedor {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: CondicionIva;
  observaciones: string;
  activo: boolean;
}

export interface CrearProveedor {
  nombre: string;
  email: string;
  telefono: string;
  cuit: string;
  condicionIva: CondicionIva;
  observaciones: string;
}
