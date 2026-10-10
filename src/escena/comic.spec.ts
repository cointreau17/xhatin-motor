/**
 * Que la tira parezca un cómic: negritas de rotulista, cartelas del narrador,
 * momentos fuertes a lo grande, la página sin huecos, la viñeta de quien está
 * escribiendo y la portada del número.
 */

import { CATALOGO } from './catalogo/catalogo.js';
import { Director } from './director/director.js';
import { componerVineta } from './composicion/compositor.js';
import { esEnfatica } from './composicion/globos.js';
import { paginar } from './composicion/pagina.js';
import { textoEscribiendo, vinetaEscribiendo } from './composicion/escribiendo.js';
import { componerPortada, numeroDeTira } from './composicion/portada.js';
import { REPARTO } from './pruebas/conversaciones.js';
import type { MensajeEntrada, Vineta } from './modelo.js';

let n = 0;
function msg(texto: string, quien: keyof typeof REPARTO = 'alberto'): MensajeEntrada {
  const p = REPARTO[quien]!;
  return { id: `c-${++n}`, texto, autorId: p.id, autorNombre: p.nombre, avatar: p.avatar, fecha: new Date(Date.UTC(2026, 9, 10, 12, n)) };
}

/** La última viñeta tras procesar estos mensajes. */
function ultima(...mensajes: MensajeEntrada[]): Vineta {
  const d = new Director();
  for (const m of mensajes) d.procesar(m);
  return d.vinetas[d.vinetas.length - 1]!;
}

describe('Bocadillos con carácter', () => {
  it('negritas de rotulista: mayúsculas sueltas, letras alargadas, asteriscos y palabras fuertes', () => {
    expect(esEnfatica('INCREÍBLE')).toBe(true);
    expect(esEnfatica('increíble')).toBe(true);
    expect(esEnfatica('siiiii')).toBe(true);
    expect(esEnfatica('*ahora*')).toBe(true);
    expect(esEnfatica('harto,')).toBe(true);
    expect(esEnfatica('casa')).toBe(false);
    expect(esEnfatica('y')).toBe(false);
    // Si todo el globo va en mayúsculas, eso solo no es énfasis.
    expect(esEnfatica('CASA', true)).toBe(false);
  });

  it('el globo pone en negrita solo esas palabras, sin los asteriscos', () => {
    const { svg } = componerVineta(ultima(msg('Esto es INCREÍBLE, lo digo *ahora* mismo')), CATALOGO, { animar: false });
    expect(svg).toContain('<tspan font-weight="700">INCREÍBLE,</tspan>');
    expect(svg).toContain('<tspan font-weight="700">ahora</tspan>');
    expect(svg).not.toContain('*ahora*');
    expect(svg).not.toContain('<tspan font-weight="700">Esto</tspan>');
  });

  it('la cartela del narrador, amarilla y pegada a la esquina', () => {
    const v: Vineta = { ...ultima(msg('Hola, ¿qué tal?')), rotulo: 'Más tarde…' };
    const r = componerVineta(v, CATALOGO, { animar: false });
    const cartela = r.globos.find((g) => g.globo.id === 'rotulo')!;
    expect(cartela.caja.x).toBe(0);
    expect(cartela.caja.y).toBe(0);
    expect(r.svg).toContain('#F4D67A');
  });
});

