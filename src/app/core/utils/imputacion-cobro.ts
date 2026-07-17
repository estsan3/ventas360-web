/** Arma imputaciones FIFO a partir de movimientos debe de CxC. */

export interface DebeCxc {
  referenciaId: string;
  monto: number;
  fecha: string;
}

export interface ImputacionCobro {
  facturaId: string;
  monto: number;
}

export function armarImputacionesDesdeDeudas(
  deudas: DebeCxc[],
  montoCobro: number,
): ImputacionCobro[] {
  const monto = Math.round(montoCobro * 100) / 100;
  if (monto <= 0 || deudas.length === 0) {
    return [];
  }
  const ordenadas = [...deudas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const imputaciones: ImputacionCobro[] = [];
  let restante = monto;
  for (const d of ordenadas) {
    if (restante <= 0) {
      break;
    }
    const cupo = Math.round(d.monto * 100) / 100;
    if (cupo <= 0) {
      continue;
    }
    const toma = Math.min(cupo, restante);
    const redondeado = Math.round(toma * 100) / 100;
    if (redondeado <= 0) {
      continue;
    }
    imputaciones.push({ facturaId: d.referenciaId, monto: redondeado });
    restante = Math.round((restante - redondeado) * 100) / 100;
  }
  // Si quedó resto por redondeo / deudas menores, cuelga del último
  if (restante > 0 && imputaciones.length > 0) {
    const last = imputaciones[imputaciones.length - 1];
    last.monto = Math.round((last.monto + restante) * 100) / 100;
  }
  return imputaciones;
}
