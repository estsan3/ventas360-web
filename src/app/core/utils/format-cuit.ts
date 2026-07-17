/** Formato de CUIT argentino: XX-XXXXXXXX-X (11 dígitos). */
export const CUIT_AR = /^\d{2}-\d{8}-\d$/;

/** Aplica la máscara mientras el usuario escribe (solo dígitos, máx. 11). */
export function formatCuitInput(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) {
    return digitos;
  }
  if (digitos.length <= 10) {
    return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
  }
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}
