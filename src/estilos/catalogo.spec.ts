/**
 * Reparto de personajes de los estilos de imagen y caricaturas propias.
 * Vienen de estilos.spec.ts del remote de xhatin.
 */

import { CARICATURA } from '../escena/estilos/caricatura.js';
import type { PersonajeImagen } from '../escena/estilos/tipos.js';
import { cargarCaricatura, conCaricaturas, opcionDe, repartir, usoDe } from './catalogo.js';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const BASE = 'https://xhatin.prueba/';

describe('Reparto de personajes', () => {
  it('respeta lo que eligió cada uno', () => {
    const r = repartir(CARICATURA, [A, B], { [A]: { estilo: null, personaje: 'lara' }, [B]: { estilo: null, personaje: 'larry' } });
    expect(r).toEqual({ [A]: 'lara', [B]: 'larry' });
  });

  it('a quien no eligió le da uno libre: en una conversación de dos, no salen dos iguales', () => {
    const r = repartir(CARICATURA, [A, B], {});
    expect(new Set(Object.values(r)).size).toBe(2);
    const conUno = repartir(CARICATURA, [A, B], { [A]: { estilo: null, personaje: 'larry' } });
    expect(conUno[B]).toBe('lara');
  });

  it('siempre el mismo, lo pida quien lo pida y en el orden que sea', () => {
    expect(repartir(CARICATURA, [A, B, C], {})).toEqual(repartir(CARICATURA, [C, A, B], {}));
  });

  it('ignora personajes que el estilo no sabe dibujar', () => {
    const r = repartir(CARICATURA, [A], { [A]: { estilo: null, personaje: 'inventado' } });
    expect(Object.keys(CARICATURA.personajes)).toContain(r[A]);
  });

  it('«jóvenes» no lleva biblioteca: se dibuja con los personajes vectoriales', () => {
    expect(usoDe(opcionDe('jovenes'), {}, BASE)).toBeUndefined();
    const uso = usoDe(opcionDe('caricatura'), { [A]: 'larry' }, BASE);
    expect(uso?.estilo).toBe(CARICATURA);
    expect(uso?.base).toBe(BASE);
    expect(opcionDe('no-existe').id).toBe('jovenes');
  });
});

describe('Caricaturas propias', () => {
  const propia = { ...CARICATURA.personajes['larry']!, id: A, nombre: 'Yo' };

  it('quien tiene caricatura sale con ella…', () => {
    const r = repartir(conCaricaturas(CARICATURA, { [A]: propia }), [A, B], {}, { [A]: propia });
    expect(r[A]).toBe(A);
    // …y a los demás no se les asigna la caricatura de otro.
    expect(['larry', 'lara']).toContain(r[B]);
  });

  it('…salvo que haya elegido expresamente a Larry o Lara', () => {
    const r = repartir(conCaricaturas(CARICATURA, { [A]: propia }), [A], { [A]: { estilo: null, personaje: 'lara' } }, { [A]: propia });
    expect(r[A]).toBe('lara');
  });

  it('nadie puede "elegir" la caricatura de otro', () => {
    const r = repartir(conCaricaturas(CARICATURA, { [A]: propia }), [A, B], { [B]: { estilo: null, personaje: A } }, { [A]: propia });
    expect(r[B]).not.toBe(A);
  });

  it('añadir caricaturas no toca el estilo base', () => {
    const con = conCaricaturas(CARICATURA, { [A]: propia });
    expect(con.personajes[A]).toBe(propia);
    expect(CARICATURA.personajes[A]).toBeUndefined();
    expect(conCaricaturas(CARICATURA, {})).toBe(CARICATURA);
  });
});

describe('cargarCaricatura', () => {
  afterEach(() => vi.unstubAllGlobals());

  const manifiesto = (): PersonajeImagen =>
    JSON.parse(
      JSON.stringify({
        ...CARICATURA.personajes['larry']!,
        figuras: { hablando: { ...CARICATURA.personajes['larry']!.figuras['hablando']!, src: 'figuras/hablando.png' } },
      }),
    );

  it('vuelve absolutas las rutas del manifiesto, y lo baja una sola vez', async () => {
    const pedir = vi.fn(async () => new Response(JSON.stringify(manifiesto())));
    vi.stubGlobal('fetch', pedir);
    const url = 'https://api.prueba/xhatin/caricaturas/abc/manifiesto.json';
    const p = await cargarCaricatura(url);
    expect(p?.figuras['hablando']?.src).toBe('https://api.prueba/xhatin/caricaturas/abc/figuras/hablando.png');
    await cargarCaricatura(url);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('sin URL, o con un manifiesto que no sirve, null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ figuras: {} }))));
    expect(await cargarCaricatura(null)).toBeNull();
    expect(await cargarCaricatura('https://api.prueba/xhatin/caricaturas/vacia/manifiesto.json')).toBeNull();
  });
});
