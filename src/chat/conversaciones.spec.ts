/**
 * La lista de conversaciones: resumir un canal.
 */

import { grupoDeCanal, nombreDeGente, resumenDe, sinBloqueados } from './conversaciones.js';
import type { CanalResumible } from './conversaciones.js';

const canal = (
  miembros: { id: string; name?: string; avatar?: string | null }[],
  ultimo?: { text?: string; user?: string; fecha?: string },
  data: object | null = {},
  noLeidos = 0,
  id = '!members-abc',
): CanalResumible => ({
  id,
  data,
  countUnread: () => noLeidos,
  state: { members: Object.fromEntries(miembros.map((u) => [u.id, { user: u, user_id: u.id }])) },
  lastMessage: () =>
    ultimo && {
      text: ultimo.text,
      user: ultimo.user ? { id: ultimo.user } : null,
      created_at: ultimo.fecha ? new Date(ultimo.fecha) : undefined,
    },
});

const G1 = '11111111-1111-1111-1111-111111111111';

describe('lista de conversaciones', () => {
  it('un privado se llama como la otra persona, y lo mío lleva «Tú:»', () => {
    expect(
      resumenDe(canal([{ id: 'yo', name: 'Yo' }, { id: 'otro', name: 'Ana', avatar: 'v1|ana' }], { text: ' hola ', user: 'yo', fecha: '2026-10-09T10:00:00Z' }, {}, 2), 'yo'),
    ).toEqual({
      id: '!members-abc',
      titulo: 'Ana',
      ultimo: 'Tú: hola',
      ultimoDe: 'yo',
      fecha: '2026-10-09T10:00:00.000Z',
      noLeidos: 2,
      otros: ['otro'],
      avatares: { otro: 'v1|ana' },
      grupo: null,
    });
  });

  it('el chat de un grupo lleva su nombre y su uuid', () => {
    const r = resumenDe(canal([{ id: 'yo' }, { id: 'a' }], { user: 'a' }, { name: 'Cacharreo Retro' }, 0, 'group-' + G1), 'yo');
    expect(r?.titulo).toBe('Cacharreo Retro');
    expect(r?.grupo).toBe(G1);
    expect(r?.ultimo).toBe('Ha enviado un adjunto');
    expect(r?.avatares).toEqual({ a: null });
  });

  it('un mensaje sin texto es un adjunto, y alguien sin nombre es «Alguien»', () => {
    const r = resumenDe(canal([{ id: 'yo' }, { id: 'a' }], { user: 'a' }), 'yo');
    expect(r?.titulo).toBe('Alguien');
    expect(r?.ultimo).toBe('Ha enviado un adjunto');
    expect(resumenDe(canal([{ id: 'yo' }, { id: 'a' }], undefined, { name: 'Redacción' }), 'yo')?.ultimo).toBeNull();
  });

  it('sin lo de quien he bloqueado: fuera sus privados, y en los grupos sin su último mensaje', () => {
    const privado = resumenDe(canal([{ id: 'yo' }, { id: 'malo', name: 'Malo' }], { text: 'eh', user: 'malo' }), 'yo')!;
    const conOtros = resumenDe(canal([{ id: 'yo' }, { id: 'malo' }, { id: 'ana' }], { text: 'hola', user: 'ana' }, {}, 0, '!members-tres'), 'yo')!;
    const grupo = resumenDe(canal([{ id: 'yo' }, { id: 'malo' }], { text: 'insulto', user: 'malo' }, { name: 'Club' }, 0, 'group-' + G1), 'yo')!;

    const quedan = sinBloqueados([privado, conOtros, grupo], new Set(['malo']));

    expect(quedan.map((c) => c.id)).toEqual(['!members-tres', 'group-' + G1]);
    expect(quedan[0]!.ultimo).toBe('hola');
    expect(quedan[1]!.ultimo).toBe('Mensaje oculto');
    expect(sinBloqueados([privado], new Set())).toEqual([privado]);
  });

  it('nombra a la gente, y sin nadie más es «Solo tú»', () => {
    expect(nombreDeGente([])).toBe('Solo tú');
    expect(nombreDeGente(['Ana', 'Bea'])).toBe('Ana y Bea');
    expect(nombreDeGente(['Ana', 'Bea', 'Carla', 'Dani', 'Eva'])).toBe('Ana, Bea y 3 más');
    expect(grupoDeCanal('!members-x')).toBeNull();
    expect(resumenDe({ ...canal([]), id: undefined }, 'yo')).toBeNull();
  });
});
