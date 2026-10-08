/**
 * De un avatar (una cabeza) a un personaje de cuerpo entero.
 *
 * El código HilarAvatar v1 describe cara, pelo, torso y colores: lo que se ve
 * en un busto. Para una escena hacen falta piernas, calzado y complexión, que
 * el código no tiene. En vez de cambiar el formato del avatar (lo que
 * invalidaría los códigos guardados), se DERIVAN del propio código con un
 * hash: la misma persona tiene siempre el mismo cuerpo, en cualquier
 * dispositivo y sin guardar nada.
 *
 * Si algún día el perfil deja elegir esas piezas, basta con pasar un
 * `Partial<IdentidadVisual>` como `preferencias`: pisan lo derivado.
 */

import { aCodigo, aleatorio, deCodigo } from '../../hilaravatar/hilaravatar';
import type { Calzado, Complexion, IdentidadVisual } from '../modelo';

/** Pantalones: tonos de tela desaturados, con su sombra (IDENTIDAD.md). */
const PANTALONES: ReadonlyArray<[string, string]> = [
  ['#3E4F63', '#2B394A'], // vaquero
  ['#4A3F35', '#342B23'], // pana marrón
  ['#2F2B28', '#1E1B19'], // negro gastado
  ['#66695C', '#4B4E42'], // gris verdoso
  ['#8C7B58', '#6C5D40'], // caqui
  ['#5C3B3B', '#432828'], // granate
  ['#5B6F86', '#43546A'], // azul lavado
];

const CALZADOS: ReadonlyArray<[Calzado, string]> = [
  ['zapatillas', '#E9E1CF'],
  ['zapatillas', '#CF3A2B'],
  ['zapatos', '#4A2E22'],
  ['zapatos', '#2A2522'],
  ['botas', '#3A2A20'],
  ['sandalias', '#8A5A3A'],
];

const COMPLEXIONES: ReadonlyArray<[Complexion, number]> = [
  ['delgada', 0.28],
  ['media', 0.42],
  ['fuerte', 0.16],
  ['oronda', 0.14],
];

/** FNV-1a: el mismo hash que usa el motor del avatar para los ids. */
function hash(txt: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Un número 0–1 estable para una semilla y un "canal" distinto por rasgo. */
function azar(semilla: string, canal: string): number {
  return (hash(semilla + '#' + canal) % 10000) / 10000;
}

function elegirPonderado<T>(opciones: ReadonlyArray<[T, number]>, r: number): T {
  let acc = 0;
  for (const [valor, peso] of opciones) {
    acc += peso;
    if (r <= acc) return valor;
  }
  return opciones[opciones.length - 1]![0];
}

/** Cache: una conversación larga repite muchas veces a las mismas personas. */
const cache = new Map<string, IdentidadVisual>();

/**
 * El personaje completo de alguien.
 *
 * @param codigo   Código HilarAvatar; si falta, el avatar determinista del id
 *                 (el mismo respaldo que ya usa el Comic Chat).
 * @param autorId  Id estable del usuario: siembra lo que el avatar no dice.
 */
export function identidadDe(
  codigo: string | null | undefined,
  autorId: string,
  preferencias: Partial<IdentidadVisual> = {},
): IdentidadVisual {
  const clave = `${codigo ?? ''}|${autorId}|${JSON.stringify(preferencias)}`;
  const guardada = cache.get(clave);
  if (guardada) return guardada;

  const cod = codigo && /^v\d+\|/.test(codigo) ? aCodigo(deCodigo(codigo)) : aCodigo(aleatorio(autorId));
  // Se siembra con el id Y el código: dos personas con el mismo avatar (los
  // que nunca lo han tocado y comparten el por defecto) no llevan también
  // las mismas piernas.
  const semilla = `${autorId}|${cod}`;
  const config = deCodigo(cod);

  const [pantalon, pantalonSombra] = PANTALONES[Math.floor(azar(semilla, 'pantalon') * PANTALONES.length)]!;
  let [calzado, calzadoColor] = CALZADOS[Math.floor(azar(semilla, 'calzado') * CALZADOS.length)]!;
  let complexion = elegirPonderado(COMPLEXIONES, azar(semilla, 'complexion'));

  // Coherencia con lo que el avatar sí dice: la bata va con zapato cerrado,
  // la camisa hawaiana pide sandalias o zapatillas.
  const torso = config.piezas.cuerpo;
  if (torso === 'bata' && calzado === 'sandalias') [calzado, calzadoColor] = ['zapatos', '#2A2522'];
  if (torso === 'hawaiana' && calzado === 'botas') [calzado, calzadoColor] = ['sandalias', '#8A5A3A'];
  // Una cara "alargada" con cuerpo orondo queda descompensada; al revés, bien.
  if (config.piezas.cabeza === 'alargada' && complexion === 'oronda') complexion = 'delgada';

  const identidad: IdentidadVisual = {
    codigo: cod,
    complexion,
    pantalon,
    pantalonSombra,
    calzado,
    calzadoColor,
    estatura: 0.94 + azar(semilla, 'estatura') * 0.12,
    // El café del avatar es un objeto que se sujeta, no algo pintado en el pecho.
    propFavorito: config.piezas.extra === 'cafe' ? 'taza' : undefined,
    ...preferencias,
  };

  cache.set(clave, identidad);
  return identidad;
}
