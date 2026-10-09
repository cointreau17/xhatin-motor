/**
 * Tests del motor de escena: interpretación, director y composición.
 *
 *   make test            (o: cd remote-angular && npx ng test --no-watch)
 *
 * Usan las conversaciones artificiales de pruebas/conversaciones.ts, las
 * mismas que el laboratorio (/lab), así que un fallo aquí se puede ver
 * dibujado allí.
 */

import { CATALOGO, Catalogo } from './catalogo/catalogo.js';
import { Director } from './director/director.js';
import { InterpreteReglas } from './interpretacion/interprete.js';
import { refinadorRemoto } from './interpretacion/refinador-remoto.js';
import { CARICATURA } from './estilos/caricatura.js';
import { elegirFigura } from './estilos/figuras.js';
import { MotorReglas } from './interpretacion/reglas.js';
import { REGLAS_BASE, type CtxMensaje } from './interpretacion/reglas-base.js';
import { componerVineta } from './composicion/compositor.js';
import { aVineta } from './composicion/camara.js';
import { identidadDe } from './personaje/identidad.js';
import { dibujarPersonaje } from './personaje/personaje.js';
import { CONVERSACIONES, REPARTO } from './pruebas/conversaciones.js';
import type { Interpretacion, MensajeEntrada, Vineta } from './modelo.js';

const interprete = new InterpreteReglas();

function msg(texto: string, quien: keyof typeof REPARTO = 'alberto', extra: Partial<MensajeEntrada> = {}): MensajeEntrada {
  const p = REPARTO[quien]!;
  return { id: `t-${Math.random()}`, texto, autorId: p.id, autorNombre: p.nombre, avatar: p.avatar, fecha: new Date(), ...extra };
}

function interpretar(texto: string): Interpretacion {
  const d = new Director();
  return interprete.interpretar(msg(texto), d.contextoPara(msg(texto)));
}

function montar(id: string): Director {
  const c = CONVERSACIONES.find((x) => x.id === id)!;
  const d = new Director();
  for (const m of c.mensajes) d.procesar(m);
  return d;
}

const solapa = (a: { x: number; y: number; ancho: number; alto: number }, b: typeof a) =>
  Math.max(0, Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y));

/* ====================================================== interpretación === */

describe('Interpretación (ejemplos del encargo)', () => {
  it('"¡No me lo puedo creer!" → sorpresa intensa en primer plano', () => {
    const i = interpretar('¡No me lo puedo creer!');
    expect(i.emocion).toBe('sorprendido');
    expect(i.intensidad).toBeGreaterThanOrEqual(0.75);
    expect(i.pose).toBe('sorprendido');
    expect(i.camara).toBe('primer-plano');
  });

  it('"Ven aquí" → señala y mira al interlocutor', () => {
    const i = interpretar('Ven aquí');
    expect(i.pose).toBe('senalando');
    expect(i.mirada.tipo).toBe('interlocutor');
    expect(i.emocion).toBe('neutral');
  });

  it('"JAJAJA 😂" → riendo en plano medio (no grito, no primer plano)', () => {
    const i = interpretar('JAJAJA 😂');
    expect(i.emocion).toBe('riendo');
    expect(i.pose).toBe('riendo');
    expect(i.camara).toBe('medio');
    expect(i.globo).not.toBe('grito');
  });

  it('"¡¿Qué ha pasado?!" → sorprendido, primer plano, viñeta propia', () => {
    const i = interpretar('¡¿Qué ha pasado?!');
    expect(i.emocion).toBe('sorprendido');
    expect(i.camara).toBe('primer-plano');
    expect(i.vinetaPropia).toBe(true);
  });

  it('"Voy a la cafetería." → camina y apunta a la cafetería como destino', () => {
    const i = interpretar('Voy a la cafetería.');
    expect(i.intencion).toBe('desplazamiento');
    expect(i.pose).toBe('caminando');
    expect(i.destino).toBe('cafeteria');
  });

  it('tipos de globo según la intención', () => {
    expect(interpretar('*se sienta en el sofá*').globo).toBe('narracion');
    expect(interpretar('(qué pesado es este tío)').globo).toBe('pensamiento');
    expect(interpretar('psst, ¿sabes lo de Juan?').globo).toBe('susurro');
    expect(interpretar('BOOM').globo).toBe('sonido');
    expect(interpretar('ERES UN PESADO DE CUIDADO').globo).toBe('grito');
    expect(interpretar('😮').globo).toBe('reaccion');
    expect(interpretar('¿Vienes mañana?').globo).toBe('pregunta');
  });

  it('gestos: saludar, encogerse, levantar la mano, pulgar', () => {
    expect(interpretar('¡Hola a todos!').pose).toBe('saludando');
    expect(interpretar('ni idea 🤷').pose).toBe('encogiendo-hombros');
    expect(interpretar('¡Yo me apunto!').pose).toBe('levantando-mano');
    expect(interpretar('vale').pose).toBe('pulgar-arriba');
  });

  it('no confunde sorpresa con desacuerdo ni un relato con un desplazamiento', () => {
    expect(interpretar('¡No me lo creo!').intencion).not.toBe('desacuerdo');
    const relato = interpretar(
      'Os cuento: salgo tarde, pierdo el autobús y cuando por fin llego a la oficina resulta que la reunión se había cancelado y nadie me avisó.',
    );
    expect(relato.destino).toBeUndefined();
    expect(relato.pose).toBe('explicando');
  });

  it('respeta la expresión elegida a mano, incluidos los ids antiguos', () => {
    const d = new Director();
    const m = msg('lo que sea', 'alberto', { expresion: 'grito' });
    expect(interprete.interpretar(m, d.contextoPara(m)).emocion).toBe('gritando');
  });

  it('deja traza de las reglas que votaron', () => {
    const i = interpretar('JAJAJA 😂');
    expect(i.traza.map((t) => t.regla)).toContain('risa');
  });
});

