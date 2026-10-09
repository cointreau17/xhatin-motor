/**
 * Expresiones de los personajes.
 *
 * Mismo principio que las expresiones del avatar (manifest.json): una
 * expresión SUSTITUYE ranuras de la cara (cejas, ojos, boca) y deja el resto
 * como lo eligió el usuario. Lo que se añade aquí:
 *
 * - Más estados (22 frente a 11) combinando piezas que ya existen.
 * - MARCAS: capas dibujadas encima de la cara (rubor, sudor, venas,
 *   lágrimas…). Son las que dan matices sin dibujar ojos nuevos, y las que
 *   hacen que "avergonzado" y "enamorado" no sean la misma cara con otro nombre.
 * - Metadatos para el director: valencia y activación (para decidir cómo
 *   reacciona quien escucha), pose y efectos que le van bien.
 *
 * Las expresiones antiguas (`risa`, `grito`, `duda`, `chulo`, `sorpresa`,
 * `hablando`) siguen funcionando como alias: un mensaje que ya traiga
 * `expresion: 'grito'` se entiende igual que antes.
 *
 * Criterio de dibujo: preferir no tocar los ojos del usuario. Los ojos son lo
 * que más identifica a alguien, así que solo se sustituyen cuando la emoción
 * no se lee sin ellos (risa, sorpresa, llanto…).
 */

import type { DefExpresion, DefMarca } from './tipos.js';

const TINTA = 'var(--dh-tinta, #1B1714)';
const ACENTO = 'var(--dh-acento, #CF3A2B)';
const AGUA = '#8FB8C4';

const trazo = (w: number, extra = '') =>
  `fill="none" stroke="${TINTA}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}`;

/** Gota con contorno: la de sudor, la de agobio, la lágrima. */
function gota(cx: number, cy: number, t: number, rot = 0): string {
  const d = `M0 ${-t * 1.6} C${t * 0.9} ${-t * 0.4} ${t} ${t * 0.3} ${t} ${t * 0.55} A${t} ${t} 0 1 1 ${-t} ${t * 0.55} C${-t} ${t * 0.3} ${-t * 0.9} ${-t * 0.4} 0 ${-t * 1.6} Z`;
  return `<path transform="translate(${cx} ${cy}) rotate(${rot})" d="${d}" fill="${AGUA}" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>`;
}

function corazon(cx: number, cy: number, t: number, relleno = ACENTO): string {
  const d = `M0 ${t * 0.9} C${-t * 1.4} 0 ${-t * 1.1} ${-t * 1.2} 0 ${-t * 0.45} C${t * 1.1} ${-t * 1.2} ${t * 1.4} 0 0 ${t * 0.9} Z`;
  return `<path transform="translate(${cx} ${cy})" d="${d}" fill="${relleno}" stroke="${TINTA}" stroke-width="5" stroke-linejoin="round"/>`;
}

function destello(cx: number, cy: number, t: number): string {
  const d = `M0 ${-t} Q${t * 0.18} ${-t * 0.18} ${t} 0 Q${t * 0.18} ${t * 0.18} 0 ${t} Q${-t * 0.18} ${t * 0.18} ${-t} 0 Q${-t * 0.18} ${-t * 0.18} 0 ${-t} Z`;
  return `<path transform="translate(${cx} ${cy})" d="${d}" fill="#F2E9D8" stroke="${TINTA}" stroke-width="4" stroke-linejoin="round"/>`;
}

/**
 * Marcas sobre la cara, en el lienzo 512×512 del avatar (IDENTIDAD.md):
 * ojos en y=226 (x 212 y 300), boca en y=302, frente entre y=130 y 180.
 */
