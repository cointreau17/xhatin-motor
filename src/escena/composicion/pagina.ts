/**
 * La tira como página de cómic: filas llenas, sin huecos.
 *
 * El director decide si cada viñeta es cuadrada (una columna) o ancha (dos).
 * En una rejilla, una viñeta que no cabe al final de una fila deja un hueco,
 * y la tira parece una galería con dientes. Aquí, antes de pintar, se cambia
 * el formato de alguna viñeta para que la fila quede llena:
 *
 * - una cuadrada sola delante de una ancha que no le cabe al lado se compone
 *   ancha y ocupa el hueco;
 * - con tres columnas, de dos anchas seguidas (la primera sola en su fila),
 *   la que menos lleva se compone cuadrada y las dos comparten fila.
 *
 * Con una sola columna (el móvil) todas van cuadradas: a lo ancho de una
 * pantalla estrecha, una ancha saldría a la mitad de tamaño que las demás.
 *
 * La escena es la misma, solo cambia el encuadre (la cámara sabe encuadrar
 * cualquier formato). Para llenar filas, la última viñeta no se toca: está
 * viva, y al llegar la siguiente se recolocaría. Mejor un hueco al final que
 * una viñeta que salta.
 */

import type { FormatoVineta, Vineta } from '../modelo.js';

const columnasDe = (v: Vineta) => (v.formato === 'ancha' ? 2 : 1);

/**
 * La copia de cada viñeta con otro formato, siempre la misma: la tira se
 * pagina otra vez con cada mensaje, y una copia nueva obligaría a recomponer
 * la viñeta. Las viñetas no se modifican (el director hace otra), así que
 * basta con recordarla por la original.
 */
const copias = new WeakMap<Vineta, Partial<Record<FormatoVineta, Vineta>>>();

function conFormato(v: Vineta, formato: FormatoVineta): Vineta {
  let deEsta = copias.get(v);
  if (!deEsta) copias.set(v, (deEsta = {}));
  return (deEsta[formato] ??= { ...v, formato });
}

/**
 * La tira con los formatos que llenan las filas de una página de `columnas`
 * columnas. Devuelve los mismos objetos salvo los que cambian de formato, y
 * para esos, la misma copia cada vez: una viñeta que no cambia no se vuelve a
 * componer.
 */
export function paginar(tira: readonly Vineta[], columnas: number): Vineta[] {
  // Con una columna, todas cuadradas: una ancha a lo ancho de un móvil sale a
  // la mitad de tamaño que las demás y su letra no se lee.
  if (columnas < 2) return tira.map((v) => (v.formato === 'ancha' ? conFormato(v, 'cuadrada') : v));
  const resultado = [...tira];
  const ultima = resultado.length - 1;
  let ocupadas = 0;
  for (let i = 0; i < resultado.length; i++) {
    const v = resultado[i]!;
    const ancho = Math.min(columnasDe(v), columnas);
    if (ocupadas + ancho > columnas) {
      // No cabe: la fila anterior se quedaría con un hueco de una columna.
      const hueco = columnas - ocupadas;
      const anterior = resultado[i - 1];
      if (hueco === 1 && anterior?.formato === 'cuadrada') {
        // La cuadrada de antes se ensancha y llena su fila; esta va a la siguiente.
        resultado[i - 1] = conFormato(anterior, 'ancha');
        ocupadas = 0;
      } else if (hueco === 1 && anterior?.formato === 'ancha' && ocupadas === 2) {
        // Dos anchas seguidas, y la de antes sola en su fila: una de las dos
        // se estrecha y comparten fila. La que menos lleva, salvo la última.
        if (i < ultima && carga(v) < carga(anterior)) {
          resultado[i] = conFormato(v, 'cuadrada');
          ocupadas = 0;
          continue;
        }
        resultado[i - 1] = conFormato(anterior, 'cuadrada');
        ocupadas = 1;
      } else {
        ocupadas = 0;
      }
    }
    ocupadas += ancho;
    if (ocupadas >= columnas) ocupadas = 0;
  }
  return resultado;
}

/** Lo que lleva una viñeta: cuanto más, peor se aprieta en una cuadrada. */
const carga = (v: Vineta) => (v.personajes?.length ?? 0) + (v.globos?.length ?? 0);