/* =========================================================== director === */

/**
 * Cómo se escribe de verdad en un chat. Salen de las conversaciones reales de
 * xhatin y de las formas de escribir que más se repiten en un chat en
 * castellano: letras alargadas, abreviaturas, risas tecleadas a lo loco.
 */
describe('Interpretación (lo que se escribe de verdad)', () => {
  it.each([
    ['holaaaa', 'saludo'],
    ['buenaaas', 'saludo'],
    ['epaa', 'saludo'],
    ['k pasa', 'saludo'],
    ['q tal?', 'saludo'],
    ['how are you??', 'saludo'],
    ['okk', 'acuerdo'],
    ['siiii', 'acuerdo'],
    ['nooooo', 'desacuerdo'],
    ['jajsjajs', 'risa'],
  ])('"%s" → intención %s', (texto, intencion) => {
    expect(interpretar(texto).intencion).toBe(intencion);
  });

  it.each([
    ['de verdad??', 'sorprendido'],
    ['tengo sueño', 'cansado'],
    ['estoy malo', 'cansado'],
    ['me han despedido', 'triste'],
    ['que asco', 'enfadado'],
  ])('"%s" → cara %s', (texto, emocion) => {
    expect(interpretar(texto).emocion).toBe(emocion);
  });

  it('deshacer alargamientos no rompe las letras dobles de verdad', () => {
    // "llorando" lleva ll y sigue leyéndose como llanto.
    expect(interpretar('estoy llorando').emocion).toBe('llorando');
  });
});

