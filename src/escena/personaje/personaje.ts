/**
 * Dibuja un personaje completo: cabeza del avatar + cuerpo por esqueleto.
 *
 * Entrada: identidad (quién es), pose, expresión y mirada (qué hace).
 * Salida: un fragmento SVG en coordenadas LOCALES (origen en el suelo entre
 * los pies, mirando a la derecha). Quien lo coloca en la viñeta aplica
 * posición, escala y espejo con un `transform`.
 *
 * Orden de capas, de atrás adelante:
 *   asiento → brazo trasero → piernas → cadera → capucha → cuello → torso
 *   → brazos "torso" → cabeza → brazos "cabeza"
 *
 * El tren superior va en un grupo girado alrededor de la cadera: inclinar
 * la pose no obliga a recalcular trazos.
 */

import { PALETAS } from '../../hilaravatar/hilaravatar.js';
import type { ConfigAvatar } from '../../hilaravatar/hilaravatar.js';
import type { IdentidadVisual } from '../modelo.js';
import type { DefExpresion, DefMarca, DefPose, FormaMano } from '../catalogo/tipos.js';
import { chapaEnPecho, configDe, dibujarCabeza } from './cabeza.js';
import {
  ANCLA_CABEZA,
  ESCALA_CABEZA,
  TOBILLO,
  direccion,
  resolverEsqueleto,
  type BrazoResuelto,
  type Esqueleto,
  type PiernaResuelta,
  type Punto,
} from './esqueleto.js';
import { contornoTorso, prendaDe, type GeometriaTorso, type Prenda } from './ropa.js';

const TINTA = 'var(--dh-tinta, #1B1714)';
const PIEL = 'var(--dh-piel, #E8B58C)';

