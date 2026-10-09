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
  /** Lo rellena `watch()`: entre otras cosas, los miembros del canal. */
  state?: { members?: Record<string, MiembroStream> };
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
}

export interface EventoStream {
  message?: MensajeStream;
  member?: MiembroStream | null;
  user?: UsuarioStream | null;
  created_at?: string | Date;
}

/** Un mensaje de Stream, en el contrato del cómic. */
export function mensajeDeStream(m: MensajeStream): MensajeChat {
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
  };
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

    marcarLeido: async () => {
      const c = await vigilado();
      await c.markRead?.();
    },

    enviar: async (texto: string) => {
      const c = await vigilado();
      await c.sendMessage({ text: texto });
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