describe('Refinador remoto (IA)', () => {
  /** Un `fetch` que contesta siempre lo mismo y apunta cuántas veces le llaman. */
  function servicio(status: number, cuerpo: unknown = {}) {
    const llamadas: unknown[] = [];
    const f = (async (_url: string, init?: RequestInit) => {
      llamadas.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(cuerpo), { status });
    }) as typeof fetch;
    return { f, llamadas };
  }

  async function refinar(texto: string, f: typeof fetch) {
    const d = new Director();
    const m = msg(texto);
    const ctx = d.contextoPara(m);
    const base = interprete.interpretar(m, ctx);
    return { base, parche: await refinadorRemoto({ url: '/x', fetch: f }).refinar(m, ctx, base) };
  }

  it('cambia la cara cuando la IA lee otra cosa, y rehace pose y cámara', async () => {
    const { f, llamadas } = servicio(200, { emocion: 'sarcastico', intensidad: 0.7, globo: 'dialogo', tono: 'comico', intencion: 'desacuerdo' });
    const { base, parche } = await refinar('qué bien, otro lunes', f);
    expect(base.emocion).toBe('feliz');
    expect(parche?.emocion).toBe('sarcastico');
    expect(parche?.pose).toBe(CATALOGO.expresion('sarcastico').pose ?? 'de-pie');
    expect(parche && 'camara' in parche && parche.camara).toBeUndefined();
    expect(parche?.efectos).toEqual([]);
    // Manda las opciones del catálogo para que la IA no invente caras.
    expect((llamadas[0] as { opciones: { emociones: string[] } }).opciones.emociones).toContain('sarcastico');
  });

  it('no recompone por un matiz', async () => {
    const d = new Director();
    const m = msg('hola');
    const base = interprete.interpretar(m, d.contextoPara(m));
    const { f } = servicio(200, { emocion: base.emocion, intensidad: base.intensidad + 0.1, globo: base.globo, tono: 'neutro', intencion: 'saludo' });
    expect((await refinar('hola', f)).parche).toBeNull();
  });

  it('ignora respuestas con caras que no existen', async () => {
    const { f } = servicio(200, { emocion: 'extasis-cosmico', intensidad: 0.5, globo: 'dialogo', tono: 'neutro', intencion: 'afirmacion' });
    expect((await refinar('qué bien, otro lunes', f)).parche).toBeNull();
  });

  it('sin IA configurada (503) deja de preguntar', async () => {
    const { f, llamadas } = servicio(503);
    const r = refinadorRemoto({ url: '/x', fetch: f });
    const d = new Director();
    for (const texto of ['uno', 'dos']) {
      const m = msg(texto);
      const ctx = d.contextoPara(m);
      expect(await r.refinar(m, ctx, interprete.interpretar(m, ctx))).toBeNull();
    }
    expect(llamadas.length).toBe(1);
  });

  it('no pregunta por mensajes sin letras', async () => {
    const { f, llamadas } = servicio(200);
    expect((await refinar('😂😂😂', f)).parche).toBeNull();
    expect(llamadas.length).toBe(0);
  });
});