export const MARCAS: DefMarca[] = [
  {
    id: 'rubor',
    capa: 'piel',
    svg: `<g class="dh-marca" opacity="0.5">
      <ellipse cx="180" cy="276" rx="24" ry="12" fill="${ACENTO}"/>
      <ellipse cx="332" cy="276" rx="24" ry="12" fill="${ACENTO}"/></g>`,
  },
  {
    id: 'rubor-fuerte',
    capa: 'piel',
    svg: `<g class="dh-marca">
      <ellipse cx="182" cy="274" rx="30" ry="15" fill="${ACENTO}" opacity="0.6"/>
      <ellipse cx="330" cy="274" rx="30" ry="15" fill="${ACENTO}" opacity="0.6"/>
      <path d="M166 268 l10 12 M182 266 l10 12 M198 268 l8 10 M314 268 l10 12 M330 266 l10 12 M346 268 l8 10" ${trazo(4)}/></g>`,
  },
  {
    id: 'cara-roja',
    capa: 'piel',
    svg: `<g class="dh-marca" opacity="0.28">
      <path d="M170 150 Q256 118 342 150 L346 250 Q256 236 166 250 Z" fill="${ACENTO}"/></g>`,
  },
  { id: 'sudor', svg: `<g class="dh-marca">${gota(350, 176, 13, 12)}</g>` },
  {
    id: 'sudores',
    svg: `<g class="dh-marca">${gota(354, 170, 12, 14)}${gota(162, 196, 9, -14)}${gota(372, 214, 8, 20)}</g>`,
  },
  { id: 'gota', svg: `<g class="dh-marca">${gota(362, 148, 20, 18)}</g>` },
  {
    id: 'lagrimas',
    svg: `<g class="dh-marca">
      <path d="M204 246 Q198 290 206 330" fill="none" stroke="${AGUA}" stroke-width="12" stroke-linecap="round"/>
      <path d="M306 246 Q314 290 306 330" fill="none" stroke="${AGUA}" stroke-width="12" stroke-linecap="round"/>
      ${gota(206, 338, 9)}${gota(306, 338, 9)}</g>`,
  },
  {
    id: 'lagrimas-risa',
    svg: `<g class="dh-marca">${gota(168, 222, 10, -50)}${gota(344, 222, 10, 50)}</g>`,
  },
  {
    id: 'miedo',
    capa: 'piel',
    svg: `<g class="dh-marca" opacity="0.6">
      <path d="M204 128 L204 176 M226 124 L226 180 M248 122 L248 182 M270 122 L270 182 M292 124 L292 180 M314 128 L314 176" ${trazo(5)}/></g>`,
  },
  {
    id: 'ojeras',
    capa: 'piel',
    svg: `<g class="dh-marca" opacity="0.7">
      <path d="M190 252 Q212 264 234 252 M278 252 Q300 264 322 252" ${trazo(5)}/>
      <path d="M194 260 Q212 268 230 260 M282 260 Q300 268 318 260" ${trazo(3)}/></g>`,
  },
  {
    id: 'vena',
    svg: `<g class="dh-marca" transform="translate(338 148)">
      <path d="M-18 -6 Q-6 -6 -6 -18 M6 -18 Q6 -6 18 -6 M18 6 Q6 6 6 18 M-6 18 Q-6 6 -18 6" fill="none" stroke="${ACENTO}" stroke-width="7" stroke-linecap="round"/></g>`,
  },
  {
    id: 'corazones-ojos',
    svg: `<g class="dh-marca">${corazon(212, 228, 20)}${corazon(300, 228, 20)}</g>`,
  },
  {
    id: 'estrellas-ojos',
    svg: `<g class="dh-marca">${destello(214, 224, 16)}${destello(302, 224, 16)}</g>`,
  },
  {
    id: 'penumbra',
    capa: 'piel',
    svg: `<g class="dh-marca" opacity="0.45">
      <path d="M180 120 L180 170 M200 112 L200 164 M220 108 L220 160 M240 106 L240 158 M260 106 L260 158 M280 106 L280 158 M300 108 L300 160 M320 112 L320 164 M340 120 L340 170" fill="none" stroke="#3E4F63" stroke-width="6" stroke-linecap="round"/></g>`,
  },
  {
    id: 'ceja-alzada',
    // Refuerzo de sospecha: una ceja sube más que la otra.
    svg: `<g class="dh-marca"><path d="M272 170 Q300 150 332 164" ${trazo(10)}/></g>`,
  },
];

/**
 * Las expresiones.
 *
 * `valencia` y `activacion` siguen el modelo circumplejo clásico (Russell):
 * bastan dos números para decidir reacciones razonables sin una tabla de
 * 22×22 casos.
 */
