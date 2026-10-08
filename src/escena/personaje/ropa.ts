/**
 * La ropa del torso completo, derivada de la pieza `cuerpo` del avatar.
 *
 * El avatar solo dibuja hombros y pecho; aquí se extiende esa misma prenda a
 * un torso entero con mangas. Cada estilo reproduce los rasgos que hacen
 * reconocible la pieza original (el cuello de la camisa, los tirantes, las
 * rayas del chándal…) con los MISMOS colores (`--dh-ropa`, `--dh-ropa-2`),
 * así que quien lleva camisa hawaiana en su avatar la lleva también de cuerpo
 * entero.
 *
 * Añadir una prenda: una entrada más en `PRENDAS` con su id de pieza del
 * avatar. Las que no estén caen a `camiseta`.
 */

const TINTA = 'var(--dh-tinta, #1B1714)';
const ROPA = 'var(--dh-ropa, #CF3A2B)';
const ROPA2 = 'var(--dh-ropa-2, #F2E9D8)';
const PIEL = 'var(--dh-piel, #E8B58C)';
const BLANCO_BATA = '#ECE5D4';

export interface GeometriaTorso {
  /** Semiancho de hombros, cintura, cadera y barriga. */
  sw: number;
  ww: number;
  hw: number;
  b: number;
  /** y de los hombros y de la cadera. */
  sy: number;
  hy: number;
}

export interface Prenda {
  /** Relleno del cuerpo de la prenda. */
  color: string;
  manga: 'larga' | 'corta';
  colorManga: string;
  /** Raya a lo largo de la manga (chándal). */
  rayaManga?: string;
  /** Detalles encima del torso (cuellos, botones, bolsillos…). */
  detalles(g: GeometriaTorso): string;
  /** Lo que va DETRÁS del cuello (la capucha). */
  detrasCuello?(g: GeometriaTorso): string;
  /** Faldón que tapa el arranque de las piernas (bata). */
  faldon?(g: GeometriaTorso): string;
}

