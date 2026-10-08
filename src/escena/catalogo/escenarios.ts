/**
 * Escenarios.
 *
 * Cada uno es un decorado de 1200×600 dibujado UNA vez; la cámara recorta de
 * ahí lo que ve cada viñeta, así que el mismo decorado sirve para un plano
 * general, uno medio o un primer plano. Son independientes de los
 * personajes: ningún decorado sabe quién va a estar delante.
 *
 * Criterio de dibujo: el decorado es más claro y menos contrastado que los
 * personajes (tinta al 70 %, colores lavados) para que las figuras se lean
 * encima sin esfuerzo. Suelo entre y≈470 y 600; los pies van de 505 a 560.
 *
 * Las funciones de ayuda de este archivo solo existen para no escribir 40
 * ventanas a mano: lo que se registra es el SVG resultante, una cadena. Un
 * escenario que venga de remoto es exactamente eso, una cadena.
 */

import type { DefEscenario } from './tipos';

const T = 'var(--dh-tinta, #1B1714)';
const P = 'var(--dh-papel, #F2E9D8)';
const A = 'var(--dh-acento, #CF3A2B)';

const C = {
  cielo: '#C8D8D4',
  cieloClaro: '#DCE5DD',
  nube: '#EFEBE0',
  pared: '#E6D8BC',
  pared2: '#D9C7A2',
  suelo: '#CBB690',
  sueloOsc: '#B39C74',
  madera: '#A88460',
  maderaOsc: '#7E6044',
  verde: '#8BA676',
  verdeOsc: '#6E8B5A',
  teal: '#5E8E96',
  tealOsc: '#2E6B78',
  mostaza: '#D9A94A',
  gris: '#B8B2A6',
  grisOsc: '#8E8A80',
  ladrillo: '#C98C6A',
  arena: '#E4CE9A',
  mar: '#7FA8B0',
  noche: '#2F3A52',
  nocheOsc: '#232B3E',
  cristal: '#B9D0D2',
};

/** Trazo del decorado: tinta más suave que la de los personajes. */
const tr = (w = 5) => `stroke="${T}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.75"`;
const linea = (w = 4, op = 0.35) => `fill="none" stroke="${T}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="${op}"`;

/* ---------------------------------------------------------------- ayudas -- */

function rect(x: number, y: number, w: number, h: number, fill: string, extra = tr()): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
}

function ventanas(x: number, y: number, cols: number, filas: number, w: number, h: number, gx: number, gy: number, fill: string, encendidas?: (i: number) => boolean): string {
  let s = '';
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < cols; c++) {
      const i = f * cols + c;
      const color = encendidas ? (encendidas(i) ? '#F0D58A' : fill) : fill;
      s += `<rect x="${x + c * (w + gx)}" y="${y + f * (h + gy)}" width="${w}" height="${h}" fill="${color}" ${tr(3.5)}/>`;
    }
  }
  return s;
}

function nube(x: number, y: number, e = 1): string {
  return `<path transform="translate(${x} ${y}) scale(${e})" d="M-60 0 Q-64 -26 -36 -28 Q-28 -52 0 -46 Q20 -64 42 -42 Q70 -44 66 -14 Q80 0 60 6 L-50 6 Q-72 6 -60 0 Z" fill="${C.nube}" ${tr(4)}/>`;
}

function arbol(x: number, suelo: number, h: number, copa = C.verde): string {
  return (
    `<path d="M${x - 9} ${suelo} L${x - 6} ${suelo - h * 0.5} L${x + 6} ${suelo - h * 0.5} L${x + 9} ${suelo} Z" fill="${C.maderaOsc}" ${tr(4)}/>` +
    `<path d="M${x} ${suelo - h} C${x - h * 0.55} ${suelo - h} ${x - h * 0.6} ${suelo - h * 0.42} ${x - h * 0.2} ${suelo - h * 0.42} C${x - h * 0.1} ${suelo - h * 0.3} ${x + h * 0.2} ${suelo - h * 0.3} ${x + h * 0.25} ${suelo - h * 0.44} C${x + h * 0.62} ${suelo - h * 0.42} ${x + h * 0.55} ${suelo - h} ${x} ${suelo - h} Z" fill="${copa}" ${tr(4.5)}/>`
  );
}

function pino(x: number, suelo: number, h: number, color = C.verdeOsc): string {
  const w = h * 0.34;
  return (
    `<rect x="${x - 5}" y="${suelo - h * 0.2}" width="10" height="${h * 0.2}" fill="${C.maderaOsc}" ${tr(3.5)}/>` +
    `<path d="M${x} ${suelo - h} L${x + w * 0.6} ${suelo - h * 0.62} L${x + w * 0.3} ${suelo - h * 0.62} L${x + w} ${suelo - h * 0.2} L${x - w} ${suelo - h * 0.2} L${x - w * 0.3} ${suelo - h * 0.62} L${x - w * 0.6} ${suelo - h * 0.62} Z" fill="${color}" ${tr(4)}/>`
  );
}

/** Suelo con líneas de fuga hacia un punto central: da profundidad sin 3D. */
function sueloFuga(y: number, color: string, lineas = 9, op = 0.18): string {
  let d = '';
  for (let i = 0; i <= lineas; i++) {
    const xArriba = 600 + (i - lineas / 2) * (1200 / lineas) * 0.55;
    const xAbajo = 600 + (i - lineas / 2) * (1200 / lineas) * 1.35;
    d += `M${xArriba.toFixed(0)} ${y} L${xAbajo.toFixed(0)} 600 `;
  }
  return rect(0, y, 1200, 600 - y, color, 'stroke="none"') + `<path d="${d}" ${linea(3, op)}/>` + `<path d="M0 ${y} L1200 ${y}" ${linea(5, 0.6)}/>`;
}

