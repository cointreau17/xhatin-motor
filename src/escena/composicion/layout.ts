/**
 * Layout: de la viñeta (datos relativos) a posiciones reales en el mundo.
 *
 * El director dice "Alberto está a la izquierda, al fondo, mirando a Juan".
 * Aquí se convierte en "Alberto está en x=420, y=530, a escala 0.9, dibujado
 * en espejo, con la cara en esta caja y las pupilas desplazadas hacia allí".
 *
 * Sin SVG todavía: el compositor dibuja con esto, y los globos y la cámara
 * lo usan para saber dónde están las caras sin dibujar nada.
 */

import type { Catalogo } from '../catalogo/catalogo.js';
import type { DefProp } from '../catalogo/tipos.js';
import { MUNDO, SUELO, TAM_VINETA, type PersonajeEnEscena, type PropEnEscena, type Vineta } from '../modelo.js';
import { resolverEsqueleto, type Caja, type Esqueleto, type Punto } from '../personaje/esqueleto.js';

export interface Colocacion {
  personaje: PersonajeEnEscena;
  esqueleto: Esqueleto;
  /** Pies, en el mundo. */
  x: number;
  y: number;
  escala: number;
  espejo: boolean;
  /** Anclas en el mundo. */
  cara: Caja;
  boca: Punto;
  coronilla: Punto;
  caja: Caja;
  manoDelante: Punto;
  manoDetras: Punto;
  /** Vector de mirada en coordenadas locales (x hacia donde mira), −1…1. */
  mirada: { x: number; y: number };
  /** Giro de la cara (0 = de frente al lector). */
  giro: number;
}

export interface ColocacionProp {
  prop: PropEnEscena;
  def: DefProp;
  x: number;
  y: number;
  escala: number;
  caja: Caja;
}

export interface Layout {
  ancho: number;
  alto: number;
  /** Inicio del set en x del mundo. */
  setX: number;
  setAncho: number;
  personajes: Colocacion[];
  props: ColocacionProp[];
}

export function sueloEn(profundidad: number): number {
  return SUELO.delante - (SUELO.delante - SUELO.fondo) * profundidad;
}

export function escalaEn(profundidad: number): number {
  return 1 - 0.2 * profundidad;
}

/** De coordenadas locales de un personaje al mundo. */
export function aMundo(c: { x: number; y: number; escala: number; espejo: boolean }, p: Punto): Punto {
  return { x: c.x + (c.espejo ? -p.x : p.x) * c.escala, y: c.y + p.y * c.escala };
}

function cajaAMundo(c: { x: number; y: number; escala: number; espejo: boolean }, k: Caja): Caja {
  const a = aMundo(c, { x: k.x, y: k.y });
  const b = aMundo(c, { x: k.x + k.ancho, y: k.y + k.alto });
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), ancho: Math.abs(b.x - a.x), alto: Math.abs(b.y - a.y) };
}

export function centro(k: Caja): Punto {
  return { x: k.x + k.ancho / 2, y: k.y + k.alto / 2 };
}

