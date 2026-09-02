import { talonarioToModel, talonarioToUpsertDto } from './parametros.mapper';

describe('talonarioToModel', () => {
  it('mapea presupuesto (tipo que el seed de casuística siembra)', () => {
    const model = talonarioToModel({
      id: 'tal-presupuesto',
      tipo_comprobante: 'presupuesto',
      prefijo: 'PRE-',
      proximo_numero: 100,
      activo: true,
    });
    expect(model).toEqual({
      id: 'tal-presupuesto',
      tipoComprobante: 'presupuesto',
      prefijo: 'PRE-',
      proximoNumero: 100,
      activo: true,
    });
  });

  it('round-trip de upsert incluye presupuesto', () => {
    const dto = talonarioToUpsertDto({
      id: 'tal-presupuesto',
      tipoComprobante: 'presupuesto',
      prefijo: 'PRE-',
      proximoNumero: 100,
      activo: true,
    });
    expect(dto.tipo_comprobante).toBe('presupuesto');
    expect(dto.proximo_numero).toBe(100);
  });
});
