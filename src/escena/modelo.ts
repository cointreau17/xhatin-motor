/**
 * Modelo de escena de Xhatin.
 *
 * Es el contrato entre las cuatro capas del motor y lo único que todas
 * comparten:
 *
 *   Mensaje ──► Interpretación ──► Director (estado + agrupación) ──► Viñeta ──► Compositor
 *
 * - La INTERPRETACIÓN dice qué significa un mensaje (emoción, intención, pose
 *   sugerida…). No sabe nada de posiciones ni de viñetas.
 * - El DIRECTOR decide qué se ve: qué viñeta, quién sale, dónde, con qué cámara.
 *   Produce objetos `Vineta`, que son datos puros y serializables.
 * - El COMPOSITOR convierte una `Vineta` en SVG. No toma decisiones: si algo
 *   sale mal colocado, el error está en el director o en el layout, nunca en
 *   el dibujo.
 *
 * Todo lo que hay aquí son tipos. Ninguna capa importa Angular: el motor
 * funciona igual en el navegador, en Node (tests, SSR, exportar a PNG en el
 * servidor) o detrás de un modelo de IA.
 *
 * Los identificadores de pose, expresión, escenario, prop y efecto son
 * `string` y no uniones cerradas a propósito: los define el catálogo, y el
 * catálogo se puede ampliar en tiempo de ejecución (incluso cargando paquetes
 * remotos) sin tocar estos tipos ni recompilar el motor.
 */

/* ------------------------------------------------------------ constantes -- */

/**
 * El "plató". Toda escena se monta en un mundo de 1200×600 unidades; la
 * cámara recorta de ahí lo que ve cada viñeta. Los escenarios se dibujan una
 * vez a este tamaño y valen para cualquier encuadre.
 */
export const MUNDO = { ancho: 1200, alto: 600 } as const;

/**
 * Cuánto puede subir la cámara por encima del decorado (y negativa). Ahí se
 * prolonga el color de fondo del escenario: es el aire que necesitan los
 * globos cuando hay varios.
 */
export const TECHO_MUNDO = -400;

/** Línea del suelo en primer término y al fondo del plató. */
export const SUELO = { delante: 560, fondo: 505 } as const;

/** Tamaño lógico de las viñetas (viewBox). El alto es común. */
export const TAM_VINETA = {
  cuadrada: { ancho: 600, alto: 600 },
  ancha: { ancho: 1200, alto: 600 },
} as const;

/* ---------------------------------------------------------- vocabulario --- */

export type Id = string;

/** Hacia dónde mira el personaje. El dibujo base mira a la derecha. */
export type Orientacion = 'izquierda' | 'derecha';

/**
 * Dirección de la mirada. `interlocutor`, `personaje` y `objeto` necesitan
 * un `objetivo`; el layout los resuelve a un punto del mundo cuando ya sabe
 * dónde está cada cosa.
 */
export type TipoMirada =
  | 'interlocutor'
  | 'personaje'
  | 'objeto'
  | 'frente'
  | 'espectador'
  | 'arriba'
  | 'abajo'
  | 'apartar';

export interface Mirada {
  tipo: TipoMirada;
  /** Id de personaje o de prop, según el tipo. */
  objetivo?: Id;
}

export type TipoGlobo =
  | 'dialogo'
  | 'pregunta'
  | 'pensamiento'
  | 'grito'
  | 'susurro'
  | 'narracion'
  | 'sonido'
  | 'reaccion';

export type TipoPlano =
  | 'general'
  | 'grupo'
  | 'medio'
  | 'dos'
  | 'primer-plano'
  | 'primerisimo'
  | 'personaje-objeto'
  | 'lateral';

export type FormatoVineta = 'cuadrada' | 'ancha';

/** Cómo entra la viñeta en la tira. */
export type Transicion = 'corte' | 'fundido' | 'barrido' | 'zoom';

/** Capa de ambiente sobre el escenario. No cambia el decorado, lo tiñe. */
export type Ambiente = 'tension' | 'fiesta' | 'drama' | 'calma';

export type Tono = 'neutro' | 'comico' | 'tenso' | 'tierno' | 'triste' | 'festivo';

/**
 * Lo que un mensaje intenta hacer. Es lo que distingue "no" de "¡NO!" más
 * allá de la emoción, y lo que decide gestos como saludar o señalar.
 */
export type Intencion =
  | 'afirmacion'
  | 'pregunta'
  | 'exclamacion'
  | 'saludo'
  | 'despedida'
  | 'llamada'
  | 'acuerdo'
  | 'desacuerdo'
  | 'agradecimiento'
  | 'disculpa'
  | 'felicitacion'
  | 'insulto'
  | 'risa'
  | 'reaccion'
  | 'desplazamiento'
  | 'mostrar'
  | 'duda'
  | 'accion';

/* ------------------------------------------------------------ identidad --- */