export function calcularLayout(v: Vineta, catalogo: Catalogo): Layout {
  const { ancho, alto } = TAM_VINETA[v.formato];
  const setAncho = ancho;
  const setX = MUNDO.ancho / 2 - setAncho / 2;

  // 1. Personajes: posición, escala y esqueleto.
  const personajes: Colocacion[] = v.personajes.map((p) => {
    const pose = catalogo.poses.obtener(p.pose);
    const e = resolverEsqueleto(pose, p.identidad.complexion);
    const escala = escalaEn(p.profundidad) * p.identidad.estatura * (p.escala ?? 1);
    const base = { x: setX + p.x * setAncho, y: sueloEn(p.profundidad), escala, espejo: p.orientacion === 'izquierda' };
    return {
      personaje: p,
      esqueleto: e,
      ...base,
      cara: cajaAMundo(base, e.anclas.cara),
      boca: aMundo(base, e.anclas.boca),
      coronilla: aMundo(base, e.anclas.coronilla),
      caja: cajaAMundo(base, e.caja),
      manoDelante: aMundo(base, e.anclas.manoDelante),
      manoDetras: aMundo(base, e.anclas.manoDetras),
      mirada: { x: 0, y: 0 },
      giro: 0,
    };
  });

  // 2. Props de escena.
  const props: ColocacionProp[] = [];
  const mesa = v.props.find((p) => p.tipo === 'mesa');
  let mesaSup: Punto | null = null;
  for (const prop of v.props) {
    const def = catalogo.props.buscar(prop.tipo);
    if (!def || def.anclaje === 'mesa') continue;
    const escala = escalaEn(prop.profundidad);
    const x = setX + prop.x * setAncho;
    const y = sueloEn(prop.profundidad);
    props.push({ prop, def, x, y, escala, caja: { x: x + def.caja.x * escala, y: y + def.caja.y * escala, ancho: def.caja.ancho * escala, alto: def.caja.alto * escala } });
    if (prop === mesa) mesaSup = { x, y: y - (def.superficie ?? 90) * escala };
  }
  for (const prop of v.props) {
    const def = catalogo.props.buscar(prop.tipo);
    if (!def || def.anclaje !== 'mesa' || !mesaSup) continue;
    const escala = escalaEn(prop.profundidad);
    const x = setX + prop.x * setAncho;
    const y = mesaSup.y + 2;
    props.push({ prop, def, x, y, escala, caja: { x: x + def.caja.x * escala, y: y + def.caja.y * escala, ancho: def.caja.ancho * escala, alto: def.caja.alto * escala } });
  }

  // 3. Miradas: ahora que se sabe dónde está cada cosa.
  for (const c of personajes) {
    const m = c.personaje.mirada;
    const ojos = aMundo(c, c.esqueleto.anclas.ojos);
    let objetivo: Punto | null = null;
    let giro = 0.75;
    switch (m.tipo) {
      case 'personaje':
      case 'interlocutor': {
        const otro = personajes.find((o) => o.personaje.id === m.objetivo && o !== c) ?? personajes.find((o) => o !== c);
        if (otro) objetivo = aMundo(otro, otro.esqueleto.anclas.ojos);
        else giro = 0;
        break;
      }
      case 'objeto': {
        const mano = c.personaje.propEnMano ? manoDelProp(c, catalogo) : null;
        const prop = props.find((p) => p.prop.id === m.objetivo);
        objetivo = mano ?? (prop ? centro(prop.caja) : null);
        giro = 0.5;
        break;
      }
      case 'arriba':
        objetivo = { x: ojos.x + (c.espejo ? -40 : 40), y: ojos.y - 200 };
        giro = 0.35;
        break;
      case 'abajo':
        objetivo = { x: ojos.x + (c.espejo ? -60 : 60), y: ojos.y + 220 };
        giro = 0.5;
        break;
      case 'apartar':
        objetivo = { x: ojos.x + (c.espejo ? 220 : -220), y: ojos.y + 60 };
        giro = -0.4;
        break;
      case 'frente':
      case 'espectador':
      default:
        objetivo = null;
        giro = 0;
    }
    if (objetivo) {
      const dx = objetivo.x - ojos.x;
      const dy = objetivo.y - ojos.y;
      const local = c.espejo ? -dx : dx;
      const d = Math.max(1, Math.hypot(local, dy));
      c.mirada = { x: local / d, y: (dy / d) * 0.9 };
      // Si mira hacia atrás (a su espalda), la cara no puede girar hacia allí.
      if (local < 0 && giro > 0) giro = -0.2;
    }
    c.giro = giro;
  }

  return { ancho, alto, setX, setAncho, personajes, props };
}

/** Punto de agarre del prop en mano (la mano que dice la pose). */
export function manoDelProp(c: Colocacion, catalogo: Catalogo): Punto {
  const pose = catalogo.poses.obtener(c.personaje.pose);
  return pose.sujeta?.mano === 'detras' ? c.manoDetras : c.manoDelante;
}
