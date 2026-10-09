/**
 * Forma de cada asset del catálogo.
 *
 * Todos son DATOS serializables (números, cadenas, SVG en texto). Ninguno
 * lleva funciones. Eso es lo que permite que un día vengan de un servidor
 * como JSON (`Catalogo.cargarPaquete`) sin tocar el motor: ver ESCENA.md.
 *
 * Convenciones de dibujo, comunes a todo el catálogo:
 * - Tinta `var(--dh-tinta)`, papel `var(--dh-papel)`, acento `var(--dh-acento)`.
 * - Trazos redondos; 6 para contornos de decorado, 4 para detalle.
 * - Nada de negro puro ni primarios saturados (ver IDENTIDAD.md).
 */

import type { Ambiente, Id, TipoMirada, Tono } from '../modelo.js';

/* ------------------------------------------------------------- poses ------ */

/**
 * Forma de la mano al final del brazo.
 * - `relajada`: mitón caído.
 * - `abierta`: palma abierta, dedos juntos (gesticular, explicar).
 * - `palma`: palma hacia arriba (preguntar, encogerse de hombros).
 * - `saludo`: dedos abiertos (saludar, asustarse).
 * - `puno`: puño cerrado.
 * - `senala`: puño con el índice extendido en la dirección del antebrazo.
 * - `pulgar`: puño con el pulgar arriba.
 * - `sujeta`: agarra un prop (el prop se dibuja en la mano).
 */
export type FormaMano =
  | 'relajada'
  | 'abierta'
  | 'palma'
  | 'saludo'
  | 'puno'
  | 'senala'
  | 'pulgar'
  | 'sujeta';

/**
 * Dónde se pinta un brazo respecto al resto del cuerpo:
 * - `detras`: detrás del torso (el brazo lejano en reposo).
 * - `torso`: sobre el torso pero bajo la cabeza (cruzar brazos, manos en la cintura).
 * - `cabeza`: sobre la cabeza (mano en la barbilla, en la frente).
 */
export type CapaBrazo = 'detras' | 'torso' | 'cabeza';

/**
 * Ángulos en grados. 0 = colgando hacia abajo; positivo = hacia delante
 * (hacia donde mira el personaje); 90 = horizontal al frente; 180 = arriba;
 * −90 = horizontal hacia atrás. El codo es RELATIVO al brazo: el antebrazo
 * apunta a `hombro + codo`.
 */
export interface DefBrazo {
  hombro: number;
  codo: number;
  mano: FormaMano;
  capa?: CapaBrazo;
}

/** Igual que el brazo: cadera 0 = pierna recta; rodilla relativa (negativa = dobla atrás). */
export interface DefPierna {
  cadera: number;
  rodilla: number;
}

export interface DefPose {
  id: Id;
  nombre: string;
  tags: string[];
  /** Brazo del lado hacia el que mira. */
  brazoDelante: DefBrazo;
  /** Brazo del lado contrario. */
  brazoDetras: DefBrazo;
  piernaDelante: DefPierna;
  piernaDetras: DefPierna;
  torso?: {
    /** Grados; positivo = inclinado hacia delante. */
    inclinacion?: number;
  };
  cabeza?: {
    /** Grados; positivo = cabeza hacia delante/abajo. */
    inclinacion?: number;
  };
  /** Hombros encogidos, en unidades (sube los hombros y hunde el cuello). */
  encoger?: number;
  /**
   * Altura de la cadera sobre el suelo. Por defecto la de estar de pie; más
   * baja al sentarse o agacharse.
   */
  alturaCadera?: number;
  /** Necesita algo donde sentarse: si la escena no lo tiene, se pone un taburete. */
  asiento?: boolean;
  /** Prop que la pose lleva implícito (usar el móvil lleva móvil). */
  sujeta?: { mano: 'delante' | 'detras'; prop: Id };
  /** Clase de animación CSS del cuerpo (`dh-anim-<valor>`). */
  animacion?: string;
  /** Mirada que la pose sugiere si nada dice otra cosa. */
  mirada?: TipoMirada;
  /** Expresión que la pose impone (dormir cierra los ojos). */
  expresion?: Id;
  /** Efectos que la acompañan de forma natural (correr → líneas de movimiento). */
  efectos?: Id[];
}

/* -------------------------------------------------------- expresiones ----- */

/** Ranuras de la cara que una expresión puede sustituir. */
export type RanuraCara = 'cejas' | 'ojos' | 'boca';

