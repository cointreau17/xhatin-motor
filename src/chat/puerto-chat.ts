/**
 * El puerto por el que entra la conversacion.
 *
 * El remote NO abre su propio cliente de Stream: `StreamChat.getInstance()` es
 * un singleton por modulo cargado, asi que una segunda copia dentro del remote
 * seria un segundo WebSocket por usuario, con su estado de canal aparte y su
 * conexion facturada. Quien tiene el cliente es el shell; aqui solo se declara
 * la forma de lo que el remote necesita y el shell la implementa.
 *
 * Lo que NO viaja por aqui es la identidad: quien eres lo dice dh-portero. El
 * puerto es la conversacion; mezclar ambas cosas obligaria al shell a repetir
 * el usuario en dos sitios y a mantenerlos de acuerdo.
 */

/**
 * Un mensaje que no es texto plano.
 *
 * La vineta no sabe dibujar una imagen ni un hilo, pero callarselos haria que
 * el comic mintiera sobre la conversacion: se pinta la vineta con un bocadillo
 * que lo cuenta y la miniatura dentro del panel.
 */
export interface AdjuntoChat {
  tipo: 'imagen' | 'video' | 'archivo';
  url: string;
  nombre?: string;
}

export interface MensajeChat {
  id: string;
  texto: string;
  autorId: string;
  autorNombre: string;
  /**
   * Codigo HilarAvatar estampado en el mensaje al enviarlo. `null` cuando el
   * mensaje viene de la ventana clasica, que no estampa nada: entonces manda
   * la cadena de respaldo del componente.
   */
  avatar: string | null;
  /**
   * Expresion elegida a mano, si algun dia hay rueda de emociones. Sin ella,
   * el componente la deduce del texto una sola vez, al recibir.
   */
  expresion?: string;
  fecha: Date;
  adjuntos?: AdjuntoChat[];
}

/**
 * Alguien entra o sale de la conversacion sin escribir nada.
 *
 * Es lo que permite al comic dibujar a alguien llegando o marchandose. Si el
 * puerto no lo sabe, no pasa nada: el comic deduce las entradas del primer
 * mensaje de cada uno y las salidas de las despedidas ("me voy").
 */
export interface PresenciaChat {
  tipo: 'entra' | 'sale';
  usuarioId: string;
  nombre?: string;
  avatar?: string | null;
  fecha: Date;
}

/**
 * Alguien que forma parte de la conversacion, haya escrito o no.
 *
 * Es lo que deja poner nombre a la conversacion desde el primer momento: en
 * una conversacion directa recien abierta todavia no hay mensajes de los que
 * sacar quien es el otro.
 */
export interface ParticipanteChat {
  id: string;
  nombre?: string;
  avatar?: string | null;
}

export interface PuertoChat {
  /** Los ultimos mensajes, en orden cronologico. */
  historial(limite?: number): Promise<MensajeChat[]>;
  /**
   * OPCIONAL. Los mensajes anteriores a uno dado (el mas antiguo que ya se
   * tiene), en orden cronologico: cargar mas historial al subir. Si devuelve
   * menos de `limite`, no hay mas. Sin el, la conversacion se queda en lo que
   * dio `historial`.
   */
  historialAnterior?(antesDe: string, limite?: number): Promise<MensajeChat[]>;
  /**
   * OPCIONAL. Da por leida la conversacion (quien la mira la tiene delante).
   * Es del usuario, no del dispositivo: si se lee en la app, deja de contar
   * como no leida tambien en la web.
   */
  marcarLeido?(): Promise<void>;
  /** Suscribe a los mensajes nuevos. Devuelve la funcion de baja. */
  alRecibir(cb: (mensaje: MensajeChat) => void): () => void;
  /** Fuera del alcance de la vista de solo lectura, pero parte del contrato. */
  enviar(texto: string): Promise<void>;
  /**
   * OPCIONAL. Entradas y salidas de la conversacion. Los puertos que ya
   * existen no tienen que implementarlo: sin el, el comic funciona igual.
   */
  alCambiarPresencia?(cb: (evento: PresenciaChat) => void): () => void;
  /**
   * OPCIONAL. Los miembros de la conversacion, yo incluido. Sin el, el comic
   * saca con quien hablas de los autores de los mensajes que van llegando.
   */
  participantes?(): Promise<ParticipanteChat[]>;
}