describe('Director', () => {
  it('cada mensaje acaba en exactamente una viñeta, con su globo', () => {
    for (const c of CONVERSACIONES) {
      const d = montar(c.id);
      const ids = d.vinetas.flatMap((v) => v.mensajes);
      expect(ids.sort()).toEqual(c.mensajes.map((m) => m.id).sort());
      for (const v of d.vinetas) {
        const conGlobo = new Set(v.globos.map((g) => g.mensajeId).filter(Boolean));
        for (const id of v.mensajes) expect(conGlobo.has(id)).toBe(true);
      }
    }
  });

  it('agrupa mensajes relacionados: una charla no es una viñeta por mensaje', () => {
    for (const id of ['normal', 'humor', 'tres', 'cortos']) {
      const c = CONVERSACIONES.find((x) => x.id === id)!;
      expect(montar(id).vinetas.length).toBeLessThan(c.mensajes.length);
    }
    // Ejemplo del encargo: la pregunta y el "No." comparten viñeta.
    const agrupar = montar('agrupar');
    expect(agrupar.vinetas[0]!.mensajes.length).toBe(2);
  });

  it('respeta los límites de la viñeta (globos, personajes)', () => {
    for (const c of CONVERSACIONES) {
      for (const v of montar(c.id).vinetas) {
        expect(v.globos.filter((g) => g.tipo !== 'narracion').length).toBeLessThanOrEqual(4);
        expect(v.personajes.length).toBeLessThanOrEqual(5);
        if (v.personajes.length >= 3) expect(v.formato).toBe('ancha');
      }
    }
  });

  it('cambia de escenario de forma progresiva (trabajo → oficina → cafetería)', () => {
    const d = montar('tema');
    const esc = d.vinetas.map((v) => v.escenario);
    expect(esc).toContain('oficina');
    expect(esc).toContain('cafeteria');
    expect(esc.indexOf('oficina')).toBeLessThan(esc.indexOf('cafeteria'));
    const cafe = d.vinetas.find((v) => v.escenario === 'cafeteria')!;
    expect(cafe.abreEscena).toBe(true);
    expect(cafe.rotulo).toBe('En la cafetería');
    // "Venga, voy a la cafetería" se dibuja aún en la oficina, caminando.
    const anuncio = d.vinetas.find((v) => v.globos.some((g) => /voy a la cafeter/i.test(g.texto)))!;
    expect(anuncio.escenario).toBe('oficina');
    expect(anuncio.personajes.find((p) => p.nombre === 'Alberto')!.pose).toBe('caminando');
  });

  it('quien habla mira a su interlocutor y el interlocutor le mira a él', () => {
    const v = montar('normal').vinetas[0]!;
    const [a, b] = v.personajes;
    expect(a!.mirada.objetivo).toBe(b!.id);
    expect(b!.mirada.objetivo).toBe(a!.id);
    expect(a!.orientacion).toBe('derecha');
    expect(b!.orientacion).toBe('izquierda');
  });

  it('entrada de un personaje nuevo: viñeta propia, animación y los demás se giran', () => {
    const d = montar('entrada');
    const v = d.vinetas.find((x) => x.personajes.some((p) => p.nombre === 'Hilario'))!;
    const hilario = v.personajes.find((p) => p.nombre === 'Hilario')!;
    expect(hilario.animaciones).toContain('entrada');
    expect(v.notas.join(' ')).toMatch(/entra Hilario/);
    const otros = v.personajes.filter((p) => p.id !== hilario.id);
    expect(otros.some((p) => p.mirada.objetivo === hilario.id)).toBe(true);
  });

  it('salida: quien se despide ya no está en la viñeta siguiente, y se cuenta', () => {
    const d = montar('salida');
    const i = d.vinetas.findIndex((v) => v.globos.some((g) => /me voy/.test(g.texto)));
    const despues = d.vinetas.slice(i + 1);
    expect(despues.length).toBeGreaterThan(0);
    for (const v of despues) expect(v.personajes.some((p) => p.nombre === 'Alberto')).toBe(false);
    expect(despues[0]!.globos.some((g) => g.tipo === 'narracion' && /Alberto se ha ido/.test(g.texto))).toBe(true);
    // Contestar "hasta mañana" no hace irse a quien contesta.
    expect(despues.some((v) => v.personajes.some((p) => p.nombre === 'Juan'))).toBe(true);
  });

  it('una discusión sube la tensión y cambia el lenguaje visual', () => {
    const d = montar('discusion');
    expect(d.vinetas.some((v) => v.ambiente === 'tension' || v.camara.plano === 'lateral')).toBe(true);
    expect(d.vinetas.some((v) => v.camara.plano === 'primerisimo' || v.camara.plano === 'primer-plano')).toBe(true);
  });

  it('muchos usuarios: plano general y reparto limitado', () => {
    const d = montar('muchos');
    expect(d.vinetas.some((v) => v.camara.plano === 'general' || v.camara.plano === 'grupo')).toBe(true);
    for (const v of d.vinetas) expect(v.personajes.length).toBeLessThanOrEqual(5);
  });

  it('dosifica los efectos (presupuesto por viñeta)', () => {
    for (const c of CONVERSACIONES) {
      for (const v of montar(c.id).vinetas) {
        const peso = v.efectos.reduce((s, e) => s + CATALOGO.efectos.obtener(e.tipo).peso, 0);
        expect(peso).toBeLessThanOrEqual(3);
      }
    }
  });

  it('es determinista y reconstruir desordenado da lo mismo', () => {
    const c = CONVERSACIONES.find((x) => x.id === 'tema')!;
    const a = new Director();
    for (const m of c.mensajes) a.procesar(m);
    const b = new Director();
    b.reconstruir([...c.mensajes].reverse());
    expect(JSON.stringify(b.vinetas)).toBe(JSON.stringify(a.vinetas));
  });

  it('parte "*acción* diálogo" en cartela y globo', () => {
    const d = new Director();
    d.procesar(msg('Hola'));
    const r = d.procesar(msg('*se sienta* ¿Café?', 'juan'));
    const tipos = r.vineta.globos.map((g) => g.tipo);
    expect(tipos).toContain('narracion');
    expect(r.vineta.globos.find((g) => g.tipo === 'narracion')!.texto).toBe('Juan se sienta.');
    expect(r.vineta.globos.some((g) => g.texto === '¿Café?')).toBe(true);
  });

  it('eventos de presencia: entrar y salir sin escribir', () => {
    const d = new Director();
    d.procesar(msg('Hola', 'alberto'));
    d.procesar(msg('Buenas', 'juan'));
    const v1 = d.presencia({ tipo: 'entra', usuarioId: 'u-x', nombre: 'Xavi', avatar: null, fecha: new Date() })!;
    expect(v1.personajes.some((p) => p.nombre === 'Xavi' && p.animaciones.includes('entrada'))).toBe(true);
    const v2 = d.presencia({ tipo: 'sale', usuarioId: 'u-x', fecha: new Date() })!;
    expect(v2.personajes.find((p) => p.nombre === 'Xavi')!.animaciones).toContain('salida');
    expect(v2.globos.some((g) => /Xavi se va/.test(g.texto))).toBe(true);
  });

  it('acepta refinadores asíncronos (IA) sin tocar el resto', async () => {
    const d = new Director({
      refinadores: [{ nombre: 'falso', refinar: async () => ({ emocion: 'enamorado' }) }],
    });
    const m = msg('Te he traído una cosa');
    d.procesar(m);
    expect(await d.refinar(m.id)).toBe(true);
    const pj = d.vinetas[0]!.personajes.find((p) => p.nombre === 'Alberto')!;
    expect(pj.expresion).toBe('enamorado');
  });
});

