import { aCodigo, aleatorio, expresionDeTexto } from '../hilaravatar/hilaravatar.js';
import { Director } from '../escena/director/director.js';
import type { Refinador } from '../escena/interpretacion/interprete.js';
import type { Vineta } from '../escena/modelo.js';
import type { AdjuntoChat, MensajeChat, ParticipanteChat, PresenciaChat, PuertoChat } from './puerto-chat.js';

/**
 * Una viñeta del modo CLÁSICO (una por mensaje): lo caro está congelado.
 *
 * `codigo` y `expresion` se calculan una vez, al recibir el mensaje, y no en
 * cada repintado. De quién es el mensaje no se guarda aquí: depende de quién
 * eres, que lo sabe quien pinta.
 */
export interface VinetaClasica {
  id: string;
  texto: string;
  autorId: string;
  autorNombre: string;
  codigo: string;
  expresion: string;
  fecha: Date;
  adjuntos: AdjuntoChat[];
}

/** Qué acaba de aparecer en la última viñeta de la tira, para animar solo eso. */
export interface Novedades {
  id: string;
  version: number;
  /** Ids de globos, personajes y efectos nuevos; `'*'` = la viñeta entera. */
  que: ReadonlySet<string> | '*';
}

/** Todo lo que necesita quien pinta la conversación. Cada cambio es un objeto nuevo. */
export interface EstadoComic {
  /** Pidiendo el historial. */
  cargando: boolean;
  /** No se pudo cargar el historial: se puede `reintentar()`. */
  error: boolean;
  /** Una viñeta por mensaje: el modo clásico. */
  vinetas: readonly VinetaClasica[];
  /** La conversación compuesta por el director: el modo escena. */
  tira: readonly Vineta[];
  /** Qué es nuevo en la última viñeta de la tira. */
  novedades: Novedades | null;
  /**
   * Quién está en la conversación, por id. Parte de lo que diga el puerto y se
   * completa con los autores de los mensajes y la presencia, así que también
   * funciona con puertos que no implementan `participantes()`.
   */
  gente: ReadonlyMap<string, ParticipanteChat>;
}

export interface OpcionesControlador {
  /**
   * Refinadores asíncronos de la interpretación (p. ej. un modelo de IA). La
   * tira se dibuja al instante con las reglas y se corrige si contestan. Se
   * leen al empezar cada escena (`conectar`, `cerrar`).
   */
  refinadores?: Refinador[];
  /** Para los fallos que no impiden seguir (los participantes no llegan). */
  avisar?: (mensaje: string, error: unknown) => void;
}

/** Cuántos mensajes se piden al puerto si nadie dice otra cosa. */
export const HISTORIAL_POR_DEFECTO = 50;

const VACIO: EstadoComic = {
  cargando: false,
  error: false,
  vinetas: [],
  tira: [],
  novedades: null,
  gente: new Map(),
};

/**
 * La conversación como cómic, sin framework.
 *
 *   const comic = new ControladorComic();
 *   const baja = comic.suscribir((estado) => pintar(estado));
 *   await comic.conectar(puerto);
 *
 * Lleva todo lo que no es pintar: la conexión al puerto (sin perder lo que
 * llega mientras viaja el historial, y sin que una conexión vieja escriba en
 * la nueva), el director con sus refinadores, las viñetas del modo clásico,
 * la gente de la conversación, el avatar de respaldo y qué se anima en cada
 * viñeta. Lo usan el componente Angular de xhatin y el componente DOM de la
 * app móvil: así no pueden contar la conversación de dos maneras.
 *
 * Quien no tenga un `PuertoChat` (la app, que recibe los mensajes de su lado
 * nativo) puede darle los mensajes a mano: `cargarHistorial`, `anadir`,
 * `presencia` y `conocerParticipantes`.
 */
export class ControladorComic {
  /** Los refinadores de la próxima escena. Ver `OpcionesControlador`. */
  refinadores: Refinador[];

  private estadoActual: EstadoComic = VACIO;
  private readonly oyentes = new Set<(estado: EstadoComic) => void>();
  private readonly avisar: (mensaje: string, error: unknown) => void;

  /**
   * El director guarda la memoria de la escena (quién está, dónde, el tono).
   * Uno por conexión: cambiar de conversación empieza una escena nueva.
   */
  private director: Director;
  /** Mensajes ya entregados al director, en orden (para reconstruir). */
  private mensajesEscena: MensajeChat[] = [];

