import type { ParticipanteChat } from './puerto-chat.js';

/**
 * Con quién hablas: lo que enseña la cabecera «Hablando con…» de la web y de
 * la app, para que las dos lo cuenten igual.
 */

/** Cuántas caras caben en la cabecera antes de resumir con «y N más». */
export const CARAS_EN_CABECERA = 3;

/** Alguien con quien hablas, listo para la cabecera. */
export interface Interlocutor {
  id: string;
  nombre: string;
  /** Código HilarAvatar: el suyo o, si no tiene, el de respaldo. */
  codigo: string;
}

/**
 * Todos menos yo, por orden alfabético, con su cara.
 *
 * Vacío mientras no se sabe quién soy: enseñar a todos entretanto pondría mi
 * propio nombre en la cabecera durante un instante, y eso confunde más que
 * esperar.
 *
 * `avatarDe` da la cara de quien no tiene código (en el controlador,
 * `comic.avatarDe`).
 */
export function interlocutores(
  gente: ReadonlyMap<string, ParticipanteChat>,
  yo: string | null,
  avatarDe: (id: string) => string,
): Interlocutor[] {
  if (yo === null) return [];
  return [...gente.values()]
    .filter((p) => p.id !== yo)
    .map((p) => ({ id: p.id, nombre: p.nombre?.trim() || 'Alguien', codigo: p.avatar ?? avatarDe(p.id) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** «Marta», «Marta y Luis», «Ana, Luis y Marta», «Ana, Luis y 3 más». Vacío si no hay nadie. */
export function conQuien(nombres: readonly string[], caben = CARAS_EN_CABECERA): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  if (nombres.length <= caben) return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `${nombres[0]}, ${nombres[1]} y ${nombres.length - 2} más`;
}