export const EXPRESIONES: DefExpresion[] = [
  {
    id: 'neutral',
    nombre: 'Neutral',
    tags: ['base'],
    slots: {},
    marcas: [],
    alias: ['hablando'],
    valencia: 0,
    activacion: 0.2,
  },
  {
    id: 'feliz',
    nombre: 'Feliz',
    tags: ['positiva'],
    slots: { boca: 'sonrisa' },
    marcas: [],
    pose: 'de-pie',
    tono: 'tierno',
    valencia: 0.6,
    activacion: 0.4,
  },
  {
    id: 'muy-feliz',
    nombre: 'Muy feliz',
    tags: ['positiva'],
    slots: { ojos: 'exp-feliz', boca: 'exp-risa', cejas: 'arqueadas' },
    marcas: ['rubor'],
    pose: 'celebrando',
    efectos: ['destellos'],
    tono: 'festivo',
    valencia: 0.9,
    activacion: 0.7,
  },
  {
    id: 'divertido',
    nombre: 'Divertido',
    tags: ['positiva', 'humor'],
    slots: { cejas: 'arqueadas', boca: 'dientes' },
    marcas: [],
    pose: 'de-pie',
    tono: 'comico',
    valencia: 0.6,
    activacion: 0.5,
  },
  {
    id: 'riendo',
    nombre: 'Riendo',
    tags: ['positiva', 'humor'],
    slots: { ojos: 'exp-feliz', boca: 'exp-risa', cejas: 'arqueadas' },
    marcas: ['lagrimas-risa'],
    alias: ['risa'],
    pose: 'riendo',
    efectos: ['risa'],
    tono: 'comico',
    valencia: 0.8,
    activacion: 0.85,
  },
  {
    id: 'sorprendido',
    nombre: 'Sorprendido',
    tags: ['sorpresa'],
    slots: { cejas: 'exp-sorpresa', ojos: 'exp-grito', boca: 'silbido' },
    marcas: [],
    alias: ['sorpresa'],
    pose: 'sorprendido',
    efectos: ['exclamacion'],
    valencia: 0.1,
    activacion: 0.85,
  },
  {
    id: 'confundido',
    nombre: 'Confundido',
    tags: ['duda'],
    slots: { cejas: 'asimetricas', boca: 'exp-duda' },
    marcas: ['gota'],
    pose: 'encogiendo-hombros',
    efectos: ['interrogacion'],
    valencia: -0.1,
    activacion: 0.4,
  },
  {
    id: 'preocupado',
    nombre: 'Preocupado',
    tags: ['negativa'],
    slots: { cejas: 'exp-triste', boca: 'torcida' },
    marcas: ['sudor'],
    pose: 'de-pie',
    tono: 'tenso',
    valencia: -0.4,
    activacion: 0.5,
  },
  {
    id: 'triste',
    nombre: 'Triste',
    tags: ['negativa'],
    slots: { cejas: 'exp-triste', ojos: 'exp-triste', boca: 'triste' },
    marcas: [],
    pose: 'triste',
    mirada: 'abajo',
    efectos: ['nubarron'],
    tono: 'triste',
    valencia: -0.7,
    activacion: 0.2,
  },
  {
    id: 'llorando',
    nombre: 'Llorando',
    tags: ['negativa'],
    slots: { cejas: 'exp-triste', ojos: 'exp-cerrados', boca: 'pucheros' },
    marcas: ['lagrimas'],
    pose: 'triste',
    mirada: 'abajo',
    tono: 'triste',
    valencia: -0.85,
    activacion: 0.6,
  },
  {
    id: 'enfadado',
    nombre: 'Enfadado',
    tags: ['negativa', 'conflicto'],
    slots: { cejas: 'exp-enfadado', ojos: 'exp-enfadado', boca: 'triste' },
    marcas: ['vena'],
    pose: 'enfadado',
    efectos: ['enfado'],
    tono: 'tenso',
    valencia: -0.7,
    activacion: 0.75,
  },
  {
    id: 'furioso',
    nombre: 'Furioso',
    tags: ['negativa', 'conflicto'],
    slots: { cejas: 'exp-enfadado', ojos: 'exp-enfadado', boca: 'exp-grito' },
    marcas: ['vena', 'cara-roja'],
    pose: 'enfadado',
    efectos: ['enfado', 'humo'],
    tono: 'tenso',
    valencia: -0.9,
    activacion: 1,
  },
  {
    id: 'gritando',
    nombre: 'Gritando',
    tags: ['activa'],
    slots: { cejas: 'exp-enfadado', ojos: 'exp-grito', boca: 'exp-grito' },
    marcas: [],
    alias: ['grito'],
    pose: 'manos-en-cintura',
    efectos: ['exclamacion'],
    valencia: -0.2,
    activacion: 0.95,
  },
  {
    id: 'asustado',
    nombre: 'Asustado',
    tags: ['negativa', 'miedo'],
    slots: { cejas: 'exp-sorpresa', ojos: 'saltones', boca: 'pucheros' },
    marcas: ['miedo', 'sudores'],
    pose: 'asustado',
    efectos: ['temblor'],
    tono: 'tenso',
    valencia: -0.7,
    activacion: 0.9,
  },
  {
    id: 'avergonzado',
    nombre: 'Avergonzado',
    tags: ['negativa', 'social'],
    slots: { cejas: 'exp-triste', boca: 'torcida' },
    marcas: ['rubor-fuerte', 'gota'],
    pose: 'avergonzado',
    mirada: 'apartar',
    tono: 'comico',
    valencia: -0.3,
    activacion: 0.5,
  },
  {
    id: 'cansado',
    nombre: 'Cansado',
    tags: ['baja'],
    slots: { ojos: 'cansados', cejas: 'finas', boca: 'linea' },
    marcas: ['ojeras'],
    pose: 'cansado',
    valencia: -0.3,
    activacion: 0.1,
  },
  {
    id: 'aburrido',
    nombre: 'Aburrido',
    tags: ['baja'],
    slots: { ojos: 'entrecerrados', cejas: 'rectas', boca: 'linea' },
    marcas: [],
    pose: 'brazos-cruzados',
    mirada: 'apartar',
    valencia: -0.3,
    activacion: 0.05,
  },
  {
    id: 'pensando',
    nombre: 'Pensando',
    tags: ['duda'],
    slots: { cejas: 'exp-duda', ojos: 'exp-pensando', boca: 'exp-duda' },
    marcas: [],
    alias: ['duda'],
    pose: 'pensando',
    mirada: 'arriba',
    efectos: ['interrogacion'],
    valencia: 0,
    activacion: 0.3,
  },
  {
    id: 'sospechando',
    nombre: 'Sospechando',
    tags: ['duda', 'social'],
    slots: { ojos: 'entrecerrados', cejas: 'asimetricas', boca: 'mueca' },
    marcas: ['ceja-alzada'],
    pose: 'brazos-cruzados',
    mirada: 'interlocutor',
    valencia: -0.2,
    activacion: 0.35,
  },
  {
    id: 'emocionado',
    nombre: 'Emocionado',
    tags: ['positiva', 'activa'],
    slots: { ojos: 'saltones', cejas: 'arqueadas', boca: 'exp-risa' },
    marcas: ['estrellas-ojos', 'rubor'],
    pose: 'celebrando',
    efectos: ['destellos'],
    tono: 'festivo',
    valencia: 0.85,
    activacion: 0.95,
  },
  {
    id: 'enamorado',
    nombre: 'Enamorado',
    tags: ['positiva', 'social'],
    slots: { boca: 'sonrisa', cejas: 'arqueadas' },
    marcas: ['corazones-ojos', 'rubor'],
    pose: 'de-pie',
    efectos: ['corazones'],
    tono: 'tierno',
    valencia: 0.9,
    activacion: 0.55,
  },
  {
    id: 'sarcastico',
    nombre: 'Sarcástico',
    tags: ['social', 'humor'],
    slots: { cejas: 'asimetricas', ojos: 'exp-chulo', boca: 'mueca' },
    marcas: [],
    alias: ['chulo'],
    pose: 'manos-en-cintura',
    mirada: 'espectador',
    tono: 'comico',
    valencia: 0.1,
    activacion: 0.4,
  },
  {
    id: 'dormido',
    nombre: 'Dormido',
    tags: ['baja'],
    slots: { ojos: 'exp-cerrados', boca: 'silbido', cejas: 'finas' },
    marcas: [],
    pose: 'durmiendo',
    efectos: ['zzz'],
    valencia: 0,
    activacion: 0,
  },
];

/** Resuelve un id o un alias antiguo al id canónico. */
export function idExpresion(idOAlias: string | undefined | null, lista: readonly DefExpresion[]): string {
  if (!idOAlias) return 'neutral';
  if (lista.some((e) => e.id === idOAlias)) return idOAlias;
  const porAlias = lista.find((e) => e.alias?.includes(idOAlias));
  return porAlias?.id ?? 'neutral';
}