  /** Baja de las suscripciones al puerto. `null` si no hay ninguna viva. */
  private baja: (() => void) | null = null;
  private bajaPresencia: (() => void) | null = null;
  /** El último puerto y límite, para `reintentar()`. */
  private ultima: { puerto: PuertoChat; limite: number } | null = null;

  /**
   * Número de la conexión vigente. `historial()` va a red, así que cambiar de
   * conversación deprisa puede resolver las promesas desordenadas; solo la
   * última puede escribir en el estado.
   */
  private conexion = 0;

  /**
   * Avatares de respaldo ya generados, por autor. `aleatorio(id)` es
   * determinista —misma persona, misma cara siempre— pero recorre las 13
   * categorías del manifest, y en una conversación larga son decenas de
   * mensajes del mismo puñado de autores.
   */
  private readonly respaldo = new Map<string, string>();

  constructor(op: OpcionesControlador = {}) {
    this.refinadores = op.refinadores ?? [];
    this.avisar = op.avisar ?? ((mensaje, error) => console.warn(`[ComicChat] ${mensaje}:`, error));
    this.director = new Director({ refinadores: this.refinadores });
  }

  /** El estado de ahora. Es el mismo objeto hasta que algo cambia. */
  get estado(): EstadoComic {
    return this.estadoActual;
  }

