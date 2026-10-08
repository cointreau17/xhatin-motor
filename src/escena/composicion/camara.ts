/**
 * Cámara: qué rectángulo del mundo (1200×600) enseña cada viñeta.
 *
 * Los planos no son posiciones fijas: se calculan a partir de dónde están
 * las caras y los cuerpos de los personajes en foco. Un primer plano de
 * alguien sentado encuadra más abajo que el de alguien de pie, sin que
 * nadie lo haya programado para ese caso.
 *
 * Siempre se deja aire encima de las cabezas: ahí van los globos.
 */

import type { TipoPlano, Vineta } from '../modelo.js';
import type { Caja } from '../personaje/esqueleto.js';
import { MUNDO, TECHO_MUNDO } from '../modelo.js';
import type { Colocacion, Layout } from './layout.js';
import { alturaGlobos } from './globos.js';

export interface Encuadre {
  /** Rectángulo del mundo que se ve. */
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Mundo → viñeta. */
  escala: number;
  inclinacion: number;
  plano: TipoPlano;
}

function union(cajas: Caja[]): Caja {
  const x = Math.min(...cajas.map((c) => c.x));
  const y = Math.min(...cajas.map((c) => c.y));
  const x2 = Math.max(...cajas.map((c) => c.x + c.ancho));
  const y2 = Math.max(...cajas.map((c) => c.y + c.alto));
  return { x, y, ancho: x2 - x, alto: y2 - y };
}

/** Ajusta una caja a la proporción de la viñeta, creciendo desde el centro, y la mete en el mundo. */
function ajustar(c: Caja, proporcion: number, anclaAbajo = false): Caja {
  let { ancho, alto } = c;
  const cx = c.x + c.ancho / 2;
  const abajo = c.y + c.alto;
  if (ancho / alto < proporcion) ancho = alto * proporcion;
  else alto = ancho / proporcion;
  if (ancho > MUNDO.ancho) {
    ancho = MUNDO.ancho;
    alto = ancho / proporcion;
  }
  const altoMax = MUNDO.alto - TECHO_MUNDO;
  if (alto > altoMax) {
    alto = altoMax;
    ancho = alto * proporcion;
  }
  const minAlto = 150;
  if (alto < minAlto) {
    alto = minAlto;
    ancho = alto * proporcion;
  }
  let x = cx - ancho / 2;
  // Al crecer, se crece hacia arriba (más aire para los globos), no hacia el suelo.
  let y = anclaAbajo ? abajo - alto : c.y + c.alto / 2 - alto / 2;
  x = Math.max(0, Math.min(MUNDO.ancho - ancho, x));
  // Por arriba se puede salir del decorado (se prolonga su color); por
  // abajo no: debajo del suelo no hay nada.
  y = Math.max(TECHO_MUNDO, Math.min(MUNDO.alto - alto, y));
  return { x, y, ancho, alto };
}

const cadera = (c: Colocacion) => c.y + c.esqueleto.caderaY * c.escala;

