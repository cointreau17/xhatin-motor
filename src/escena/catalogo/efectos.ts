/**
 * Efectos visuales: la gramática del cómic (¡!, ¿?, sudor, estrellitas…).
 *
 * Se usan con moderación: cada efecto tiene un `umbral` de intensidad por
 * debajo del cual el director no lo pone por su cuenta, y un `peso` que
 * cuenta contra el presupuesto de la viñeta (ver director.ts). La idea es
 * que una viñeta tenga personalidad, no que cada mensaje sea una explosión.
 *
 * Coordenadas (ver catalogo/tipos.ts):
 * - `personaje`: origen en la coronilla, x positiva hacia donde mira.
 * - `detras`: origen en los pies del personaje, x positiva hacia donde mira.
 * - `pantalla`: viñeta normalizada 0–1 (se estira al tamaño real).
 */

import type { DefEfecto } from './tipos.js';

const T = 'var(--dh-tinta, #1B1714)';
const P = 'var(--dh-papel, #F2E9D8)';
const A = 'var(--dh-acento, #CF3A2B)';
const MOSTAZA = '#D9A94A';
const AGUA = '#8FB8C4';

const tr = (w = 5) => `stroke="${T}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

function corazon(x: number, y: number, t: number, rot = 0): string {
  const d = `M0 ${t * 0.9} C${-t * 1.4} 0 ${-t * 1.1} ${-t * 1.2} 0 ${-t * 0.45} C${t * 1.1} ${-t * 1.2} ${t * 1.4} 0 0 ${t * 0.9} Z`;
  return `<path transform="translate(${x} ${y}) rotate(${rot})" d="${d}" fill="${A}" ${tr(4)}/>`;
}

function destello(x: number, y: number, t: number): string {
  const d = `M0 ${-t} Q${t * 0.2} ${-t * 0.2} ${t} 0 Q${t * 0.2} ${t * 0.2} 0 ${t} Q${-t * 0.2} ${t * 0.2} ${-t} 0 Q${-t * 0.2} ${-t * 0.2} 0 ${-t} Z`;
  return `<path transform="translate(${x} ${y})" d="${d}" fill="${MOSTAZA}" ${tr(3.5)}/>`;
}

function gota(x: number, y: number, t: number, rot: number): string {
  const d = `M0 ${-t * 1.6} C${t * 0.9} ${-t * 0.4} ${t} ${t * 0.3} ${t} ${t * 0.55} A${t} ${t} 0 1 1 ${-t} ${t * 0.55} C${-t} ${t * 0.3} ${-t * 0.9} ${-t * 0.4} 0 ${-t * 1.6} Z`;
  return `<path transform="translate(${x} ${y}) rotate(${rot})" d="${d}" fill="${AGUA}" ${tr(3.5)}/>`;
}

/** Rayos de un estallido: polígono de puntas alternas. */
function estrella(cx: number, cy: number, rExt: number, rInt: number, puntas: number, semilla = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < puntas * 2; i++) {
    const ang = (Math.PI * i) / puntas + semilla;
    const r = i % 2 === 0 ? rExt * (0.85 + ((i * 37) % 10) / 50) : rInt;
    pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Letras de cómic: relleno y contorno grueso, sin depender de ninguna fuente. */
function rotulo(txt: string, x: number, y: number, tam: number, rot: number, color = A): string {
  return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="'Bangers','Impact','Arial Black',sans-serif" font-weight="900" font-size="${tam}" text-anchor="middle" fill="${color}" stroke="${T}" stroke-width="${tam / 9}" paint-order="stroke" letter-spacing="1">${txt}</text>`;
}

function lineasRadiales(n: number, rIni: number, rFin: number, grosor: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + (i % 3) * 0.05;
    const r0 = rIni + (i % 4) * 0.025;
    d += `M${(0.5 + Math.cos(a) * r0).toFixed(3)} ${(0.5 + Math.sin(a) * r0).toFixed(3)} L${(0.5 + Math.cos(a) * rFin).toFixed(3)} ${(0.5 + Math.sin(a) * rFin).toFixed(3)} `;
  }
  return `<path d="${d}" fill="none" stroke="${T}" stroke-width="${grosor}" stroke-linecap="round" opacity="0.55"/>`;
}