function tablones(y: number, color: string): string {
  let d = '';
  for (let yy = y + 26; yy < 600; yy += 30 + (yy - y) * 0.25) d += `M0 ${yy.toFixed(0)} L1200 ${yy.toFixed(0)} `;
  return rect(0, y, 1200, 600 - y, color, 'stroke="none"') + `<path d="${d}" ${linea(3, 0.22)}/>` + `<path d="M0 ${y} L1200 ${y}" ${linea(5, 0.6)}/>`;
}

function rodapie(y: number): string {
  return rect(-5, y - 16, 1210, 16, C.pared2, tr(4));
}

function lampara(x: number, largo: number, color = C.mostaza): string {
  return `<path d="M${x} 0 L${x} ${largo}" ${linea(3, 0.6)}/><path d="M${x - 34} ${largo + 30} Q${x} ${largo - 10} ${x + 34} ${largo + 30} Z" fill="${color}" ${tr(4)}/><ellipse cx="${x}" cy="${largo + 32}" rx="10" ry="5" fill="#F7E7B0" ${tr(3)}/>`;
}

function cuadro(x: number, y: number, w: number, h: number, dentro: string): string {
  return rect(x, y, w, h, C.madera, tr(5)) + rect(x + 9, y + 9, w - 18, h - 18, dentro, tr(3));
}

function trama(y: number, h: number, op = 0.25): string {
  return `<rect x="0" y="${y}" width="1200" height="${h}" fill="url(#dh-esc-puntos)" opacity="${op}"/>`;
}

/* ------------------------------------------------------------ escenarios -- */

const neutro: DefEscenario = {
  id: 'neutro',
  nombre: 'Fondo neutro',
  tags: ['base'],
  palabras: [],
  svg:
    rect(0, 0, 1200, 600, P, 'stroke="none"') +
    trama(0, 470, 0.18) +
    `<path d="M0 470 L1200 470" ${linea(5, 0.45)}/>` +
    rect(0, 470, 1200, 130, '#E7DBC2', 'stroke="none"') +
    `<path d="M0 470 L1200 470" ${linea(5, 0.5)}/>`,
};

const calle: DefEscenario = {
  id: 'calle',
  nombre: 'Calle',
  tags: ['exterior', 'ciudad'],
  palabras: ['calle', 'acera', 'esquina', 'barrio', 'portal', 'paseando', 'fuera', 'plaza'],
  rotulo: 'En la calle',
  svg:
    rect(0, 0, 1200, 600, C.cielo, 'stroke="none"') +
    nube(220, 70, 0.9) +
    nube(930, 50, 0.7) +
    rect(-10, 130, 260, 340, C.ladrillo) +
    ventanas(20, 160, 3, 4, 50, 56, 30, 26, C.cristal) +
    rect(250, 60, 300, 410, C.pared2) +
    ventanas(280, 90, 4, 5, 44, 52, 26, 22, C.cristal) +
    rect(550, 170, 220, 300, C.teal) +
    ventanas(575, 195, 3, 3, 44, 60, 24, 24, C.cristal) +
    rect(620, 395, 70, 75, C.maderaOsc) +
    rect(770, 100, 280, 370, C.pared) +
    ventanas(800, 130, 4, 4, 42, 54, 24, 24, C.cristal) +
    `<path d="M790 380 L1030 380 L1010 410 L810 410 Z" fill="${A}" ${tr(4)}/><path d="M820 380 l0 30 M860 380 l0 30 M900 380 l0 30 M940 380 l0 30 M980 380 l0 30" ${linea(3, 0.4)}/>` +
    rect(1050, 150, 170, 320, C.ladrillo) +
    ventanas(1070, 180, 2, 4, 44, 50, 26, 22, C.cristal) +
    `<path d="M160 470 L160 250 Q160 230 185 230 L215 230" fill="none" ${tr(7)}/><path d="M200 222 L240 222 L232 240 L208 240 Z" fill="${C.mostaza}" ${tr(4)}/>` +
    rect(0, 470, 1200, 70, C.gris, 'stroke="none"') +
    `<path d="M0 470 L1200 470 M0 540 L1200 540" ${linea(5, 0.6)}/><path d="M100 470 L80 540 M300 470 L290 540 M500 470 L500 540 M700 470 L710 540 M900 470 L920 540 M1100 470 L1130 540" ${linea(3, 0.25)}/>` +
    rect(0, 540, 1200, 60, C.grisOsc, 'stroke="none"') +
    `<path d="M40 575 L160 575 M300 575 L420 575 M560 575 L680 575 M820 575 L940 575 M1080 575 L1200 575" stroke="${P}" stroke-width="8" stroke-linecap="round" opacity="0.7"/>`,
};

