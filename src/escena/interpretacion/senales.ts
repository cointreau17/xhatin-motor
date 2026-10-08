/**
 * Señales: todo lo que se puede medir de un mensaje SIN interpretarlo.
 *
 * Signos, mayúsculas, emojis, risas, palabras del léxico, temas… Es la
 * única parte que lee el texto crudo. Las reglas trabajan sobre esto, así
 * que una regla nunca repite una expresión regular ni sabe de tildes.
 *
 * Si un día entra un modelo de IA, puede recibir estas señales como
 * contexto o ignorarlas: no dependen de él ni él de ellas.
 */

import type { Catalogo } from '../catalogo/catalogo';
import type { AdjuntoEntrada } from '../modelo';
import {
  EMOJIS,
  EMOJIS_ESCENA,
  ONOMATOPEYAS,
  PATRONES,
  VERBOS_DESPLAZAMIENTO,
  normalizar,
  compactar,
  type CategoriaLexico,
} from './lexico';

export interface Senales {
  texto: string;
  /** Minúsculas, sin tildes. */
  norm: string;
  /**
   * `norm` leído como se lee un chat: sin alargamientos ni abreviaturas
   * ("holaaa k tal" → "hola que tal"). Es donde se busca el léxico; `norm`
   * se queda como estaba para medir risas y alargamientos.
   */
  lectura: string;
  palabras: string[];
  longitud: number;

  emojis: string[];
  /** Solo emojis (y espacios): es una reacción. */
  soloEmojis: boolean;
  exclamaciones: number;
  interrogaciones: number;
  /** "¿¡…!?" o "?!" */
  interrobang: boolean;
  esPregunta: boolean;
  /** Proporción de mayúsculas sobre letras (0–1). */
  mayusculas: number;
  /** Escrito en mayúsculas sostenidas: gritar. */
  gritado: boolean;
  /** Letras repetidas ("siiiii", "noooo"). */
  alargamientos: number;
  suspensivos: boolean;
  /** 0–1 según lo larga que sea la risa ("ja" < "jajajajaja"). */
  risa: number;
  /** Texto entre paréntesis o "*acción*": pensamiento o narración. */
  entreParentesis: boolean;
  accion: string | null;
  /** Solo onomatopeyas ("BOOM", "toc toc"). */
  onomatopeya: boolean;
  /** Muy corto (≤ 3 caracteres sin espacios): "ok", "?", "no". */
  muyCorto: boolean;
  /** @menciones y nombres de presentes encontrados en el texto. */
  menciones: string[];
  adjuntos: AdjuntoEntrada[];

  /** Categorías del léxico que aparecen, con lo que casó. */
  lexico: Partial<Record<CategoriaLexico, string[]>>;
  /** Puntos por escenario (palabras + emojis). */
  escenarios: Record<string, number>;
  /** Props mencionados (ids de catálogo). */
  props: string[];
  /** Destino de un desplazamiento ("voy a la cafetería" → 'cafeteria'). */
  destino: string | null;
  /** Palabra que dio el destino, para la traza. */
  destinoPalabra: string | null;
}