/** Complexión del cuerpo completo. No existe en el avatar: se deriva. */
export type Complexion = 'delgada' | 'media' | 'fuerte' | 'oronda';

export type Calzado = 'zapatillas' | 'zapatos' | 'botas' | 'sandalias';

/**
 * Lo que hace falta para dibujar a alguien de cuerpo entero.
 *
 * La cabeza es EXACTAMENTE el avatar de Diario Hilario (`codigo`): mismas
 * piezas, mismos colores. El resto —piernas, calzado, complexión— no existe
 * en el código v1 del avatar, así que se deriva de él de forma determinista.
 * `extras` deja sitio para que el perfil guarde un día esas elecciones sin
 * cambiar el formato del avatar.
 */
export interface IdentidadVisual {
  /** Código HilarAvatar `v1|…|…`. */
  codigo: string;
  complexion: Complexion;
  /** Color de pantalón (hex). */
  pantalon: string;
  pantalonSombra: string;
  calzado: Calzado;
  /** Color del calzado (hex). */
  calzadoColor: string;
  /** Estatura relativa (0.94–1.06). */
  estatura: number;
  /** Prop que la persona "lleva siempre" (p. ej. el café del avatar). */
  propFavorito?: Id;
}

/* -------------------------------------------------------------- escena ---- */

export interface PersonajeEnEscena {
  id: Id;
  nombre: string;
  identidad: IdentidadVisual;

  /**
   * Posición horizontal dentro del "set" de la viñeta, de 0 (izquierda) a 1
   * (derecha). El set es el ancho útil del formato: 600 en una cuadrada,
   * 1200 en una ancha.
   */
  x: number;
  /** 0 = primer término, 1 = al fondo. Escala y altura salen de aquí. */
  profundidad: number;
  /** Multiplicador extra (p. ej. alguien que se acerca a cámara). */
  escala?: number;

  pose: Id;
  expresion: Id;
  /** 0–1. Modula efectos y animaciones, no el dibujo de la cara. */
  intensidad: number;
  mirada: Mirada;
  orientacion: Orientacion;

  /** Habla en esta viñeta: boca animada y foco de globos. */
  habla: boolean;
  /** Prop que sujeta en la mano (id de catálogo). */
  propEnMano?: Id;
  /** Imagen a mostrar en el prop que sujeta (adjunto del mensaje). */
  imagenEnMano?: string;

  /** Animaciones puntuales: `entrada`, `salida`, `temblor`, `saludo`… */
  animaciones: string[];
  /** Por dónde entra o sale de escena, si lo hace en esta viñeta. */
  entra?: Orientacion;
  sale?: Orientacion;
}

export interface PropEnEscena {
  /** Id único dentro de la viñeta. */
  id: Id;
  /** Id del catálogo de props. */
  tipo: Id;
  /** Igual que en los personajes: 0–1 dentro del set. */
  x: number;
  profundidad: number;
  /** Imagen incrustada (pantalla del móvil, cartel, foto). */
  imagen?: string;
}

export interface Globo {
  id: Id;
  mensajeId: Id;
  /** Quién habla. `null` en narración. */
  autorId: Id | null;
  autorNombre?: string;
  tipo: TipoGlobo;
  texto: string;
  /** Orden de lectura dentro de la viñeta. */
  orden: number;
  intensidad: number;
}

export interface EfectoEnEscena {
  /** Id del catálogo de efectos. */
  tipo: Id;
  /** Personaje sobre el que se coloca. Sin él, efecto de pantalla. */
  sobre?: Id;
  intensidad: number;
}

export interface Camara {
  plano: TipoPlano;
  /** Ids de personajes (o props) que el encuadre tiene que incluir. */
  foco: Id[];
  /** Plano del que viene, para animar el zoom al entrar. */
  desde?: TipoPlano;
  /** Grados de inclinación (plano holandés). */
  inclinacion?: number;
}

/**
 * Una viñeta, entera y sin ambigüedades: con esto y el catálogo, el
 * compositor la dibuja siempre igual. Es JSON puro, así que se puede guardar,
 * mandar a un servidor para exportarla o reproducirla en un test.
 */
export interface Vineta {
  id: Id;
  /** Sube cada vez que el director la modifica (viñeta abierta). */
  version: number;
  formato: FormatoVineta;
  escenario: Id;
  ambiente?: Ambiente;
  camara: Camara;
  personajes: PersonajeEnEscena[];
  props: PropEnEscena[];
  globos: Globo[];
  efectos: EfectoEnEscena[];
  /** Mensajes que la componen, en orden. */
  mensajes: Id[];
  transicion: Transicion;
  /** Primera viñeta de una escena (cambio de sitio o de momento). */
  abreEscena: boolean;
  /** Rótulo de narración al principio ("Más tarde…", "En la cafetería"). */
  rotulo?: string;
  /**
   * Momento fuerte (un grito, una sorpresa muy grande): el decorado se cambia
   * por líneas de impacto que salen de la cara de `sobre`, como en el manga y
   * el cómic americano.
   */
  impacto?: { sobre: Id };
  /** Qué ha pasado, para el laboratorio. No afecta al dibujo. */
  notas: string[];
}