const ciudad: DefEscenario = {
  id: 'ciudad',
  nombre: 'Ciudad',
  tags: ['exterior', 'ciudad'],
  palabras: ['ciudad', 'centro', 'metro', 'trafico', 'madrid', 'barcelona', 'santander', 'torrelavega', 'rascacielos', 'urbano'],
  rotulo: 'En la ciudad',
  svg:
    rect(0, 0, 1200, 600, C.cieloClaro, 'stroke="none"') +
    nube(160, 90, 0.8) +
    nube(1000, 60, 1) +
    `<g opacity="0.5">` +
    [60, 180, 320, 470, 640, 760, 910, 1060].map((x, i) => rect(x, 160 + (i % 3) * 50, 110 + (i % 2) * 30, 320, C.gris, tr(3))).join('') +
    `</g>` +
    rect(20, 120, 150, 350, C.tealOsc) +
    ventanas(40, 140, 3, 7, 26, 28, 16, 14, C.cristal) +
    rect(200, 40, 160, 430, C.pared2) +
    ventanas(222, 60, 4, 9, 22, 30, 12, 14, C.cristal) +
    `<path d="M280 40 L280 0" ${tr(5)}/>` +
    rect(880, 70, 150, 400, C.teal) +
    ventanas(900, 90, 3, 8, 28, 32, 14, 14, C.cristal) +
    rect(1040, 180, 170, 290, C.ladrillo) +
    ventanas(1060, 200, 3, 5, 34, 36, 16, 16, C.cristal) +
    rect(0, 470, 1200, 130, C.gris, 'stroke="none"') +
    `<path d="M0 470 L1200 470" ${linea(5, 0.6)}/>` +
    sueloFuga(470, C.gris, 12, 0.14) +
    `<path d="M430 470 L430 330 M430 330 Q430 316 446 316 L470 316" fill="none" ${tr(6)}/><circle cx="476" cy="322" r="11" fill="#F0D58A" ${tr(4)}/>` +
    `<rect x="700" y="400" width="110" height="36" rx="4" fill="${C.tealOsc}" ${tr(4)}/><text x="755" y="425" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="${P}">METRO</text><path d="M720 436 L720 470 M790 436 L790 470" ${tr(5)}/>`,
};

const casa: DefEscenario = {
  id: 'casa',
  nombre: 'Casa',
  tags: ['interior', 'hogar'],
  palabras: ['casa', 'salon', 'sofa', 'piso', 'hogar', 'en casa', 'cocina', 'vecino', 'vecina'],
  rotulo: 'En casa',
  svg:
    rect(0, 0, 1200, 600, C.pared, 'stroke="none"') +
    `<path d="${Array.from({ length: 30 }, (_, i) => `M${i * 42} 0 L${i * 42} 452`).join(' ')}" stroke="${C.pared2}" stroke-width="14"/>` +
    rect(120, 90, 280, 230, C.cielo) +
    `<path d="M260 90 L260 320 M120 205 L400 205" ${tr(5)}/>` +
    `<path d="M96 70 L424 70" ${tr(8)}/><path d="M100 72 Q140 200 110 340 L150 340 Q170 190 160 72 Z M420 72 Q380 200 410 340 L370 340 Q350 190 360 72 Z" fill="${A}" ${tr(4)}/>` +
    cuadro(560, 110, 150, 110, C.verde) +
    `<path d="M580 200 L620 150 L650 180 L680 140 L700 200 Z" fill="${C.verdeOsc}" ${tr(3)}/>` +
    cuadro(760, 140, 90, 110, C.mostaza) +
    `<path d="M880 452 L880 270 Q880 250 900 250 L1150 250 Q1170 250 1170 270 L1170 452" fill="${C.tealOsc}" ${tr(5)}/>` +
    rect(860, 330, 330, 90, C.teal) +
    rect(845, 320, 40, 110, C.tealOsc) +
    rect(1165, 320, 40, 110, C.tealOsc) +
    `<path d="M925 280 q20 30 60 12 M1040 285 q30 20 70 0" ${linea(4, 0.4)}/>` +
    `<rect x="950" y="296" width="60" height="44" rx="10" fill="${C.mostaza}" ${tr(4)}/>` +
    rodapie(468) +
    tablones(468, C.madera),
};

const habitacion: DefEscenario = {
  id: 'habitacion',
  nombre: 'Habitación',
  tags: ['interior', 'hogar', 'noche'],
  palabras: ['habitacion', 'cuarto', 'cama', 'dormir', 'durmiendo', 'siesta', 'sueno', 'almohada', 'pijama', 'acostarme', 'acostado'],
  rotulo: 'En la habitación',
  svg:
    rect(0, 0, 1200, 600, '#D7D2C4', 'stroke="none"') +
    trama(0, 460, 0.12) +
    rect(820, 80, 200, 170, C.noche) +
    `<circle cx="960" cy="130" r="26" fill="${P}" ${tr(3)}/><path d="M920 80 L920 250 M820 165 L1020 165" ${tr(5)}/>` +
    `<path d="M110 90 L270 90 L262 300 L118 300 Z" fill="${C.mostaza}" ${tr(4)}/><text x="190" y="170" text-anchor="middle" font-family="Impact,sans-serif" font-size="40" fill="${T}" opacity="0.7">ROCK</text><path d="M140 210 L240 210 M150 240 L230 240" ${linea(4, 0.5)}/>` +
    `<path d="M20 470 L20 330 Q20 300 50 300 L110 300 Q140 300 140 330 L140 360 L520 360 L520 470" fill="${C.madera}" ${tr(5)}/>` +
    rect(130, 360, 400, 70, P) +
    rect(40, 330, 120, 50, '#EDE6D6') +
    `<path d="M130 430 L530 430" ${tr(5)}/><path d="M200 360 Q260 400 330 368 Q400 400 470 364" ${linea(4, 0.3)}/>` +
    rect(600, 360, 90, 100, C.maderaOsc) +
    `<path d="M645 360 L645 300" ${tr(5)}/><path d="M615 300 L675 300 L660 260 L630 260 Z" fill="${C.mostaza}" ${tr(4)}/>` +
    rodapie(466) +
    tablones(466, C.sueloOsc),
};