const RE_EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\u200D[\u2640\u2642]\uFE0F?|[\u{1F3FB}-\u{1F3FF}])*/gu;
const RE_RISA = /\b(?:a?(?:ja|je|ji|jo|xa){2,}j?a?|ja(?:ja)+|j[aj]{3,}|j[ajs]{4,}|x+d+|l+o+l+|lmao)\b/g;
const RE_ALARGAR = /([a-z])\1{2,}/g;
const RE_EMOTICONO = /(?:^|\s)([:;=8][-']?[)(\]\[dDpPoO/\\|*]|<3|\^\^|xD|XD)(?=\s|$)/g;

const EMOTICONOS: Record<string, CategoriaLexico> = {
  ':)': 'alegria', ':-)': 'alegria', '=)': 'alegria', ':]': 'alegria', ';)': 'sarcasmo', ';-)': 'sarcasmo',
  ':D': 'alegria', ':-D': 'alegria', 'xD': 'risa', 'XD': 'risa', ':(': 'tristeza', ':-(': 'tristeza', ":'(": 'tristeza',
  ':O': 'sorpresa', ':o': 'sorpresa', ':-O': 'sorpresa', ':P': 'sarcasmo', ':p': 'sarcasmo', ':/': 'confusion', ':\\': 'confusion',
  ':|': 'aburrimiento', '<3': 'amor', '^^': 'alegria', ':*': 'amor',
};

function contar(txt: string, re: RegExp): number {
  return (txt.match(re) ?? []).length;
}

/**
 * Calcula las señales de un texto.
 *
 * @param nombresPresentes nombres de quien está en la conversación, para
 *        detectar a quién se habla ("Juan, ven").
 */
export function extraerSenales(
  texto: string,
  catalogo: Catalogo,
  nombresPresentes: readonly string[] = [],
  adjuntos: readonly AdjuntoEntrada[] = [],
): Senales {
  const t = (texto ?? '').trim();
  const norm = normalizar(t);
  const lectura = compactar(norm);
  const palabras = norm.split(/[^a-z0-9]+/).filter(Boolean);

  const emojis = t.match(RE_EMOJI) ?? [];
  const sinEmojis = t.replace(RE_EMOJI, '').replace(/[\s\uFE0F\u200D]/g, '');
  const letras = t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g, '');
  const mayus = t.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '').length;
  const mayusculas = letras.length ? mayus / letras.length : 0;

  const risaTxt = norm.match(RE_RISA) ?? [];
  const largoRisa = risaTxt.reduce((n, r) => n + r.length, 0);
  let risa = largoRisa ? Math.min(1, 0.35 + largoRisa / 14) : 0;

  // Léxico: categoría → términos que casaron.
  const lexico: Partial<Record<CategoriaLexico, string[]>> = {};
  const anotar = (cat: CategoriaLexico, termino: string) => {
    (lexico[cat] ??= []).push(termino);
  };
  for (const [cat, re] of Object.entries(PATRONES) as [CategoriaLexico, RegExp][]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lectura))) anotar(cat, m[1]!);
  }
  if (risaTxt.length) anotar('risa', risaTxt[0]!);
  for (const e of emojis) for (const cat of EMOJIS[e] ?? EMOJIS[e.replace(/\uFE0F/g, '')] ?? []) anotar(cat, e);
  RE_EMOTICONO.lastIndex = 0;
  let em: RegExpExecArray | null;
  while ((em = RE_EMOTICONO.exec(t))) {
    const cat = EMOTICONOS[em[1]!];
    if (cat) anotar(cat, em[1]!);
    if (cat === 'risa') risa = Math.max(risa, 0.6);
  }

  // Temas → escenarios. Cada palabra del escenario suma; las compuestas más.
  const escenarios: Record<string, number> = {};
  for (const esc of catalogo.escenarios.listar()) {
    let puntos = 0;
    for (const p of esc.palabras) {
      const pn = normalizar(p);
      if (pn.includes(' ') ? norm.includes(pn) : palabras.includes(pn)) puntos += pn.includes(' ') ? 1.5 : 1;
    }
    if (puntos) escenarios[esc.id] = puntos;
  }
  const props = new Set<string>();
  for (const prop of catalogo.props.listar()) {
    for (const p of prop.palabras) {
      const pn = normalizar(p);
      if (pn.includes(' ') ? norm.includes(pn) : palabras.includes(pn)) props.add(prop.id);
    }
  }
  for (const e of emojis) {
    const r = EMOJIS_ESCENA[e] ?? EMOJIS_ESCENA[e.replace(/\uFE0F/g, '')];
    if (r?.escenario) escenarios[r.escenario] = (escenarios[r.escenario] ?? 0) + 1;
    if (r?.prop) props.add(r.prop);
  }

  // Desplazamiento: "voy a la cafetería", "nos vemos en el parque".
  let destino: string | null = null;
  let destinoPalabra: string | null = null;
  const mDest = norm.match(VERBOS_DESPLAZAMIENTO);
  if (mDest) {
    const candidata = mDest[1]!;
    const trozos = [candidata, candidata.split(' ')[0]!];
    for (const esc of catalogo.escenarios.listar()) {
      if (esc.palabras.some((p) => trozos.includes(normalizar(p)))) {
        destino = esc.id;
        destinoPalabra = candidata;
        break;
      }
    }
  }

  // Menciones: @nombre y nombres de presentes escritos en el texto.
  const menciones: string[] = [];
  for (const m of t.matchAll(/@([\p{L}\d_.-]+)/gu)) menciones.push(normalizar(m[1]!));
  for (const nombre of nombresPresentes) {
    const n = normalizar(nombre);
    const primero = n.split(' ')[0]!;
    if (primero.length >= 3 && new RegExp(`(?:^|[^a-z])${escapar(primero)}(?=$|[^a-z])`).test(norm)) menciones.push(n);
  }

  const soloOno = norm.replace(/[^a-z ]/g, ' ').split(' ').filter(Boolean);
  const onomatopeya =
    soloOno.length > 0 &&
    soloOno.length <= 4 &&
    soloOno.every((w) => ONOMATOPEYAS.some((o) => o.split(' ').includes(w.replace(/(.)\1{2,}/g, '$1$1'))));

  const accionM = t.match(/^\*(.+)\*$/) ?? t.match(/^\/me\s+(.+)$/i);

  return {
    texto: t,
    norm,
    lectura,
    palabras,
    longitud: t.length,
    emojis,
    soloEmojis: emojis.length > 0 && sinEmojis.length === 0,
    // Solo los de cierre: "¡Hola!" es una exclamación, no dos.
    exclamaciones: contar(t, /!/g),
    interrogaciones: contar(t, /[?¿]/g),
    interrobang: /[?¿][!¡]|[!¡][?¿]/.test(t),
    esPregunta: /\?\s*[\p{Extended_Pictographic}\s]*$/u.test(t) || /^¿/.test(t),
    mayusculas,
    gritado: letras.length >= 4 && mayusculas > 0.72,
    alargamientos: contar(norm, RE_ALARGAR),
    suspensivos: /(\.\.\.|…)/.test(t),
    risa,
    entreParentesis: /^\(.*\)$/.test(t),
    accion: accionM ? accionM[1]!.trim() : null,
    onomatopeya,
    muyCorto: sinEmojis.length > 0 && sinEmojis.length <= 3,
    menciones,
    adjuntos: [...adjuntos],
    lexico,
    escenarios,
    props: [...props],
    destino,
    destinoPalabra,
  };
}

function escapar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** ¿Aparece alguna de estas categorías? */
export function hay(s: Senales, ...cats: CategoriaLexico[]): boolean {
  return cats.some((c) => (s.lexico[c]?.length ?? 0) > 0);
}

/** Cuántas veces aparece una categoría. */
export function cuantas(s: Senales, cat: CategoriaLexico): number {
  return s.lexico[cat]?.length ?? 0;
}