/* ---------------------------------------------------------- entrada ------- */

export interface AdjuntoEntrada {
  tipo: 'imagen' | 'video' | 'archivo';
  url: string;
  nombre?: string;
}

/**
 * Lo que el motor necesita de un mensaje. Es un subconjunto compatible con
 * `MensajeChat` del puerto: se le puede pasar uno tal cual.
 */
export interface MensajeEntrada {
  id: Id;
  texto: string;
  autorId: Id;
  autorNombre: string;
  /** Código de avatar, si viaja en el mensaje. */
  avatar: string | null;
  fecha: Date;
  /** Expresión elegida a mano (anula la deducida). */
  expresion?: string;
  adjuntos?: AdjuntoEntrada[];
}

/** Alguien entra o sale de la conversación (si el puerto lo sabe). */
export interface EventoPresencia {
  tipo: 'entra' | 'sale';
  usuarioId: Id;
  nombre?: string;
  avatar?: string | null;
  fecha: Date;
}

/* ------------------------------------------------------ interpretación ---- */

/** Paso de la traza: qué regla se disparó y qué propuso. */
export interface PasoTraza {
  regla: string;
  propuestas: string[];
}

/**
 * Lo que significa un mensaje, visto desde el cómic.
 *
 * Los campos son PROPUESTAS: el director puede corregirlas con el contexto
 * (p. ej. una cámara de primer plano no tiene sentido si hay cinco personas
 * hablando a la vez). `confianza` indica cuánto se fía el intérprete de cada
 * campo, para que otro intérprete (un modelo de IA) pueda pisar solo lo
 * que mejora.
 */
export interface Interpretacion {
  intencion: Intencion;
  emocion: Id;
  /** 0–1. */
  intensidad: number;
  pose: Id;
  mirada: Mirada;
  /** Encuadre sugerido. `undefined` = que decida el director. */
  camara?: TipoPlano;
  globo: TipoGlobo;
  efectos: Id[];
  props: Id[];
  /** Escenario al que apunta el contenido (tema), si lo hay. */
  escenario?: { id: Id; confianza: number; motivo: string };
  /** A dónde dice que va (`desplazamiento`): el escenario cambiará después. */
  destino?: Id;
  destinatarioId?: Id;
  tono: Tono;
  movimiento?: 'acercarse' | 'alejarse' | 'salir';
  /** Pide viñeta propia (reacción fuerte, cambio de escena…). */
  vinetaPropia: boolean;
  confianza: Partial<Record<keyof Interpretacion, number>>;
  traza: PasoTraza[];
}

/* ------------------------------------------------------- estado vivo ------ */

export interface EstadoPersonaje {
  id: Id;
  nombre: string;
  identidad: IdentidadVisual;
  /** Índice del último mensaje que escribió. */
  ultimoIndice: number;
  ultimaFecha: Date;
  emocion: Id;
  intensidad: number;
  pose: Id;
  /** Sigue en escena. */
  presente: boolean;
  /** Se ha despedido: sale en la próxima viñeta. */
  saliendo: boolean;
  /** Aún no ha aparecido en ninguna viñeta. */
  nuevo: boolean;
  /** Desplazamiento acumulado hacia (+) o desde (−) su interlocutor. */
  cercania: number;
}

/**
 * CURRENT SCENE STATE: la memoria del director.
 *
 * Es lo que permite que el motor no mire solo el último mensaje: sabe dónde
 * están, quién estaba hablando con quién, de qué se habla y cómo va el tono.
 */
export interface EstadoEscena {
  escenario: Id;
  /** Escenario al que alguien dijo que iba: se aplica en la siguiente viñeta. */
  escenarioPendiente?: { id: Id; motivo: string };
  /** Puntuación acumulada por escenario según los temas (con olvido). */
  temas: Record<Id, number>;
  personajes: Record<Id, EstadoPersonaje>;
  /** Orden estable de izquierda a derecha: quien estaba a la izquierda sigue ahí. */
  orden: Id[];
  /** Props que pertenecen a la escena (mesa, tele…), no a un mensaje. */
  props: Id[];
  camara: TipoPlano;
  tono: Tono;
  /** 0–1: sube con enfados, insultos y desacuerdos; baja sola. */
  tension: number;
  /** 0–1: sube con risas y celebraciones. */
  euforia: number;
  hablanteAnterior?: Id;
  /** Con quién hablaba cada uno la última vez. */
  interlocutores: Record<Id, Id>;
  indiceMensaje: number;
  ultimaFecha?: Date;
  /** Viñetas desde la última que llevó efectos (para dosificarlos). */
  vinetasSinEfectos: number;
}
