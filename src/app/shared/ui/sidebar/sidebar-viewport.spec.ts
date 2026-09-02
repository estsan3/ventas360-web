import {
  querySidebarCompacta,
  leerBreakpointTablet,
  sidebarExpandidaPorDefecto,
} from './sidebar-viewport';

describe('sidebar-viewport', () => {
  it('arma la media query con el token CSS', () => {
    expect(querySidebarCompacta('768px')).toBe('(max-width: 768px)');
  });

  it('cae a 768px si el token aún no está en :root (jsdom)', () => {
    expect(querySidebarCompacta('')).toBe('(max-width: 768px)');
    expect(querySidebarCompacta('  ')).toBe('(max-width: 768px)');
  });

  it('lee --breakpoint-tablet de :root', () => {
    document.documentElement.style.setProperty('--breakpoint-tablet', '768px');
    expect(leerBreakpointTablet()).toBe('768px');
  });

  it('colapsa por defecto en viewport compacto y expande en desktop', () => {
    expect(sidebarExpandidaPorDefecto(true)).toBe(false);
    expect(sidebarExpandidaPorDefecto(false)).toBe(true);
  });
});

describe('sidebar-viewport', () => {
  it('arma la media query con el token CSS', () => {
    expect(querySidebarCompacta('768px')).toBe('(max-width: 768px)');
  });

  it('cae a 768px si el token aún no está en :root (jsdom)', () => {
    expect(querySidebarCompacta('')).toBe('(max-width: 768px)');
    expect(querySidebarCompacta('  ')).toBe('(max-width: 768px)');
  });

  it('colapsa por defecto en viewport compacto y expande en desktop', () => {
    expect(sidebarExpandidaPorDefecto(true)).toBe(false);
    expect(sidebarExpandidaPorDefecto(false)).toBe(true);
  });
});