const oficina: DefEscenario = {
  id: 'oficina',
  nombre: 'Oficina',
  tags: ['interior', 'trabajo'],
  palabras: ['trabajo', 'curro', 'currar', 'oficina', 'jefe', 'jefa', 'reunion', 'informe', 'cliente', 'clientes', 'proyecto', 'deadline', 'entrega', 'sprint', 'daily', 'compi', 'compis', 'empresa', 'nomina', 'teletrabajo'],
  rotulo: 'En la oficina',
  svg:
    rect(0, 0, 1200, 600, '#DDE0D8', 'stroke="none"') +
    rect(60, 60, 360, 240, C.cristal) +
    `<path d="${Array.from({ length: 12 }, (_, i) => `M60 ${72 + i * 19} L420 ${72 + i * 19}`).join(' ')}" ${linea(3, 0.35)}/>` +
    `<path d="M240 60 L240 300" ${tr(5)}/>` +
    rect(500, 80, 300, 190, '#F4F1E8') +
    `<path d="M530 240 L580 200 L630 220 L690 150 L760 120" fill="none" stroke="${A}" stroke-width="6" stroke-linecap="round"/><path d="M530 110 L530 245 L775 245" ${linea(4, 0.6)}/>` +
    `<text x="650" y="110" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="${T}" opacity="0.6">Q3</text>` +
    `<path d="M520 270 L780 270" ${tr(6)}/>` +
    rect(900, 200, 140, 260, C.gris) +
    `<path d="M900 286 L1040 286 M900 372 L1040 372" ${tr(4)}/><path d="M950 240 L990 240 M950 326 L990 326 M950 412 L990 412" ${tr(6)}/>` +
    `<path d="M1100 460 L1090 380 L1150 380 L1140 460 Z" fill="#B86A45" ${tr(4)}/><path d="M1120 380 C1080 330 1070 290 1100 260 C1110 300 1120 330 1122 380 C1130 320 1150 290 1180 280 C1180 320 1160 350 1122 380 Z" fill="${C.verdeOsc}" ${tr(4)}/>` +
    rodapie(462) +
    rect(0, 462, 1200, 138, '#A9AFA6', 'stroke="none"') +
    trama(462, 138, 0.2) +
    `<path d="M0 462 L1200 462" ${linea(5, 0.6)}/>`,
};

const cafeteria: DefEscenario = {
  id: 'cafeteria',
  nombre: 'Cafetería',
  tags: ['interior', 'comida', 'cafe'],
  palabras: ['cafeteria', 'cafe', 'bar', 'cana', 'canas', 'cortado', 'desayuno', 'merienda', 'terraza', 'barra', 'camarero', 'camarera', 'almorzar'],
  rotulo: 'En la cafetería',
  mobiliario: [{ tipo: 'mesa', x: 'centro', profundidad: 0.45 }],
  svg:
    rect(0, 0, 1200, 600, '#E2CFB0', 'stroke="none"') +
    `<path d="${Array.from({ length: 16 }, (_, i) => `M0 ${260 + i * 14} L1200 ${260 + i * 14}`).join(' ')}" ${linea(2, 0.08)}/>` +
    rect(80, 70, 300, 170, '#34403A') +
    `<text x="230" y="110" text-anchor="middle" font-family="'Comic Sans MS',cursive" font-size="28" fill="${P}">MENÚ</text><path d="M110 140 L260 140 M110 170 L240 170 M110 200 L270 200 M300 140 L350 140 M300 170 L350 170 M300 200 L350 200" stroke="${P}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>` +
    lampara(560, 70) +
    lampara(820, 50) +
    rect(640, 250, 540, 120, C.maderaOsc) +
    rect(620, 240, 580, 18, C.madera) +
    `<rect x="720" y="170" width="90" height="72" rx="6" fill="${C.grisOsc}" ${tr(4)}/><path d="M740 242 L740 222 M790 242 L790 222" ${tr(5)}/><rect x="735" y="184" width="60" height="18" fill="${C.gris}" ${tr(3)}/>` +
    `<path d="M880 240 L880 214 L906 214 L904 240 Z M930 240 L930 214 L956 214 L954 240 Z" fill="${P}" ${tr(3.5)}/>` +
    `<path d="M1010 170 L1010 240 M1060 180 L1060 240 M1110 160 L1110 240" stroke="${C.tealOsc}" stroke-width="16" stroke-linecap="round"/>` +
    rect(-5, 370, 1210, 100, C.madera) +
    `<path d="M0 370 L1200 370" ${tr(5)}/>` +
    `<path d="${Array.from({ length: 13 }, (_, i) => `M${i * 100} 470 L${i * 100 - 60} 600`).join(' ')} ${Array.from({ length: 5 }, (_, i) => `M0 ${490 + i * 26} L1200 ${490 + i * 26}`).join(' ')}" ${linea(3, 0.2)}/>` +
    rect(0, 470, 1200, 130, '#E5D9C0', 'stroke="none" opacity="0.6"') +
    `<path d="M0 470 L1200 470" ${linea(5, 0.6)}/>`,
};

