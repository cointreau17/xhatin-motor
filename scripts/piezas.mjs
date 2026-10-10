// Genera src/hilaravatar/piezas.js a partir de los dibujos de HilarAvatar:
//
//   hilaravatar/manifest.json             categorías, opciones, paletas…
//   hilaravatar/piezas/<categoria>/<id>.svg  un SVG por pieza
//
// Cada pieza es un SVG completo de 512×512 —se puede abrir y retocar en
// cualquier editor y verse suelta— con los `<defs>` compartidos y la pieza
// en un `<g class="dh-<categoria>">`. Al generar, se toma lo que va después
// de `</defs>`; los `<defs>` salen del primero (todos llevan los mismos, y si
// alguno no, el script se para).
//
// Sustituye al build.py con el que se generaron al principio, que se perdió.
//
//   npm run piezas            regenera piezas.js
//   npm run piezas -- --check  solo comprueba que está al día (para CI)

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { anchoA, caja, puntosDePath, subtrazosDePath } from './geometria.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'hilaravatar');
const DESTINO = join(RAIZ, 'src/hilaravatar/piezas.js');
const CABECERA =
  '// Generado por scripts/piezas.mjs a partir de hilaravatar/ — no editar a mano.\n' +
  '// Datos del sistema HilarAvatar: fragmentos SVG + catalogo.\n';

const manifest = JSON.parse(readFileSync(join(ORIGEN, 'manifest.json'), 'utf8'));
const errores = [];
let defs = null;
const piezas = {};

for (const categoria of manifest.categorias) {
  const carpeta = join(ORIGEN, 'piezas', categoria.id);
  piezas[categoria.id] = {};
  for (const opcion of categoria.opciones) {
    const fichero = join(carpeta, `${opcion.id}.svg`);
    if (!existsSync(fichero)) {
      errores.push(`falta el dibujo ${categoria.id}/${opcion.id}.svg`);
      continue;
    }
    const svg = readFileSync(fichero, 'utf8');
    const inicio = svg.indexOf('<defs>');
    const fin = svg.indexOf('</defs>');
    if (inicio < 0 || fin < 0) {
      errores.push(`${categoria.id}/${opcion.id}.svg no lleva <defs>`);
      continue;
    }
    const susDefs = svg.slice(inicio, fin + '</defs>'.length);
    if (defs === null) defs = susDefs;
    else if (susDefs !== defs) errores.push(`${categoria.id}/${opcion.id}.svg lleva otros <defs>`);
    const pieza = svg.slice(fin + '</defs>'.length, svg.lastIndexOf('</svg>')).trim();
    if (!pieza.trim().startsWith('<g')) errores.push(`${categoria.id}/${opcion.id}.svg: la pieza no es un <g>`);
    piezas[categoria.id][opcion.id] = pieza;
  }
  // Un dibujo que no está en el manifiesto no saldría nunca: mejor saberlo.
  if (existsSync(carpeta))
    for (const f of readdirSync(carpeta))
      if (f.endsWith('.svg') && !categoria.opciones.some((o) => `${o.id}.svg` === f))
        errores.push(`${categoria.id}/${f} no está en el manifiesto`);
}

// ------------------------------------------------- ajuste a la cabeza --
//
// Las piezas se dibujan sobre la cabeza por defecto (la ovalada). Para cada
// cabeza se mide su dibujo —el contorno de la cara, marcado con
// data-contorno="cara", y las orejas— y se calcula el transform que lleva lo
// dibujado para la ovalada a ella. Los usa hilaravatar.js con los grupos
// `data-ajuste="<nombre>"` de las piezas.

const AJUSTES = [
  'craneo', 'craneo-orejas', 'mandibula', 'barbilla', 'orejas',
  'oreja-izquierda', 'oreja-derecha', 'brazo-izquierdo', 'brazo-derecho',
];
/** Borde de fuera de los cristales: desde ahí salen los brazos de las gafas. */
const CRISTAL = { izquierdo: 178, derecho: 334 };