export interface DefExpresion {
  id: Id;
  nombre: string;
  tags: string[];
  /** Piezas del avatar que sustituye. Lo que no se nombra, se queda como lo eligió el usuario. */
  slots: Partial<Record<RanuraCara, string>>;
  /** Marcas dibujadas sobre la cara (rubor, sudor, venas…): ids de `MARCAS`. */
  marcas: Id[];
  /** Ids antiguos que resuelven a esta (compatibilidad con `expresionDeTexto`). */
  alias?: string[];
  /** Pose que le va bien si el mensaje no pide otra. */
  pose?: Id;
  mirada?: TipoMirada;
  /** Efectos que puede llevar a intensidad alta. */
  efectos?: Id[];
  tono?: Tono;
  /** −1 (negativa) … 1 (positiva). Para decidir cómo reaccionan los demás. */
  valencia: number;
  /** 0 (calma) … 1 (muy activada). */
  activacion: number;
}

/** Marca sobre la cara, dibujada en el lienzo 512×512 del avatar. */
export interface DefMarca {
  id: Id;
  svg: string;
  /**
   * `piel`: se pinta sobre la piel y bajo pelo, gafas y sombrero (rubor,
   * ojeras). Por defecto va encima de todo (sudor, venas, lágrimas).
   */
  capa?: 'piel' | 'encima';
}

/* ---------------------------------------------------------- escenarios ---- */

export interface MobiliarioEscenario {
  tipo: Id;
  /** 0–1 dentro del set; `centro` lo coloca entre los personajes. */
  x: number | 'centro';
  profundidad: number;
}

export interface DefEscenario {
  id: Id;
  nombre: string;
  tags: string[];
  /** Decorado de 1200×600 detrás de todo. */
  svg: string;
  /**
   * Color para prolongar el decorado hacia arriba (cielo, pared). Si falta,
   * se usa el relleno del primer elemento del SVG.
   */
  cielo?: string;
  /** Primer término (barra, ramas…) delante de los personajes. Opcional. */
  frente?: string;
  /** Palabras que lo evocan (normalizadas: minúsculas y sin tildes). */
  palabras: string[];
  /** Muebles que trae de serie. */
  mobiliario?: MobiliarioEscenario[];
  /** Rótulo al entrar ("En la cafetería"). */
  rotulo?: string;
  ambiente?: Ambiente;
  /** Oscuro: los globos y rótulos usan contraste de noche. */
  oscuro?: boolean;
}

/* --------------------------------------------------------------- props ---- */

export type AnclajeProp = 'mano' | 'suelo' | 'mesa';

export interface DefProp {
  id: Id;
  nombre: string;
  tags: string[];
  palabras: string[];
  /**
   * Dibujo con el origen (0,0) en el punto de anclaje:
   * - `suelo`: centro de la base, el dibujo crece hacia arriba (y negativa).
   * - `mano`: el punto por donde se agarra.
   * - `mesa`: centro de la base, apoyado sobre una mesa.
   */
  svg: string;
  anclaje: AnclajeProp;
  /** Caja aproximada desde el anclaje, para cámara y colisiones. */
  caja: { x: number; y: number; ancho: number; alto: number };
  /** Delante o detrás de los personajes que están a su misma profundidad. */
  capa: 'detras' | 'delante';
  /** Hueco donde incrustar una imagen (pantalla, cartel, foto). */
  pantalla?: { x: number; y: number; ancho: number; alto: number };
  /** Altura de su superficie (mesa) para apoyar otros props. */
  superficie?: number;
}

/* ------------------------------------------------------------- efectos ---- */

export interface DefEfecto {
  id: Id;
  nombre: string;
  tags: string[];
  /**
   * `personaje`: se dibuja junto a la cabeza, con origen (0,0) en lo alto de
   * la cabeza y x positiva hacia donde mira.
   * `pantalla`: cubre la viñeta (líneas de velocidad, impacto), en
   * coordenadas 0–1 de la viñeta: se escala al tamaño real.
   * `detras`: detrás del personaje, en sus coordenadas (el estallido).
   */
  ambito: 'personaje' | 'pantalla' | 'detras';
  svg: string;
  /** Clase de animación CSS (`dh-fx-<valor>`). */
  animacion?: string;
  /** Intensidad mínima para que el director lo use por su cuenta. */
  umbral: number;
  /** Cuánto "llena" la viñeta: sirve para dosificar. */
  peso: number;
}

/* ------------------------------------------------------------- paquete ---- */

/**
 * Un paquete de assets. Es lo que `Catalogo.cargarPaquete` acepta: todos los
 * campos opcionales, para poder mandar solo escenarios nuevos, o solo una pose.
 */
export interface PaqueteCatalogo {
  nombre?: string;
  version?: number;
  poses?: DefPose[];
  expresiones?: DefExpresion[];
  marcas?: DefMarca[];
  escenarios?: DefEscenario[];
  props?: DefProp[];
  efectos?: DefEfecto[];
}