const restaurante: DefEscenario = {
  id: 'restaurante',
  nombre: 'Restaurante',
  tags: ['interior', 'comida'],
  palabras: ['restaurante', 'cena', 'cenar', 'comer', 'comida', 'menu', 'reserva', 'mesa para', 'paella', 'cocido', 'chuleton', 'sidra', 'sidreria', 'tapas', 'pintxos'],
  rotulo: 'En el restaurante',
  mobiliario: [{ tipo: 'mesa', x: 'centro', profundidad: 0.4 }],
  svg:
    rect(0, 0, 1200, 600, '#C9A07A', 'stroke="none"') +
    rect(0, 300, 1200, 170, '#9E6E4E', 'stroke="none"') +
    `<path d="M0 300 L1200 300" ${tr(6)}/>` +
    cuadro(120, 90, 160, 120, C.mostaza) +
    `<circle cx="200" cy="150" r="30" fill="${A}" ${tr(3)}/>` +
    cuadro(900, 70, 190, 150, C.verde) +
    rect(430, 60, 300, 230, C.maderaOsc) +
    `<path d="M430 136 L730 136 M430 212 L730 212" ${tr(5)}/>` +
    Array.from({ length: 9 }, (_, i) => `<path d="M${455 + i * 32} 130 L${455 + i * 32} 98 Q${455 + i * 32} 90 ${462 + i * 32} 88 L${462 + i * 32} 76" fill="none" stroke="${i % 2 ? '#5C3B3B' : C.verdeOsc}" stroke-width="12" stroke-linecap="round"/>`).join('') +
    lampara(330, 40, A) +
    lampara(830, 40, A) +
    `<path d="M0 470 L1200 470" ${linea(5, 0.6)}/>` +
    rect(0, 470, 1200, 130, '#7E5A42', 'stroke="none"') +
    `<path d="${Array.from({ length: 16 }, (_, i) => `M${i * 80} 470 L${i * 80 - 40} 600`).join(' ')}" ${linea(3, 0.2)}/>`,
};

const parque: DefEscenario = {
  id: 'parque',
  nombre: 'Parque',
  tags: ['exterior', 'naturaleza'],
  palabras: ['parque', 'paseo', 'pasear', 'perro', 'banco', 'columpios', 'jardin', 'cesped', 'picnic', 'correr', 'running'],
  rotulo: 'En el parque',
  svg:
    rect(0, 0, 1200, 600, C.cielo, 'stroke="none"') +
    nube(300, 80, 1) +
    nube(860, 110, 0.8) +
    `<path d="M0 380 Q300 330 600 370 Q900 400 1200 350 L1200 470 L0 470 Z" fill="${C.verdeOsc}" ${tr(4)} opacity="0.7"/>` +
    arbol(120, 470, 300) +
    arbol(1060, 470, 330, C.verdeOsc) +
    arbol(760, 440, 180) +
    `<path d="M380 470 L380 420 M540 470 L540 420" ${tr(7)}/>` +
    rect(360, 400, 200, 18, C.madera) +
    rect(360, 360, 200, 16, C.madera) +
    `<path d="M370 360 L370 418 M550 360 L550 418" ${tr(5)}/>` +
    rect(0, 470, 1200, 130, C.verde, 'stroke="none"') +
    `<path d="M420 600 Q520 520 640 470 L760 470 Q700 520 780 600 Z" fill="${C.arena}" ${tr(4)}/>` +
    `<path d="M0 470 L1200 470" ${linea(5, 0.55)}/>` +
    `<path d="M80 520 l6 -12 l6 12 M200 560 l6 -12 l6 12 M960 530 l6 -12 l6 12 M1100 570 l6 -12 l6 12 M300 590 l6 -12 l6 12" ${linea(3, 0.5)}/>`,
};

const tienda: DefEscenario = {
  id: 'tienda',
  nombre: 'Tienda',
  tags: ['interior', 'compras'],
  palabras: ['tienda', 'comprar', 'compras', 'super', 'supermercado', 'mercadona', 'oferta', 'ofertas', 'rebajas', 'caja', 'precio', 'carro', 'mercado'],
  rotulo: 'En la tienda',
  svg:
    rect(0, 0, 1200, 600, '#E4E0D2', 'stroke="none"') +
    `<rect x="450" y="30" width="300" height="60" rx="6" fill="${A}" ${tr(5)}/><text x="600" y="72" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="34" fill="${P}">¡OFERTAS!</text>` +
    [40, 820].map((x) => {
      let s = rect(x, 120, 340, 340, C.madera);
      for (let f = 0; f < 4; f++) {
        s += `<path d="M${x} ${200 + f * 80} L${x + 340} ${200 + f * 80}" ${tr(5)}/>`;
        for (let c = 0; c < 7; c++) {
          const colores = [A, C.mostaza, C.teal, C.verde, P, '#C2588A'];
          const h = 34 + ((c * 13 + f * 7) % 24);
          s += `<rect x="${x + 12 + c * 46}" y="${200 + f * 80 - h}" width="36" height="${h}" rx="3" fill="${colores[(c + f) % colores.length]}" ${tr(3)}/>`;
        }
      }
      return s;
    }).join('') +
    rect(450, 300, 300, 160, C.grisOsc) +
    rect(440, 290, 320, 20, C.gris) +
    `<rect x="620" y="240" width="90" height="52" rx="4" fill="${C.gris}" ${tr(4)}/><rect x="632" y="250" width="66" height="22" fill="#9DB8C0"/>` +
    sueloFuga(460, '#D3CCBB', 14, 0.15),
};