function medirCabeza(id) {
  const pieza = piezas.cabeza[id];
  const contorno = /<path[^>]*\sdata-contorno="cara"[^>]*\sd="([^"]+)"|<path[^>]*\sd="([^"]+)"[^>]*\sdata-contorno="cara"/.exec(pieza);
  if (!contorno) {
    errores.push(`cabeza/${id}.svg: falta data-contorno="cara" en el contorno de la cara`);
    return null;
  }
  const d = contorno[1] ?? contorno[2];
  const pts = puntosDePath(d);
  const { y0: arriba, y1: abajo } = caja(pts);
  const orejas = [...pieza.matchAll(/<ellipse\b[^>]*\scx="([\d.]+)"[^>]*\scy="([\d.]+)"/g)]
    .map((m) => [Number(m[1]), Number(m[2])])
    .sort((a, b) => a[0] - b[0]);
  if (orejas.length < 2) errores.push(`cabeza/${id}.svg: no se encuentran las dos orejas (ellipse)`);
  const izq = orejas[0] ?? [0, 0];
  const der = orejas[orejas.length - 1] ?? [0, 0];
  const mitad = (y) => {
    const a = anchoA(pts, y);
    return a ? (a[1] - a[0]) / 2 : NaN;
  };
  const borde = (y) => anchoA(pts, y) ?? [NaN, NaN];
  return { d, arriba, abajo, izq, der, linea: (izq[1] + der[1]) / 2, mitad, borde };
}

const r2 = (n) => Math.round(n * 1000) / 1000;
const matriz = (sx, sy, tx, ty) =>
  sx === 1 && sy === 1 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01
    ? ''
    : `matrix(${r2(sx)} 0 0 ${r2(sy)} ${r2(tx)} ${r2(ty)})`;

function ajustesDe(r, t) {
  // Cráneo (pelo, sombreros): la parte de arriba de la cabeza a la de la otra,
  // con la línea de las orejas fija. A lo ancho, lo que haga falta para que el
  // pelo no se meta nunca dentro de la cara (mejor que abulte un poco).
  const syC = (t.linea - t.arriba) / (r.linea - r.arriba);
  // Desde un tercio hacia abajo: arriba del todo las formas difieren mucho
  // (la cuadrada es plana, la ovalada estrecha) y el pelo solo la cubre.
  const sxC = Math.max(...[0.35, 0.55, 0.75, 1].map((f) =>
    t.mitad(t.arriba + f * (t.linea - t.arriba)) / r.mitad(r.arriba + f * (r.linea - r.arriba))));
  // Mandíbula (perillas): de la línea de las orejas a la barbilla.
  const syM = (t.abajo - t.linea) / (r.abajo - r.linea);
  const ratiosM = [0.25, 0.5, 0.75].map((f) =>
    t.mitad(t.linea + f * (t.abajo - t.linea)) / r.mitad(r.linea + f * (r.abajo - r.linea)));
  const sxM = ratiosM.reduce((a, b) => a + b, 0) / ratiosM.length;
  // Orejas: a lo ancho, la distancia entre las orejas.
  const sxO = (t.der[0] - t.izq[0]) / (r.der[0] - r.izq[0]);
  const dyO = t.linea - r.linea;
  const c = 256;
  const brazo = (ancla, orejaR, orejaT, dy) => {
    const k = (orejaT - ancla) / (orejaR - ancla);
    return matriz(k, 1, ancla * (1 - k), dy);
  };
  return {
    craneo: matriz(sxC, syC, c * (1 - sxC), t.linea - r.linea * syC),
    'craneo-orejas': matriz(sxO, syC, c * (1 - sxO), t.linea - r.linea * syC),
    mandibula: matriz(sxM, syM, c * (1 - sxM), t.linea - r.linea * syM),
    // Barbilla (perillas): solo en vertical, hasta la barbilla de la otra.
    barbilla: matriz(1, syM, 0, t.linea - r.linea * syM),
    orejas: matriz(sxO, 1, c * (1 - sxO), dyO),
    'oreja-izquierda': matriz(1, 1, t.izq[0] - r.izq[0], t.izq[1] - r.izq[1]),
    'oreja-derecha': matriz(1, 1, t.der[0] - r.der[0], t.der[1] - r.der[1]),
    'brazo-izquierdo': brazo(CRISTAL.izquierdo, r.izq[0], t.izq[0], t.izq[1] - r.izq[1]),
    'brazo-derecho': brazo(CRISTAL.derecho, r.der[0], t.der[0], t.der[1] - r.der[1]),
  };
}

// --------------------------------------------- pegado al borde de la cara --
//
// `<g data-pegado="cara-izquierda">` (o `cara-derecha`): lo de dentro va
// pegado al borde de la cara, como las patillas. Se dibuja sobre la ovalada y
// aquí se redibuja para cada cabeza: cada punto se corre en horizontal lo que
// se separa el borde de esa cabeza del de la ovalada a su altura, así que
// sigue al borde con el mismo grosor. Junto a los ojos se estrecha lo que haga
// falta para no meterse en ellos: en las cabezas estrechas el ojo queda casi
// en el borde. Sale una pieza por cabeza, en caras[cabeza].piezas.

const PEGADOS = { 'cara-izquierda': 0, 'cara-derecha': 1 };
/** Los ojos normales: lo pegado al borde no pasa de ahí. */
const OJO = { cx: [212, 300], cy: 226, rx: 31, ry: 25 };
const MARGEN_OJO = 5;

/** Dónde empieza el ojo de un lado (0 izquierdo, 1 derecho) a una altura. */
function bordeDelOjo(lado, y) {
  const v = (y - OJO.cy) / OJO.ry;
  if (Math.abs(v) >= 1) return lado === 0 ? Infinity : -Infinity;
  const ancho = OJO.rx * Math.sqrt(1 - v * v);
  return lado === 0 ? OJO.cx[0] - ancho : OJO.cx[1] + ancho;
}

const enCara = (c, y) => Math.min(c.abajo - 1, Math.max(c.arriba + 1, y));

/**
 * Cuánto puede meterse en la cara lo pegado al borde a una altura sin llegar
 * al ojo. Es el hueco más estrecho de los de alrededor (±VENTANA): así se
 * estrecha poco a poco al acercarse al ojo, en vez de calcar su curva.
 */
const VENTANA = 14;
function libreHastaElOjo(lado, t, y) {
  let libre = Infinity;
  for (let k = -VENTANA; k <= VENTANA; k += 2) {
    const yk = y + k;
    const hueco = (bordeDelOjo(lado, yk) - t.borde(enCara(t, yk))[lado]) * (lado === 0 ? 1 : -1);
    libre = Math.min(libre, hueco - MARGEN_OJO);
  }
  return Math.max(0, libre);
}

function pegarPunto([x, y], lado, r, t) {
  const hacia = lado === 0 ? 1 : -1; // hacia dentro de la cara
  const yT = y + (t.linea - r.linea);
  const bordeR = r.borde(enCara(r, y))[lado];
  const bordeT = t.borde(enCara(t, yT))[lado];
  let dentro = (x - bordeR) * hacia;
  if (dentro > 0) dentro = Math.min(dentro, libreHastaElOjo(lado, t, yT));
  return [bordeT + hacia * dentro, yT];
}

/** Puntos cada `paso` px como mucho, para que lo corrido siga bien el borde. */
function densificar(pts, paso = 3) {
  const salida = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1];
    const [bx, by] = pts[k];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / paso));
    for (let j = 1; j <= n; j++) salida.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  return salida;
}

