/**
 * Con quién hablas: la cabecera «Hablando con…».
 */

import { conQuien, interlocutores } from './gente.js';
import type { ParticipanteChat } from './puerto-chat.js';

const gente = (...p: ParticipanteChat[]) => new Map(p.map((x) => [x.id, x]));
const respaldo = (id: string) => `respaldo-${id}`;

describe('con quién hablas', () => {
  it('todos menos yo, por orden alfabético, con su cara o la de respaldo', () => {
    const r = interlocutores(
      gente({ id: 'yo', nombre: 'Yo' }, { id: 'b', nombre: 'Beto', avatar: 'cod-b' }, { id: 'a', nombre: ' Ana ' }, { id: 'c' }),
      'yo',
      respaldo,
    );
    expect(r).toEqual([
      { id: 'c', nombre: 'Alguien', codigo: 'respaldo-c' },
      { id: 'a', nombre: 'Ana', codigo: 'respaldo-a' },
      { id: 'b', nombre: 'Beto', codigo: 'cod-b' },
    ]);
  });

  it('mientras no se sabe quién soy, nadie', () => {
    expect(interlocutores(gente({ id: 'a', nombre: 'Ana' }), null, respaldo)).toEqual([]);
  });

  it('nombra a la gente y resume cuando no caben', () => {
    expect(conQuien([])).toBe('');
    expect(conQuien(['Marta'])).toBe('Marta');
    expect(conQuien(['Marta', 'Luis'])).toBe('Marta y Luis');
    expect(conQuien(['Ana', 'Luis', 'Marta'])).toBe('Ana, Luis y Marta');
    expect(conQuien(['Ana', 'Luis', 'Marta', 'Pepe', 'Rosa'])).toBe('Ana, Luis y 3 más');
  });
});