/* ======================================================== extensible === */

describe('Extensibilidad', () => {
  it('una pose nueva por paquete funciona sin tocar el motor', () => {
    const cat = new Catalogo().cargarPaquete({
      poses: [
        {
          id: 'jarras-arriba',
          nombre: 'Brindis',
          tags: ['fiesta'],
          brazoDelante: { hombro: 150, codo: 10, mano: 'sujeta' },
          brazoDetras: { hombro: -10, codo: 0, mano: 'relajada' },
          piernaDelante: { cadera: 4, rodilla: 0 },
          piernaDetras: { cadera: -4, rodilla: 0 },
          sujeta: { mano: 'delante', prop: 'taza' },
        },
      ],
    });
    const r = dibujarPersonaje({
      identidad: identidadDe(REPARTO['juan']!.avatar, 'u-juan'),
      pose: cat.poses.obtener('jarras-arriba'),
      expresion: cat.expresion('muy-feliz'),
      marcas: cat.marcas.listar(),
      mirada: { x: 0, y: 0 },
      giro: 0,
      habla: false,
      semilla: 1,
    });
    expect(r.svg).toContain('dh-cabeza');
    expect(r.esqueleto.anclas.manoDelante.y).toBeLessThan(r.esqueleto.anclas.boca.y);
  });

  it('una regla nueva cambia la interpretación; quitarla la deshace', () => {
    const motor = new MotorReglas<CtxMensaje>(REGLAS_BASE);
    motor.anadir({
      id: 'pizza-restaurante',
      descripcion: 'Hablar de pizza lleva al restaurante',
      cuando: (c) => /pizza/.test(c.s.norm),
      entonces: (c) => c.p.votar('escenario', 'restaurante', 5),
    });
    const i = new InterpreteReglas(motor);
    const d = new Director();
    const m = msg('¿Pedimos una pizza?');
    expect(i.interpretar(m, d.contextoPara(m)).escenario?.id).toBe('restaurante');
    motor.quitar('pizza-restaurante');
    expect(i.interpretar(m, d.contextoPara(m)).escenario?.id).not.toBe('restaurante');
  });

  it('el cuerpo se deriva del avatar de forma estable', () => {
    const a = identidadDe(REPARTO['marta']!.avatar, 'u-marta');
    const b = identidadDe(REPARTO['marta']!.avatar, 'u-marta');
    expect(b).toEqual(a);
    // Sin avatar guardado, el respaldo determinista por id.
    expect(identidadDe(null, 'u-carlos').codigo).toBe(identidadDe(null, 'u-carlos').codigo);
  });
});

