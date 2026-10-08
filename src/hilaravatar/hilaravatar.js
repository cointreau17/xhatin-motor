/**
 * HilarAvatar — motor de composicion de avatares de Diario Hilario.
 *
 * Sin dependencias. ESM puro. Funciona igual en el navegador y en Node
 * (para generar la imagen en el servidor, por ejemplo en el SSR de Angular).
 *
 *   import { componer, aleatorio, aCodigo, deCodigo } from './hilaravatar.js';
 *   el.innerHTML = componer(config);
 *
 * El avatar es solo datos: trece ranuras y cuatro colores. Lo que se guarda
 * en base de datos es un codigo corto, nunca una imagen.
 */

import { DATOS } from './piezas.js';

export const MANIFEST = DATOS.manifest;
export const Z_ORDER = MANIFEST.zOrder;
export const CATEGORIAS = MANIFEST.categorias;
export const PALETAS = MANIFEST.paletas;
export const EXPRESIONES = MANIFEST.expresiones;
export const VERSION = MANIFEST.version;

const PIEZAS = DATOS.piezas;
const DEFS = DATOS.defs;

const porId = (lista, id) => lista.find((x) => x.id === id);
const catPorId = (id) => porId(CATEGORIAS, id);

/** Hash corto y estable (FNV-1a) para los sufijos de id. */
function hash32(txt) {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Config minima valida. */
export function porDefecto() {
  return {
    v: VERSION,
    piezas: { ...MANIFEST.porDefecto.piezas },
    colores: { ...MANIFEST.porDefecto.colores },
  };
}

/* ------------------------------------------------------------- colores --- */

function resolverColores(colores) {
  const c = { ...MANIFEST.porDefecto.colores, ...(colores || {}) };
  const piel = porId(PALETAS.piel, c.piel) || PALETAS.piel[0];
  const pelo = porId(PALETAS.pelo, c.pelo) || PALETAS.pelo[0];
  const ropa = porId(PALETAS.ropa, c.ropa) || PALETAS.ropa[0];
  const fondo = porId(PALETAS.fondo, c.fondo) || PALETAS.fondo[0];
  return {
    '--dh-tinta': '#1B1714',
    '--dh-papel': '#F2E9D8',
    '--dh-piel': piel.color,
    '--dh-piel-sombra': piel.sombra,
    '--dh-pelo': pelo.color,
    '--dh-pelo-sombra': pelo.sombra,
    '--dh-ropa': ropa.color,
    '--dh-ropa-2': ropa.secundario,
    '--dh-fondo': fondo.color,
    '--dh-fondo-2': fondo.secundario,
    '--dh-acento': '#CF3A2B',
    '--dh-boca': '#A8402F',
    '--dh-cristal': '#8FB8C4',
  };
}

/* ----------------------------------------------------------- normalizar --- */

/**
 * Rellena huecos, descarta ids inexistentes y aplica las dependencias
 * declaradas (la melena arrastra su pelo trasero, etc.).
 */
export function normalizar(config) {
  const base = porDefecto();
  const piezas = { ...base.piezas, ...((config && config.piezas) || {}) };

  for (const cat of Z_ORDER) {
    const def = catPorId(cat);
    if (!def) continue;
    const existe = porId(def.opciones, piezas[cat]);
    if (!existe) piezas[cat] = base.piezas[cat];
  }
  // dependencias: se aplican despues de validar, y ganan siempre.
  for (const cat of Z_ORDER) {
    const def = catPorId(cat);
    const op = def && porId(def.opciones, piezas[cat]);
    if (op && op.req) for (const [k, v] of Object.entries(op.req)) piezas[k] = v;
  }
  return { v: VERSION, piezas, colores: { ...base.colores, ...((config && config.colores) || {}) } };
}

/* -------------------------------------------------------------- componer -- */

/**
 * Devuelve el marcado SVG del avatar.
 *
 * @param {object} config          {piezas, colores}
 * @param {object} [op]
 * @param {number} [op.tam=256]    lado en px; usa null para que herede del CSS
 * @param {string} [op.expresion]  clave de EXPRESIONES (Comic Chat)
 * @param {string} [op.clase]
 * @param {string} [op.titulo]     <title> accesible
 * @param {string[]}[op.solo]      renderiza solo estas categorias
 * @param {string[]}[op.omitir]    salta estas categorias (p.ej. ['fondo'])
 * @param {string} [op.encuadre]   'completo' | 'busto' | 'cara'
 * @param {boolean}[op.idsUnicos=true] reescribe los ids internos de las tramas.
 *   Necesario en cuanto hay mas de un avatar inline en la pagina: si dos SVG
 *   comparten el id de un <pattern>, el navegador resuelve ambos contra el
 *   primero y las variables CSS del segundo se pierden. El sufijo es un hash
 *   del propio avatar, no un aleatorio, para que el SSR y el cliente generen
 *   exactamente el mismo marcado y la hidratacion no se queje.
 */
export function componer(config, op = {}) {
  const { piezas, colores } = normalizar(config);
  const slots = { ...piezas };

  if (op.expresion && EXPRESIONES[op.expresion]) {
    Object.assign(slots, EXPRESIONES[op.expresion].slots);
  }

  const capas = [];
  for (const cat of Z_ORDER) {
    if (op.solo && op.solo.indexOf(cat) === -1) continue;
    if (op.omitir && op.omitir.indexOf(cat) !== -1) continue;
    const frag = PIEZAS[cat] && PIEZAS[cat][slots[cat]];
    if (frag) capas.push(frag);
  }

  const estilo = Object.entries(resolverColores(colores))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');

  const dim = op.tam === null ? '' : ` width="${op.tam || 256}" height="${op.tam || 256}"`;
  const ENCUADRES = {
    completo: '0 0 512 512',
    busto: '44 56 424 424',
    cara: '128 84 256 256',
  };
  const caja = ENCUADRES[op.encuadre] || ENCUADRES.completo;
  // 'recorte' rellena el hueco aunque no sea cuadrado (vinetas apaisadas).
  const ajuste = op.ajuste === 'recorte'
    ? ' preserveAspectRatio="xMidYMid slice"' : '';
  const titulo = op.titulo
    ? `<title>${String(op.titulo).replace(/[<>&]/g, '')}</title>`
    : '';
  const rol = op.titulo ? 'img' : 'presentation';

  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja}"${dim}${ajuste} ` +
    `class="dh-avatar${op.clase ? ' ' + op.clase : ''}" role="${rol}" ` +
    `style="${estilo}">${titulo}${DEFS}${capas.join('')}</svg>`;

  if (op.idsUnicos !== false) {
    const sufijo = '-' + hash32(aCodigo(config) + '|' + (op.expresion || ''));
    svg = svg.replace(/(id="|url\(#)(dh-[a-z-]+)/g, (_m, p, id) => p + id + sufijo);
  }
  return svg;
}

/** SVG listo para usar en src="" o background-image. */
export function aDataUrl(config, op = {}) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(componer(config, op));
}

/**
 * Rasteriza a PNG en el navegador. Util para Comic Chat, Open Graph o para
 * cachear la miniatura del perfil.
 * @returns {Promise<Blob>}
 */
export function aPng(config, op = {}) {
  const tam = op.tam || 512;
  const url = aDataUrl(config, { ...op, tam });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = tam;
      c.height = tam;
      c.getContext('2d').drawImage(img, 0, 0, tam, tam);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob vacio'))), 'image/png');
    };
    img.onerror = () => reject(new Error('No se pudo rasterizar el avatar'));
    img.src = url;
  });
}