/** Ramer–Douglas–Peucker: quita los puntos que no cambian el dibujo. */
function simplificar(pts, tolerancia = 0.25) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const largo = Math.hypot(bx - ax, by - ay) || 1;
  let max = 0;
  let idx = 0;
  for (let k = 1; k < pts.length - 1; k++) {
    const dist = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / largo;
    if (dist > max) {
      max = dist;
      idx = k;
    }
  }
  if (max <= tolerancia) return [pts[0], pts[pts.length - 1]];
  return [...simplificar(pts.slice(0, idx + 1), tolerancia).slice(0, -1), ...simplificar(pts.slice(idx), tolerancia)];
}

const num = (v) => String(Math.round(v * 10) / 10);

function pegarTrazo(d, lado, r, t) {
  return subtrazosDePath(d)
    .map(({ pts, cerrado }) => {
      let p = densificar(cerrado ? [...pts, pts[0]] : pts);
      if (cerrado) p = p.slice(0, -1);
      p = simplificar(p.map((q) => pegarPunto(q, lado, r, t)));
      return p.map(([x, y], k) => `${k ? 'L' : 'M'}${num(x)} ${num(y)}`).join('') + (cerrado ? 'Z' : '');
    })
    .join('');
}

function pegarPieza(pieza, r, t) {
  return pieza.replace(/<g data-pegado="([a-z-]+)">([\s\S]*?)<\/g>/g, (_m, nombre, dentro) =>
    `<g>${dentro.replace(/\sd="([^"]+)"/g, (_d, d) => ` d="${pegarTrazo(d, PEGADOS[nombre], r, t)}"`)}</g>`);
}