/* ========================================================= composición === */

describe('Composición', () => {
  const todas: Array<{ conv: string; v: Vineta; d: Director }> = [];
  for (const c of CONVERSACIONES) {
    const d = montar(c.id);
    for (const v of d.vinetas) todas.push({ conv: c.id, v, d });
  }

  it('produce un SVG por viñeta con ids propios', () => {
    for (const { v, d } of todas) {
      const { svg } = componerVineta(v, d.catalogo, { animar: false });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      // Ningún id sin sufijo de viñeta (chocarían entre viñetas).
      const base = ['dh-trama', 'dh-trama-fina', 'dh-rayas', 'dh-cuadros', 'dh-marco', 'dh-esc-puntos', 'dh-esc-rayas', 'dh-clip'];
      const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(base).not.toContain(id);
      for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
    }
  });

  it('los globos quedan dentro de la viñeta, sin pisarse ni tapar caras', () => {
    for (const { conv, v, d } of todas) {
      const r = componerVineta(v, d.catalogo, { animar: false });
      const caras = r.layout.personajes.map((c) => aVineta(r.encuadre, c.cara));
      r.globos.forEach((g, i) => {
        const c = g.caja;
        expect(c.x, `${conv}/${v.id}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `${conv}/${v.id}`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.ancho, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.ancho + 0.5);
        expect(c.y + c.alto, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.alto + 0.5);
        for (const otro of r.globos.slice(i + 1)) expect(solapa(c, otro.caja), `${conv}/${v.id} globos`).toBe(0);
        const tapado = caras.reduce((s, f) => s + solapa(c, f), 0);
        expect(tapado / (c.ancho * c.alto), `${conv}/${v.id} tapa una cara: "${g.globo.texto}"`).toBeLessThan(0.08);
      });
    }
  });

  it('con desborde los globos solo se salen por arriba y lo justo, sin pisarse ni tapar caras', () => {
    const DESBORDE = 60;
    const movil = { animar: false, escalaLetra: 1.3, separacion: 0.5, desborde: DESBORDE };
    let fuera = 0;
    for (const { conv, v, d } of todas) {
      const r = componerVineta(v, d.catalogo, movil);
      const caras = r.layout.personajes.map((c) => aVineta(r.encuadre, c.cara));
      r.globos.forEach((g, i) => {
        const c = g.caja;
        expect(c.x, `${conv}/${v.id}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `${conv}/${v.id}`).toBeGreaterThanOrEqual(-DESBORDE);
        expect(c.x + c.ancho, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.ancho + 0.5);
        expect(c.y + c.alto, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.alto + 0.5);
        for (const otro of r.globos.slice(i + 1)) expect(solapa(c, otro.caja), `${conv}/${v.id} globos`).toBe(0);
        const tapado = caras.reduce((s, f) => s + solapa(c, f), 0);
        expect(tapado / (c.ancho * c.alto), `${conv}/${v.id} tapa una cara: "${g.globo.texto}"`).toBeLessThan(0.08);
        if (c.y < 0) fuera++;
      });
      // Los valores por defecto son los de siempre.
      expect(componerVineta(v, d.catalogo, { animar: false, separacion: 1, desborde: 0 }).svg).toBe(
        componerVineta(v, d.catalogo, { animar: false }).svg,
      );
    }
    expect(fuera).toBeGreaterThan(0);
  });

  it('con escalaLetra la letra crece y los globos siguen dentro, sin pisarse ni tapar caras', () => {
    let mayores = 0;
    for (const { conv, v, d } of todas) {
      const normal = componerVineta(v, d.catalogo, { animar: false });
      const r = componerVineta(v, d.catalogo, { animar: false, escalaLetra: 1.3 });
      const caras = r.layout.personajes.map((c) => aVineta(r.encuadre, c.cara));
      r.globos.forEach((g, i) => {
        const c = g.caja;
        expect(c.x, `${conv}/${v.id}`).toBeGreaterThanOrEqual(0);
        expect(c.y, `${conv}/${v.id}`).toBeGreaterThanOrEqual(0);
        expect(c.x + c.ancho, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.ancho + 0.5);
        expect(c.y + c.alto, `${conv}/${v.id}`).toBeLessThanOrEqual(r.layout.alto + 0.5);
        for (const otro of r.globos.slice(i + 1)) expect(solapa(c, otro.caja), `${conv}/${v.id} globos`).toBe(0);
        const tapado = caras.reduce((s, f) => s + solapa(c, f), 0);
        expect(tapado / (c.ancho * c.alto), `${conv}/${v.id} tapa una cara: "${g.globo.texto}"`).toBeLessThan(0.08);
        const antes = normal.globos.find((x) => x.globo.id === g.globo.id);
        if (antes && g.estilo.tam > antes.estilo.tam) mayores++;
      });
      // La escala no se queda puesta para la viñeta siguiente.
      expect(componerVineta(v, d.catalogo, { animar: false }).svg).toBe(normal.svg);
    }
    expect(mayores).toBeGreaterThan(0);
  });

  it('dos viñetas con el mismo id en conversaciones distintas no comparten ids de SVG', () => {
    const a = montar('discusion').vinetas[1]!;
    const b = montar('salida').vinetas[1]!;
    expect(a.id).toBe(b.id);
    const idsDe = (v: Vineta) => new Set([...componerVineta(v, CATALOGO, { animar: false }).svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const ia = idsDe(a);
    for (const id of idsDe(b)) expect(ia.has(id)).toBe(false);
  });

  it('escapa el texto de los mensajes', () => {
    const d = new Director();
    const r = d.procesar(msg('<script>alert(1)</script> & "hola"'));
    const { svg } = componerVineta(r.vineta, d.catalogo, { animar: false });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('la mirada mueve las pupilas', () => {
    const base = {
      identidad: identidadDe(REPARTO['juan']!.avatar, 'u-juan'),
      pose: CATALOGO.poses.obtener('de-pie'),
      expresion: CATALOGO.expresion('neutral'),
      marcas: CATALOGO.marcas.listar(),
      giro: 0,
      habla: false,
      semilla: 1,
    };
    const frente = dibujarPersonaje({ ...base, mirada: { x: 0, y: 0 } }).svg;
    const lado = dibujarPersonaje({ ...base, mirada: { x: 1, y: 0 } }).svg;
    expect(lado).not.toBe(frente);
    expect(lado).toContain('translate(7.0 0.0)');
  });
});

/* ============================================================ estilos === */

describe('Estilos de imagen (caricatura)', () => {
  const larry = CARICATURA.personajes['larry']!;
  const uso = { estilo: CARICATURA, base: 'https://remote.test/', reparto: { 'u-alberto': 'larry', 'u-juan': 'lara' } };

  function conversacion(...lineas: [keyof typeof REPARTO, string][]): Director {
    const d = new Director();
    lineas.forEach(([quien, texto], i) => d.procesar(msg(texto, quien, { id: `e${i}`, fecha: new Date(Date.UTC(2026, 0, 1, 10, i)) })));
    return d;
  }

  it('el gesto manda sobre la cara; si la pose es neutra, manda la cara', () => {
    expect(elegirFigura(larry, { pose: 'saludando', expresion: 'feliz' }).id).toBe('saludando');
    expect(elegirFigura(larry, { pose: 'hablando', expresion: 'enfadado' }).id).toBe('enfadado');
    expect(elegirFigura(larry, { pose: 'de-pie', expresion: 'sarcastico' }).id).toBe('brazos-cruzados');
    expect(elegirFigura(larry, { pose: 'inventada', expresion: 'inventada' }).id).toBe('hablando');
  });

  it('si falta una figura, cae en la más parecida y no en "hablando"', () => {
    const { enfadado: _, ...sinEnfado } = larry.figuras;
    const incompleto = { ...larry, figuras: sinEnfado };
    expect(elegirFigura(incompleto, { pose: 'enfadado', expresion: 'enfadado' }).id).toBe('negando');
  });

  it('cada expresión y cada pose del catálogo tienen figura', () => {
    for (const e of CATALOGO.expresiones.listar()) {
      expect(larry.figuras[elegirFigura(larry, { pose: 'de-pie', expresion: e.id }).id], e.id).toBeDefined();
    }
    for (const p of CATALOGO.poses.listar()) {
      expect(larry.figuras[elegirFigura(larry, { pose: p.id, expresion: 'neutral' }).id], p.id).toBeDefined();
    }
  });

  it('dibuja con la biblioteca a quien está en el reparto, con boca y párpados', () => {
    const d = conversacion(['alberto', 'Hola, ¿qué tal?'], ['juan', '¡Muy bien!']);
    const { svg } = componerVineta(d.vinetas[0]!, d.catalogo, { estilo: uso });
    expect(svg).toContain('href="https://remote.test/estilos/caricatura/larry/');
    expect(svg).toContain('href="https://remote.test/estilos/caricatura/lara/');
    expect(svg).toContain('class="dh-boca-b"><image');
    expect(svg).toContain('class="dh-parpados"');
    expect(svg).toContain('estilos/caricatura/escenarios/');
  });

  it('quien no está en el reparto sigue siendo su personaje vectorial', () => {
    const d = conversacion(['alberto', 'Hola'], ['marta', 'Hola, Alberto']);
    const { svg } = componerVineta(d.vinetas[0]!, d.catalogo, { estilo: uso });
    const marta = svg.slice(svg.indexOf('data-id="u-marta"'));
    expect(marta.slice(0, marta.indexOf('</g></g>'))).not.toContain('<image');
  });

  it('la cámara y los globos usan la cara del dibujo: el rabito apunta a su boca', () => {
    const d = conversacion(['alberto', '¿Vienes a por un café?']);
    const v = d.vinetas[0]!;
    const sin = componerVineta(v, d.catalogo);
    const con = componerVineta(v, d.catalogo, { estilo: uso });
    const cSin = sin.layout.personajes[0]!;
    const cCon = con.layout.personajes[0]!;
    expect(cCon.boca).not.toEqual(cSin.boca);
    // La boca queda dentro de la cara del dibujo.
    expect(cCon.boca.x).toBeGreaterThanOrEqual(cCon.cara.x);
    expect(cCon.boca.x).toBeLessThanOrEqual(cCon.cara.x + cCon.cara.ancho);
    expect(cCon.boca.y).toBeGreaterThanOrEqual(cCon.cara.y);
    expect(cCon.boca.y).toBeLessThanOrEqual(cCon.cara.y + cCon.cara.alto);
  });

  it('la letra del estilo solo dura lo que dura su viñeta', () => {
    const d = conversacion(['alberto', 'Hola, ¿qué tal todo?']);
    const v = d.vinetas[0]!;
    expect(componerVineta(v, d.catalogo, { estilo: uso }).svg).toContain("font-family=\"'Patrick Hand'");
    const despues = componerVineta(v, d.catalogo).svg;
    expect(despues).toContain("font-family=\"'Comic Neue'");
    expect(despues).not.toContain('Patrick Hand');
  });

  it('las figuras con URL absoluta (caricaturas propias) no llevan la base delante', () => {
    const propia = {
      ...larry,
      id: 'u-alberto',
      figuras: Object.fromEntries(Object.entries(larry.figuras).map(([k, f]) => [k, { ...f, src: 'https://api.test/xhatin/caricaturas/x/' + k + '.webp' }])),
    };
    const d = conversacion(['alberto', 'Hola']);
    const { svg } = componerVineta(d.vinetas[0]!, d.catalogo, {
      estilo: { ...uso, estilo: { ...CARICATURA, personajes: { ...CARICATURA.personajes, 'u-alberto': propia } }, reparto: { 'u-alberto': 'u-alberto' } },
    });
    expect(svg).toContain('href="https://api.test/xhatin/caricaturas/x/');
    expect(svg).not.toContain('https://remote.test/https://');
  });

  it('sin estilo, la viñeta sale exactamente igual que antes', () => {
    const d = montar('normal');
    for (const v of d.vinetas) {
      const a = componerVineta(v, d.catalogo, { animar: false }).svg;
      expect(a).not.toContain('<image href="https://');
      expect(componerVineta(v, d.catalogo, { animar: false, estilo: undefined }).svg).toBe(a);
    }
  });
});