const escuela: DefEscenario = {
  id: 'escuela',
  nombre: 'Escuela',
  tags: ['interior', 'estudio'],
  palabras: ['clase', 'clases', 'examen', 'examenes', 'profe', 'profesor', 'profesora', 'colegio', 'cole', 'instituto', 'insti', 'universidad', 'uni', 'facultad', 'estudiar', 'estudiando', 'deberes', 'apuntes', 'aprobar', 'suspender', 'selectividad', 'tfg', 'master'],
  rotulo: 'En clase',
  svg:
    rect(0, 0, 1200, 600, '#DCD6B8', 'stroke="none"') +
    rect(230, 70, 740, 280, C.maderaOsc) +
    rect(250, 90, 700, 240, '#35463C') +
    `<text x="330" y="160" font-family="'Comic Sans MS',cursive" font-size="40" fill="${P}" opacity="0.85">E = mc²</text>` +
    `<text x="620" y="150" font-family="'Comic Sans MS',cursive" font-size="28" fill="${P}" opacity="0.7">Tema 4</text>` +
    `<path d="M300 220 Q400 190 480 240 T660 230 M620 270 L880 270 M620 300 L820 300" fill="none" stroke="${P}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>` +
    rect(250, 330, 700, 14, C.madera) +
    `<circle cx="1080" cy="120" r="46" fill="${P}" ${tr(6)}/><path d="M1080 120 L1080 88 M1080 120 L1102 132" ${tr(5)}/>` +
    `<path d="M20 40 L200 60" ${linea(3, 0.6)}/>` +
    ['A', 'B', 'C', 'D'].map((l, i) => `<rect x="${30 + i * 42}" y="${44 + i * 4.5}" width="34" height="40" fill="${[A, C.mostaza, C.teal, C.verde][i]}" ${tr(3)}/><text x="${47 + i * 42}" y="${73 + i * 4.5}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="24" fill="${P}">${l}</text>`).join('') +
    rodapie(462) +
    tablones(462, C.madera),
};

const playa: DefEscenario = {
  id: 'playa',
  nombre: 'Playa',
  tags: ['exterior', 'vacaciones', 'verano'],
  palabras: ['playa', 'mar', 'arena', 'bano', 'banarse', 'bronceado', 'chiringuito', 'olas', 'surf', 'verano', 'sol', 'toalla', 'sardinero'],
  rotulo: 'En la playa',
  svg:
    rect(0, 0, 1200, 600, '#CFE0DC', 'stroke="none"') +
    `<circle cx="1000" cy="110" r="60" fill="#F0D58A" ${tr(4)}/>` +
    nube(260, 90, 0.8) +
    rect(0, 300, 1200, 170, C.mar, 'stroke="none"') +
    `<path d="M0 300 L1200 300" ${linea(4, 0.6)}/>` +
    `<path d="M60 350 q20 -12 40 0 q20 12 40 0 M400 330 q20 -12 40 0 q20 12 40 0 M760 370 q20 -12 40 0 q20 12 40 0 M980 340 q20 -12 40 0 M200 420 q20 -12 40 0 q20 12 40 0" ${linea(4, 0.5)}/>` +
    `<path d="M0 470 Q300 440 600 462 Q900 480 1200 450 L1200 600 L0 600 Z" fill="${C.arena}" ${tr(5)}/>` +
    `<path d="M880 560 L920 330" ${tr(7)}/><path d="M800 350 Q920 250 1040 330 Z" fill="${A}" ${tr(5)}/><path d="M860 339 Q920 280 980 321 M920 330 L920 290" ${linea(4, 0.4)}/>` +
    `<rect x="120" y="520" width="170" height="40" rx="6" fill="${C.teal}" ${tr(4)} transform="rotate(-6 200 540)"/>` +
    trama(470, 130, 0.12),
};

const naturaleza: DefEscenario = {
  id: 'naturaleza',
  nombre: 'Naturaleza',
  tags: ['exterior', 'naturaleza'],
  palabras: ['monte', 'montana', 'campo', 'excursion', 'senderismo', 'bosque', 'rio', 'lago', 'pueblo', 'vacas', 'picos', 'ruta', 'acampada', 'camping', 'naturaleza'],
  rotulo: 'En el monte',
  svg:
    rect(0, 0, 1200, 600, C.cieloClaro, 'stroke="none"') +
    nube(180, 70, 0.8) +
    `<path d="M-20 400 L200 150 L300 250 L460 90 L700 400 Z" fill="#A8B3A8" ${tr(4)}/><path d="M410 150 L460 90 L520 170 L490 160 L460 180 L440 160 Z" fill="${P}" ${tr(3)}/>` +
    `<path d="M500 400 L760 170 L880 280 L980 200 L1220 400 Z" fill="#96A596" ${tr(4)}/><path d="M720 205 L760 170 L800 206 L780 200 L760 214 Z" fill="${P}" ${tr(3)}/>` +
    `<path d="M0 390 Q300 360 600 400 Q900 420 1200 380 L1200 470 L0 470 Z" fill="${C.verdeOsc}" ${tr(4)}/>` +
    pino(80, 470, 220) +
    pino(170, 470, 170, C.verde) +
    pino(1060, 470, 240) +
    pino(1150, 470, 180, C.verde) +
    rect(0, 470, 1200, 130, C.verde, 'stroke="none"') +
    `<path d="M300 600 Q420 520 560 490 Q700 470 820 480 L900 480 Q760 500 700 530 Q620 570 600 600 Z" fill="${C.mar}" ${tr(4)}/>` +
    `<path d="M0 470 L1200 470" ${linea(5, 0.5)}/>`,
};

