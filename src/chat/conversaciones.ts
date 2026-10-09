import { conQuien } from './gente.js';

/**
 * La lista de conversaciones de Xhatín: mis grupos, cada uno con su chat
 * común, y mis chats con otras personas. La pintan igual la web (portada de
 * xhatin) y la app (pestaña Xhatín).
 */

/** Una conversación en la lista: lo justo para pintarla. */
export interface ResumenConversacion {
  /** Id del canal `messaging` de Stream. */
  id: string;
  titulo: string;
  /** El último mensaje, ya con «Tú: » si es mío. */
  ultimo: string | null;
  /** Fecha del último mensaje (ISO). */
  fecha: string | null;
  /** Mensajes sin leer. */
  noLeidos: number;
  /** Ids de los demás miembros (todos menos yo). */
  otros: string[];
  /** El código HilarAvatar de cada uno de los demás, por id (null si no tiene). */
  avatares: Record<string, string | null>;
  /** Si es el chat común de un grupo de Diario Hilario (`group-<uuid>`), su uuid. */
  grupo: string | null;
}

/** Lo que se usa de un canal para resumirlo (`Channel` de `stream-chat`). */
export interface CanalResumible {
  id?: string;
  /** Datos del canal; el nombre, si lo tiene, es un dato propio. */
  data?: object | null;
  state: {
    members: Record<string, { user?: { id?: string; name?: string; avatar?: string | null } | null; user_id?: string }>;
  };
  lastMessage(): { text?: string; created_at?: string | Date; user?: { id?: string } | null } | undefined;
  countUnread(): number;
}

/**
 * Los eventos de Stream que cambian la lista: un mensaje nuevo, un canal que
 * llega o se va, uno que se lee. Quien pinte la lista la vuelve a pedir con
 * ellos (mejor con un respiro: un mensaje nuevo trae dos).
 */
export const EVENTOS_DE_LA_LISTA: ReadonlySet<string> = new Set([
  'message.new',
  'notification.message_new',
  'notification.added_to_channel',
  'notification.removed_from_channel',
  'notification.mark_read',
  'channel.deleted',
  'channel.updated',
  'channel.hidden',
  'channel.visible',
]);

/** El chat común de cada grupo es el canal `group-<uuid>`. */
const PREFIJO_GRUPO = 'group-';

/** El uuid del grupo si el canal es el chat común de uno; si no, `null`. */
export function grupoDeCanal(id: string): string | null {
  return id.startsWith(PREFIJO_GRUPO) ? id.slice(PREFIJO_GRUPO.length) : null;
}

/** Como la cabecera «Hablando con…» (`conQuien`); sin nadie más, «Solo tú». */
export function nombreDeGente(nombres: readonly string[]): string {
  return conQuien(nombres) || 'Solo tú';
}

/**
 * El resumen de un canal visto por `yo`. Si el canal no tiene nombre (los
 * privados no lo tienen), se llama como la gente con la que hablas.
 */
export function resumenDe(canal: CanalResumible, yo: string): ResumenConversacion | null {
  if (!canal.id) return null;
  const demas = Object.values(canal.state.members).filter((m) => (m.user?.id ?? m.user_id) !== yo);
  const datos = canal.data;
  const nombre = datos && 'name' in datos && typeof datos.name === 'string' ? datos.name.trim() : '';
  const ultimo = canal.lastMessage();
  const conId = demas.flatMap((m) => {
    const id = m.user?.id ?? m.user_id;
    return id ? [{ id, avatar: m.user?.avatar ?? null }] : [];
  });
  const texto = ultimo ? ultimo.text?.trim() || 'Ha enviado un adjunto' : null;
  return {
    id: canal.id,
    titulo: nombre || nombreDeGente(demas.map((m) => m.user?.name || 'Alguien')),
    ultimo: texto && ultimo?.user?.id === yo ? `Tú: ${texto}` : texto,
    fecha: ultimo?.created_at ? new Date(ultimo.created_at).toISOString() : null,
    noLeidos: canal.countUnread(),
    otros: conId.map((m) => m.id),
    avatares: Object.fromEntries(conId.map((m) => [m.id, m.avatar])),
    grupo: grupoDeCanal(canal.id),
  };
}

/** Lo mínimo de un grupo para la lista. */
export interface GrupoDeLista {
  id: string;
  name: string;
}

/** Un grupo en Xhatín, con su chat común si ya existe en Stream. */
export interface GrupoConChat<G extends GrupoDeLista = GrupoDeLista> {
  grupo: G;
  chat: ResumenConversacion | null;
}

/**
 * Junta mis grupos con mis conversaciones: cada grupo lleva su chat común (el
 * canal `group-<uuid>`) si ya existe, y esos chats salen de las conversaciones
 * para no verlos dos veces. Los grupos con actividad, arriba; los demás, por
 * orden alfabético.
 */
export function juntarGruposYConversaciones<G extends GrupoDeLista>(
  grupos: readonly G[],
  conversaciones: readonly ResumenConversacion[],
): { grupos: GrupoConChat<G>[]; conversaciones: ResumenConversacion[] } {
  const porGrupo = new Map(conversaciones.flatMap((c) => (c.grupo ? [[c.grupo.toLowerCase(), c] as const] : [])));
  const conChat = grupos.map((grupo) => ({ grupo, chat: porGrupo.get(grupo.id.toLowerCase()) ?? null }));
  const usados = new Set(conChat.flatMap((g) => (g.chat ? [g.chat.id] : [])));
  const fecha = (g: GrupoConChat<G>) => g.chat?.fecha ?? '';
  return {
    grupos: [...conChat].sort((a, b) => fecha(b).localeCompare(fecha(a)) || a.grupo.name.localeCompare(b.grupo.name, 'es')),
    conversaciones: conversaciones.filter((c) => !usados.has(c.id)),
  };
}
