/**
 * La lista de conversaciones: resumir un canal y juntar grupos y chats.
 */

import { grupoDeCanal, juntarGruposYConversaciones, nombreDeGente, resumenDe } from './conversaciones.js';
import type { CanalResumible, ResumenConversacion } from './conversaciones.js';

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
const G2 = '22222222-2222-2222-2222-222222222222';

describe('lista de conversaciones', () => {
  it('un privado se llama como la otra persona, y lo mío lleva «Tú:»', () => {
    expect(
      resumenDe(canal([{ id: 'yo', name: 'Yo' }, { id: 'otro', name: 'Ana', avatar: 'v1|ana' }], { text: ' hola ', user: 'yo', fecha: '2026-10-09T10:00:00Z' }, {}, 2), 'yo'),
    ).toEqual({
      id: '!members-abc',
      titulo: 'Ana',
      ultimo: 'Tú: hola',
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

  it('nombra a la gente, y sin nadie más es «Solo tú»', () => {
    expect(nombreDeGente([])).toBe('Solo tú');
    expect(nombreDeGente(['Ana', 'Bea'])).toBe('Ana y Bea');
    expect(nombreDeGente(['Ana', 'Bea', 'Carla', 'Dani', 'Eva'])).toBe('Ana, Bea y 3 más');
    expect(grupoDeCanal('!members-x')).toBeNull();
    expect(resumenDe({ ...canal([]), id: undefined }, 'yo')).toBeNull();
  });
});

describe('grupos y conversaciones', () => {
  const grupo = (id: string, name: string) => ({ id, name });
  const chat = (id: string, fecha: string | null, grupoId: string | null = null): ResumenConversacion => ({
    id,
    titulo: id,
    ultimo: 'hola',
    fecha,
    noLeidos: 2,
    otros: [],
    avatares: {},
    grupo: grupoId,
  });

  it('cada grupo lleva su chat común, con actividad arriba, y ese chat no se repite', () => {
    const r = juntarGruposYConversaciones(
      [grupo(G2, 'Alfa'), grupo(G1, 'Bravo')],
      [chat('group-' + G1, '2026-10-09T10:00:00Z', G1), chat('privado', null)],
    );
    expect(r.grupos.map((g) => [g.grupo.name, g.chat?.id ?? null])).toEqual([
      ['Bravo', 'group-' + G1],
      ['Alfa', null],
    ]);
    expect(r.conversaciones.map((c) => c.id)).toEqual(['privado']);
  });

  it('el chat de un grupo que no es mío se queda en las conversaciones', () => {
    const r = juntarGruposYConversaciones([grupo(G1, 'Bravo')], [chat('group-' + G2, null, G2)]);
    expect(r.conversaciones.map((c) => c.id)).toEqual(['group-' + G2]);
  });
});
