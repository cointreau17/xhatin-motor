/**
 * Personajes de imagen: qué figura de la biblioteca toca y dónde va.
 *
 * El director sigue hablando en su idioma (una pose del catálogo y una
 * expresión); aquí se traduce a la figura dibujada que mejor lo cuenta. Los
 * gestos que dicen algo por sí mismos (saludar, señalar, el móvil) mandan
 * sobre la cara; si la pose es neutra, manda la expresión.
 *
 * Luego se coloca: los pies de la figura en los pies del personaje, y una
 * escala que hace que todas las cabezas midan lo mismo. Con eso se
 * recalculan la cara, la boca y la coronilla en el mundo, que son lo que usan
 * la cámara para encuadrar y los globos para apuntar el rabito.
 */

import type { PersonajeEnEscena } from '../modelo.js';
import type { Caja, Punto } from '../personaje/esqueleto.js';
import { aMundo, type Colocacion } from '../composicion/layout.js';
import type { CajaPx, FiguraImagen, PersonajeImagen } from './tipos.js';

/**
 * Alto de la cabeza en unidades del mundo. El personaje vectorial mide unas
 * 370 y su cabeza unas 120: así un personaje de imagen ocupa lo mismo en la
 * escena y los planos salen igual de apretados.
 */
export const ALTO_CABEZA = 118;

/** Gestos del catálogo que tienen figura propia. */
const POR_POSE: Record<string, string[]> = {
  saludando: ['saludando'],
  senalando: ['senalando'],
  'levantando-mano': ['senalando', 'saludando'],
  'usando-movil': ['movil'],
  escribiendo: ['movil'],
  'usando-ordenador': ['movil'],
  negando: ['negando'],
  'pulgar-arriba': ['pulgar-arriba'],
  'brazos-cruzados': ['brazos-cruzados'],
  'manos-en-cintura': ['brazos-cruzados'],
  pensando: ['pensando'],
  'encogiendo-hombros': ['encogerse'],
  celebrando: ['celebrando'],
  bailando: ['celebrando'],
  riendo: ['riendo'],
  sorprendido: ['sorprendido'],
  asustado: ['sorprendido'],
  // Si falta la figura (p. ej. Gemini la rechazó al fabricar una caricatura
  // propia), antes que "hablando" tranquilo, algo que aún diga que no.
  enfadado: ['enfadado', 'negando', 'brazos-cruzados'],
  triste: ['triste'],
  avergonzado: ['avergonzado'],
  cansado: ['cansado'],
  durmiendo: ['cansado'],
};

/** Si la pose no dice nada (de pie, hablando…), la cara decide. */
const POR_EXPRESION: Record<string, string[]> = {
  neutral: ['hablando'],
  feliz: ['feliz', 'hablando'],
  divertido: ['feliz', 'riendo'],
  'muy-feliz': ['celebrando', 'feliz'],
  emocionado: ['celebrando', 'feliz'],
  riendo: ['riendo', 'feliz'],
  sorprendido: ['sorprendido'],
  asustado: ['sorprendido'],
  confundido: ['encogerse', 'pensando'],
  preocupado: ['pensando', 'triste'],
  triste: ['triste'],
  llorando: ['triste'],
  enfadado: ['enfadado', 'negando', 'brazos-cruzados'],
  furioso: ['enfadado', 'negando', 'brazos-cruzados'],
  gritando: ['enfadado', 'negando', 'celebrando'],
  avergonzado: ['avergonzado'],
  cansado: ['cansado'],
  aburrido: ['cansado', 'brazos-cruzados'],
  dormido: ['cansado'],
  pensando: ['pensando'],
  sospechando: ['brazos-cruzados', 'pensando'],
  sarcastico: ['brazos-cruzados'],
  enamorado: ['enamorado', 'feliz'],
};

/**
 * Poses que solo dicen "está ahí": no pisan a la expresión. Una cara enfadada
 * "hablando" es la figura de enfadado, no la de hablar tranquilo.
 */
const POSES_NEUTRAS = new Set([
  'de-pie', 'mirando', 'mirando-espectador', 'escuchando', 'hablando', 'explicando', 'preguntando',
  'caminando', 'corriendo', 'sentado', 'sentado-hablando', 'mostrando', 'bebiendo',
]);

export function elegirFigura(personaje: PersonajeImagen, pj: Pick<PersonajeEnEscena, 'pose' | 'expresion'>): { id: string; figura: FiguraImagen } {
  const f = personaje.figuras;
  const candidatas = [
    ...(POSES_NEUTRAS.has(pj.pose) ? [] : POR_POSE[pj.pose] ?? []),
    ...(POR_EXPRESION[pj.expresion] ?? []),
    'hablando',
  ];
  const id = candidatas.find((c) => f[c]) ?? Object.keys(f)[0]!;
  return { id, figura: f[id]! };
}

/** Dónde va la imagen, en coordenadas locales del personaje (pies en 0,0). */
export interface FiguraColocada {
  id: string;
  figura: FiguraImagen;
  /** Unidades locales por píxel de la imagen. */
  k: number;
  /** Esquina superior izquierda de la imagen, en local. */
  x: number;
  y: number;
}

const centro = (c: CajaPx) => (c[0] + c[2]) / 2;

/**
 * Coloca la figura y reescribe las anclas de la colocación (cara, boca,
 * coronilla y caja del cuerpo) para que la cámara y los globos trabajen con
 * el dibujo que se va a ver, no con el muñeco vectorial que sustituye.
 */
export function colocarFigura(c: Colocacion, id: string, figura: FiguraImagen): FiguraColocada {
  const k = ALTO_CABEZA / Math.max(1, figura.cabeza[3] - figura.cabeza[1]);
  const px = centro(figura.pies);
  const py = figura.pies[3];
  const local = (x: number, y: number): Punto => ({ x: (x - px) * k, y: (y - py) * k });
  const mundo = (x: number, y: number) => aMundo(c, local(x, y));
  const cajaMundo = (b: CajaPx): Caja => {
    const a = mundo(b[0], b[1]);
    const z = mundo(b[2], b[3]);
    return { x: Math.min(a.x, z.x), y: Math.min(a.y, z.y), ancho: Math.abs(z.x - a.x), alto: Math.abs(z.y - a.y) };
  };

  c.cara = cajaMundo(figura.cara);
  c.boca = mundo(centro(figura.boca), (figura.boca[1] + figura.boca[3]) / 2);
  c.coronilla = mundo(centro(figura.cabeza), figura.cabeza[1]);
  c.caja = cajaMundo([0, 0, figura.ancho, figura.alto]);

  const esquina = local(0, 0);
  return { id, figura, k, x: esquina.x, y: esquina.y };
}
