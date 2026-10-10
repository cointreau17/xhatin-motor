import type { EscrituraChat, ParticipanteChat } from './puerto-chat.js';

/**
 * Lo que dura «está escribiendo» sin noticias. Stream ya avisa a los 7 s de
 * que alguien ha parado; esto es por si ese aviso se pierde.
 */
export const ESCRIBIENDO_MS = 9000;

/**
 * Quién está escribiendo, a partir de los avisos del puerto (`alEscribir`):
 * entra con el aviso y sale con el de parar, al enviar o a los
 * `ESCRIBIENDO_MS` sin noticias. Lo usan `ControladorComic` y la parte nativa
 * de la app, que lleva los mensajes fuera de la WebView: así las dos cuentan
 * lo mismo.
 */
export class Escribiendo {
  private actual: readonly ParticipanteChat[] = [];
  /** Cuándo deja de contar cada uno, por id. */
  private readonly caduca = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * @param alCaducar Alguien ha dejado de contar por tiempo: hay que volver a
   * leer `lista`.
   */
  constructor(
    private readonly alCaducar: () => void,
    private readonly ms = ESCRIBIENDO_MS,
  ) {}

  /** Quién escribe ahora. Es otro array solo cuando cambia. */
  get lista(): readonly ParticipanteChat[] {
    return this.actual;
  }

  /**
   * Un aviso del puerto. Si no trae nombre o cara, se toman de `conocido`
   * (lo que ya se sabe de esa persona). Dice si ha cambiado la lista.
   */
  avisa(evento: EscrituraChat, conocido?: ParticipanteChat): boolean {
    const id = evento.usuarioId;
    if (!id) return false;
    if (!evento.escribe) return this.quitar(id);
    clearTimeout(this.caduca.get(id));
    this.caduca.set(
      id,
      setTimeout(() => {
        if (this.quitar(id)) this.alCaducar();
      }, this.ms),
    );
    const quien: ParticipanteChat = {
      id,
      nombre: evento.nombre ?? conocido?.nombre,
      avatar: evento.avatar ?? conocido?.avatar,
    };
    const ya = this.actual.find((p) => p.id === id);
    if (ya && ya.nombre === quien.nombre && ya.avatar === quien.avatar) return false;
    this.actual = ya ? this.actual.map((p) => (p.id === id ? quien : p)) : [...this.actual, quien];
    return true;
  }

  /** Alguien deja de contar: ha enviado, o se le ha bloqueado. Dice si estaba. */
  quitar(id: string): boolean {
    clearTimeout(this.caduca.get(id));
    this.caduca.delete(id);
    if (!this.actual.some((p) => p.id === id)) return false;
    this.actual = this.actual.filter((p) => p.id !== id);
    return true;
  }

  /** Ya no escribe nadie: se ha cerrado la conversación. Dice si había alguien. */
  vaciar(): boolean {
    for (const t of this.caduca.values()) clearTimeout(t);
    this.caduca.clear();
    if (!this.actual.length) return false;
    this.actual = [];
    return true;
  }
}