export const EFECTOS: DefEfecto[] = [
  /* -------------------------------------------------------- de personaje -- */
  {
    id: 'exclamacion',
    nombre: '¡Sorpresa!',
    tags: ['sorpresa'],
    ambito: 'personaje',
    umbral: 0.55,
    peso: 1,
    animacion: 'salta',
    svg: `<path d="M56 -70 L74 -70 L68 -22 L62 -22 Z" fill="${A}" ${tr(5)}/><circle cx="64" cy="-8" r="7" fill="${A}" ${tr(4)}/>
      <path d="M36 -44 L22 -58 M92 -44 L106 -58 M28 -16 L12 -18" ${tr(4)}/>`,
  },
  {
    id: 'interrogacion',
    nombre: '¿Confusión?',
    tags: ['duda'],
    ambito: 'personaje',
    umbral: 0.35,
    peso: 1,
    animacion: 'flota',
    svg: `<path d="M50 -52 Q50 -78 72 -78 Q94 -78 94 -58 Q94 -44 76 -38 L74 -24" fill="none" stroke="${T}" stroke-width="15" stroke-linecap="round"/>
      <path d="M50 -52 Q50 -78 72 -78 Q94 -78 94 -58 Q94 -44 76 -38 L74 -24" fill="none" stroke="${MOSTAZA}" stroke-width="7" stroke-linecap="round"/>
      <circle cx="74" cy="-6" r="7.5" fill="${MOSTAZA}" ${tr(4)}/>`,
  },
  {
    id: 'corazones',
    nombre: 'Corazones',
    tags: ['amor'],
    ambito: 'personaje',
    umbral: 0.4,
    peso: 1,
    animacion: 'sube',
    svg: corazon(58, -30, 13, -12) + corazon(88, -62, 10, 14) + corazon(40, -74, 8, -4),
  },
  {
    id: 'risa',
    nombre: 'Risa',
    tags: ['risa'],
    ambito: 'personaje',
    umbral: 0.55,
    peso: 1,
    animacion: 'vibra',
    svg: rotulo('JA', 76, -30, 34, 14) + rotulo('JA', 104, 4, 26, 22),
  },
  {
    id: 'enfado',
    nombre: 'Enfado',
    tags: ['enfado'],
    ambito: 'personaje',
    umbral: 0.5,
    peso: 1,
    animacion: 'late',
    svg: `<g transform="translate(62 -22)"><path d="M-20 -7 Q-7 -7 -7 -20 M7 -20 Q7 -7 20 -7 M20 7 Q7 7 7 20 M-7 20 Q-7 7 -20 7" fill="none" stroke="${T}" stroke-width="13" stroke-linecap="round"/><path d="M-20 -7 Q-7 -7 -7 -20 M7 -20 Q7 -7 20 -7 M20 7 Q7 7 7 20 M-7 20 Q-7 7 -20 7" fill="none" stroke="${A}" stroke-width="7" stroke-linecap="round"/></g>`,
  },
  {
    id: 'humo',
    nombre: 'Echando humo',
    tags: ['enfado'],
    ambito: 'personaje',
    umbral: 0.8,
    peso: 2,
    animacion: 'sube',
    svg: `<path d="M-30 -8 C-44 -20 -30 -34 -42 -48 C-54 -62 -34 -74 -44 -88" fill="none" stroke="${T}" stroke-width="10" stroke-linecap="round" opacity="0.35"/>
      <path d="M30 -8 C44 -20 30 -34 42 -48 C54 -62 34 -74 44 -88" fill="none" stroke="${T}" stroke-width="10" stroke-linecap="round" opacity="0.35"/>`,
  },
  {
    id: 'sudor',
    nombre: 'Sudor',
    tags: ['miedo', 'nervios'],
    ambito: 'personaje',
    umbral: 0.4,
    peso: 1,
    animacion: 'gotea',
    svg: gota(-44, 10, 7, -30) + gota(52, 4, 8, 30) + gota(66, 30, 6, 40),
  },
  {
    id: 'zzz',
    nombre: 'Zzz',
    tags: ['sueno'],
    ambito: 'personaje',
    umbral: 0,
    peso: 1,
    animacion: 'sube',
    svg: rotulo('Z', 50, -8, 30, -10, P) + rotulo('Z', 76, -40, 24, -6, P) + rotulo('Z', 96, -66, 18, 0, P),
  },
  {
    id: 'destellos',
    nombre: 'Destellos',
    tags: ['alegria', 'emocion'],
    ambito: 'personaje',
    umbral: 0.6,
    peso: 1,
    animacion: 'titila',
    svg: destello(-62, -10, 14) + destello(70, -30, 17) + destello(40, -78, 11) + destello(-30, -66, 9),
  },
  {
    id: 'nubarron',
    nombre: 'Nubarrón',
    tags: ['tristeza'],
    ambito: 'personaje',
    umbral: 0.6,
    peso: 2,
    animacion: 'flota',
    svg: `<path d="M-46 -52 Q-50 -80 -24 -80 Q-16 -102 8 -96 Q30 -110 42 -86 Q66 -84 58 -58 Z" fill="#8E8A80" ${tr(5)}/>
      <path d="M-30 -44 l-6 16 M-6 -44 l-6 16 M18 -44 l-6 16 M42 -44 l-6 16" stroke="${AGUA}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: 'bombilla',
    nombre: 'Idea',
    tags: ['idea'],
    ambito: 'personaje',
    umbral: 0.3,
    peso: 1,
    animacion: 'salta',
    svg: `<path d="M-14 -40 Q-30 -60 -18 -80 Q0 -100 18 -80 Q30 -60 14 -40 Z" fill="${MOSTAZA}" ${tr(5)}/>
      <rect x="-12" y="-40" width="24" height="14" rx="3" fill="#8E8A80" ${tr(4)}/>
      <path d="M-36 -92 L-46 -102 M36 -92 L46 -102 M0 -106 L0 -120 M-44 -64 L-58 -64 M44 -64 L58 -64" ${tr(4)}/>`,
  },
  {
    id: 'temblor',
    nombre: 'Temblor',
    tags: ['miedo'],
    ambito: 'personaje',
    umbral: 0.55,
    peso: 1,
    animacion: 'tiembla',
    svg: `<path d="M-64 30 q-8 10 0 20 q8 10 0 20 M-78 40 q-6 8 0 16 M64 30 q8 10 0 20 q-8 10 0 20 M78 40 q6 8 0 16" fill="none" ${tr(4)}/>`,
  },

  /* ------------------------------------------------------------ detrás --- */
  {
    id: 'estallido',
    nombre: 'Estallido',
    tags: ['impacto', 'grito'],
    ambito: 'detras',
    umbral: 0.8,
    peso: 2,
    animacion: 'pulsa',
    svg: `<polygon points="${estrella(0, -250, 190, 120, 14)}" fill="${MOSTAZA}" ${tr(6)} opacity="0.9"/>`,
  },
  {
    id: 'movimiento',
    nombre: 'Líneas de movimiento',
    tags: ['movimiento'],
    ambito: 'detras',
    umbral: 0,
    peso: 1,
    svg: `<path d="M-70 -300 L-190 -300 M-80 -250 L-230 -250 M-76 -200 L-176 -200 M-84 -150 L-214 -150 M-90 -96 L-170 -96" fill="none" stroke="${T}" stroke-width="6" stroke-linecap="round" opacity="0.5"/>`,
  },

  /* ---------------------------------------------------------- pantalla --- */
  {
    id: 'lineas-velocidad',
    nombre: 'Líneas de tensión',
    tags: ['zoom', 'drama', 'sorpresa'],
    ambito: 'pantalla',
    umbral: 0.85,
    peso: 2,
    svg: lineasRadiales(46, 0.36, 0.95, 0.006),
  },
  {
    id: 'impacto',
    nombre: 'Impacto',
    tags: ['impacto'],
    ambito: 'pantalla',
    umbral: 0.9,
    peso: 3,
    animacion: 'pulsa',
    svg: `<polygon points="${estrella(0.5, 0.42, 0.34, 0.2, 13)}" fill="${MOSTAZA}" stroke="${T}" stroke-width="0.008" stroke-linejoin="round" opacity="0.85"/>`,
  },
  {
    id: 'confeti',
    nombre: 'Confeti',
    tags: ['fiesta'],
    ambito: 'pantalla',
    umbral: 0.5,
    peso: 2,
    animacion: 'cae',
    svg: (() => {
      const colores = [A, MOSTAZA, '#2E6B78', '#6E8B5A', '#C2588A'];
      let s = '';
      for (let i = 0; i < 38; i++) {
        const x = ((i * 0.618) % 1).toFixed(3);
        const y = (((i * 0.382 + 0.07) % 0.55) + 0.02).toFixed(3);
        const rot = (i * 47) % 180;
        s += `<rect x="${x}" y="${y}" width="0.014" height="0.028" fill="${colores[i % colores.length]}" transform="rotate(${rot} ${x} ${y})"/>`;
      }
      return s;
    })(),
  },
];
