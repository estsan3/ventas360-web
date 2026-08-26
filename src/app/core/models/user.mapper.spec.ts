import { userToModel } from './user.mapper';

describe('userToModel', () => {
  it('mapea tenant, rol encargado y permisos', () => {
    const user = userToModel({
      id: 'u1',
      nombre: 'Ana',
      dni: '30111222',
      email: 'ana@demo.com',
      rol: 'encargado',
      tenant_id: 'tnt-demo',
      permisos: ['inicio', 'articulos'],
    });
    expect(user.rol).toBe('encargado');
    expect(user.tenantId).toBe('tnt-demo');
    expect(user.permisos).toEqual(['inicio', 'articulos']);
  });

  it('defaults si el DTO viejo no trae permisos', () => {
    const user = userToModel({
      id: 'u2',
      nombre: 'Juan',
      dni: '1',
      email: 'j@demo.com',
      rol: 'vendedor',
    });
    expect(user.permisos).toEqual([]);
    expect(user.tenantId).toBeNull();
  });
});
