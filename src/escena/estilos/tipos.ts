/**
 * Estilos de cómic: CON QUÉ se dibuja una escena.
 *
 * El director decide qué pasa (viñeta, reparto, cara, pose, cámara, globos)
 * y eso no cambia de un estilo a otro. El estilo solo cambia el dibujo:
 *
 * - «jóvenes» (sin estilo, el de siempre): personajes vectoriales por piezas,
 *   hechos a partir del avatar HilarAvatar de cada uno.
 * - estilos de imagen (p. ej. «caricatura»): una biblioteca de figuras,
 *   decorados y objetos dibujados una vez (con IA) para unos personajes
 *   concretos. El compositor elige la figura que mejor casa con la cara y la
 *   pose que pidió el director, y le pone encima las capas de boca y
 *   párpados para que hable y parpadee.
 *
 * Todo son datos serializables: un estilo nuevo es otro manifiesto y otra
 * carpeta de imágenes, sin tocar el motor.
 */

/** Caja en píxeles de la imagen: [x0, y0, x1, y1]. */
export type CajaPx = [number, number, number, number];

/** Un trozo de imagen que se pone encima de la figura (boca que habla, párpados). */
export interface CapaImagen {
  src: string;
  /** Posición y tamaño en píxeles de la figura. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Una figura de cuerpo entero, mirando a la derecha. */
export interface FiguraImagen {
  src: string;
  ancho: number;
  alto: number;
  /** Dónde está cada cosa en la imagen: con esto se alinea con el mundo. */
  cabeza: CajaPx;
  cara: CajaPx;
  ojos: CajaPx;
  boca: CajaPx;
  pies: CajaPx;
  capas?: {
    /** La boca en el otro estado: alterna con la de la figura al hablar. */
    habla?: CapaImagen;
    /** Los ojos cerrados: aparece un instante al parpadear. */
    parpado?: CapaImagen;
  };
}

/** Un personaje de un estilo de imagen. */
export interface PersonajeImagen {
  id: string;
  nombre: string;
  /** Pública: la ven los usuarios al elegir personaje. */
  descripcion: string;
  /** Por id de figura: `hablando`, `feliz`, `riendo`, `saludando`… */
  figuras: Record<string, FiguraImagen>;
}

export interface EscenarioImagen {
  /** 1200×600, el tamaño del mundo, con el suelo abajo. */
  src: string;
  /** Color con el que se prolonga el decorado hacia arriba. */
  cielo: string;
  oscuro?: boolean;
}

export interface ObjetoImagen {
  src: string;
  ancho: number;
  alto: number;
}

export interface EstiloComic {
  id: string;
  nombre: string;
  /** Pública: la ven los usuarios al elegir estilo. */
  descripcion: string;
  /** Letra de los bocadillos y de los rótulos. Sin ella, la de siempre. */
  fuentes?: { dialogo: string; rotulo: string };
  personajes: Record<string, PersonajeImagen>;
  /** Por id de escenario del catálogo. Los que falten usan `neutro`. */
  escenarios: Record<string, EscenarioImagen>;
  /** Por id de prop del catálogo. Los que falten no se dibujan. */
  objetos: Record<string, ObjetoImagen>;
}

/**
 * Cómo se pinta una conversación con un estilo de imagen.
 *
 * `base` es la URL desde la que se sirven las imágenes (la del remote: no la
 * del Shell). `reparto` dice qué personaje del estilo es cada participante;
 * quien no esté se queda con su personaje vectorial de siempre.
 */
export interface UsoEstilo {
  estilo: EstiloComic;
  base: string;
  reparto: Readonly<Record<string, string>>;
  /**
   * Sube cuando cambia algo que no está en los datos pero obliga a volver a
   * componer, como que acabe de cargar la letra del estilo (los globos se
   * midieron con otra).
   */
  revision?: number;
}
