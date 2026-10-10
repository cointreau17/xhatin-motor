/**
 * Tipos de los datos de piezas.js, que genera `scripts/piezas.mjs` a partir
 * de los dibujos de `hilaravatar/`.
 *
 * El motor de escena de Xhatin compone la cabeza de los personajes con las
 * mismas piezas que el avatar, pero capa a capa (para mover pupilas, girar la
 * cara o animar la boca), así que necesita leer los fragmentos directamente y
 * no solo el SVG que devuelve `componer()`.
 */
import type { Manifest } from './hilaravatar.js';

export declare const DATOS: {
  /** `<defs>` compartidos (tramas y patrones con ids `dh-…`). */
  defs: string;
  /** Fragmentos `<g>` por categoría y id de pieza, en el lienzo 512×512. */
  piezas: Record<string, Record<string, string>>;
  manifest: Manifest;
  /**
   * Por cabeza, medido del dibujo: el contorno de la cara, los `transform`
   * que llevan las piezas pensadas para la ovalada a esa cabeza (`craneo`,
   * `mandibula`, `orejas`…; la ovalada no lleva ninguno) y, redibujadas para
   * ella, las piezas pegadas al borde de la cara (`data-pegado`).
   */
  caras: Record<
    string,
    { contorno: string; ajustes: Record<string, string>; piezas?: Record<string, Record<string, string>> }
  >;
};
