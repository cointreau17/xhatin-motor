import type { ResumenConversacion } from './conversaciones.js';

/**
 * Qué conversaciones se ven según su entorno.
 *
 * Desarrollo y producción comparten la app de Stream, así que la lista de
 * cada uno trae también las conversaciones nacidas en el otro. Para
 * separarlas se pregunta al API qué usuarios y grupos conoce
 * (`GET /xhatin/existen`): son de su entorno las conversaciones con todos
 * sus miembros, y su grupo si lo tienen, entre los que conoce. Cada cliente
 * solo puede preguntar a su API (la sesión es de su Auth0), así que lo que
 * es del otro entorno se deduce por exclusión.
 */

export type ConversacionesQueSeVen = 'produccion' | 'desarrollo' | 'todas';

/** Lo que el API conoce, de lo que se le ha preguntado. */
export interface Existen {
  usuarios: string[];
  grupos: string[];
}

/** El valor de la variable, o `porDefecto` si falta o no se entiende. */
export function conversacionesDe(
  valor: string | null | undefined,
  porDefecto: ConversacionesQueSeVen = 'produccion',
): ConversacionesQueSeVen {
  const v = valor?.trim().toLowerCase();
  return v === 'produccion' || v === 'desarrollo' || v === 'todas' ? v : porDefecto;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Las conversaciones del entorno del API: todos sus miembros, y su grupo si
 * es de grupo, están entre los que conoce. Un id que no es un uuid no es un
 * usuario de Diario Hilario: fuera.
 */
export function deEsteEntorno(conversaciones: readonly ResumenConversacion[], existen: Existen): ResumenConversacion[] {
  const usuarios = new Set(existen.usuarios.map((id) => id.toLowerCase()));
  const grupos = new Set(existen.grupos.map((id) => id.toLowerCase()));
  return conversaciones.filter(
    (c) =>
      c.otros.every((id) => usuarios.has(id.toLowerCase())) &&
      (c.grupo === null || grupos.has(c.grupo.toLowerCase())),
  );
}

/**
 * Las que se enseñan según `modo`, sabiendo de qué entorno es el API al que
 * se ha preguntado (`entornoDelApi`):
 * - el mismo entorno que el API: las suyas (`deEsteEntorno`);
 * - el otro: las demás, las que tienen a alguien o un grupo que el API no
 *   conoce;
 * - `todas`: sin filtro.
 *
 * La app habla siempre con producción; la web, con el API de su entorno.
 */
export function filtrarPorEntorno(
  conversaciones: readonly ResumenConversacion[],
  existen: Existen,
  modo: ConversacionesQueSeVen,
  entornoDelApi: Exclude<ConversacionesQueSeVen, 'todas'> = 'produccion',
): ResumenConversacion[] {
  if (modo === 'todas') return [...conversaciones];
  const aqui = new Set(deEsteEntorno(conversaciones, existen));
  return conversaciones.filter((c) => (modo === entornoDelApi ? aqui.has(c) : !aqui.has(c)));
}

/** Lo que hay que preguntar al API para filtrar: solo uuids, sin repetir. */
export function porComprobar(conversaciones: readonly ResumenConversacion[]): Existen {
  const unicos = (ids: string[]) => [...new Set(ids.map((id) => id.toLowerCase()))].filter((id) => UUID.test(id));
  return {
    usuarios: unicos(conversaciones.flatMap((c) => c.otros)),
    grupos: unicos(conversaciones.flatMap((c) => (c.grupo ? [c.grupo] : []))),
  };
}
