/**
 * Geometría del personaje: dónde queda cada articulación para una pose.
 *
 * Es cálculo puro, sin SVG. Lo usan dos consumidores:
 * - el dibujo del cuerpo, que pinta tubos entre estas articulaciones;
 * - el layout (cámara, globos, efectos), que necesita saber dónde están la
 *   cara, la boca y las manos SIN dibujar nada.
 *
 * Coordenadas locales: origen en el suelo, entre los pies; x positiva hacia
 * donde mira el personaje; y negativa hacia arriba (como SVG). Unidades del
 * mundo a escala 1: un personaje mide unas 370 unidades.
 */

import type { Complexion } from '../modelo';
import type { DefBrazo, DefPierna, DefPose } from '../catalogo/tipos';

export interface Punto {
  x: number;
  y: number;
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Medidas por complexión. Todo lo demás del cuerpo sale de aquí. */
export interface Medidas {
  hombro: number; // semiancho de hombros
  cintura: number; // semiancho en la cintura
  cadera: number; // semiancho de cadera
  barriga: number; // cuánto sale la barriga por los lados
  grosorBrazo: number;
  grosorPierna: number;
  brazo: number;
  antebrazo: number;
  muslo: number;
  espinilla: number;
  torso: number;
  mano: number;
}

const BASE: Omit<Medidas, 'hombro' | 'cintura' | 'cadera' | 'barriga' | 'grosorBrazo' | 'grosorPierna'> = {
  brazo: 50,
  antebrazo: 46,
  muslo: 60,
  espinilla: 58,
  torso: 106,
  mano: 11,
};

export const MEDIDAS: Record<Complexion, Medidas> = {
  delgada: { ...BASE, hombro: 42, cintura: 32, cadera: 33, barriga: 0, grosorBrazo: 16, grosorPierna: 20 },
  media: { ...BASE, hombro: 48, cintura: 38, cadera: 37, barriga: 0, grosorBrazo: 19, grosorPierna: 23 },
  fuerte: { ...BASE, hombro: 57, cintura: 42, cadera: 40, barriga: 0, grosorBrazo: 24, grosorPierna: 27 },
  oronda: { ...BASE, hombro: 50, cintura: 54, cadera: 46, barriga: 14, grosorBrazo: 21, grosorPierna: 26 },
};

/** Altura del tobillo sobre el suelo (lo que ocupa el zapato). */
export const TOBILLO = 12;

/** Escala de la cabeza del avatar (lienzo 512) dentro del cuerpo. */
export const ESCALA_CABEZA = 0.42;

/** Punto del lienzo del avatar que se ata al cuello (bajo la barbilla). */
export const ANCLA_CABEZA: Punto = { x: 256, y: 352 };

/** Caja de la cara en el lienzo 512 (de sien a sien, de la coronilla a la barbilla). */
const CARA_LIENZO: Caja = { x: 148, y: 92, ancho: 216, alto: 276 };
const BOCA_LIENZO: Punto = { x: 256, y: 304 };
const OJOS_LIENZO: Punto = { x: 256, y: 226 };
const CORONILLA_LIENZO: Punto = { x: 256, y: 96 };

export interface BrazoResuelto {
  hombro: Punto;
  codo: Punto;
  muneca: Punto;
  mano: Punto;
  /** Ángulo absoluto del antebrazo (grados, 0 = abajo). */
  angulo: number;
  def: DefBrazo;
}

export interface PiernaResuelta {
  cadera: Punto;
  rodilla: Punto;
  tobillo: Punto;
  /** Ángulo absoluto de la espinilla. */
  angulo: number;
}

/**
 * Todo lo que se sabe de un personaje en una pose, en coordenadas locales
 * y ya con el torso inclinado. Los puntos del tren superior están girados;
 * `inclinacion` y `pivote` se guardan para que el dibujo aplique el mismo giro
 * con un `rotate()` en vez de recalcular cada trazo.
 */
export interface Esqueleto {
  medidas: Medidas;
  /** Giro del tren superior (grados) alrededor de `pivote`. */
  inclinacion: number;
  pivote: Punto;
  /** Altura real de la cadera (y negativa). */
  caderaY: number;
  /** Altura de los hombros ANTES de inclinar (el dibujo trabaja sin girar). */
  hombrosY: number;
  /** Punto del cuello donde se ata la cabeza, antes de inclinar. */
  cuello: Punto;
  inclinacionCabeza: number;

