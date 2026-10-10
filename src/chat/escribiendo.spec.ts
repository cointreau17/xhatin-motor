import { ESCRIBIENDO_MS, Escribiendo } from './escribiendo.js';

describe('Escribiendo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('entra con el aviso, completa lo que no trae y no cambia si no hay nada nuevo', () => {
    const e = new Escribiendo(() => undefined);
    expect(e.avisa({ usuarioId: 'u-ana', escribe: true }, { id: 'u-ana', nombre: 'Ana', avatar: 'v1|ana' })).toBe(true);
    expect(e.lista).toEqual([{ id: 'u-ana', nombre: 'Ana', avatar: 'v1|ana' }]);
    const antes = e.lista;
    expect(e.avisa({ usuarioId: 'u-ana', nombre: 'Ana', avatar: 'v1|ana', escribe: true })).toBe(false);
    expect(e.lista).toBe(antes);
    expect(e.avisa({ usuarioId: '', escribe: true })).toBe(false);
  });

  it('sale con el aviso de parar, al quitarlo o al cabo de un rato, y entonces avisa', () => {
    const caducados: string[][] = [];
    const e = new Escribiendo(() => caducados.push(e.lista.map((p) => p.id)));
    e.avisa({ usuarioId: 'u-ana', escribe: true });
    e.avisa({ usuarioId: 'u-beto', escribe: true });
    expect(e.avisa({ usuarioId: 'u-ana', escribe: false })).toBe(true);
    expect(e.quitar('u-nadie')).toBe(false);
    vi.advanceTimersByTime(ESCRIBIENDO_MS + 1);
    expect(caducados).toEqual([[]]);
    // Al quitar a alguien, su caducidad no avisa después.
    e.avisa({ usuarioId: 'u-ana', escribe: true });
    expect(e.quitar('u-ana')).toBe(true);
    vi.advanceTimersByTime(ESCRIBIENDO_MS + 1);
    expect(caducados).toHaveLength(1);
  });

  it('vaciar deja a nadie y para los relojes', () => {
    const avisos = vi.fn();
    const e = new Escribiendo(avisos);
    expect(e.vaciar()).toBe(false);
    e.avisa({ usuarioId: 'u-ana', escribe: true });
    expect(e.vaciar()).toBe(true);
    expect(e.lista).toEqual([]);
    vi.advanceTimersByTime(ESCRIBIENDO_MS + 1);
    expect(avisos).not.toHaveBeenCalled();
  });
});
