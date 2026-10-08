/**
 * La cabeza del personaje, hecha con las piezas del avatar.
 *
 * Es la parte que garantiza la identidad: se usan LAS MISMAS piezas y los
 * mismos colores que el usuario eligió en su perfil. Lo que se añade encima
 * no redibuja nada, solo reordena y desplaza capas:
 *
 * - Expresión: sustitución de ranuras (cejas, ojos, boca), igual que el motor
 *   del avatar, más las marcas de la expresión (rubor, sudor…).
 * - Mirada: se desplazan las pupilas, que en todas las piezas son círculos de
 *   tinta sin trazo. No hace falta una pieza por dirección.
 * - Giro: cejas, ojos, nariz, boca, barba y gafas se corren unas unidades
 *   hacia donde mira el personaje. Con eso una cara frontal se lee de tres
 *   cuartos, que es lo que hace que dos personajes "se miren".
 * - Vida: párpados para parpadear y una segunda boca para hablar, ambas
 *   animadas por CSS (no hay JavaScript por fotograma).
 *
 * Todo en el lienzo de 512×512 del avatar (IDENTIDAD.md).
 */

import { DATOS } from '../../hilaravatar/piezas.js';
import { normalizar, deCodigo } from '../../hilaravatar/hilaravatar';
import type { ConfigAvatar } from '../../hilaravatar/hilaravatar';
import type { DefExpresion, DefMarca, RanuraCara } from '../catalogo/tipos';

const PIEZAS = DATOS.piezas;

export interface OpcionesCabeza {
  expresion: DefExpresion;
  marcas: readonly DefMarca[];
  /** Mirada: vector −1…1 en cada eje (x positiva = hacia donde mira el cuerpo). */
  mirada: { x: number; y: number };
  /** 0 = de frente, 1 = tres cuartos hacia donde mira. */
  giro: number;
  /** Añade la segunda boca para la animación de habla. */
  habla: boolean;
  /** Añade párpados para parpadear. */
  parpadea: boolean;
  /** Retraso del parpadeo (s), para que no parpadeen todos a la vez. */
  retrasoParpadeo: number;
}

/**
 * Geometría de cada pieza de ojos, para los párpados.
 * Las que no están aquí (cerrados, rendijas, feliz) no parpadean: ya
 * están cerradas o casi.
 */
const OJOS_GEOMETRIA: Record<string, { cx: [number, number]; cy: number; rx: number; ry: number }> = {
  normales: { cx: [212, 300], cy: 226, rx: 31, ry: 25 },
  cansados: { cx: [212, 300], cy: 230, rx: 30, ry: 22 },
  saltones: { cx: [210, 302], cy: 224, rx: 34, ry: 34 },
  entrecerrados: { cx: [212, 300], cy: 226, rx: 30, ry: 16 },
  asimetricos: { cx: [209, 302], cy: 225, rx: 33, ry: 32 },
  despiertos: { cx: [212, 302], cy: 225, rx: 31, ry: 25 },
  bizcos: { cx: [214, 298], cy: 227, rx: 31, ry: 25 },
  'de-lado': { cx: [216, 304], cy: 225, rx: 31, ry: 25 },
  'exp-grito': { cx: [211, 301], cy: 226, rx: 30, ry: 30 },
  'exp-enfadado': { cx: [212, 300], cy: 230, rx: 31, ry: 22 },
  'exp-triste': { cx: [212, 300], cy: 232, rx: 31, ry: 23 },
  'exp-chulo': { cx: [214, 302], cy: 228, rx: 31, ry: 20 },
  'exp-pensando': { cx: [210, 298], cy: 220, rx: 31, ry: 25 },
};

/** Para hablar: la boca alterna entre la que tiene y esta. */
const BOCA_ALTERNA: Record<string, string> = {
  neutra: 'abierta',
  linea: 'abierta',
  sonrisa: 'dientes',
  mueca: 'abierta',
  torcida: 'abierta',
  triste: 'pucheros',
  pucheros: 'abierta',
  silbido: 'abierta',
  lengua: 'abierta',
  abierta: 'neutra',
  dientes: 'sonrisa',
  'exp-risa': 'dientes',
  'exp-grito': 'abierta',
  'exp-duda': 'abierta',
};

/** Pupilas: círculos de tinta sin trazo, de radio pequeño. */
const RE_PUPILA = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="var\(--dh-tinta[^"]*\)" stroke="none"\/>/g;
/** Brillos de las pupilas ('despiertos'). */
const RE_BRILLO = /<circle cx="([\d.]+)" cy="([\d.]+)" r="4" fill="#F7F3EA"\/>/g;

function moverPupilas(fragmento: string, dx: number, dy: number): string {
  if (!dx && !dy) return fragmento;
  const t = `transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})"`;
  return fragmento
    .replace(RE_PUPILA, (m, _cx, _cy, r) => (Number(r) <= 13 ? m.replace('/>', ` ${t}/>`) : m))
    .replace(RE_BRILLO, (m) => m.replace('/>', ` ${t}/>`));
}

function pieza(cat: string, id: string | undefined): string {
  return (id && PIEZAS[cat]?.[id]) || '';
}