const espacio: DefEscenario = {
  id: 'espacio',
  nombre: 'Espacio',
  tags: ['exterior', 'fantasia'],
  palabras: ['espacio', 'planeta', 'planetas', 'cohete', 'nasa', 'marte', 'luna', 'alien', 'aliens', 'extraterrestre', 'astronauta', 'galaxia', 'universo', 'ovni', 'spacex'],
  rotulo: 'En el espacio',
  oscuro: true,
  svg:
    rect(0, 0, 1200, 600, '#1F2436', 'stroke="none"') +
    Array.from({ length: 70 }, (_, i) => {
      const x = (i * 173.3) % 1200;
      const y = (i * 97.1) % 430;
      const r = 1.5 + (i % 3);
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${P}" opacity="${0.4 + (i % 5) / 8}"/>`;
    }).join('') +
    `<circle cx="920" cy="160" r="90" fill="${C.mostaza}" ${tr(5)}/><path d="M850 130 Q920 110 990 150 M840 180 Q910 170 1000 196" ${linea(5, 0.3)}/>` +
    `<ellipse cx="920" cy="170" rx="150" ry="30" fill="none" stroke="#C98C6A" stroke-width="10" transform="rotate(-12 920 170)"/>` +
    `<circle cx="200" cy="120" r="30" fill="#8FB8C4" ${tr(4)}/>` +
    `<path d="M0 470 Q300 440 600 460 Q900 480 1200 450 L1200 600 L0 600 Z" fill="#8E8A80" ${tr(5)}/>` +
    `<ellipse cx="200" cy="530" rx="70" ry="16" fill="#77736A" ${tr(4)}/><ellipse cx="820" cy="560" rx="90" ry="18" fill="#77736A" ${tr(4)}/><ellipse cx="1080" cy="500" rx="40" ry="10" fill="#77736A" ${tr(3)}/>`,
};

const noticias: DefEscenario = {
  id: 'noticias',
  nombre: 'Plató de noticias',
  tags: ['interior', 'noticias'],
  palabras: ['noticia', 'noticias', 'telediario', 'ultima hora', 'periodico', 'prensa', 'politica', 'elecciones', 'gobierno', 'economia', 'bolsa', 'inflacion', 'ministro', 'congreso', 'rueda de prensa', 'entrevista'],
  rotulo: 'Última hora',
  ambiente: 'drama',
  svg:
    rect(0, 0, 1200, 600, '#2C4A66', 'stroke="none"') +
    `<g opacity="0.25" stroke="${P}" stroke-width="2" fill="none">` +
    Array.from({ length: 13 }, (_, i) => `<path d="M${i * 100} 0 L${i * 100} 470"/>`).join('') +
    Array.from({ length: 6 }, (_, i) => `<path d="M0 ${i * 80} L1200 ${i * 80}"/>`).join('') +
    `</g>` +
    `<circle cx="600" cy="220" r="170" fill="none" stroke="${P}" stroke-width="3" opacity="0.35"/><ellipse cx="600" cy="220" rx="70" ry="170" fill="none" stroke="${P}" stroke-width="3" opacity="0.35"/><path d="M430 220 L770 220 M450 140 L750 140 M450 300 L750 300" stroke="${P}" stroke-width="3" opacity="0.35"/>` +
    `<rect x="40" y="40" width="250" height="56" fill="${A}" ${tr(4)}/><text x="165" y="80" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="32" fill="${P}">ÚLTIMA HORA</text>` +
    `<rect x="0" y="400" width="1200" height="40" fill="${P}" opacity="0.9"/><text x="620" y="428" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="22" fill="${T}">DIARIO HILARIO · LA ACTUALIDAD, CONTADA POR SU GENTE · DIARIO HILARIO · LA ACTUALIDAD</text>` +
    rect(0, 440, 1200, 160, '#1E3348', 'stroke="none"') +
    `<path d="M0 440 L1200 440" ${linea(5, 0.6)}/>`,
  frente:
    `<path d="M250 600 L290 492 L910 492 L950 600 Z" fill="${C.gris}" ${tr(6)}/>` +
    `<path d="M280 492 L920 492 L912 516 L288 516 Z" fill="${P}" ${tr(5)}/>` +
    `<text x="600" y="570" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="36" fill="${T}" opacity="0.8">DH NOTICIAS</text>`,
};

const celebracion: DefEscenario = {
  id: 'celebracion',
  nombre: 'Fiesta',
  tags: ['interior', 'fiesta'],
  palabras: ['fiesta', 'celebrar', 'celebracion', 'cumple', 'cumpleanos', 'felicidades', 'brindis', 'boda', 'nochevieja', 'fiestuki', 'party', 'aniversario', 'enhorabuena'],
  rotulo: '¡Fiesta!',
  ambiente: 'fiesta',
  mobiliario: [{ tipo: 'globos', x: 0.04, profundidad: 0.8 }],
  svg:
    rect(0, 0, 1200, 600, '#E9D6C0', 'stroke="none"') +
    trama(0, 470, 0.15) +
    [60, 360, 660].map((x0) => {
      let s = `<path d="M${x0 - 60} 40 Q${x0 + 90} 120 ${x0 + 240} 40" ${linea(3, 0.6)}/>`;
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const x = x0 - 60 + 300 * t;
        const y = 40 + 80 * 4 * t * (1 - t) * 0.5;
        s += `<path d="M${(x - 14).toFixed(0)} ${y.toFixed(0)} L${(x + 14).toFixed(0)} ${y.toFixed(0)} L${x.toFixed(0)} ${(y + 34).toFixed(0)} Z" fill="${[A, C.mostaza, C.teal, C.verde][i % 4]}" ${tr(3)}/>`;
      }
      return s;
    }).join('') +
    `<path d="M960 40 Q1080 120 1200 40" ${linea(3, 0.6)}/>` +
    `<rect x="380" y="170" width="440" height="80" rx="8" fill="${A}" ${tr(5)} transform="rotate(-2 600 210)"/><text x="600" y="228" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="46" fill="${P}" transform="rotate(-2 600 210)">¡FELICIDADES!</text>` +
    Array.from({ length: 24 }, (_, i) => `<rect x="${(i * 211) % 1200}" y="${280 + ((i * 53) % 170)}" width="10" height="18" fill="${[A, C.mostaza, C.teal, C.verde][i % 4]}" transform="rotate(${(i * 41) % 180} ${(i * 211) % 1200} ${280 + ((i * 53) % 170)})" opacity="0.8"/>`).join('') +
    rodapie(466) +
    tablones(466, C.madera),
};