const caras = {};
const referencia = medirCabeza(manifest.porDefecto.piezas.cabeza);
for (const { id } of manifest.categorias.find((c) => c.id === 'cabeza').opciones) {
  const t = medirCabeza(id);
  if (!t || !referencia) continue;
  const ajustes = ajustesDe(referencia, t);
  for (const k of Object.keys(ajustes)) if (!ajustes[k]) delete ajustes[k];
  caras[id] = { contorno: t.d, ajustes };
  for (const [cat, ops] of Object.entries(piezas))
    for (const [pid, pieza] of Object.entries(ops))
      if (pieza.includes('data-pegado=')) {
        caras[id].piezas ??= {};
        caras[id].piezas[cat] ??= {};
        caras[id].piezas[cat][pid] = pegarPieza(pieza, referencia, t);
      }
}

// Los nombres de ajuste que usan las piezas tienen que existir, y un grupo
// con data-ajuste no puede llevar además su propio transform (se pisarían).
for (const [cat, ops] of Object.entries(piezas))
  for (const [id, pieza] of Object.entries(ops)) {
    for (const m of pieza.matchAll(/data-ajuste="([^"]*)"/g))
      if (!AJUSTES.includes(m[1])) errores.push(`${cat}/${id}.svg: ajuste desconocido "${m[1]}"`);
    for (const m of pieza.matchAll(/<[a-z]+\b[^>]*>/g))
      if (m[0].includes('data-ajuste=') && m[0].includes(' transform=')) errores.push(`${cat}/${id}.svg: data-ajuste y transform en el mismo elemento`);
    // Lo pegado al borde se redibuja punto a punto: solo trazados, sin grupos
    // dentro ni transform (se correrían dos veces).
    for (const m of pieza.matchAll(/<g data-pegado="([^"]*)">([\s\S]*?)<\/g>/g)) {
      if (!(m[1] in PEGADOS)) errores.push(`${cat}/${id}.svg: pegado desconocido "${m[1]}"`);
      if (/<(?!path\b)[a-z]+\b|transform=/.test(m[2])) errores.push(`${cat}/${id}.svg: lo pegado al borde solo pueden ser <path> sin transform`);
    }
    if ((pieza.match(/data-pegado=/g) ?? []).length !== (pieza.match(/<g data-pegado="[^"]*">/g) ?? []).length)
      errores.push(`${cat}/${id}.svg: data-pegado va en un <g> y solo con él`);
  }

if (errores.length) {
  console.error('No se generan las piezas:\n  ' + errores.join('\n  '));
  process.exit(1);
}

const salida = CABECERA + 'export const DATOS = ' + JSON.stringify({ defs, piezas, manifest, caras }) + ';\n';

if (process.argv.includes('--check')) {
  const actual = readFileSync(DESTINO, 'utf8');
  if (actual !== salida) {
    console.error('src/hilaravatar/piezas.js no está al día: ejecuta `npm run piezas`.');
    process.exit(1);
  }
  console.log('piezas.js al día.');
} else {
  writeFileSync(DESTINO, salida);
  const total = Object.values(piezas).reduce((n, ops) => n + Object.keys(ops).length, 0);
  console.log(`piezas.js: ${total} piezas en ${Object.keys(piezas).length} categorías.`);
}
