import type { LecturaIA } from '../escena/modelo.js';
import type { MensajeChat, ParticipanteChat, PuertoChat } from './puerto-chat.js';

/**
 * Un canal de Stream como `PuertoChat`: la traducción que comparten la web y
 * la app.
 *
 * Aquí no se importa `stream-chat` ni se abre ninguna conexión: se declara la
 * forma mínima de canal que hace falta y quien tiene el cliente pone el
 * canal. En la web es el shell, que publica su cliente ya conectado en
 * DhPortero (un segundo websocket por pestaña duplicaría cada mensaje); en la
 * app, la conexión única de su parte nativa.
 */

/** Lo que se usa de un canal de Stream (`Channel` de `stream-chat`). */
export interface CanalStream {
  watch(): Promise<unknown>;
  query(opciones: { messages: { limit: number; id_lt?: string } }): Promise<{ messages?: MensajeStream[] }>;
  sendMessage(mensaje: { text: string }): Promise<unknown>;
  on(evento: string, cb: (e: EventoStream) => void): { unsubscribe(): void };
  /** Opcional: los puertos de solo lectura no lo necesitan. */
  markRead?(): Promise<unknown>;
  /** «Estoy escribiendo»: Stream manda `typing.start` como mucho cada 2 s. */
  keystroke?(): Promise<unknown>;
  /** «Ya no»: `typing.stop`. */
  stopTyping?(): Promise<unknown>;
  /** El cliente del canal: Stream devuelve también los avisos de escribir propios. */
  getClient?(): { userID?: string };
  /** Lo rellena `watch()`: entre otras cosas, los miembros del canal. */
  state?: { members?: Record<string, MiembroStream> };
  /**
   * Los datos del canal, también de `watch()`: el nombre (`name`) en los de
   * grupo. Sin declarar sus campos: cada versión de `stream-chat` los tipa
   * a su manera.
   */
  data?: { readonly [campo: string]: unknown } | null;
}

export interface UsuarioStream {
  id?: string;
  name?: string;
  avatar?: string | null;
}

export interface MiembroStream {
  user?: UsuarioStream | null;
  user_id?: string;
}

export interface MensajeStream {
  id?: string;
  text?: string;
  created_at?: string | Date;
  user?: UsuarioStream | null;
  /** La lectura de la IA que guarda dhcore en el mensaje (campo propio). */
  xhatin_lectura?: unknown;
}

export interface EventoStream {
  message?: MensajeStream;
  member?: MiembroStream | null;
  user?: UsuarioStream | null;
  created_at?: string | Date;
}

/** Un mensaje de Stream, en el contrato del cómic. */
export function mensajeDeStream(m: MensajeStream): MensajeChat {
  const lectura = lecturaDe(m.xhatin_lectura);
  return {
    id: m.id ?? '',
    texto: m.text ?? '',
    autorId: m.user?.id ?? '',
    autorNombre: m.user?.name ?? 'Alguien',
    // El código HilarAvatar viajará aquí cuando se estampe al enviar. `null`
    // es un valor previsto en el contrato: el cómic cae entonces al avatar de
    // respaldo, que es determinista por autor.
    avatar: m.user?.avatar ?? null,
    fecha: m.created_at ? new Date(m.created_at) : new Date(),
    ...(lectura ? { lectura } : {}),
  };
}

/**
 * La lectura de la IA guardada en un mensaje, si tiene la forma esperada. Que
 * sus valores existan en el catálogo lo comprueba el director al usarla.
 */
function lecturaDe(x: unknown): LecturaIA | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const l = x as Record<string, unknown>;
  const textos = ['emocion', 'globo', 'tono', 'intencion'].every((k) => typeof l[k] === 'string');
  return textos && typeof l['intensidad'] === 'number' ? (l as unknown as LecturaIA) : undefined;
}

/**
 * Traduce un canal de Stream al contrato que espera el cómic.
 *
 *   puertoStream(() => cliente.channel('messaging', { members: [yo, otro] }))
 *
 * `canal` se llama una sola vez, la primera vez que hace falta, y el canal se
 * vigila (`watch()`) también una sola vez: va a la red y lo comparten todas
 * las funciones del puerto. Si falla, la siguiente llamada lo vuelve a
 * intentar (`reintentar()` del controlador sirve de algo).
 */