export function encuadrar(v: Vineta, layout: Layout, plano: TipoPlano = v.camara.plano, focoIds: string[] = v.camara.foco): Encuadre {
  const proporcion = layout.ancho / layout.alto;
  // Aire para los globos (en unidades de viñeta), estimado con el mismo
  // cálculo que usará la colocación. Nunca más del 62 % del alto.
  // La x de cada hablante aún no se sabe en pantalla (depende del
  // encuadre); para decidir filas basta el orden, que es el del mundo.
  const xMundo = (id: string | null) => {
    const c = layout.personajes.find((p) => p.personaje.id === id);
    return c ? c.coronilla.x : layout.ancho / 2;
  };
  const aireGlobos = Math.min(layout.alto * 0.66, alturaGlobos(v.globos, layout.ancho, v.rotulo, v.personajes.length >= 3, xMundo));
  /**
   * Alto de mundo necesario para que, con el suelo del encuadre en `abajo`,
   * la parte de arriba de las caras quede por debajo de los globos:
   *   (arribaCaras − y) · (altoV / H) ≥ aire   con   y = abajo − H
   *   ⇒ H ≥ (abajo − arribaCaras) / (1 − aire / altoV)
   */
  const altoConAire = (arribaCaras: number, abajo: number) =>
    (abajo - arribaCaras) / Math.max(0.3, 1 - (aireGlobos + 16) / layout.alto);
  const todos = layout.personajes;
  let foco = todos.filter((c) => focoIds.includes(c.personaje.id));
  if (!foco.length) foco = todos;

  let caja: Caja;
  let anclaAbajo = false;

  if (!todos.length || plano === 'general') {
    caja = { x: layout.setX, y: 0, ancho: layout.setAncho, alto: MUNDO.alto };
  } else {
    const caras = foco.map((c) => c.cara);
    const cara = union(caras);
    switch (plano) {
      case 'primerisimo': {
        const c = foco[0]!.cara;
        caja = { x: c.x - c.ancho * 0.15, y: c.y - c.alto * 0.32, ancho: c.ancho * 1.3, alto: c.alto * 1.45 };
        break;
      }
      case 'primer-plano': {
        const c = foco[0]!.cara;
        caja = { x: c.x - c.ancho * 0.5, y: c.y - c.alto * 0.85, ancho: c.ancho * 2, alto: c.alto * 2.5 };
        anclaAbajo = true;
        break;
      }
      case 'personaje-objeto': {
        const f = foco[0]!;
        const mano = f.manoDelante;
        const cuerpo = union([f.cara, { x: mano.x - 90, y: mano.y - 150, ancho: 180, alto: 190 }]);
        const abajo = Math.max(...foco.map(cadera)) + 30;
        const alto = altoConAire(cuerpo.y - 10, abajo);
        caja = { x: cuerpo.x - 40, y: abajo - alto, ancho: cuerpo.ancho + 80, alto };
        anclaAbajo = true;
        break;
      }
      case 'medio':
      case 'dos':
      case 'lateral': {
        const cuerpos = union(foco.map((c) => c.caja));
        const bottom = Math.max(...foco.map(cadera)) + 40;
        const alto = Math.max(altoConAire(cara.y - 12, bottom), (bottom - cara.y) * 1.55);
        caja = { x: cuerpos.x - 40, y: bottom - alto, ancho: cuerpos.ancho + 80, alto };
        anclaAbajo = true;
        break;
      }
      case 'grupo':
      default: {
        const cuerpos = union(todos.map((c) => c.caja));
        const bottom = Math.max(...todos.map((c) => c.y)) + 24;
        const alto = Math.max(altoConAire(cara.y - 12, bottom), (bottom - cara.y) * 1.3);
        caja = { x: cuerpos.x - 60, y: bottom - alto, ancho: Math.max(cuerpos.ancho + 120, layout.setAncho * 0.72), alto };
        anclaAbajo = true;
      }
    }
  }

  const r = ajustar(caja, proporcion, anclaAbajo);
  return {
    ...r,
    escala: layout.ancho / r.ancho,
    inclinacion: plano === 'lateral' ? v.camara.inclinacion ?? 4 : 0,
    plano,
  };
}

/** `transform` CSS/SVG que lleva el mundo a la viñeta con este encuadre. */
export function transformDe(e: Encuadre, layout: Layout): string {
  const k = e.escala;
  const base = `translate(${(-e.x * k).toFixed(2)} ${(-e.y * k).toFixed(2)}) scale(${k.toFixed(4)})`;
  if (!e.inclinacion) return base;
  return `rotate(${e.inclinacion} ${layout.ancho / 2} ${layout.alto / 2}) ${base}`;
}

/** Lo mismo como matriz CSS (para animar el zoom entre dos encuadres). */
export function matrizDe(e: Encuadre, layout: Layout): string {
  const k = e.escala;
  const a = (e.inclinacion * Math.PI) / 180;
  const cx = layout.ancho / 2;
  const cy = layout.alto / 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // rotate(a, cx, cy) · translate(tx, ty) · scale(k)
  const tx = -e.x * k;
  const ty = -e.y * k;
  const ma = cos * k;
  const mb = sin * k;
  const mc = -sin * k;
  const md = cos * k;
  const me = cos * tx - sin * ty + cx - cos * cx + sin * cy;
  const mf = sin * tx + cos * ty + cy - sin * cx - cos * cy;
  return `matrix(${ma.toFixed(4)}, ${mb.toFixed(4)}, ${mc.toFixed(4)}, ${md.toFixed(4)}, ${me.toFixed(2)}, ${mf.toFixed(2)})`;
}

/** Una caja del mundo, vista en la viñeta (sin inclinación: para colocar globos basta). */
export function aVineta(e: Encuadre, c: Caja): Caja {
  return { x: (c.x - e.x) * e.escala, y: (c.y - e.y) * e.escala, ancho: c.ancho * e.escala, alto: c.alto * e.escala };
}