export interface OpcionesPersonaje {
  identidad: IdentidadVisual;
  pose: DefPose;
  expresion: DefExpresion;
  marcas: readonly DefMarca[];
  /** Vector de mirada en coordenadas locales (x positiva = hacia donde mira). */
  mirada: { x: number; y: number };
  /** Giro de la cara hacia donde mira (0–1). */
  giro: number;
  habla: boolean;
  /** Semilla para desfasar parpadeo y respiración entre personajes. */
  semilla: number;
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/* --------------------------------------------------------------- colores -- */

/**
 * Las mismas variables CSS que pone el motor del avatar en su `<svg>`.
 * Van en el grupo del personaje: así cada uno lleva sus colores aunque
 * compartan viñeta.
 */
export function estiloColores(config: ConfigAvatar, identidad: IdentidadVisual): string {
  const c = config.colores;
  const tono = (lista: typeof PALETAS.piel, id: string) => lista.find((x) => x.id === id) ?? lista[0]!;
  const piel = tono(PALETAS.piel, c.piel);
  const pelo = tono(PALETAS.pelo, c.pelo);
  const ropa = tono(PALETAS.ropa, c.ropa);
  const fondo = tono(PALETAS.fondo, c.fondo);
  return [
    `--dh-piel:${piel.color}`,
    `--dh-piel-sombra:${piel.sombra}`,
    `--dh-pelo:${pelo.color}`,
    `--dh-pelo-sombra:${pelo.sombra}`,
    `--dh-ropa:${ropa.color}`,
    `--dh-ropa-2:${ropa.secundario}`,
    `--dh-fondo:${fondo.color}`,
    `--dh-fondo-2:${fondo.secundario}`,
    `--dh-pantalon:${identidad.pantalon}`,
    `--dh-pantalon-sombra:${identidad.pantalonSombra}`,
    `--dh-calzado:${identidad.calzadoColor}`,
  ].join(';');
}

/* ---------------------------------------------------------------- tubos --- */

/** Un miembro: trazo grueso de tinta y encima el relleno. Da el contorno gratis. */
function tubo(puntos: Punto[], grosor: number, color: string, contorno = 9): string {
  const d = 'M' + puntos.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L');
  return (
    `<path d="${d}" fill="none" stroke="${TINTA}" stroke-width="${grosor + contorno}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function puntoEntre(a: Punto, b: Punto, t: number): Punto {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/* ---------------------------------------------------------------- manos --- */

function dedo(desde: Punto, ang: number, largo: number): string {
  const d = direccion(ang);
  const hasta = { x: desde.x + d.x * largo, y: desde.y + d.y * largo };
  return tubo([desde, hasta], 5, PIEL, 7);
}

function dibujarMano(forma: FormaMano, c: Punto, angulo: number, t: number): string {
  const rot = `transform="rotate(${f(-angulo)} ${f(c.x)} ${f(c.y)})"`;
  const trazo = `stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"`;
  const d = direccion(angulo);
  const lateral = { x: d.y, y: -d.x };

  switch (forma) {
    case 'puno':
    case 'sujeta':
      return (
        `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(t * 0.95)}" fill="${PIEL}" ${trazo}/>` +
        `<path d="M${f(c.x - t * 0.45)} ${f(c.y + 1)} q${f(t * 0.45)} ${f(t * 0.35)} ${f(t * 0.9)} 0" fill="none" stroke="${TINTA}" stroke-width="3" stroke-linecap="round" ${rot}/>`
      );
    case 'senala': {
      const base = { x: c.x + d.x * t * 0.4, y: c.y + d.y * t * 0.4 };
      return (
        dedo(base, angulo, 19) +
        `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(t * 0.9)}" fill="${PIEL}" ${trazo}/>`
      );
    }
    case 'pulgar':
      return (
        dedo({ x: c.x, y: c.y - t * 0.5 }, 180, 13) +
        `<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(t)}" ry="${f(t * 0.85)}" fill="${PIEL}" ${trazo}/>`
      );
    case 'saludo': {
      const palma = { x: c.x + d.x * 2, y: c.y + d.y * 2 };
      const dedos = [-34, -12, 10, 32].map((a) => dedo({ x: palma.x + d.x * t * 0.5, y: palma.y + d.y * t * 0.5 }, angulo + a, 11)).join('');
      const pulgar = dedo({ x: palma.x + lateral.x * t * 0.6, y: palma.y + lateral.y * t * 0.6 }, angulo + 72, 9);
      return dedos + pulgar + `<circle cx="${f(palma.x)}" cy="${f(palma.y)}" r="${f(t * 0.95)}" fill="${PIEL}" ${trazo}/>`;
    }
    case 'palma':
      return (
        `<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(t * 0.85)}" ry="${f(t * 1.35)}" fill="${PIEL}" ${trazo} ${rot}/>` +
        dedo({ x: c.x - lateral.x * t * 0.5, y: c.y - lateral.y * t * 0.5 }, angulo - 60, 8)
      );
    case 'abierta':
      return (
        `<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(t * 0.9)}" ry="${f(t * 1.3)}" fill="${PIEL}" ${trazo} ${rot}/>` +
        dedo({ x: c.x + lateral.x * t * 0.55, y: c.y + lateral.y * t * 0.55 }, angulo + 55, 8)
      );
    case 'relajada':
    default:
      return `<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(t * 0.85)}" ry="${f(t * 1.12)}" fill="${PIEL}" ${trazo} ${rot}/>`;
  }
}

/* ---------------------------------------------------------------- partes -- */

function dibujarBrazo(b: BrazoResuelto, prenda: Prenda, grosor: number, t: number, clase: string): string {
  let s = '';
  if (prenda.manga === 'larga') {
    s += tubo([b.hombro, b.codo, b.muneca], grosor, prenda.colorManga);
    if (prenda.rayaManga) {
      s += `<path d="M${f(b.hombro.x)} ${f(b.hombro.y)} L${f(b.codo.x)} ${f(b.codo.y)} L${f(b.muneca.x)} ${f(b.muneca.y)}" fill="none" stroke="${prenda.rayaManga}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  } else {
    s += tubo([b.hombro, b.codo, b.muneca], grosor * 0.86, PIEL);
    const finManga = puntoEntre(b.hombro, b.codo, 0.62);
    s += tubo([b.hombro, finManga], grosor + 4, prenda.colorManga);
  }
  s += dibujarMano(b.def.mano, b.mano, b.angulo, t);
  // Origen de giro en el hombro para las animaciones de brazo (saludar…).
  return `<g class="dh-brazo ${clase}" style="transform-origin:${f(b.hombro.x)}px ${f(b.hombro.y)}px">${s}</g>`;
}

function dibujarZapato(p: PiernaResuelta, calzado: IdentidadVisual['calzado']): string {
  const x = p.tobillo.x;
  const y = p.tobillo.y; // unos 12 por encima del suelo si está apoyado
  const suelo = y + TOBILLO;
  const inclinacion = Math.max(-25, Math.min(25, -p.angulo * 0.35));
  const rot = `transform="rotate(${f(inclinacion)} ${f(x)} ${f(y)})"`;
  const trazo = `stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"`;
  switch (calzado) {
    case 'botas':
      return `<g ${rot}><path d="M${f(x - 12)} ${f(y - 24)} L${f(x + 11)} ${f(y - 24)} L${f(x + 12)} ${f(y - 3)} Q${f(x + 31)} ${f(y - 1)} ${f(x + 31)} ${f(suelo - 3)} L${f(x - 14)} ${f(suelo)} Z" fill="var(--dh-calzado)" ${trazo}/><path d="M${f(x - 14)} ${f(suelo - 3)} L${f(x + 31)} ${f(suelo - 4)}" stroke="${TINTA}" stroke-width="4"/></g>`;
    case 'sandalias':
      return `<g ${rot}><path d="M${f(x - 10)} ${f(y - 6)} Q${f(x + 22)} ${f(y - 8)} ${f(x + 28)} ${f(suelo - 4)} L${f(x - 12)} ${f(suelo - 3)} Z" fill="${PIEL}" ${trazo}/><path d="M${f(x - 13)} ${f(suelo - 2)} L${f(x + 30)} ${f(suelo - 3)}" stroke="var(--dh-calzado)" stroke-width="6" stroke-linecap="round"/><path d="M${f(x + 4)} ${f(y - 6)} L${f(x + 14)} ${f(suelo - 4)} M${f(x + 16)} ${f(y - 3)} L${f(x + 22)} ${f(suelo - 4)}" stroke="var(--dh-calzado)" stroke-width="5" stroke-linecap="round"/></g>`;
    case 'zapatos':
      return `<g ${rot}><path d="M${f(x - 12)} ${f(y - 6)} L${f(x + 14)} ${f(y - 5)} Q${f(x + 32)} ${f(y - 2)} ${f(x + 32)} ${f(suelo - 2)} L${f(x - 14)} ${f(suelo)} Q${f(x - 16)} ${f(y)} ${f(x - 12)} ${f(y - 6)} Z" fill="var(--dh-calzado)" ${trazo}/><path d="M${f(x + 16)} ${f(y - 1)} q6 1 9 5" fill="none" stroke="#F2E9D8" stroke-width="3" stroke-linecap="round" opacity="0.6"/></g>`;
    case 'zapatillas':
    default:
      return `<g ${rot}><path d="M${f(x - 12)} ${f(y - 8)} L${f(x + 12)} ${f(y - 6)} Q${f(x + 32)} ${f(y - 2)} ${f(x + 32)} ${f(suelo - 3)} L${f(x - 14)} ${f(suelo - 1)} Q${f(x - 17)} ${f(y - 2)} ${f(x - 12)} ${f(y - 8)} Z" fill="var(--dh-calzado)" ${trazo}/><path d="M${f(x - 14)} ${f(suelo - 3)} L${f(x + 32)} ${f(suelo - 4)}" stroke="#F2E9D8" stroke-width="5"/><path d="M${f(x - 14)} ${f(suelo + 1)} L${f(x + 32)} ${f(suelo)}" stroke="${TINTA}" stroke-width="4"/><path d="M${f(x + 2)} ${f(y - 5)} l5 5 M${f(x + 9)} ${f(y - 4)} l5 5" stroke="${TINTA}" stroke-width="3" stroke-linecap="round"/></g>`;
  }
}

function dibujarPierna(p: PiernaResuelta, grosor: number, identidad: IdentidadVisual): string {
  return (
    tubo([p.cadera, p.rodilla, p.tobillo], grosor, 'var(--dh-pantalon)') +
    dibujarZapato(p, identidad.calzado)
  );
}

function dibujarAsiento(e: Esqueleto): string {
  if (!e.anclas.asiento) return '';
  const y = e.caderaY + e.medidas.grosorPierna * 0.55;
  const madera = '#8A6A4A';
  const tr = `stroke="${TINTA}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`;
  return (
    `<g class="dh-asiento">` +
    `<path d="M-26 ${f(y)} L-34 -2 M26 ${f(y)} L34 -2 M-29 ${f(y * 0.45)} L29 ${f(y * 0.45)}" fill="none" ${tr}/>` +
    `<path d="M-26 ${f(y)} L-34 -2 M26 ${f(y)} L34 -2" fill="none" stroke="${madera}" stroke-width="3" stroke-linecap="round"/>` +
    `<rect x="-40" y="${f(y - 4)}" width="80" height="14" rx="5" fill="${madera}" ${tr}/>` +
    `</g>`
  );
}

/* ------------------------------------------------------------ personaje --- */

export interface PersonajeDibujado {
  svg: string;
  esqueleto: Esqueleto;
  config: ConfigAvatar;
}

/**
 * El personaje, como fragmento SVG en coordenadas locales.
 *
 * `props` en mano NO se dibujan aquí: los pinta el compositor en
 * `esqueleto.anclas.manoDelante/manoDetras`, porque pertenecen a la escena
 * (pueden llevar una imagen adjunta) y no al cuerpo.
 */
export function dibujarPersonaje(op: OpcionesPersonaje): PersonajeDibujado {
  const { identidad, pose } = op;
  const config = configDe(identidad.codigo);
  const e = resolverEsqueleto(pose, identidad.complexion);
  const m = e.medidas;
  const prenda = prendaDe(config.piezas.cuerpo);

  const g: GeometriaTorso = { sw: m.hombro, ww: m.cintura, hw: m.cadera, b: m.barriga, sy: e.hombrosY, hy: e.caderaY };

  const brazo = (b: BrazoResuelto, clase: string) => dibujarBrazo(b, prenda, m.grosorBrazo, m.mano, clase);
  const brazos = { detras: [] as string[], torso: [] as string[], cabeza: [] as string[] };
  const capa = (b: BrazoResuelto, porDefecto: 'detras' | 'torso') => b.def.capa ?? porDefecto;
  brazos[capa(e.brazoDetras, 'detras')].push(brazo(e.brazoDetras, 'dh-brazo-det'));
  brazos[capa(e.brazoDelante, 'torso')].push(brazo(e.brazoDelante, 'dh-brazo-del'));

  const retraso = (op.semilla % 997) / 997;
  const cabeza = dibujarCabeza(config, {
    expresion: op.expresion,
    marcas: op.marcas,
    mirada: op.mirada,
    giro: op.giro,
    habla: op.habla,
    parpadea: true,
    retrasoParpadeo: 1.2 + retraso * 3.4,
  });

  const cuelloAncho = 13 + (identidad.complexion === 'fuerte' ? 3 : 0);
  const cuello =
    `<path d="M${-cuelloAncho} ${f(e.cuello.y - 6)} L${-cuelloAncho} ${f(e.hombrosY + 2)} Q0 ${f(e.hombrosY + 8)} ${cuelloAncho} ${f(e.hombrosY + 2)} L${cuelloAncho} ${f(e.cuello.y - 6)} Z" fill="${PIEL}" stroke="${TINTA}" stroke-width="6"/>` +
    `<path d="M${-cuelloAncho + 3} ${f(e.hombrosY - 6)} Q0 ${f(e.hombrosY)} ${cuelloAncho - 3} ${f(e.hombrosY - 6)}" fill="none" stroke="var(--dh-piel-sombra)" stroke-width="5"/>`;

  const cadera =
    `<path d="M${-m.cadera - 2} ${f(e.caderaY - 12)} L${m.cadera + 2} ${f(e.caderaY - 12)} L${m.cadera + 4} ${f(e.caderaY + 14)} Q0 ${f(e.caderaY + 24)} ${-m.cadera - 4} ${f(e.caderaY + 14)} Z" fill="var(--dh-pantalon)" stroke="${TINTA}" stroke-width="7" stroke-linejoin="round"/>`;

  const torso =
    `<path d="${contornoTorso(g)}" fill="${prenda.color}" stroke="${TINTA}" stroke-width="8" stroke-linejoin="round"/>` +
    prenda.detalles(g) +
    chapaEnPecho(config, -m.hombro * 0.48, e.hombrosY + 30, 0.36);

  const cabezaG =
    `<g class="dh-cabeza" transform="translate(${f(e.cuello.x)} ${f(e.cuello.y)}) rotate(${f(e.inclinacionCabeza)}) scale(${ESCALA_CABEZA}) translate(${-ANCLA_CABEZA.x} ${-ANCLA_CABEZA.y})">` +
    cabeza +
    `</g>`;

  const superior =
    `<g class="dh-superior" transform="rotate(${f(e.inclinacion)} ${f(e.pivote.x)} ${f(e.pivote.y)})">` +
    brazos.detras.join('') +
    `</g>`;

  // Las piernas van fuera del grupo girado: la inclinación es del tronco.
  const piernas =
    dibujarPierna(e.piernaDetras, m.grosorPierna, identidad) + dibujarPierna(e.piernaDelante, m.grosorPierna, identidad);

  const superiorDelante =
    `<g class="dh-superior" transform="rotate(${f(e.inclinacion)} ${f(e.pivote.x)} ${f(e.pivote.y)})">` +
    (prenda.detrasCuello?.(g) ?? '') +
    cuello +
    torso +
    brazos.torso.join('') +
    cabezaG +
    brazos.cabeza.join('') +
    `</g>`;

  const svg =
    dibujarAsiento(e) +
    superior +
    piernas +
    cadera +
    (prenda.faldon?.(g) ?? '') +
    superiorDelante;

  return { svg, esqueleto: e, config };
}
