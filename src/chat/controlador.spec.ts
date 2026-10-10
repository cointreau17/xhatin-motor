/**
 * Tests del controlador del cómic: la conversación sin framework, la misma
 * que pintan xhatin (Angular) y la app móvil (componente DOM).
 */

import { aCodigo, aleatorio } from '../hilaravatar/hilaravatar.js';
import { Director } from '../escena/director/director.js';
import type { Refinador } from '../escena/interpretacion/interprete.js';
import { ControladorComic, type EstadoComic } from './controlador.js';
import { ESCRIBIENDO_MS } from './escribiendo.js';
import { PuertoChatFalso } from './puerto-falso.js';
import type { MensajeChat, PresenciaChat, PuertoChat } from './puerto-chat.js';

const T0 = Date.UTC(2026, 0, 1, 12);
const NOMBRES: Record<string, string> = { 'u-ana': 'Ana', 'u-beto': 'Beto' };

function msg(id: string, texto: string, autor = 'u-ana', minuto = 0): MensajeChat {
  return { id, texto, autorId: autor, autorNombre: NOMBRES[autor] ?? autor, avatar: null, fecha: new Date(T0 + minuto * 60_000) };
}

const HISTORIAL = [
  msg('m1', 'Hola Beto, ¿qué tal?', 'u-ana', 0),
  msg('m2', 'Bien, aquí liado con el cierre', 'u-beto', 1),
  msg('m3', '¿Te ayudo?', 'u-ana', 2),
];