const t = (w: number) => `stroke="${TINTA}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

/** Escote redondo con la piel del cuello asomando. */
function escoteRedondo(g: GeometriaTorso, ancho = 15, fondo = 12): string {
  return `<path d="M${-ancho} ${g.sy - 6} Q0 ${g.sy + fondo} ${ancho} ${g.sy - 6} Z" fill="${PIEL}" ${t(5)}/>`;
}

function escotePico(g: GeometriaTorso, ancho = 15, fondo = 26): string {
  return `<path d="M${-ancho} ${g.sy - 6} L0 ${g.sy + fondo} L${ancho} ${g.sy - 6} Z" fill="${PIEL}" ${t(5)}/>`;
}

function botones(g: GeometriaTorso, desde: number, n: number, color = ROPA2): string {
  const paso = (g.hy - 10 - desde) / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `<circle cx="0" cy="${(desde + paso * (i + 0.5)).toFixed(1)}" r="3.4" fill="${color}" ${t(2.5)}/>`;
  }
  return s;
}

export const PRENDAS: Record<string, Prenda> = {
  camiseta: {
    color: ROPA,
    manga: 'corta',
    colorManga: ROPA,
    detalles: (g) => escoteRedondo(g),
  },
  camisa: {
    color: ROPA,
    manga: 'larga',
    colorManga: ROPA,
    detalles: (g) =>
      escotePico(g, 13, 20) +
      `<path d="M-19 ${g.sy - 8} L-3 ${g.sy + 16} L-22 ${g.sy + 10} Z M19 ${g.sy - 8} L3 ${g.sy + 16} L22 ${g.sy + 10} Z" fill="${ROPA2}" ${t(4)}/>` +
      `<path d="M0 ${g.sy + 18} L0 ${g.hy + 8}" fill="none" ${t(3)} opacity="0.6"/>` +
      botones(g, g.sy + 20, 3),
  },
  jersey: {
    color: ROPA,
    manga: 'larga',
    colorManga: ROPA,
    detalles: (g) =>
      escoteRedondo(g, 14, 10) +
      `<path d="M-17 ${g.sy - 7} Q0 ${g.sy + 16} 17 ${g.sy - 7}" fill="none" ${t(4)}/>` +
      `<path d="M${-g.hw + 2} ${g.hy - 4} Q0 ${g.hy + 4} ${g.hw - 2} ${g.hy - 4}" fill="none" ${t(4)}/>` +
      `<path d="M${-g.hw * 0.6} ${g.hy - 2} l0 9 M${-g.hw * 0.2} ${g.hy + 1} l0 9 M${g.hw * 0.2} ${g.hy + 1} l0 9 M${g.hw * 0.6} ${g.hy - 2} l0 9" fill="none" ${t(3)} opacity="0.55"/>`,
  },
  chaqueta: {
    color: ROPA,
    manga: 'larga',
    colorManga: ROPA,
    detalles: (g) =>
      `<path d="M-14 ${g.sy - 6} L14 ${g.sy - 6} L10 ${g.hy + 6} L-10 ${g.hy + 6} Z" fill="${ROPA2}" ${t(4)}/>` +
      escotePico(g, 10, 14) +
      `<path d="M-22 ${g.sy - 7} L-4 ${g.sy + 44} L-14 ${g.sy + 50} L-30 ${g.sy + 16} Z M22 ${g.sy - 7} L4 ${g.sy + 44} L14 ${g.sy + 50} L30 ${g.sy + 16} Z" fill="${ROPA}" ${t(4)}/>` +
      `<path d="M-6 ${g.sy + 50} L-6 ${g.hy + 8} M6 ${g.sy + 50} L6 ${g.hy + 8}" fill="none" ${t(4)}/>` +
      `<circle cx="-12" cy="${g.sy + 70}" r="3.2" fill="${TINTA}"/>`,
  },
  capucha: {
    color: ROPA,
    manga: 'larga',
    colorManga: ROPA,
    detrasCuello: (g) =>
      `<path d="M-34 ${g.sy + 4} C-40 ${g.sy - 26} -20 ${g.sy - 34} 0 ${g.sy - 34} C20 ${g.sy - 34} 40 ${g.sy - 26} 34 ${g.sy + 4} Z" fill="${ROPA}" ${t(5)}/>`,
    detalles: (g) =>
      escoteRedondo(g, 13, 9) +
      `<path d="M-24 ${g.sy - 4} Q0 ${g.sy + 16} 24 ${g.sy - 4}" fill="none" ${t(5)}/>` +
      `<path d="M-7 ${g.sy + 6} L-9 ${g.sy + 34} M7 ${g.sy + 6} L9 ${g.sy + 34}" fill="none" ${t(3)}/>` +
      `<circle cx="-9" cy="${g.sy + 37}" r="3" fill="${ROPA2}" ${t(2)}/><circle cx="9" cy="${g.sy + 37}" r="3" fill="${ROPA2}" ${t(2)}/>` +
      `<path d="M${-g.ww * 0.7} ${g.hy - 6} L${-g.ww * 0.5} ${g.hy - 38} L${g.ww * 0.5} ${g.hy - 38} L${g.ww * 0.7} ${g.hy - 6}" fill="none" ${t(4)}/>`,
  },
  tirantes: {
    color: ROPA2,
    manga: 'corta',
    colorManga: ROPA2,
    detalles: (g) =>
      escoteRedondo(g, 14, 10) +
      `<path d="M${-g.sw * 0.55} ${g.sy - 6} L${-g.hw * 0.55} ${g.hy + 6} M${g.sw * 0.55} ${g.sy - 6} L${g.hw * 0.55} ${g.hy + 6}" fill="none" stroke="${TINTA}" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M${-g.sw * 0.55} ${g.sy - 6} L${-g.hw * 0.55} ${g.hy + 6} M${g.sw * 0.55} ${g.sy - 6} L${g.hw * 0.55} ${g.hy + 6}" fill="none" stroke="${ROPA}" stroke-width="6" stroke-linecap="round"/>`,
  },
  bata: {
    color: BLANCO_BATA,
    manga: 'larga',
    colorManga: BLANCO_BATA,
    detalles: (g) =>
      `<path d="M-13 ${g.sy - 6} L13 ${g.sy - 6} L9 ${g.sy + 60} L-9 ${g.sy + 60} Z" fill="${ROPA}" ${t(4)}/>` +
      escotePico(g, 9, 12) +
      `<path d="M-22 ${g.sy - 7} L-6 ${g.sy + 58} M22 ${g.sy - 7} L6 ${g.sy + 58}" fill="none" ${t(4)}/>` +
      `<path d="M-2 ${g.sy + 58} L-2 ${g.hy + 8}" fill="none" ${t(4)}/>` +
      `<path d="M${g.sw * 0.28} ${g.sy + 26} l16 0 l0 16 l-16 0 Z" fill="none" ${t(3)}/>` +
      `<path d="M${g.sw * 0.28 + 5} ${g.sy + 18} l0 12" fill="none" stroke="${ROPA}" stroke-width="4" stroke-linecap="round"/>`,
    faldon: (g) =>
      `<path d="M${-g.hw - 6} ${g.hy - 4} L${-g.hw - 12} ${g.hy + 52} L-3 ${g.hy + 56} L-2 ${g.hy + 6} Z M${g.hw + 6} ${g.hy - 4} L${g.hw + 12} ${g.hy + 52} L3 ${g.hy + 56} L2 ${g.hy + 6} Z" fill="${BLANCO_BATA}" ${t(5)}/>`,
  },
  hawaiana: {
    color: ROPA,
    manga: 'corta',
    colorManga: ROPA,
    detalles: (g) => {
      const flores = [
        [-26, 22], [18, 14], [-6, 46], [28, 52], [-30, 70], [8, 80], [-14, 96], [24, 96],
      ]
        .filter(([, y]) => g.sy + y! < g.hy)
        .map(([x, y]) => {
          const cx = x!;
          const cy = g.sy + y!;
          return `<g transform="translate(${cx} ${cy})" fill="${ROPA2}" opacity="0.8"><circle cx="0" cy="-5" r="4"/><circle cx="5" cy="0" r="4"/><circle cx="0" cy="5" r="4"/><circle cx="-5" cy="0" r="4"/></g><circle cx="${cx}" cy="${cy}" r="2.5" fill="${TINTA}" opacity="0.7"/>`;
        })
        .join('');
      return (
        flores +
        escotePico(g, 16, 24) +
        `<path d="M-20 ${g.sy - 8} L-2 ${g.sy + 24} L-26 ${g.sy + 14} Z M20 ${g.sy - 8} L2 ${g.sy + 24} L26 ${g.sy + 14} Z" fill="${ROPA}" ${t(4)}/>` +
        `<path d="M0 ${g.sy + 26} L0 ${g.hy + 8}" fill="none" ${t(3)} opacity="0.6"/>`
      );
    },
  },
  chandal: {
    color: ROPA,
    manga: 'larga',
    colorManga: ROPA,
    rayaManga: ROPA2,
    detalles: (g) =>
      `<path d="M-15 ${g.sy - 8} L-13 ${g.sy + 4} L13 ${g.sy + 4} L15 ${g.sy - 8}" fill="${ROPA}" ${t(4)}/>` +
      `<path d="M0 ${g.sy + 4} L0 ${g.hy + 8}" fill="none" ${t(4)}/>` +
      `<rect x="-3.5" y="${g.sy + 8}" width="7" height="12" rx="2" fill="${ROPA2}" ${t(2.5)}/>` +
      `<path d="M${-g.sw + 4} ${g.sy + 14} L${-g.ww + 2} ${g.hy - 2} M${g.sw - 4} ${g.sy + 14} L${g.ww - 2} ${g.hy - 2}" fill="none" stroke="${ROPA2}" stroke-width="5" stroke-linecap="round"/>`,
  },
};

export function prendaDe(idPiezaCuerpo: string | undefined): Prenda {
  return PRENDAS[idPiezaCuerpo ?? ''] ?? PRENDAS['camiseta']!;
}

/** Contorno del torso (frontal). La barriga ensancha los costados. */
export function contornoTorso(g: GeometriaTorso): string {
  const { sw, ww, hw, b, sy, hy } = g;
  return (
    `M${-sw} ${sy + 16} C${-sw} ${sy + 2} ${-sw + 10} ${sy - 6} ${-sw + 26} ${sy - 6} ` +
    `L${sw - 26} ${sy - 6} C${sw - 10} ${sy - 6} ${sw} ${sy + 2} ${sw} ${sy + 16} ` +
    `C${sw + b} ${sy + 52} ${ww + b} ${hy - 30} ${hw + 3} ${hy + 8} ` +
    `Q0 ${hy + 17} ${-hw - 3} ${hy + 8} ` +
    `C${-ww - b} ${hy - 30} ${-sw - b} ${sy + 52} ${-sw} ${sy + 16} Z`
  );
}