/* ------------------------------------------------------------- codigo ----- */
// Formato: v<version>|<pieza por cada ranura en zOrder, separadas por .>|<colores>
// Ej: v1|trama.nada.camisa.ovalo.rectas.normales.boton.sonrisa.nada.entradas.nada.nada.nada|media.castano.rojo.mostaza
// Cabe de sobra en un VARCHAR(191). Es estable y legible en la base de datos.

const ORDEN_COLOR = ['piel', 'pelo', 'ropa', 'fondo'];

export function aCodigo(config) {
  const { piezas, colores } = normalizar(config);
  return [
    'v' + VERSION,
    Z_ORDER.map((c) => piezas[c]).join('.'),
    ORDEN_COLOR.map((c) => colores[c]).join('.'),
  ].join('|');
}

export function deCodigo(codigo) {
  if (typeof codigo !== 'string' || !codigo) return porDefecto();
  const [, cuerpo, color] = codigo.split('|');
  if (!cuerpo) return porDefecto();
  const ids = cuerpo.split('.');
  const cols = (color || '').split('.');
  const piezas = {};
  Z_ORDER.forEach((c, i) => { if (ids[i]) piezas[c] = ids[i]; });
  const colores = {};
  ORDEN_COLOR.forEach((c, i) => { if (cols[i]) colores[c] = cols[i]; });
  return normalizar({ piezas, colores });
}

