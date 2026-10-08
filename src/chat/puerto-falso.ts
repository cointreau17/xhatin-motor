import type { MensajeChat, ParticipanteChat, PresenciaChat, PuertoChat } from './puerto-chat.js';

/**
 * Un puerto de mentira, en memoria.
 *
 * Es la contrapartida de haber declarado un puerto en vez de hablar con Stream:
 * el comic se desarrolla y se prueba sin shell, sin sesion y sin red. Lo usa la
 * pagina de prueba del remote (`npm start`) y sirve igual para los tests.
 */

const GENTE = [
  {
    id: 'u-hilario',
    nombre: 'Hilario',
    avatar: 'v1|trama.nada.tirantes.patata.unica.bizcos.patata.dientes.morsa.calvo.nada.papel.chapa|clara.zanahoria.rojo.mostaza',
  },
  {
    id: 'u-cocinera',
    nombre: 'La Cocinera',
    avatar: 'v1|trama.mono.bata.redonda.arqueadas.despiertos.boton.dientes.nada.mono.nada.nada.nada|media.caoba.rojo.mostaza',
  },
  {
    id: 'u-redactor',
    nombre: 'El Redactor',
    // Sin codigo de avatar: es el caso de un mensaje escrito desde la ventana
    // clasica. Tiene que salir dibujado igualmente, con la cara determinista
    // que le toque por su id.
    avatar: null,
  },
] as const;

const GUION: [number, string, ('imagen' | 'video' | 'archivo')?][] = [
  [2, 'Llevo desde las seis con el cierre de la portada.'],
  [1, '¿Has comido algo hoy?'],
  [2, 'Un cafe. Dos, si cuenta el de ayer.'],
  [0, '¡ESO NO ES UNA COMIDA!'],
  [1, 'Te he dejado esto en la nevera', 'imagen'],
  [2, 'jajaja gracias, ahora bajo'],
  [0, 'zzz'],
  // A partir de aqui, lo que ensena el motor de escena: cambio de sitio,
  // reacciones, gestos y una despedida.
  [1, 'Venga, vamos a la cafeteria y te invito'],
  [2, '¡Por fin algo de comer! 😍'],
  [0, '*se despierta de golpe* ¿Cafe? ¡Yo tambien voy!'],
  [1, 'Hilario, tu solo vienes por los churros 😏'],
  [0, 'Ni idea de que me hablas 🤷'],
  [2, 'JAJAJA te ha pillado'],
  [1, 'Bueno, me voy que cierro la cocina. ¡Hasta luego!'],
];

export class PuertoChatFalso implements PuertoChat {
  private readonly oyentes = new Set<(m: MensajeChat) => void>();
  private readonly presencia = new Set<(e: PresenciaChat) => void>();
  /** Quien ha "entrado" con `entra()`, para poder sacarlo con `sale()`. */
  private visitante: { id: string; nombre: string } | null = null;
  private n = 0;

  /** @param entregados Cuantos mensajes del guion vienen ya en el historial. */
  constructor(private readonly entregados = 4) {}

  historial(limite = 50): Promise<MensajeChat[]> {
    this.n = Math.min(this.entregados, GUION.length);
    const mensajes = GUION.slice(0, this.n).map((linea, i) => this.mensaje(linea, i));
    // Con retraso, como una peticion de verdad: asi se ve el estado de carga y
    // se prueba que lo que entre por `alRecibir` mientras tanto no se pierde.
    return new Promise((ok) => setTimeout(() => ok(mensajes.slice(-limite)), 400));
  }

  alRecibir(cb: (mensaje: MensajeChat) => void): () => void {
    this.oyentes.add(cb);
    return () => this.oyentes.delete(cb);
  }

  enviar(texto: string): Promise<void> {
    this.emitir(this.mensaje([0, texto], this.n++));
    return Promise.resolve();
  }

  participantes(): Promise<ParticipanteChat[]> {
    return Promise.resolve(GENTE.map((p) => ({ id: p.id, nombre: p.nombre, avatar: p.avatar })));
  }

  alCambiarPresencia(cb: (e: PresenciaChat) => void): () => void {
    this.presencia.add(cb);
    return () => this.presencia.delete(cb);
  }

  /** Simula que alguien entra en la conversacion sin escribir. */
  entra(): void {
    this.visitante = { id: 'u-visita', nombre: 'La Cinefila' };
    const e: PresenciaChat = {
      tipo: 'entra',
      usuarioId: this.visitante.id,
      nombre: this.visitante.nombre,
      avatar: 'v1|rayas.nada.chaqueta.ovalo.finas.entrecerrados.respingona.mueca.nada.melena.sol.nada.nada|morena.tinta.grafito.rojo',
      fecha: new Date(),
    };
    for (const o of this.presencia) o(e);
  }

  /** Y que se va. */
  sale(): void {
    if (!this.visitante) return;
    const e: PresenciaChat = { tipo: 'sale', usuarioId: this.visitante.id, nombre: this.visitante.nombre, fecha: new Date() };
    this.visitante = null;
    for (const o of this.presencia) o(e);
  }

  /** Suelta la siguiente linea del guion, como si la escribiera otro. */
  siguiente(): void {
    const linea = GUION[this.n % GUION.length]!;
    this.emitir(this.mensaje(linea, this.n++));
  }

  private emitir(mensaje: MensajeChat): void {
    for (const oyente of this.oyentes) oyente(mensaje);
  }

  private mensaje([quien, texto, adjunto]: [number, string, ('imagen' | 'video' | 'archivo')?], i: number): MensajeChat {
    const persona = GENTE[quien % GENTE.length]!;
    return {
      id: `falso-${i}`,
      texto,
      autorId: persona.id,
      autorNombre: persona.nombre,
      avatar: persona.avatar,
      fecha: new Date(Date.now() - (GUION.length - i) * 60_000),
      adjuntos: adjunto
        ? [{ tipo: adjunto, url: MINIATURA, nombre: 'tortilla.png' }]
        : undefined,
    };
  }
}

/** Un cuadrado dibujado a mano, para no depender de la red en la demo. */
const MINIATURA =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#e7dbc2"/>' +
      '<circle cx="32" cy="32" r="18" fill="#e8b23a" stroke="#1b1714" stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="7" fill="#f2e9d8" stroke="#1b1714" stroke-width="2"/>' +
    '</svg>',
  );