/** Un puerto que maneja el test: el historial llega (o falla) cuando se diga. */
function puertoManual(historial: MensajeChat[] = HISTORIAL) {
  const oyentes = new Set<(m: MensajeChat) => void>();
  const presencias = new Set<(e: PresenciaChat) => void>();
  const pendientes: Array<{ ok: (m: MensajeChat[]) => void; ko: (e: unknown) => void }> = [];
  const puerto: PuertoChat = {
    historial: () => new Promise((ok, ko) => pendientes.push({ ok, ko })),
    alRecibir: (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    enviar: () => Promise.resolve(),
    alCambiarPresencia: (cb) => {
      presencias.add(cb);
      return () => presencias.delete(cb);
    },
  };
  return {
    puerto,
    oyentes,
    cargar: () => pendientes.shift()!.ok(historial),
    fallar: () => pendientes.shift()!.ko(new Error('sin red')),
    recibir: (m: MensajeChat) => oyentes.forEach((o) => o(m)),
    presencia: (e: PresenciaChat) => presencias.forEach((o) => o(e)),
  };
}

/** La tira que haría el director con esos mensajes, para comparar. */
function tiraDe(mensajes: readonly MensajeChat[]) {
  const d = new Director();
  return d.reconstruir([...mensajes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())).map((v) => v.mensajes);
}

async function conectado(c: ControladorComic, m = puertoManual()) {
  const lista = c.conectar(m.puerto);
  m.cargar();
  await lista;
  return m;
}

describe('ControladorComic', () => {
  it('compone el historial como el director y anima la última viñeta entera', async () => {
    const c = new ControladorComic();
    const m = puertoManual();
    const lista = c.conectar(m.puerto);
    expect(c.estado.cargando).toBe(true);
    m.cargar();
    await lista;

    const e = c.estado;
    expect(e.cargando).toBe(false);
    expect(e.error).toBe(false);
    expect(e.tira.map((v) => v.mensajes)).toEqual(tiraDe(HISTORIAL));
    expect(e.novedades?.que).toBe('*');
    expect(e.novedades?.id).toBe(e.tira[e.tira.length - 1]!.id);
    expect(e.vinetas.map((v) => v.id)).toEqual(['m1', 'm2', 'm3']);
    expect([...e.gente.keys()].sort()).toEqual(['u-ana', 'u-beto']);
  });

  it('avisa de cada cambio con un objeto nuevo, y deja de avisar al darse de baja', async () => {
    const c = new ControladorComic();
    const vistos: EstadoComic[] = [];
    const baja = c.suscribir((e) => vistos.push(e));
    await conectado(c);
    expect(vistos.length).toBeGreaterThanOrEqual(2);
    expect(vistos[vistos.length - 1]).toBe(c.estado);
    expect(new Set(vistos).size).toBe(vistos.length);
    baja();
    const antes = vistos.length;
    c.anadir(msg('m4', 'Venga', 'u-beto', 3));
    expect(vistos.length).toBe(antes);
  });

  it('lo que llega mientras viaja el historial no se pierde ni se repite', async () => {
    const c = new ControladorComic();
    const m = puertoManual();
    const lista = c.conectar(m.puerto);
    m.recibir(HISTORIAL[2]!); // también vendrá en el historial
    m.recibir(msg('m4', '¡Sí, porfa!', 'u-beto', 3));
    m.cargar();
    await lista;

    expect(c.estado.vinetas.map((v) => v.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
    expect(c.estado.tira.map((v) => v.mensajes)).toEqual(tiraDe([...HISTORIAL, msg('m4', '¡Sí, porfa!', 'u-beto', 3)]));
  });

  it('un mensaje nuevo anima solo lo nuevo, y los repetidos se ignoran', async () => {
    const c = new ControladorComic();
    const m = await conectado(c);
    m.recibir(msg('m4', 'Vale, gracias', 'u-beto', 3));
    const ultima = c.estado.tira[c.estado.tira.length - 1]!;
    expect(ultima.mensajes).toContain('m4');
    expect(c.novedadesDe(ultima)).not.toBeNull();
    for (const v of c.estado.tira.slice(0, -1)) expect(c.novedadesDe(v)).toBeNull();

    const tira = c.estado.tira;
    m.recibir(msg('m4', 'Vale, gracias', 'u-beto', 3));
    expect(c.estado.tira).toBe(tira);
    expect(c.estado.vinetas.filter((v) => v.id === 'm4')).toHaveLength(1);
  });

  it('un mensaje desordenado recompone la tira como si hubiera llegado en su sitio', async () => {
    const c = new ControladorComic();
    const m = await conectado(c);
    const tarde = msg('m0', 'Buenos días', 'u-beto', -5);
    m.recibir(tarde);
    expect(c.estado.tira.map((v) => v.mensajes)).toEqual(tiraDe([tarde, ...HISTORIAL]));
    expect(c.estado.novedades).toBeNull();
  });

  it('una conexión vieja no escribe en la nueva', async () => {
    const c = new ControladorComic();
    const a = puertoManual([msg('a1', 'De la conversación A')]);
    const b = puertoManual([msg('b1', 'De la conversación B')]);
    const primera = c.conectar(a.puerto);
    const segunda = c.conectar(b.puerto);
    expect(a.oyentes.size).toBe(0);
    a.cargar();
    await primera;
    expect(c.estado.vinetas).toHaveLength(0);
    b.cargar();
    await segunda;
    expect(c.estado.vinetas.map((v) => v.id)).toEqual(['b1']);
  });

  it('si el historial falla queda en error, y reintentar vuelve a pedirlo', async () => {
    const c = new ControladorComic();
    const m = puertoManual();
    const lista = c.conectar(m.puerto);
    m.fallar();
    await lista;
    expect(c.estado.error).toBe(true);
    expect(c.estado.cargando).toBe(false);
    expect(m.oyentes.size).toBe(0);

    const otra = c.reintentar();
    m.cargar();
    await otra;
    expect(c.estado.error).toBe(false);
    expect(c.estado.tira.length).toBeGreaterThan(0);
  });

  it('la gente entra y sale', async () => {
    const c = new ControladorComic();
    const m = await conectado(c);
    m.presencia({ tipo: 'entra', usuarioId: 'u-carla', nombre: 'Carla', avatar: null, fecha: new Date(T0 + 4 * 60_000) });
    expect(c.estado.gente.get('u-carla')?.nombre).toBe('Carla');
    m.presencia({ tipo: 'sale', usuarioId: 'u-carla', fecha: new Date(T0 + 5 * 60_000) });
    expect(c.estado.gente.has('u-carla')).toBe(false);
  });

  it('lo que dice el puerto de alguien pisa lo deducido de sus mensajes, y no al revés', async () => {
    const c = new ControladorComic();
    await conectado(c);
    c.conocerParticipantes([{ id: 'u-ana', nombre: 'Ana López' }]);
    expect(c.estado.gente.get('u-ana')?.nombre).toBe('Ana López');
    c.anadir({ ...msg('m4', 'Otra cosa', 'u-ana', 3), autorNombre: 'Alguien' });
    expect(c.estado.gente.get('u-ana')?.nombre).toBe('Ana López');
  });

  it('sin código de avatar, la cara determinista de su id', async () => {
    const c = new ControladorComic();
    await conectado(c);
    expect(c.estado.vinetas[0]!.codigo).toBe(aCodigo(aleatorio('u-ana')));
    expect(c.avatarDe('u-ana')).toBe(aCodigo(aleatorio('u-ana')));
  });

  it('cerrar vacía el estado y un historial en vuelo ya no escribe', async () => {
    const c = new ControladorComic();
    await conectado(c);
    const m = puertoManual();
    const lista = c.conectar(m.puerto);
    c.cerrar();
    m.cargar();
    await lista;
    expect(c.estado.tira).toHaveLength(0);
    expect(c.estado.vinetas).toHaveLength(0);
    expect(c.estado.gente.size).toBe(0);
  });

  it('un refinador que contesta tarde corrige la tira y avisa otra vez', async () => {
    let contestar: () => void = () => {};
    const ia: Refinador = {
      nombre: 'prueba',
      refinar: () => new Promise((ok) => (contestar = () => ok({ emocion: 'enfadado', intensidad: 0.9 }))),
    };
    const c = new ControladorComic({ refinadores: [ia] });
    await conectado(c);
    let avisos = 0;
    c.suscribir(() => avisos++);
    c.anadir(msg('m4', 'Pues vale', 'u-beto', 3));
    const tras = avisos;
    contestar();
    await new Promise((r) => setTimeout(r, 0));
    expect(avisos).toBe(tras + 1);
    expect(c.estado.novedades).toBeNull();
  });

  it('los mensajes más antiguos entran sin animar nada', async () => {
    const c = new ControladorComic();
    c.cargarHistorial(HISTORIAL.slice(1));
    expect(c.estado.novedades?.que).toBe('*');
    c.cargarHistorial(HISTORIAL.slice(0, 1), { animar: false });
    expect(c.estado.novedades).toBeNull();
    expect(c.estado.tira.map((v) => v.mensajes)).toEqual(tiraDe(HISTORIAL));
  });

  it('el puerto falso también da los anteriores', async () => {
    const puerto = new PuertoChatFalso(4);
    const ultimos = await puerto.historial(2);
    const antes = await puerto.historialAnterior(ultimos[0]!.id, 5);
    expect(antes.map((m) => m.id)).toEqual(['falso-0', 'falso-1']);
  });

  it('los mensajes de quien he bloqueado no entran en la tira, ni ahora ni después', async () => {
    const c = new ControladorComic({ ocultos: ['u-beto'] });
    const m = puertoManual();
    await conectado(c, m);
    expect(c.estado.vinetas.map((v) => v.id)).toEqual(['m1', 'm3']);
    expect(c.estado.tira.flatMap((v) => v.mensajes)).toEqual(['m1', 'm3']);

    m.recibir(msg('m4', 'Otra cosa', 'u-beto', 3));
    m.presencia({ tipo: 'entra', usuarioId: 'u-beto', nombre: 'Beto', fecha: new Date(T0 + 4 * 60_000) });
    expect(c.estado.vinetas.map((v) => v.id)).toEqual(['m1', 'm3']);
  });

  it('bloquear a alguien con la conversación abierta le quita de la tira al momento', async () => {
    const c = new ControladorComic();
    await conectado(c);
    const avisos: EstadoComic[] = [];
    c.suscribir((e) => avisos.push(e));

    c.ocultar(['u-beto']);
    expect(c.estado.vinetas.map((v) => v.id)).toEqual(['m1', 'm3']);
    expect(c.estado.tira).toHaveLength(tiraDe([HISTORIAL[0]!, HISTORIAL[2]!]).length);
    expect(c.estado.tira.flatMap((v) => v.mensajes)).toEqual(['m1', 'm3']);
    // Nada se anima: no es nuevo, es lo que había sin él.
    expect(c.estado.novedades).toBeNull();
    expect(avisos).toHaveLength(1);

    // La misma lista otra vez no cambia nada.
    c.ocultar(['u-beto']);
    expect(avisos).toHaveLength(1);
  });

  it('da los mensajes de cada viñeta, para denunciar uno', async () => {
    const c = new ControladorComic();
    await conectado(c);
    const todos = c.estado.tira.flatMap((v) => c.mensajesDe(v).map((m) => m.id));
    expect(todos).toEqual(['m1', 'm2', 'm3']);
    expect(c.mensajesDe(c.estado.tira[0]!)[0]).toMatchObject({ id: 'm1', autorId: 'u-ana', texto: 'Hola Beto, ¿qué tal?' });
  });

  it('quién está escribiendo: entra al empezar y sale al parar, al enviar o al cabo de un rato', async () => {
    vi.useFakeTimers();
    try {
      const c = new ControladorComic({ ocultos: ['u-malo'] });
      c.escribe({ usuarioId: 'u-ana', nombre: 'Ana', escribe: true });
      c.escribe({ usuarioId: 'u-beto', nombre: 'Beto', escribe: true });
      c.escribe({ usuarioId: 'u-malo', nombre: 'Malo', escribe: true });
      expect(c.estado.escribiendo.map((p) => p.id)).toEqual(['u-ana', 'u-beto']);

      // Beto para; Ana envía su mensaje.
      c.escribe({ usuarioId: 'u-beto', escribe: false });
      c.anadir(msg('m9', 'ya está', 'u-ana', 9));
      expect(c.estado.escribiendo).toEqual([]);

      // Sin noticias, se da por terminado.
      c.escribe({ usuarioId: 'u-ana', nombre: 'Ana', escribe: true });
      vi.advanceTimersByTime(ESCRIBIENDO_MS + 1);
      expect(c.estado.escribiendo).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('el nombre de la conversación, si el puerto lo da, y el de antes no se queda', async () => {
    const c = new ControladorComic();
    const m = puertoManual();
    await conectado(c, { ...m, puerto: { ...m.puerto, titulo: () => Promise.resolve('Los del cierre') } });
    expect(c.estado.titulo).toBe('Los del cierre');
    await conectado(c);
    expect(c.estado.titulo).toBeNull();
  });

  it('el puerto falso dice quién escribe', async () => {
    const c = new ControladorComic();
    const puerto = new PuertoChatFalso();
    await c.conectar(puerto);
    puerto.teclea(1);
    expect(c.estado.escribiendo.map((p) => p.nombre)).toEqual(['La Cocinera']);
    puerto.teclea(1, false);
    expect(c.estado.escribiendo).toEqual([]);
    c.cerrar();
  });

  it('funciona con el puerto falso', async () => {
    const c = new ControladorComic();
    const puerto = new PuertoChatFalso(4);
    await c.conectar(puerto);
    expect(c.estado.vinetas).toHaveLength(4);
    expect(c.estado.tira.length).toBeGreaterThan(0);
    puerto.siguiente();
    expect(c.estado.vinetas).toHaveLength(5);
    const adjuntos = c.estado.tira.flatMap((v) => c.adjuntosDe(v));
    expect(adjuntos.every((a) => a.tipo !== 'imagen')).toBe(true);
  });
});