const noche: DefEscenario = {
  id: 'noche',
  nombre: 'Noche',
  tags: ['exterior', 'noche'],
  palabras: ['noche', 'nocturno', 'madrugada', 'insomnio', 'luna', 'estrellas', 'de noche', 'trasnochar', 'fiesta de noche', 'marcha'],
  rotulo: 'De noche',
  oscuro: true,
  svg:
    rect(0, 0, 1200, 600, C.noche, 'stroke="none"') +
    Array.from({ length: 36 }, (_, i) => `<circle cx="${(i * 131) % 1200}" cy="${(i * 71) % 250}" r="${1.5 + (i % 3)}" fill="${P}" opacity="0.7"/>`).join('') +
    `<circle cx="1000" cy="100" r="52" fill="#EFE6C8" ${tr(4)}/><circle cx="1022" cy="86" r="52" fill="${C.noche}"/>` +
    [
      [0, 170, 180],
      [180, 110, 150],
      [330, 200, 200],
      [530, 140, 160],
      [690, 190, 210],
      [900, 160, 150],
      [1050, 120, 160],
    ]
      .map(([x, y, w], i) => rect(x!, y!, w!, 470 - y!, C.nocheOsc, tr(3)) + ventanas(x! + 18, y! + 24, Math.floor((w! - 20) / 44), Math.floor((440 - y!) / 60), 26, 34, 18, 26, '#3A4560', (k) => (k * 7 + i * 3) % 5 === 0))
      .join('') +
    rect(0, 470, 1200, 130, '#3A4258', 'stroke="none"') +
    `<path d="M0 470 L1200 470" stroke="${P}" stroke-width="4" opacity="0.3"/>` +
    `<path d="M300 470 L300 280 Q300 262 318 262 L346 262" fill="none" ${tr(7)}/><circle cx="352" cy="270" r="12" fill="#F0D58A"/><path d="M352 282 L260 470 L440 470 Z" fill="#F0D58A" opacity="0.12"/>`,
};

const aeropuerto: DefEscenario = {
  id: 'aeropuerto',
  nombre: 'Aeropuerto',
  tags: ['interior', 'viaje'],
  palabras: ['aeropuerto', 'avion', 'vuelo', 'volar', 'embarque', 'terminal', 'maleta', 'viaje', 'viajar', 'vacaciones', 'ryanair', 'escala', 'pasaporte', 'aterrizar', 'despegar', 'barajas'],
  rotulo: 'En el aeropuerto',
  svg:
    rect(0, 0, 1200, 600, '#DCDCD4', 'stroke="none"') +
    rect(40, 50, 720, 330, '#CFE0E2') +
    `<path d="M220 50 L220 380 M400 50 L400 380 M580 50 L580 380 M40 215 L760 215" ${tr(5)}/>` +
    `<g transform="translate(420 170) rotate(-10)"><path d="M-150 0 Q-150 -18 -120 -20 L130 -20 Q170 -18 180 0 Q170 18 130 20 L-120 20 Q-150 18 -150 0 Z" fill="${P}" ${tr(4)}/><path d="M-20 -18 L40 -90 L70 -90 L40 -18 Z M-20 18 L30 70 L56 70 L40 18 Z M-130 -18 L-150 -60 L-126 -60 L-100 -18 Z" fill="${C.teal}" ${tr(4)}/><path d="M-90 -6 L110 -6" stroke="${C.teal}" stroke-dasharray="10 10" stroke-width="6"/></g>` +
    rect(830, 60, 330, 200, '#26303A') +
    `<text x="995" y="98" text-anchor="middle" font-family="monospace" font-weight="700" font-size="24" fill="#F0D58A">SALIDAS</text>` +
    ['SDR  10:45  A12', 'MAD  11:20  B03', 'BCN  12:05  A07', 'LIS  13:30  C21'].map((t, i) => `<text x="850" y="${135 + i * 32}" font-family="monospace" font-size="22" fill="${P}">${t}</text>`).join('') +
    Array.from({ length: 4 }, (_, i) => rect(820 + i * 90, 390, 80, 36, C.teal, tr(4)) + `<path d="M${828 + i * 90} 426 L${828 + i * 90} 462 M${892 + i * 90} 426 L${892 + i * 90} 462" ${tr(4)}/>`).join('') +
    sueloFuga(466, '#C9C7BB', 14, 0.18),
};

export const ESCENARIOS: DefEscenario[] = [
  neutro,
  calle,
  ciudad,
  casa,
  habitacion,
  oficina,
  cafeteria,
  restaurante,
  parque,
  tienda,
  escuela,
  playa,
  naturaleza,
  espacio,
  noticias,
  celebracion,
  noche,
  aeropuerto,
];

/** `<defs>` que usan los escenarios (tramas). Se inyectan una vez por viñeta. */
export const DEFS_ESCENARIOS = `
  <pattern id="dh-esc-puntos" width="14" height="14" patternUnits="userSpaceOnUse">
    <circle cx="3.5" cy="3.5" r="2.2" fill="#1B1714"/><circle cx="10.5" cy="10.5" r="2.2" fill="#1B1714"/>
  </pattern>
  <pattern id="dh-esc-rayas" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
    <rect width="4" height="12" fill="#1B1714"/>
  </pattern>`;