  /** Sin girar: para dibujar dentro del grupo inclinado. */
  brazoDelante: BrazoResuelto;
  brazoDetras: BrazoResuelto;
  piernaDelante: PiernaResuelta;
  piernaDetras: PiernaResuelta;

  /** Ya girados: para el layout. */
  anclas: {
    cara: Caja;
    boca: Punto;
    ojos: Punto;
    coronilla: Punto;
    manoDelante: Punto;
    manoDetras: Punto;
    asiento: Punto | null;
  };
  caja: Caja;
}

const rad = (g: number) => (g * Math.PI) / 180;

/** Vector unitario para un ángulo con 0 = abajo y positivo = hacia delante. */
export function direccion(grados: number): Punto {
  return { x: Math.sin(rad(grados)), y: Math.cos(rad(grados)) };
}

function mas(p: Punto, d: Punto, largo: number): Punto {
  return { x: p.x + d.x * largo, y: p.y + d.y * largo };
}

/** Gira `p` alrededor de `c` (grados, sentido de las agujas como SVG). */
export function girar(p: Punto, c: Punto, grados: number): Punto {
  if (!grados) return p;
  const a = rad(grados);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

/** Del lienzo del avatar a coordenadas del cuerpo (sin girar el tren superior). */
export function deLienzo(p: Punto, cuello: Punto, inclinacionCabeza: number): Punto {
  const local = {
    x: cuello.x + (p.x - ANCLA_CABEZA.x) * ESCALA_CABEZA,
    y: cuello.y + (p.y - ANCLA_CABEZA.y) * ESCALA_CABEZA,
  };
  return girar(local, cuello, inclinacionCabeza);
}

function resolverPierna(cadera: Punto, def: DefPierna, m: Medidas): PiernaResuelta {
  const rodilla = mas(cadera, direccion(def.cadera), m.muslo);
  const angulo = def.cadera + def.rodilla;
  const tobillo = mas(rodilla, direccion(angulo), m.espinilla);
  return { cadera, rodilla, tobillo, angulo };
}

function resolverBrazo(hombro: Punto, def: DefBrazo, m: Medidas): BrazoResuelto {
  const codo = mas(hombro, direccion(def.hombro), m.brazo);
  const angulo = def.hombro + def.codo;
  const muneca = mas(codo, direccion(angulo), m.antebrazo);
  const mano = mas(muneca, direccion(angulo), m.mano * 0.55);
  return { hombro, codo, muneca, mano, angulo, def };
}

function cajaDe(puntos: Punto[], margen = 0): Caja {
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const x = Math.min(...xs) - margen;
  const y = Math.min(...ys) - margen;
  return { x, y, ancho: Math.max(...xs) + margen - x, alto: Math.max(...ys) + margen - y };
}

/**
 * Resuelve una pose.
 *
 * Las piernas se calculan primero con la cadera a una altura provisional y
 * luego TODO el cuerpo se baja o sube para que el pie más bajo toque el
 * suelo. Así una pose de caminar o de agacharse no hay que calibrarla a
 * mano: se define con ángulos y el personaje nunca flota ni se hunde.
 */
export function resolverEsqueleto(pose: DefPose, complexion: Complexion): Esqueleto {
  const m = MEDIDAS[complexion];
  const separacionPiernas = Math.max(12, m.cadera * 0.45);

  // 1. Piernas con una cadera provisional en y = 0.
  const pDel0 = resolverPierna({ x: separacionPiernas, y: 0 }, pose.piernaDelante, m);
  const pDet0 = resolverPierna({ x: -separacionPiernas, y: 0 }, pose.piernaDetras, m);

  // 2. Cuánto hay que bajar para que el tobillo más bajo quede a ras de zapato.
  let caderaY = -(Math.max(pDel0.tobillo.y, pDet0.tobillo.y) + TOBILLO);
  if (pose.alturaCadera !== undefined && pose.asiento) {
    // Sentado: manda el asiento; los pies llegan (o cuelgan) desde ahí.
    caderaY = -pose.alturaCadera;
  }
  const bajar = (p: Punto): Punto => ({ x: p.x, y: p.y + caderaY });
  const piernaDelante: PiernaResuelta = {
    ...pDel0,
    cadera: bajar(pDel0.cadera),
    rodilla: bajar(pDel0.rodilla),
    tobillo: bajar(pDel0.tobillo),
  };
  const piernaDetras: PiernaResuelta = {
    ...pDet0,
    cadera: bajar(pDet0.cadera),
    rodilla: bajar(pDet0.rodilla),
    tobillo: bajar(pDet0.tobillo),
  };
  // Un pie sentado no puede atravesar el suelo.
  for (const p of [piernaDelante, piernaDetras]) {
    if (p.tobillo.y > -TOBILLO) p.tobillo = { x: p.tobillo.x, y: -TOBILLO };
  }

  // 3. Tren superior, sin girar.
  const encoger = pose.encoger ?? 0;
  const hombrosY = caderaY - m.torso - encoger * 0.35;
  const alturaHombro = hombrosY + 8 - encoger;
  const hombroDel = { x: m.hombro - 5, y: alturaHombro };
  const hombroDet = { x: -(m.hombro - 5), y: alturaHombro };
  const brazoDelante = resolverBrazo(hombroDel, pose.brazoDelante, m);
  const brazoDetras = resolverBrazo(hombroDet, pose.brazoDetras, m);
  const cuello = { x: 0, y: hombrosY - 12 + encoger * 0.6 };
  const inclinacionCabeza = pose.cabeza?.inclinacion ?? 0;

  // 4. Inclinación del torso alrededor de la cadera.
  const inclinacion = pose.torso?.inclinacion ?? 0;
  const pivote = { x: 0, y: caderaY };
  const g = (p: Punto) => girar(p, pivote, inclinacion);

  const esquinas = [
    { x: CARA_LIENZO.x, y: CARA_LIENZO.y },
    { x: CARA_LIENZO.x + CARA_LIENZO.ancho, y: CARA_LIENZO.y },
    { x: CARA_LIENZO.x, y: CARA_LIENZO.y + CARA_LIENZO.alto },
    { x: CARA_LIENZO.x + CARA_LIENZO.ancho, y: CARA_LIENZO.y + CARA_LIENZO.alto },
  ].map((p) => g(deLienzo(p, cuello, inclinacionCabeza)));
  const cara = cajaDe(esquinas);

  const anclas = {
    cara,
    boca: g(deLienzo(BOCA_LIENZO, cuello, inclinacionCabeza)),
    ojos: g(deLienzo(OJOS_LIENZO, cuello, inclinacionCabeza)),
    coronilla: g(deLienzo(CORONILLA_LIENZO, cuello, inclinacionCabeza)),
    manoDelante: g(brazoDelante.mano),
    manoDetras: g(brazoDetras.mano),
    asiento: pose.asiento ? { x: 0, y: caderaY + m.grosorPierna * 0.5 } : null,
  };

  const puntos: Punto[] = [
    ...esquinas,
    anclas.manoDelante,
    anclas.manoDetras,
    g(brazoDelante.codo),
    g(brazoDetras.codo),
    g(hombroDel),
    g(hombroDet),
    piernaDelante.rodilla,
    piernaDetras.rodilla,
    piernaDelante.tobillo,
    piernaDetras.tobillo,
    { x: -m.cadera, y: caderaY },
    { x: m.cadera, y: caderaY },
    { x: 0, y: 0 },
  ];

  return {
    medidas: m,
    inclinacion,
    pivote,
    caderaY,
    hombrosY,
    cuello,
    inclinacionCabeza,
    brazoDelante,
    brazoDetras,
    piernaDelante,
    piernaDetras,
    anclas,
    caja: cajaDe(puntos, 14),
  };
}
