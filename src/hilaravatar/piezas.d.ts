/**
 * Tipos de los datos generados por `build.py` (piezas.js).
 *
 * El motor de escena de Xhatin compone la cabeza de los personajes con las
 * mismas piezas que el avatar, pero capa a capa (para mover pupilas, girar la
 * cara o animar la boca), así que necesita leer los fragmentos directamente y
 * no solo el SVG que devuelve `componer()`.
 */
import type { Manifest } from './hilaravatar';

export declare const DATOS: {
  /** `<defs>` compartidos (tramas y patrones con ids `dh-…`). */
  defs: string;
  /** Fragmentos `<g>` por categoría y id de pieza, en el lienzo 512×512. */
  piezas: Record<string, Record<string, string>>;
  manifest: Manifest;
};