/** Config de avatar desde un código, con cache (se pinta decenas de veces). */
const configs = new Map<string, ConfigAvatar>();
export function configDe(codigo: string): ConfigAvatar {
  let c = configs.get(codigo);
  if (!c) {
    c = normalizar(deCodigo(codigo));
    configs.set(codigo, c);
  }
  return c;
}

function parpados(ojos: string, dx: number, retraso: number): string {
  const g = OJOS_GEOMETRIA[ojos];
  if (!g) return '';
  const tapa = (cx: number) =>
    `<ellipse cx="${cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" fill="var(--dh-piel)" stroke="var(--dh-tinta, #1B1714)" stroke-width="7"/>` +
    `<path d="M${cx - g.rx + 6} ${g.cy + 4} Q${cx} ${g.cy + g.ry * 0.55} ${cx + g.rx - 6} ${g.cy + 4}" fill="none" stroke="var(--dh-tinta, #1B1714)" stroke-width="7" stroke-linecap="round"/>`;
  return (
    `<g class="dh-parpados" style="animation-delay:${retraso.toFixed(2)}s" transform="translate(${dx} 0)">` +
    tapa(g.cx[0]) +
    tapa(g.cx[1]) +
    `</g>`
  );
}

/**
 * Devuelve la cabeza como fragmentos SVG en el lienzo 512×512, sin `<svg>`
 * envolvente: el cuerpo la coloca con un `transform`.
 */
export function dibujarCabeza(config: ConfigAvatar, op: OpcionesCabeza): string {
  const piezas = { ...config.piezas } as Record<string, string>;
  const slots = op.expresion.slots;
  for (const r of Object.keys(slots) as RanuraCara[]) {
    const nuevo = slots[r];
    if (nuevo && PIEZAS[r]?.[nuevo]) piezas[r] = nuevo;
  }

  // Cuánto se corren los rasgos: la nariz algo más que el resto, que es lo
  // que vende el tres cuartos.
  const giro = Math.max(-1, Math.min(1, op.giro));
  const dxRasgos = Math.round(giro * 11);
  const dxNariz = Math.round(giro * 16);

  const px = Math.max(-1, Math.min(1, op.mirada.x)) * 7;
  const py = Math.max(-1, Math.min(1, op.mirada.y)) * 5;

  const ojos = moverPupilas(pieza('ojos', piezas['ojos']), px, py);

  let boca = pieza('boca', piezas['boca']);
  if (op.habla) {
    const alterna = pieza('boca', BOCA_ALTERNA[piezas['boca'] ?? ''] ?? 'abierta');
    if (alterna) {
      boca = `<g class="dh-boca-a">${boca}</g><g class="dh-boca-b">${alterna}</g>`;
    }
  }

  const defsMarcas = op.expresion.marcas
    .map((id) => op.marcas.find((m) => m.id === id))
    .filter((m): m is DefMarca => !!m);
  const marcasPiel = defsMarcas.filter((m) => m.capa === 'piel').map((m) => m.svg).join('');
  const marcas = defsMarcas.filter((m) => m.capa !== 'piel').map((m) => m.svg).join('');

  const rasgos = [
    pieza('cejas', piezas['cejas']),
    ojos,
    op.parpadea ? parpados(piezas['ojos'] ?? '', 0, op.retrasoParpadeo) : '',
  ].join('');

  // `extra`: el café y la chapa del avatar se dibujan a la altura del pecho
  // del busto; en un cuerpo entero quedarían flotando fuera del torso. El
  // café pasa a ser un prop que se sujeta (ver identidad.ts) y la chapa la
  // prende el cuerpo en el pecho (`chapaEnPecho`).
  const extra = EXTRAS_DE_PECHO.has(piezas['extra'] ?? '') ? '' : pieza('extra', piezas['extra']);

  return [
    pieza('pelo-tras', piezas['pelo-tras']),
    pieza('cabeza', piezas['cabeza']),
    marcasPiel ? `<g transform="translate(${dxRasgos} 0)">${marcasPiel}</g>` : '',
    `<g class="dh-rasgos" transform="translate(${dxRasgos} 0)">${rasgos}</g>`,
    `<g transform="translate(${dxNariz} 0)">${pieza('nariz', piezas['nariz'])}</g>`,
    `<g transform="translate(${dxRasgos} 0)">${boca}${pieza('barba', piezas['barba'])}</g>`,
    pieza('pelo', piezas['pelo']),
    `<g transform="translate(${dxRasgos} 0)">${pieza('gafas', piezas['gafas'])}</g>`,
    pieza('sombrero', piezas['sombrero']),
    extra,
    marcas ? `<g transform="translate(${dxRasgos} 0)">${marcas}</g>` : '',
  ].join('');
}

/** Extras del avatar que en el busto van en el pecho. */
const EXTRAS_DE_PECHO = new Set(['cafe', 'chapa']);

/**
 * La chapa del avatar, prendida en el pecho del cuerpo completo: el mismo
 * dibujo, reescalado y recolocado. Vacío si no lleva chapa.
 */
export function chapaEnPecho(config: ConfigAvatar, x: number, y: number, escala: number): string {
  if (config.piezas['extra'] !== 'chapa') return '';
  const frag = pieza('extra', 'chapa');
  // En el lienzo del avatar la chapa está centrada en (126, 452).
  return `<g transform="translate(${x} ${y}) scale(${escala}) translate(-126 -452)">${frag}</g>`;
}