export function puertoStream(canal: () => CanalStream | Promise<CanalStream>): PuertoChat {
  let pendiente: Promise<CanalStream> | null = null;

  const vigilado = (): Promise<CanalStream> => {
    if (!pendiente) {
      const intento = (async () => {
        const c = await canal();
        await c.watch();
        return c;
      })();
      pendiente = intento;
      intento.catch(() => {
        if (pendiente === intento) pendiente = null;
      });
    }
    return pendiente;
  };

  return {
    historial: async (limite = 50) => {
      const c = await vigilado();
      const respuesta = await c.query({ messages: { limit: limite } });
      return (respuesta.messages ?? []).map(mensajeDeStream);
    },

    // Los anteriores al más antiguo que se tiene: Stream pagina por id.
    historialAnterior: async (antesDe, limite = 50) => {
      const c = await vigilado();
      const respuesta = await c.query({ messages: { limit: limite, id_lt: antesDe } });
      return (respuesta.messages ?? []).map(mensajeDeStream);
    },

    // `alRecibir` es síncrono por contrato pero el canal tarda en resolver, así
    // que la suscripción se engancha cuando llega. La función de baja se
    // devuelve de inmediato y vale en los dos momentos.
    alRecibir: (cb) => {
      let baja: (() => void) | null = null;
      let cancelado = false;

      vigilado()
        .then((c) => {
          if (cancelado) return;
          const { unsubscribe } = c.on('message.new', (evento) => {
            if (evento.message) cb(mensajeDeStream(evento.message));
          });
          baja = () => unsubscribe();
        })
        // El fallo lo cuenta `historial()`, que va por el mismo canal.
        .catch(() => undefined);

      return () => {
        cancelado = true;
        baja?.();
      };
    },

    // Como `alRecibir`: los mensajes que cambian (dhcore les guarda la lectura
    // de la IA después de enviarlos).
    alActualizar: (cb) => {
      let baja: (() => void) | null = null;
      let cancelado = false;

      vigilado()
        .then((c) => {
          if (cancelado) return;
          const { unsubscribe } = c.on('message.updated', (evento) => {
            if (evento.message) cb(mensajeDeStream(evento.message));
          });
          baja = () => unsubscribe();
        })
        .catch(() => undefined);

      return () => {
        cancelado = true;
        baja?.();
      };
    },

    marcarLeido: async () => {
      const c = await vigilado();
      await c.markRead?.();
    },

    enviar: async (texto: string) => {
      const c = await vigilado();
      await c.sendMessage({ text: texto });
      // Lo escrito ya está enviado: deja de salir «escribiendo» a los demás.
      void c.stopTyping?.().catch(() => undefined);
    },

    escribiendo: () => {
      void vigilado()
        .then((c) => c.keystroke?.())
        .catch(() => undefined);
    },

    // Quien empieza y deja de escribir. Stream da por terminado a quien lleva
    // 7 s sin teclear (manda él mismo el `typing.stop`).
    alEscribir: (cb) => {
      const bajas: Array<() => void> = [];
      let cancelado = false;

      vigilado()
        .then((c) => {
          if (cancelado) return;
          // Lo que escribo yo no sale como «escribiendo»: ya lo veo en la caja.
          const yo = c.getClient?.().userID;
          for (const [evento, escribe] of [['typing.start', true], ['typing.stop', false]] as const) {
            const { unsubscribe } = c.on(evento, (e) => {
              const id = e.user?.id;
              if (id && id !== yo) cb({ usuarioId: id, nombre: e.user?.name, avatar: e.user?.avatar ?? null, escribe });
            });
            bajas.push(unsubscribe);
          }
        })
        .catch(() => undefined);

      return () => {
        cancelado = true;
        for (const b of bajas) b();
      };
    },

    // Los miembros ya vienen con el canal: `watch()` los deja en su estado,
    // así que no cuesta otra petición.
    participantes: async () => {
      const c = await vigilado();
      return Object.values(c.state?.members ?? {}).flatMap((m): ParticipanteChat[] => {
        const id = m.user?.id ?? m.user_id;
        return id ? [{ id, nombre: m.user?.name, avatar: m.user?.avatar ?? null }] : [];
      });
    },

    // dhcore llama a los chats de grupo como el grupo; los privados no tienen nombre.
    titulo: async () => {
      const nombre = (await vigilado()).data?.['name'];
      return typeof nombre === 'string' && nombre.trim() ? nombre.trim() : null;
    },

    // Altas y bajas de miembros del canal: alguien entra o sale del grupo.
    // (No se usa `user.watching.*`: salta cada vez que alguien cambia de
    // pestaña y llenaría la tira de gente entrando y saliendo.)
    alCambiarPresencia: (cb) => {
      const bajas: Array<() => void> = [];
      let cancelado = false;

      vigilado()
        .then((c) => {
          if (cancelado) return;
          const suscribir = (evento: string, tipo: 'entra' | 'sale') => {
            const { unsubscribe } = c.on(evento, (e) => {
              const u = e.member?.user ?? e.user;
              const id = u?.id ?? e.member?.user_id;
              if (!id) return;
              cb({
                tipo,
                usuarioId: id,
                nombre: u?.name,
                avatar: u?.avatar ?? null,
                fecha: e.created_at ? new Date(e.created_at) : new Date(),
              });
            });
            bajas.push(unsubscribe);
          };
          suscribir('member.added', 'entra');
          suscribir('member.removed', 'sale');
        })
        .catch(() => undefined);

      return () => {
        cancelado = true;
        for (const b of bajas) b();
      };
    },
  };
}