/* ------------------------------------------------------------ aleatorio --- */

/** PRNG determinista (mulberry32) a partir de una cadena. */
function semillaDe(txt) {
  let h = 1779033703 ^ String(txt).length;
  for (let i = 0; i < String(txt).length; i++) {
    h = Math.imul(h ^ String(txt).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Avatar aleatorio. Con semilla (por ejemplo el id de usuario) siempre sale
 * el mismo: sirve como avatar por defecto sin guardar nada.
 */
export function aleatorio(semilla) {
  const r = semilla === undefined ? Math.random : semillaDe(semilla);
  const elegir = (arr) => arr[Math.floor(r() * arr.length)];
  const piezas = {};
  for (const cat of CATEGORIAS) {
    if (cat.id === 'pelo-tras') { piezas[cat.id] = 'nada'; continue; }
    const base = cat.opciones.filter((o) => o.rol === 'base');
    if (!base.length) continue;
    // las categorias opcionales salen vacias la mitad de las veces
    if (!cat.obligatoria && r() < 0.45 && porId(base, 'nada')) {
      piezas[cat.id] = 'nada';
    } else {
      piezas[cat.id] = elegir(base).id;
    }
  }
  const colores = {
    piel: elegir(PALETAS.piel).id,
    pelo: elegir(PALETAS.pelo).id,
    ropa: elegir(PALETAS.ropa).id,
    fondo: elegir(PALETAS.fondo).id,
  };
  return normalizar({ piezas, colores });
}

/* --------------------------------------------------------- comic chat ---- */

/**
 * Deduce una expresion a partir del texto de un mensaje.
 *
 * Es la pieza que convierte un chat corriente en un chat de vinetas: el
 * usuario escribe normal y el personaje pone la cara. En Comic Chat esto se
 * elegia a mano con una rueda de emociones; aqui se puede hacer automatico y
 * dejar que el usuario lo corrija si quiere.
 *
 * @param {string} texto
 * @returns {string} clave de EXPRESIONES
 */
export function expresionDeTexto(texto) {
  const t = String(texto || '').trim();
  if (!t) return 'neutral';
  const b = t.toLowerCase();

  if (/\b(z{3,}|zzz)\b/.test(b)) return 'dormido';
  if (/(ja|je|ji){2,}|\blol\b|\bxd\b|😂|🤣/.test(b)) return 'risa';
  if (/[:;=]-?[()[]|snif|😢|😭|\bpena\b/.test(b) && /[:;=]-?\(|snif|😢|😭/.test(b)) return 'triste';
  if (/[:;=]-?[dD)]|😀|😄|😁/.test(t)) return 'feliz';
  if (t === t.toUpperCase() && t.replace(/[^A-Za-zÁÉÍÓÚÑÜ]/g, '').length > 3) return 'grito';
  if (/!{2,}|!$/.test(t)) return 'grito';
  if (/\b(anda|ostras|vaya|no me digas|en serio)\b|😮|😲/.test(b)) return 'sorpresa';
  if (/\?$|\?{2,}/.test(t)) return 'duda';
  if (/\b(claro|obvio|ya te digo|evidentemente)\b|😎/.test(b)) return 'chulo';
  if (/\b(no|nunca|jamas|jamás)\b.*!|😠|😡/.test(b)) return 'enfadado';
  return 'hablando';
}

/* ------------------------------------------------- elemento a medida ------ */

/**
 * Registra <dh-avatar codigo="..." tam="96" expresion="feliz">.
 * Pensado para los remotes que no son Angular (o para el blog).
 */
export function definirElemento(nombre = 'dh-avatar') {
  if (typeof customElements === 'undefined' || customElements.get(nombre)) return;
  class DhAvatar extends HTMLElement {
    static get observedAttributes() { return ['codigo', 'tam', 'expresion', 'titulo']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      const tam = Number(this.getAttribute('tam')) || 96;
      this.innerHTML = componer(deCodigo(this.getAttribute('codigo')), {
        tam,
        expresion: this.getAttribute('expresion') || undefined,
        titulo: this.getAttribute('titulo') || undefined,
        idsUnicos: true,
      });
    }
  }
  customElements.define(nombre, DhAvatar);
}

export default {
  MANIFEST, CATEGORIAS, PALETAS, EXPRESIONES, Z_ORDER, VERSION,
  porDefecto, normalizar, componer, aDataUrl, aPng,
  aCodigo, deCodigo, aleatorio, expresionDeTexto, definirElemento,
};
