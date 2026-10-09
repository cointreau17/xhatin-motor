/**
 * El puerto sobre un canal de Stream, con un canal falso que apunta lo que se
 * le pide y deja disparar eventos.
 */

import type { CanalStream, EventoStream, MensajeStream, MiembroStream } from './stream.js';
import { mensajeDeStream, puertoStream } from './stream.js';
import type { MensajeChat, PresenciaChat } from './puerto-chat.js';

class CanalFalso implements CanalStream {
  vigilado = 0;
  enviados: string[] = [];
  state: { members: Record<string, MiembroStream> } = { members: {} };
  /** Si es un número, los `watch()` fallan hasta llegar a cero. */
  fallos = 0;
  private readonly oyentes = new Map<string, Set<(e: EventoStream) => void>>();

  constructor(private readonly mensajes: MensajeStream[] = []) {}

  async watch(): Promise<void> {
    this.vigilado++;
    if (this.fallos > 0) {
      this.fallos--;
      throw new Error('sin red');
    }
  }

  async query(opciones: { messages: { limit: number; id_lt?: string } }): Promise<{ messages: MensajeStream[] }> {
    const { limit, id_lt } = opciones.messages;
    const hasta = id_lt ? this.mensajes.findIndex((m) => m.id === id_lt) : this.mensajes.length;
    return { messages: this.mensajes.slice(Math.max(0, hasta - limit), hasta) };
  }

  async sendMessage(mensaje: { text: string }): Promise<void> {
    this.enviados.push(mensaje.text);
  }

  leido = 0;
  async markRead(): Promise<void> {
    this.leido++;
  }

  on(evento: string, cb: (e: EventoStream) => void): { unsubscribe(): void } {
    const lista = this.oyentes.get(evento) ?? new Set();
    lista.add(cb);
    this.oyentes.set(evento, lista);
    return { unsubscribe: () => lista.delete(cb) };
  }

  emitir(evento: string, e: EventoStream): void {
    for (const cb of this.oyentes.get(evento) ?? []) cb(e);
  }

  oyendo(evento: string): number {
    return this.oyentes.get(evento)?.size ?? 0;
  }
}

/** Deja correr las promesas pendientes. */
const vaciar = () => new Promise((r) => setTimeout(r, 0));

const ANA = { id: 'u-ana', name: 'Ana', avatar: null };
const BEA = { id: 'u-bea', name: 'Bea', avatar: 'cod-bea' };

describe('puerto sobre un canal de Stream', () => {
  it('traduce los mensajes al contrato del cómic', () => {
    expect(mensajeDeStream({ id: 'm1', text: 'hola', created_at: '2026-10-09T10:00:00Z', user: BEA })).toEqual({
      id: 'm1',
      texto: 'hola',
      autorId: 'u-bea',
      autorNombre: 'Bea',
      avatar: 'cod-bea',
      fecha: new Date('2026-10-09T10:00:00Z'),
    });
    const sinDatos = mensajeDeStream({});
    expect(sinDatos.autorNombre).toBe('Alguien');
    expect(sinDatos.avatar).toBeNull();
    expect(sinDatos.fecha).toBeInstanceOf(Date);
  });

  it('pide el historial con su límite y vigila el canal una sola vez', async () => {
    const canal = new CanalFalso([
      { id: 'm1', text: 'uno', user: ANA },
      { id: 'm2', text: 'dos', user: BEA },
      { id: 'm3', text: 'tres', user: ANA },
    ]);
    const obtener = vi.fn(() => canal);
    const puerto = puertoStream(obtener);

    const historial = await puerto.historial(2);
    await puerto.enviar('¿qué tal?');
    await puerto.participantes?.();

    expect(historial.map((m) => m.texto)).toEqual(['dos', 'tres']);
    expect(canal.enviados).toEqual(['¿qué tal?']);
    expect(obtener).toHaveBeenCalledTimes(1);
    expect(canal.vigilado).toBe(1);
  });

  it('marca la conversación como leída en el canal', async () => {
    const canal = new CanalFalso();
    await puertoStream(() => canal).marcarLeido?.();
    expect(canal.leido).toBe(1);
  });

  it('los anteriores a uno dado, para cargar más al subir', async () => {
    const canal = new CanalFalso(['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => ({ id, text: id, user: ANA })));
    const puerto = puertoStream(() => canal);
    expect((await puerto.historialAnterior?.('m4', 2))?.map((m) => m.id)).toEqual(['m2', 'm3']);
    expect((await puerto.historialAnterior?.('m2', 5))?.map((m) => m.id)).toEqual(['m1']);
    expect(canal.vigilado).toBe(1);
  });

  it('avisa de los mensajes nuevos, y la baja vale aunque el canal aún no haya llegado', async () => {
    const canal = new CanalFalso();
    const puerto = puertoStream(async () => canal);
    const llegan: MensajeChat[] = [];

    const baja = puerto.alRecibir((m) => llegan.push(m));
    await vaciar();
    canal.emitir('message.new', { message: { id: 'm1', text: 'hola', user: ANA } });
    baja();
    canal.emitir('message.new', { message: { id: 'm2', text: 'adiós', user: ANA } });
    expect(llegan.map((m) => m.id)).toEqual(['m1']);

    // Darse de baja antes de que llegue el canal: no se llega a suscribir.
    const tarde = puertoStream(async () => canal);
    tarde.alRecibir(() => undefined)();
    await vaciar();
    expect(canal.oyendo('message.new')).toBe(0);
  });

  it('los participantes salen de los miembros del canal', async () => {
    const canal = new CanalFalso();
    canal.state.members = { a: { user: ANA }, b: { user_id: 'u-sin-datos' }, c: {} };
    const participantes = await puertoStream(() => canal).participantes?.();
    expect(participantes).toEqual([
      { id: 'u-ana', nombre: 'Ana', avatar: null },
      { id: 'u-sin-datos', nombre: undefined, avatar: null },
    ]);
  });

  it('las altas y bajas del canal son entradas y salidas', async () => {
    const canal = new CanalFalso();
    const eventos: PresenciaChat[] = [];
    const baja = puertoStream(() => canal).alCambiarPresencia?.((e) => eventos.push(e));
    await vaciar();
    canal.emitir('member.added', { member: { user: BEA }, created_at: '2026-10-09T10:00:00Z' });
    canal.emitir('member.removed', { user: ANA });
    canal.emitir('member.removed', {});
    baja?.();
    canal.emitir('member.added', { member: { user: ANA } });

    expect(eventos.map((e) => `${e.tipo} ${e.usuarioId}`)).toEqual(['entra u-bea', 'sale u-ana']);
    expect(eventos[0]).toMatchObject({ nombre: 'Bea', avatar: 'cod-bea', fecha: new Date('2026-10-09T10:00:00Z') });
  });

  it('si vigilar el canal falla, la siguiente llamada lo vuelve a intentar', async () => {
    const canal = new CanalFalso([{ id: 'm1', text: 'hola', user: ANA }]);
    canal.fallos = 1;
    const puerto = puertoStream(() => canal);

    await expect(puerto.historial()).rejects.toThrow('sin red');
    expect((await puerto.historial()).map((m) => m.id)).toEqual(['m1']);
    expect(canal.vigilado).toBe(2);
  });
});