describe('Momentos fuertes a lo grande', () => {
  it('un grito muy fuerte cambia el decorado por líneas de impacto desde su cara', () => {
    const v = ultima(msg('¡¡¡ESTOY HARTA DE TODO ESTO!!!', 'marta'));
    expect(v.impacto?.sobre).toBe(REPARTO['marta']!.id);
    const { svg } = componerVineta(v, CATALOGO, { animar: false });
    expect(svg).toContain('dh-impacto');
    expect(svg).not.toContain('dh-frente');
  });

  it('una charla tranquila deja el decorado', () => {
    const v = ultima(msg('Hola, ¿qué tal el día?'));
    expect(v.impacto).toBeUndefined();
    expect(componerVineta(v, CATALOGO, { animar: false }).svg).not.toContain('dh-impacto');
  });

  it('la onomatopeya va gigante, con su sombra, y puede romper el marco', () => {
    const base = ultima(msg('Mira esto'));
    const v: Vineta = {
      ...base,
      globos: [...base.globos, { id: 'zas', mensajeId: '', autorId: base.globos[0]!.autorId, tipo: 'sonido', texto: '¡ZAS!', orden: 9, intensidad: 1 }],
    };
    const r = componerVineta(v, CATALOGO, { animar: false });
    const zas = r.globos.find((g) => g.globo.id === 'zas')!;
    expect(zas.estilo.tam).toBeGreaterThanOrEqual(110);
    expect(r.svg).toContain('#F2C14E');
    expect(r.desborda).toBe(!!zas.fuera);
    // Se sale como mucho lo que se le deja.
    expect(zas.caja.x).toBeGreaterThanOrEqual(-40);
    expect(zas.caja.y).toBeGreaterThanOrEqual(-40);
  });

  it('el grito muy fuerte tiembla', () => {
    const { svg } = componerVineta(ultima(msg('¡¡¡NO PUEDE SER!!!', 'juan')), CATALOGO, { animar: false });
    expect(svg).toContain('dh-globo--tiembla');
  });
});

describe('La tira como página de cómic', () => {
  const v = (id: string, formato: Vineta['formato']) => ({ id, formato }) as Vineta;

  it('una cuadrada sola delante de una ancha se ensancha y llena la fila', () => {
    const tira = [v('a', 'cuadrada'), v('b', 'ancha'), v('c', 'cuadrada'), v('d', 'cuadrada'), v('e', 'ancha')];
    expect(paginar(tira, 2).map((x) => x.formato)).toEqual(['ancha', 'ancha', 'cuadrada', 'cuadrada', 'ancha']);
    // Las que no cambian son los mismos objetos: no se vuelven a componer.
    expect(paginar(tira, 2)[2]).toBe(tira[2]);
    // Y las ensanchadas, la misma copia cada vez que se pagina.
    expect(paginar(tira, 2)[0]).toBe(paginar(tira, 2)[0]);
    expect(paginar(tira, 2)[0]).not.toBe(tira[0]);
  });

  it('con tres columnas llena el hueco de una', () => {
    const tira = [v('a', 'cuadrada'), v('b', 'cuadrada'), v('c', 'ancha'), v('d', 'cuadrada')];
    expect(paginar(tira, 3).map((x) => x.formato)).toEqual(['cuadrada', 'ancha', 'ancha', 'cuadrada']);
  });

  it('con tres columnas, de dos anchas seguidas la primera se estrecha y comparten fila', () => {
    const tira = [v('a', 'ancha'), v('b', 'ancha'), v('c', 'ancha'), v('d', 'ancha'), v('e', 'ancha')];
    expect(paginar(tira, 3).map((x) => x.formato)).toEqual(['cuadrada', 'ancha', 'cuadrada', 'ancha', 'ancha']);
    // Una ancha con una cuadrada al lado no cambia.
    const mixta = [v('a', 'ancha'), v('b', 'cuadrada'), v('c', 'ancha')];
    expect(paginar(mixta, 3).map((x) => x.formato)).toEqual(['ancha', 'cuadrada', 'ancha']);
    expect(paginar(tira, 3)[0]).toBe(paginar(tira, 3)[0]);
  });

  it('la última no se toca, y con una columna todas cuadradas', () => {
    const tira = [v('a', 'cuadrada'), v('b', 'cuadrada'), v('c', 'cuadrada')];
    expect(paginar(tira, 2).map((x) => x.formato)).toEqual(['cuadrada', 'cuadrada', 'cuadrada']);
    const conAnchas = [v('a', 'cuadrada'), v('b', 'ancha'), v('c', 'ancha')];
    expect(paginar(conAnchas, 1).map((x) => x.formato)).toEqual(['cuadrada', 'cuadrada', 'cuadrada']);
    expect(paginar(conAnchas, 1)[1]).toBe(paginar(conAnchas, 1)[1]);
  });

  it('de dos anchas seguidas se estrecha la que menos lleva, nunca la última', () => {
    const llena = (id: string, n: number) =>
      ({ id, formato: 'ancha', personajes: Array(n).fill({}), globos: Array(n).fill({}) }) as unknown as Vineta;
    // La segunda lleva menos: se estrecha ella y la primera sigue ancha.
    const tira = [llena('a', 3), llena('b', 1), llena('c', 2)];
    expect(paginar(tira, 3).map((x) => x.formato)).toEqual(['ancha', 'cuadrada', 'ancha']);
    // Si la que lleva menos es la última, se estrecha la de antes.
    expect(paginar([llena('a', 3), llena('b', 1)], 3).map((x) => x.formato)).toEqual(['cuadrada', 'ancha']);
  });
});