  /** Avisa de cada cambio de estado. Devuelve la baja. */
  suscribir(oyente: (estado: EstadoComic) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /* --------------------------------------------------------- conexión --- */

  /**
   * Conecta con una conversación: deja la anterior, empieza escena nueva y
   * pide el historial. Lo que llegue por `alRecibir` mientras el historial
   * viaja no se pierde: se suscribe antes, y lo que venga repetido se
   * descarta por id.
   */
  async conectar(puerto: PuertoChat, limite = HISTORIAL_POR_DEFECTO): Promise<void> {
    this.desconectar();
    this.ultima = { puerto, limite };

    const conexion = ++this.conexion;
    this.reiniciarEscena();
    this.poner({ cargando: true, error: false, vinetas: [], gente: new Map() });
    this.emitir();

    // Quién está, aunque no haya escrito: en una conversación recién abierta
    // es lo único que dice con quién hablas. Si falla no se pierde nada, los
    // autores de los mensajes también cuentan.
    puerto.participantes?.()
      .then((participantes) => {
        if (conexion === this.conexion) this.conocerParticipantes(participantes);
      })
      .catch((err) => this.avisar('no se han podido leer los participantes', err));

    this.baja = puerto.alRecibir((mensaje) => {
      if (conexion === this.conexion) this.anadir(mensaje);
    });
    // Opcional en el contrato: los puertos antiguos no lo tienen.
    this.bajaPresencia =
      puerto.alCambiarPresencia?.((evento) => {
        if (conexion === this.conexion) this.presencia(evento);
      }) ?? null;

    try {
      const historial = await puerto.historial(limite);
      if (conexion !== this.conexion) return;
      this.poner({ cargando: false });
      this.cargarHistorial(historial);
    } catch {
      if (conexion !== this.conexion) return;
      this.desconectar();
      this.poner({ error: true, cargando: false });
      this.emitir();
    }
  }

  /** Vuelve a conectar con el último puerto, tras un fallo al cargar. */
  reintentar(): Promise<void> {
    return this.ultima ? this.conectar(this.ultima.puerto, this.ultima.limite) : Promise.resolve();
  }

  /** Deja de escuchar al puerto. Lo que hay en pantalla se queda. */
  desconectar(): void {
    this.baja?.();
    this.baja = null;
    this.bajaPresencia?.();
    this.bajaPresencia = null;
  }

  /**
   * Cierra la conversación en pantalla (sesión caída, componente destruido):
   * deja el puerto, vacía el estado y empieza escena nueva. Un historial que
   * aún estuviera viajando ya no escribe.
   */
  cerrar(): void {
    this.desconectar();
    this.conexion++;
    this.ultima = null;
    this.reiniciarEscena();
    this.poner({ ...VACIO, gente: new Map() });
    this.emitir();
  }

  /* --------------------------------------------------------- mensajes --- */

  /**
   * El historial de una vez: se une a lo que ya hubiera llegado, sin
   * repetidos y en orden, y solo la última viñeta entra animada. Con
   * `animar: false` no se anima nada: para mensajes más antiguos que llegan
   * al subir, que no cambian lo último que se ha visto.
   */
  cargarHistorial(historial: readonly MensajeChat[], opciones: { animar?: boolean } = {}): void {
    for (const m of historial) this.conocerAutor(m);
    this.poner({ vinetas: this.unir(historial.map((m) => this.aVineta(m)), this.estadoActual.vinetas) });

    const vistos = new Set(this.mensajesEscena.map((m) => m.id));
    const todos = [...historial.filter((m) => !vistos.has(m.id)), ...this.mensajesEscena];
    this.mensajesEscena = todos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    this.director.reconstruir(this.mensajesEscena);
    this.publicar(opciones.animar === false ? null : '*');
    this.emitir();
  }

  /** Un mensaje que llega. Los repetidos se ignoran. */
  anadir(mensaje: MensajeChat): void {
    this.conocerAutor(mensaje);
    const vinetas = this.estadoActual.vinetas;
    if (!vinetas.some((v) => v.id === mensaje.id)) this.poner({ vinetas: [...vinetas, this.aVineta(mensaje)] });
    this.anadirEscena(mensaje);
    this.emitir();
  }

  /** Alguien entra o sale sin escribir: el cómic lo dibuja. */
  presencia(evento: PresenciaChat): void {
    if (evento.tipo === 'entra') {
      this.conocer({ id: evento.usuarioId, nombre: evento.nombre, avatar: evento.avatar });
    } else if (this.estadoActual.gente.has(evento.usuarioId)) {
      const sin = new Map(this.estadoActual.gente);
      sin.delete(evento.usuarioId);
      this.poner({ gente: sin });
    }
    const antes = this.estadoActual.tira;
    if (this.director.presencia(evento)) this.publicar(this.diferencias(antes));
    this.emitir();
  }

  /** Los miembros de la conversación, según quien los sepa (el puerto). */
  conocerParticipantes(participantes: readonly ParticipanteChat[]): void {
    for (const p of participantes) this.conocer(p, true);
    this.emitir();
  }

  /* ---------------------------------------------------------- ayudas --- */

  /**
   * La cara de alguien sin código de avatar: la determinista de su id.
   * Último eslabón de la cadena de respaldo; los dos primeros (el código del
   * mensaje y el del usuario) los resuelve el puerto.
   */
  avatarDe(autorId: string): string {
    const guardado = this.respaldo.get(autorId);
    if (guardado !== undefined) return guardado;
    const codigo = aCodigo(aleatorio(autorId));
    this.respaldo.set(autorId, codigo);
    return codigo;
  }

  /** Qué anima una viñeta de la tira: solo la última, y solo lo nuevo. */
  novedadesDe(v: Vineta): ReadonlySet<string> | '*' | null {
    const n = this.estadoActual.novedades;
    return n && n.id === v.id && n.version === v.version ? n.que : null;
  }

  /** Adjuntos que no son imagen (la imagen ya se ve dentro de la viñeta). */
  adjuntosDe(v: Vineta): AdjuntoChat[] {
    const ids = new Set(v.mensajes);
    return this.mensajesEscena
      .filter((m) => ids.has(m.id))
      .flatMap((m) => m.adjuntos ?? [])
      .filter((a) => a.tipo !== 'imagen');
  }

  /* ----------------------------------------------------------- privado --- */

  private poner(parcial: Partial<EstadoComic>): void {
    this.estadoActual = { ...this.estadoActual, ...parcial };
  }

  private emitir(): void {
    for (const oyente of this.oyentes) oyente(this.estadoActual);
  }

  /**
   * Apunta a alguien en la conversación. Lo que dice el puerto (`manda`) pisa
   * lo que ya se sabía; lo que se deduce de un mensaje solo rellena huecos,
   * para que un «Alguien» de un mensaje sin nombre no borre el nombre de verdad.
   */
  private conocer(p: ParticipanteChat, manda = false): void {
    if (!p.id) return;
    const gente = this.estadoActual.gente;
    const antes = gente.get(p.id);
    const nuevo: ParticipanteChat = manda
      ? { id: p.id, nombre: p.nombre ?? antes?.nombre, avatar: p.avatar ?? antes?.avatar }
      : { id: p.id, nombre: antes?.nombre ?? p.nombre, avatar: antes?.avatar ?? p.avatar };
    if (antes && antes.nombre === nuevo.nombre && antes.avatar === nuevo.avatar) return;
    this.poner({ gente: new Map(gente).set(p.id, nuevo) });
  }

  private conocerAutor(m: MensajeChat): void {
    this.conocer({ id: m.autorId, nombre: m.autorNombre, avatar: m.avatar });
  }

  /** Historial + lo que se coló mientras viajaba, sin repetidos y en orden. */
  private unir(historial: VinetaClasica[], recibidas: readonly VinetaClasica[]): VinetaClasica[] {
    const vistas = new Set(historial.map((v) => v.id));
    const extra = recibidas.filter((v) => !vistas.has(v.id));
    return [...historial, ...extra].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }

  private aVineta(mensaje: MensajeChat): VinetaClasica {
    const adjuntos = mensaje.adjuntos ?? [];
    const texto = mensaje.texto?.trim() || this.describir(adjuntos);
    return {
      id: mensaje.id,
      texto,
      autorId: mensaje.autorId,
      autorNombre: mensaje.autorNombre,
      codigo: mensaje.avatar ?? this.avatarDe(mensaje.autorId),
      expresion: mensaje.expresion ?? expresionDeTexto(texto),
      fecha: mensaje.fecha,
      adjuntos,
    };
  }

  /** Un mensaje sin texto: el bocadillo cuenta lo que la viñeta no dibuja. */
  private describir(adjuntos: readonly AdjuntoChat[]): string {
    if (!adjuntos.length) return '…';
    const primero = adjuntos[0]!;
    const resto = adjuntos.length - 1;
    const que = { imagen: 'una imagen', video: 'un video', archivo: 'un archivo' }[primero.tipo];
    return resto > 0 ? `ha enviado ${que} y ${resto} cosa${resto > 1 ? 's' : ''} mas` : `ha enviado ${que}`;
  }

  private reiniciarEscena(): void {
    this.director = new Director({ refinadores: this.refinadores });
    this.mensajesEscena = [];
    this.poner({ tira: [], novedades: null });
  }

  private anadirEscena(mensaje: MensajeChat): void {
    if (this.director.yaProcesado(mensaje.id)) return;
    const antes = this.estadoActual.tira;
    this.mensajesEscena.push(mensaje);

    // Un mensaje que llega desordenado (red lenta, historial que se solapa)
    // obliga a recomponer: el director es determinista, sale lo mismo que si
    // hubiera llegado en su sitio.
    const ultima = this.director.ultimaFecha;
    if (ultima && mensaje.fecha.getTime() < ultima.getTime()) {
      this.mensajesEscena.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      this.director.reconstruir(this.mensajesEscena);
      this.publicar(null);
      return;
    }
    this.director.procesar(mensaje);
    this.publicar(this.diferencias(antes));

    const director = this.director;
    if (director.refinadores.length) {
      void director.refinar(mensaje.id).then((cambio) => {
        // Solo si seguimos en la misma conversación.
        if (cambio && director === this.director) {
          this.publicar(null);
          this.emitir();
        }
      });
    }
  }

  /** Qué es nuevo en la última viñeta respecto a cómo estaba antes. */
  private diferencias(antes: readonly Vineta[]): ReadonlySet<string> | '*' {
    const ahora = this.director.vinetas;
    const ultima = ahora[ahora.length - 1];
    if (!ultima) return '*';
    const previa = antes.find((v) => v.id === ultima.id);
    if (!previa) return '*';
    const nuevos = new Set<string>();
    for (const g of ultima.globos) if (!previa.globos.some((x) => x.id === g.id)) nuevos.add(g.id);
    for (const p of ultima.personajes) if (!previa.personajes.some((x) => x.id === p.id)) nuevos.add(p.id);
    for (const e of ultima.efectos)
      if (!previa.efectos.some((x) => x.tipo === e.tipo && x.sobre === e.sobre)) nuevos.add(`fx:${e.tipo}:${e.sobre ?? ''}`);
    return nuevos;
  }

  private publicar(que: ReadonlySet<string> | '*' | null): void {
    const tira = [...this.director.vinetas];
    const ultima = tira[tira.length - 1];
    this.poner({ tira, novedades: ultima && que ? { id: ultima.id, version: ultima.version, que } : null });
  }
}