describe('Está escribiendo…', () => {
  it('quien teclea sale con el móvil y un bocadillo de pensamiento con puntos suspensivos', () => {
    const v = vinetaEscribiendo([{ id: 'u-ana', nombre: 'Ana', avatar: null }], 'cafeteria')!;
    expect(v.escenario).toBe('cafeteria');
    expect(v.personajes[0]).toMatchObject({ pose: 'usando-movil', animaciones: ['teclea'], propEnMano: 'movil' });
    expect(v.globos[0]).toMatchObject({ tipo: 'pensamiento', texto: '…' });
    const { svg } = componerVineta(v, CATALOGO, { animar: true, novedades: '*' });
    expect(svg).toContain('dh-anim-teclea');
  });

  it('sin nadie no hay viñeta, y caben tres', () => {
    expect(vinetaEscribiendo([])).toBeNull();
    const cuatro = ['a', 'b', 'c', 'd'].map((id) => ({ id, nombre: id.toUpperCase() }));
    expect(vinetaEscribiendo(cuatro)!.personajes).toHaveLength(3);
  });

  it('el texto para quien no ve la viñeta', () => {
    expect(textoEscribiendo([{ id: 'a', nombre: 'Ana' }])).toBe('Ana está escribiendo…');
    expect(textoEscribiendo([{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }])).toBe('Ana y Beto están escribiendo…');
    expect(textoEscribiendo([])).toBe('');
  });
});

describe('Portada de la conversación', () => {
  it('el número cuenta los días en que se ha hablado', () => {
    const d = (dia: number, hora = 10) => new Date(2026, 9, dia, hora);
    expect(numeroDeTira([d(1), d(1, 22), d(3), d(10)])).toBe(3);
    expect(numeroDeTira([])).toBe(1);
  });

  it('lleva la cabecera, el número, la fecha, de qué va y el reparto con sus caras', () => {
    const svg = componerPortada({
      titulo: 'Con Ana y Beto',
      numero: 12,
      fecha: new Date(2026, 9, 10),
      reparto: [
        { id: 'u-ana', nombre: 'Ana', avatar: null },
        { id: 'u-beto', nombre: 'Beto', avatar: null },
      ],
    });
    expect(svg).toContain('XHATÍN');
    expect(svg).toContain('Nº 12');
    expect(svg).toContain('10 OCT 2026');
    expect(svg).toContain('CON ANA Y BETO');
    expect(svg).toContain('>Ana</text>');
    expect(svg).toContain('aria-label="Xhatín, número 12, 10 de octubre de 2026: Con Ana y Beto. Reparto: Ana, Beto."');
  });

  it('escapa lo que escriben los usuarios', () => {
    const svg = componerPortada({ titulo: '<b>hola</b>', numero: 1, fecha: new Date(), reparto: [{ id: 'x', nombre: '<i>yo</i>' }] });
    expect(svg).not.toContain('<b>');
    expect(svg).not.toContain('<i>');
  });
});
