/**
 * Globos de texto: forma según la intención y colocación que no tapa caras.
 *
 * Tipos: diálogo, pregunta, pensamiento (nube con burbujitas), grito
 * (dentado), susurro (discontinuo, letra pequeña), narración (cartela),
 * sonido (letras sueltas, sin globo) y reacción (globo pequeño).
 *
 * Colocación: para cada globo, en orden de lectura, se prueban posiciones
 * en rejilla y se puntúa cada una:
 *   - tapar una cara cuesta muchísimo; tapar otro globo, más aún;
 *   - lejos de quien habla cuesta (el globo "flota" sobre su cabeza);
 *   - un globo posterior encima y a la izquierda del anterior rompe el orden
 *     de lectura del cómic (de arriba abajo, de izquierda a derecha);
 *   - arriba es mejor que abajo.
 * Si ni así cabe sin tapar caras, se prueba con letra más pequeña.
 *
 * El rabito apunta a la boca pero se detiene en el borde de la cara.
 */

import type { Globo, TipoGlobo } from '../modelo.js';
import type { Caja, Punto } from '../personaje/esqueleto.js';
import { LEXICO, compactar, normalizar } from '../interpretacion/lexico.js';

const TINTA = 'var(--dh-tinta, #1B1714)';
const FONDO_GLOBO = '#FFFCF3';
/** Las cartelas del narrador, en el amarillo de las cajas de texto clásicas. */
const FONDO_CARTELA = '#F4D67A';
/** Las onomatopeyas: relleno mostaza y sombra en rojo de prensa. */
const RELLENO_SONIDO = '#F2C14E';
const SOMBRA_SONIDO = 'var(--dh-acento, #CF3A2B)';
/** Cuánto se puede salir una onomatopeya del marco, por cada lado. */
const FUERA_SONIDO = 40;

/* ------------------------------------------------- negritas de rotulista -- */

/** Las palabras fuertes del léxico (una sola palabra y no muy corta). */
const ENFATICAS: ReadonlySet<string> = new Set(
  (['sorpresa', 'enfado', 'entusiasmo', 'insulto', 'miedo', 'celebrar', 'felicitacion', 'risa', 'intensificador'] as const)
    .flatMap((c) => LEXICO[c])
    .filter((p) => !p.includes(' ') && p.length >= 4)
    .map(compactar),
);

/** Una palabra entre asteriscos (`*así*`), que es como se marca en un chat. */
const ENTRE_ASTERISCOS = /^\*([^*]+)\*([.,;:!?¡¿…]*)$/;

/** La palabra tal como se dibuja: sin los asteriscos de énfasis. */
export function sinMarcas(palabra: string): string {
  const m = ENTRE_ASTERISCOS.exec(palabra);
  return m ? m[1]! + m[2]! : palabra;
}

/**
 * Si un rotulista la pondría en negrita: en mayúsculas cuando el resto del
 * globo no lo está, con letras alargadas («siiii», «noooo»), entre asteriscos
 * o de las fuertes del léxico («increíble», «harto», «brutal»).
 */
export function esEnfatica(palabra: string, todoMayus = false): boolean {
  if (ENTRE_ASTERISCOS.test(palabra)) return true;
  const letras = palabra.replace(/[^\p{L}]/gu, '');
  if (letras.length < 2) return false;
  if (!todoMayus && letras === letras.toUpperCase() && letras !== letras.toLowerCase()) return true;
  if (/(\p{L})\1\1/u.test(letras.toLowerCase())) return true;
  return ENFATICAS.has(compactar(normalizar(letras)));
}

export const FUENTE_COMIC = "'Comic Neue','Comic Sans MS','Chalkboard SE','Comic Relief','Segoe Print',ui-rounded,sans-serif";
export const FUENTE_ROTULO = "'Bangers','Impact','Haettenschweiler','Arial Black',sans-serif";

/**
 * La letra con la que se mide y se dibuja ahora mismo. La cambia un estilo
 * de cómic mientras compone su viñeta (ver `conFuentes`): así la cámara, que
 * también mide globos, usa la misma letra sin tener que pasarla a mano.
 */
let fuentes = { dialogo: FUENTE_COMIC, rotulo: FUENTE_ROTULO };

/** Ejecuta `fn` con otra letra y deja la de antes al terminar. */
export function conFuentes<T>(otras: { dialogo: string; rotulo: string } | undefined, fn: () => T): T {
  if (!otras) return fn();
  const antes = fuentes;
  fuentes = otras;
  try {
    return fn();
  } finally {
    fuentes = antes;
  }
}

/**
 * Cuánto se agranda la letra de los globos respecto a la de siempre (1). La
 * fija quien compone (`OpcionesComposicion.escalaLetra`) para viñetas que se
 * ven pequeñas, como las dos por fila del móvil. La cámara no la usa: encuadra
 * como con la letra de siempre (ver camara.ts).
 */
let escalaLetra = 1;

/**
 * Ejecuta `fn` con otra escala de letra y deja la de antes al terminar.
 * `undefined` deja la que haya; `1` vuelve a la de siempre.
 */
export function conEscalaLetra<T>(escala: number | undefined, fn: () => T): T {
  if (escala === undefined || escala === escalaLetra) return fn();
  const antes = escalaLetra;
  escalaLetra = escala;
  try {
    return fn();
  } finally {
    escalaLetra = antes;
  }
}

/**
 * Cómo se reparten los globos en la viñeta, aparte de la letra. Lo fija quien
 * compone (`OpcionesComposicion`):
 * - `separacion`: multiplica los huecos entre globos (1 = los de siempre).
 * - `desborde`: unidades que un globo puede salirse por encima del marco,
 *   como en los cómics cuando el texto no cabe. 0 = nunca se sale.
 */
let disposicion = { separacion: 1, desborde: 0 };

/** Ejecuta `fn` con otra disposición y deja la de antes al terminar. */
export function conDisposicion<T>(otra: { separacion?: number; desborde?: number }, fn: () => T): T {
  if (otra.separacion === undefined && otra.desborde === undefined) return fn();
  const antes = disposicion;
  disposicion = { separacion: otra.separacion ?? antes.separacion, desborde: otra.desborde ?? antes.desborde };
  try {
    return fn();
  } finally {
    disposicion = antes;
  }
}

/** Hueco entre dos globos de la misma fila. */
const hueco = () => 16 * disposicion.separacion;
/** Hueco entre una fila de globos y la siguiente. */
const espacioFilas = () => ESPACIO_FILAS * disposicion.separacion;

/** Mide el ancho de un texto. En el navegador se inyecta uno exacto (canvas). */
export type MedirTexto = (texto: string, tam: number, negrita: boolean, fuente: string) => number;

/** Estimación sin DOM: suficiente para tests y SSR (va algo holgada a propósito). */
export const medirEstimado: MedirTexto = (texto, tam, negrita) => {
  let w = 0;
  for (const ch of texto) {
    if (/\p{Extended_Pictographic}/u.test(ch)) w += 1.2;
    else if (/[\u200d\ufe0f]/.test(ch)) w += 0;
    else if (' '.includes(ch)) w += 0.3;
    else if (/[iljtf.,;:'!|¡()]/.test(ch)) w += 0.32;
    else if (/[mwMW]/.test(ch)) w += 0.86;
    else if (/[A-ZÁÉÍÓÚÑ]/.test(ch)) w += 0.68;
    else w += 0.56;
  }
  return w * tam * (negrita ? 1.07 : 1);
};

let medidor: MedirTexto & { olvidar?: () => void } = medirEstimado;

/** Instala un medidor exacto (lo hace el componente en el navegador). */
export function usarMedidor(m: MedirTexto | null): void {
  medidor = m ?? medirEstimado;
}

/**
 * Olvida lo medido: al cargar una letra nueva, lo que se midió con la de
 * respaldo ya no vale (la caché va por nombre de letra, que es el mismo).
 */
export function olvidarMedidas(): void {
  medidor.olvidar?.();
}

/** Medidor exacto basado en canvas, para el navegador. */
export function medidorCanvas(): MedirTexto | null {
  if (typeof document === 'undefined') return null;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  const cache = new Map<string, number>();
  const medir: MedirTexto & { olvidar: () => void } = Object.assign(
    (texto: string, tam: number, negrita: boolean, fuente: string) => {
      const clave = `${tam}|${negrita}|${fuente}|${texto}`;
      let w = cache.get(clave);
      if (w === undefined) {
        ctx.font = `${negrita ? 'bold ' : ''}${tam}px ${fuente}`;
        w = ctx.measureText(texto).width;
        if (cache.size > 4000) cache.clear();
        cache.set(clave, w);
      }
      return w;
    },
    { olvidar: () => cache.clear() },
  );
  return medir;
}

interface Estilo {
  tam: number;
  negrita: boolean;
  cursiva: boolean;
  mayus: boolean;
  fuente: string;
  anchoMax: number;
  padX: number;
  padY: number;
  /**
   * Las palabras con énfasis van en negrita (`esEnfatica`). Lo que ya va
   * entero en negrita (gritos, cartelas) no lo necesita. `todoMayus`: el
   * texto está entero en mayúsculas y eso, por sí solo, no es énfasis.
   */
  enfasis?: { todoMayus: boolean };
}

/**
 * El estilo con la escala de letra vigente. Crecen la letra y el relleno a la
 * par, para que el globo conserve su aire; las onomatopeyas no, que ya van
 * enormes y son dibujo más que texto.
 */
function estiloDe(tipo: TipoGlobo, anchoVineta: number, soloEmoji: boolean, varios = false, largo = false): Estilo {
  const e = estiloBase(tipo, anchoVineta, soloEmoji, varios, largo);
  if (escalaLetra === 1 || tipo === 'sonido') return e;
  return { ...e, tam: Math.round(e.tam * escalaLetra), padX: Math.round(e.padX * escalaLetra), padY: Math.round(e.padY * escalaLetra) };
}

function estiloBase(tipo: TipoGlobo, anchoVineta: number, soloEmoji: boolean, varios = false, largo = false): Estilo {
  // Con varios globos se estrechan, para que quepan dos por fila. Un
  // párrafo largo, en cambio, se ensancha y baja un punto de letra: en un
  // chat el texto se tiene que poder leer entero.
  // En una viñeta ancha hay sitio a lo ancho y no a lo alto: globos más
  // anchos y de menos líneas.
  const anchoMax = largo
    ? Math.min(560, anchoVineta * 0.62)
    : varios
      ? anchoVineta >= 1000 ? 400 : Math.min(300, anchoVineta * 0.47)
      : Math.min(anchoVineta >= 1000 ? 440 : 350, anchoVineta * 0.6);
  const base: Estilo = { tam: largo ? 25 : 29, negrita: false, cursiva: false, mayus: false, fuente: fuentes.dialogo, anchoMax, padX: 22, padY: 15 };
  switch (tipo) {
    case 'grito':
      return { ...base, tam: 31, negrita: true, mayus: true, anchoMax: Math.min(360, anchoVineta * 0.62), padX: 30, padY: 24 };
    case 'susurro':
      return { ...base, tam: 25, cursiva: true };
    case 'pensamiento':
      return { ...base, tam: 27, cursiva: true, padX: 28, padY: 22 };
    case 'narracion':
      return { ...base, tam: 21, negrita: true, mayus: true, anchoMax: Math.min(480, anchoVineta * 0.72), padX: 14, padY: 10 };
    case 'sonido':
      return { ...base, tam: 62, negrita: true, mayus: true, fuente: fuentes.rotulo, anchoMax: anchoVineta * 0.7, padX: 0, padY: 0 };
    case 'reaccion':
      return soloEmoji ? { ...base, tam: 48, padX: 18, padY: 10 } : { ...base, tam: 30, negrita: true, padX: 18, padY: 12 };
    default:
      return base;
  }
}

/**
 * Lo que mide una línea, palabra a palabra: las de énfasis van en negrita, que
 * es más ancha. Las marcas de énfasis (`*así*`) no se dibujan y no cuentan.
 */
export function anchoDeLinea(linea: string, e: Estilo): number {
  const palabras = linea.split(' ').filter(Boolean);
  if (!palabras.length) return 0;
  const espacio = medidor(' ', e.tam, e.negrita, e.fuente);
  return palabras.reduce(
    (total, p) => total + medidor(sinMarcas(p), e.tam, e.negrita || (!!e.enfasis && esEnfatica(p, e.enfasis.todoMayus)), e.fuente),
    espacio * (palabras.length - 1),
  );
}

/** Parte el texto en líneas que quepan en `ancho`. Parte palabras kilométricas. */
export function partirLineas(texto: string, e: Estilo, ancho: number): string[] {
  const medir = (t: string) => anchoDeLinea(t, e);
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (let p of palabras) {
    while (medir(p) > ancho && p.length > 1) {
      // Palabra más ancha que el globo (una URL): se corta a trozos.
      let corte = p.length - 1;
      while (corte > 1 && medir(p.slice(0, corte) + '-') > ancho) corte--;
      if (actual) {
        lineas.push(actual);
        actual = '';
      }
      lineas.push(p.slice(0, corte) + '-');
      p = p.slice(corte);
    }
    const prueba = actual ? `${actual} ${p}` : p;
    if (medir(prueba) <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [''];
}

export interface Obstaculos {
  /** Caras visibles, con el id de su dueño. */
  caras: Array<{ id: string; caja: Caja }>;
  cuerpos: Caja[];
  /** Dónde está cada personaje que habla (en la viñeta). */
  hablantes: Record<string, { boca: Punto; coronilla: Punto; cara: Caja; visible: boolean }>;
}

export interface GloboColocado {
  globo: Globo;
  caja: Caja;
  lineas: string[];
  estilo: Estilo;
  cola: { base: Punto; punta: Punto } | null;
  nombre: string | null;
  /** Se sale del marco (una onomatopeya que lo rompe, o un globo que sube). */
  fuera?: boolean;
}

const solapa = (a: Caja, b: Caja) =>
  Math.max(0, Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y));

const crecer = (c: Caja, m: number): Caja => ({ x: c.x - m, y: c.y - m, ancho: c.ancho + 2 * m, alto: c.alto + 2 * m });

function medirGlobo(g: Globo, anchoVineta: number, escalaFuente: number, conNombre: boolean, varios = false) {
  const soloEmoji = /^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(g.texto);
  const largo = g.texto.length > 140 && (g.tipo === 'dialogo' || g.tipo === 'pregunta' || g.tipo === 'pensamiento' || g.tipo === 'susurro');
  const e0 = estiloDe(g.tipo, anchoVineta, soloEmoji, varios, largo);
  // Según la intensidad: el grito crece y la onomatopeya, más (va gigante).
  const fuerza = Math.min(1, Math.max(0, g.intensidad));
  const crece = g.tipo === 'grito' ? 1 + 0.15 * Math.max(0, fuerza * 2 - 1) : g.tipo === 'sonido' ? (64 + 52 * fuerza) / e0.tam : 1;
  const e: Estilo = { ...e0, tam: Math.round(e0.tam * crece * escalaFuente) };
  let texto = e.mayus ? g.texto.toUpperCase() : g.texto;
  if (!e.negrita && !soloEmoji) e.enfasis = { todoMayus: texto === texto.toUpperCase() };
  let lineas = partirLineas(texto, e, e.anchoMax);
  // Demasiado largo: se recorta. El texto entero sigue en el aria-label.
  const maxLineas = g.tipo === 'narracion' ? 3 : largo ? 12 : 7;
  if (lineas.length > maxLineas) {
    lineas = lineas.slice(0, maxLineas);
    let ultima = lineas[maxLineas - 1]!;
    while (ultima.length > 1 && anchoDeLinea(ultima + '…', e) > e.anchoMax) ultima = ultima.slice(0, -1);
    lineas[maxLineas - 1] = ultima.replace(/\s+\S*$/, '') + '…';
    texto = lineas.join(' ');
  }
  const anchoTexto = Math.max(...lineas.map((l) => anchoDeLinea(l, e)));
  const altoLinea = e.tam * 1.18;
  const nombreAlto = conNombre ? 20 : 0;
  const anchoNombre = conNombre ? medidor((g.autorNombre ?? '').toUpperCase(), 16, true, fuentes.dialogo) : 0;
  const ancho = Math.max(anchoTexto, anchoNombre) + e.padX * 2;
  const alto = lineas.length * altoLinea + e.padY * 2 + nombreAlto;
  return { e, lineas, ancho: Math.max(ancho, g.tipo === 'reaccion' ? 64 : 70), alto: Math.max(alto, 56) };
}

type Medida = ReturnType<typeof medirGlobo>;

interface Fila {
  globos: Array<{ g: Globo; m: Medida; xHablante: number }>;
  alto: number;
}

/**
 * Reparte los globos en FILAS de lectura, como un rotulista:
 * - se leen de arriba abajo, y dentro de una fila de izquierda a derecha;
 * - un globo entra en la fila actual si cabe al lado del anterior Y su
 *   hablante está a la derecha del hablante anterior (si no, los rabitos se
 *   cruzarían y la lectura se liaría): entonces empieza fila nueva.
 *
 * La cámara usa esto mismo (vía `alturaGlobos`) para dejar el aire justo.
 */
function empaquetar(globos: readonly Globo[], anchoV: number, nombres: boolean, xDe: (autorId: string | null) => number, escala = 1): Fila[] {
  const varios = globos.filter((g) => g.tipo !== 'narracion').length >= 2;
  const filas: Fila[] = [];
  let fila: Fila | null = null;
  let anchoFila = 0;
  for (const g of globos) {
    const conNombre = nombres && g.tipo !== 'narracion' && g.tipo !== 'sonido' && !!g.autorNombre;
    const m = medirGlobo(g, anchoV, escala, conNombre, varios);
    const xH = xDe(g.autorId);
    const anterior = fila?.globos[fila.globos.length - 1];
    const cabe = !!fila && anchoFila + m.ancho + 2 * MARGEN + hueco() <= anchoV;
    const ordenado = !!anterior && xH >= anterior.xHablante + 1;
    const esNarracion = g.tipo === 'narracion' || anterior?.g.tipo === 'narracion';
    if (!fila || !cabe || !ordenado || esNarracion) {
      fila = { globos: [], alto: 0 };
      filas.push(fila);
      anchoFila = 0;
    }
    fila.globos.push({ g, m, xHablante: xH });
    fila.alto = Math.max(fila.alto, m.alto);
    anchoFila += m.ancho + hueco();
  }
  return filas;
}

const ESPACIO_FILAS = 10;
const MARGEN = 10;

/**
 * Cuánto alto (en unidades de viñeta) van a necesitar los globos.
 *
 * La cámara lo usa para dejar ese aire sobre las cabezas: así los globos
 * caben arriba en vez de acabar tapando cuerpos. `xDe` da la posición en
 * pantalla de cada hablante (cuenta para decidir las filas).
 */
export function alturaGlobos(
  globos: readonly Globo[],
  anchoV: number,
  rotulo: string | undefined,
  nombres: boolean,
  xDe: (autorId: string | null) => number,
): number {
  const todos = conRotulo(globos, rotulo).filter((g) => g.tipo !== 'sonido');
  const filas = empaquetar(todos, anchoV, nombres, xDe);
  return MARGEN + filas.reduce((s, f) => s + f.alto + espacioFilas(), 0) + 30;
}

function conRotulo(globos: readonly Globo[], rotulo?: string): Globo[] {
  const todos: Globo[] = [];
  if (rotulo) todos.push({ id: 'rotulo', mensajeId: '', autorId: null, tipo: 'narracion', texto: rotulo, orden: -1, intensidad: 0 });
  // Las cartelas sin autor (alguien entra, alguien se va) van arriba, antes
  // que los diálogos, como las cartelas de un cómic.
  const orden = [...globos].sort((a, b) => a.orden - b.orden);
  todos.push(...orden.filter((g) => g.tipo === 'narracion' && !g.autorId), ...orden.filter((g) => !(g.tipo === 'narracion' && !g.autorId)));
  return todos;
}

/**
 * Coloca todos los globos de una viñeta.
 *
 * 1. Filas de lectura (`empaquetar`), apiladas desde arriba.
 * 2. En cada fila, cada globo se centra sobre su hablante y se empuja a la
 *    derecha lo justo para no pisar al anterior; si la fila se sale, se
 *    corre entera a la izquierda.
 * 3. Si aun así un globo tapa una cara (primeros planos, viñetas muy
 *    llenas), ese globo se recoloca por búsqueda en rejilla.
 * Los sonidos ("¡BOOM!") no van en filas: se colocan junto a quien los hace.
 */
export function colocarGlobos(
  globos: readonly Globo[],
  anchoV: number,
  altoV: number,
  obst: Obstaculos,
  opciones: { nombres: boolean; rotulo?: string },
): GloboColocado[] {
  const xDe = (id: string | null) => (id && obst.hablantes[id] ? obst.hablantes[id]!.coronilla.x : anchoV / 2);
  const todos = conRotulo(globos, opciones.rotulo);
  const enFilas = todos.filter((g) => g.tipo !== 'sonido');

  // Si las filas no caben en la mitad alta (más lo que puedan salirse por
  // arriba), se reduce la letra.
  const altoDe = (fs: readonly Fila[]) => fs.reduce((s, f) => s + f.alto + espacioFilas(), MARGEN);
  let filas = empaquetar(enFilas, anchoV, opciones.nombres, xDe);
  for (const escala of [0.88, 0.78]) {
    if (altoDe(filas) - disposicion.desborde <= altoV * 0.66) break;
    filas = empaquetar(enFilas, anchoV, opciones.nombres, xDe, escala);
  }

  // Lo que los globos piden de más respecto al hueco que dejó la cámara (que
  // encuadra con la letra de siempre) sube por encima del marco, hasta
  // `desborde`: así la letra grande no hace bajar los globos sobre las caras.
  let subida = 0;
  if (disposicion.desborde > 0) {
    const reservado = conEscalaLetra(1, () => altoDe(empaquetar(enFilas, anchoV, opciones.nombres, xDe)));
    subida = Math.min(disposicion.desborde, Math.max(0, altoDe(filas) - reservado));
  }

  const colocados: GloboColocado[] = [];
  // La cartela del narrador va pegada a la esquina, como en los cómics.
  const abreCartela = filas[0]?.globos[0]?.g.tipo === 'narracion';
  let y = abreCartela && subida === 0 ? 0 : MARGEN - subida;
  for (const fila of filas) {
    // Centrado sobre el hablante, empujando a la derecha para no solapar.
    const xs: number[] = [];
    let derecha = MARGEN - hueco();
    for (const { g, m, xHablante } of fila.globos) {
      const cartela = g.tipo === 'narracion';
      const ideal = cartela ? 0 : xHablante - m.ancho / 2;
      // La primera cartela de la fila, a ras del borde; lo demás, con margen.
      const minimo = cartela && !xs.length ? 0 : MARGEN;
      const x = Math.max(ideal, xs.length ? derecha + hueco() : minimo, minimo);
      xs.push(x);
      derecha = x + m.ancho;
    }
    const exceso = derecha - (anchoV - MARGEN);
    if (exceso > 0) for (let i = 0; i < xs.length; i++) xs[i] = Math.max(i === 0 && fila.globos[0]!.g.tipo === 'narracion' ? 0 : MARGEN, xs[i]! - exceso);
    // Un poco de escalonado: el segundo globo de la fila, algo más bajo.
    fila.globos.forEach(({ g, m }, i) => {
      // Baja como mucho hasta casi el hueco con la fila siguiente (8 con los
      // huecos de siempre), para no pisarla.
      const escalon = i > 0 && fila.globos.length > 1 ? Math.min(14, fila.alto - m.alto + espacioFilas() - 2) : 0;
      colocados.push(crearColocado(g, { x: xs[i]!, y: y + escalon, ancho: Math.min(m.ancho, anchoV - 2 * MARGEN), alto: m.alto }, m, obst, anchoV, altoV, opciones.nombres));
    });
    y += fila.alto + espacioFilas();
  }

  // Respaldo: los que tapan caras se recolocan por rejilla.
  for (let i = 0; i < colocados.length; i++) {
    const c = colocados[i]!;
    if (c.globo.tipo === 'narracion') continue;
    const tapa = obst.caras.reduce((s, f) => s + solapa(c.caja, crecer(f.caja, -6)), 0);
    if (tapa > c.caja.ancho * c.caja.alto * 0.03) {
      const otros = colocados.filter((_, j) => j !== i);
      const nuevo = buscarEnRejilla(c.globo, anchoV, altoV, obst, otros, opciones.nombres, colocados.slice(0, i));
      if (nuevo) colocados[i] = nuevo;
    }
  }

  // Sonidos: junto a quien los hace, donde no molesten.
  for (const g of todos.filter((x) => x.tipo === 'sonido')) {
    const nuevo = buscarEnRejilla(g, anchoV, altoV, obst, colocados, false, []);
    if (nuevo) colocados.push(nuevo);
  }
  return colocados;
}

function crearColocado(g: Globo, caja: Caja, m: Medida, obst: Obstaculos, anchoV: number, altoV: number, nombres: boolean): GloboColocado {
  const hablante = g.autorId ? obst.hablantes[g.autorId] : undefined;
  const conNombre = nombres && g.tipo !== 'narracion' && g.tipo !== 'sonido' && !!g.autorNombre;
  const fuera = caja.x < 0 || caja.y < 0 || caja.x + caja.ancho > anchoV || caja.y + caja.alto > altoV;
  return {
    globo: g,
    caja,
    lineas: m.lineas,
    estilo: m.e,
    cola: hablante && g.tipo !== 'narracion' && g.tipo !== 'sonido' ? calcularCola(caja, hablante, anchoV, altoV) : null,
    nombre: conNombre ? (g.autorNombre ?? null) : null,
    ...(fuera ? { fuera: true } : {}),
  };
}

/** Búsqueda exhaustiva en rejilla, puntuando cada posición (ver cabecera). */
function buscarEnRejilla(
  g: Globo,
  anchoV: number,
  altoV: number,
  obst: Obstaculos,
  ocupados: readonly GloboColocado[],
  nombres: boolean,
  anteriores: readonly GloboColocado[],
): GloboColocado | null {
  const hablante = g.autorId ? obst.hablantes[g.autorId] : undefined;
  const conNombre = nombres && g.tipo !== 'narracion' && g.tipo !== 'sonido' && !!g.autorNombre;
  const varios = true;
  let mejor: { caja: Caja; coste: number; medida: Medida } | null = null;

  // Si no cabe, se prueba con letra más pequeña. Con la letra agrandada
  // (escalaLetra) se baja más pasos, hasta el mismo mínimo de siempre: mejor
  // un globo como el de la web que uno grande tapando una cara.
  const minimo = 0.78 / escalaLetra;
  const escalas = [1, 0.88, 0.78, 0.7, 0.62, 0.55].filter((s) => s >= minimo - 0.001);
  if (escalas[escalas.length - 1]! > minimo + 0.001) escalas.push(minimo);
  for (const escalaFuente of escalas) {
    const medida = medirGlobo(g, anchoV, escalaFuente, conNombre, varios);
    const w = Math.min(medida.ancho, anchoV - MARGEN * 2);
    const h = Math.min(medida.alto, altoV - MARGEN * 2);

    let ideal: Punto;
    if (hablante && hablante.visible) ideal = { x: hablante.coronilla.x, y: hablante.coronilla.y - h / 2 - 34 };
    else if (hablante) ideal = { x: Math.max(w / 2, Math.min(anchoV - w / 2, hablante.coronilla.x)), y: h / 2 + MARGEN };
    else ideal = { x: anchoV / 2, y: h / 2 + MARGEN };
    if (g.tipo === 'sonido' && hablante) ideal = { x: hablante.coronilla.x + (hablante.coronilla.x < anchoV / 2 ? 110 : -110), y: hablante.coronilla.y + 10 };

    // Puede subir por encima del marco hasta `desborde`, pagando por ello:
    // solo se sale si dentro no hay sitio sin tapar una cara. Las
    // onomatopeyas, en cambio, rompen el borde por cualquier lado y gratis:
    // es lo que hacen en un cómic.
    const sonido = g.tipo === 'sonido';
    const fuera = sonido ? FUERA_SONIDO : 0;
    for (let y = MARGEN - Math.max(disposicion.desborde, fuera); y <= altoV - MARGEN - h + fuera; y += 10) {
      for (let x = MARGEN - fuera; x <= anchoV - MARGEN - w + fuera; x += 10) {
        const c = { x, y, ancho: w, alto: h };
        let coste = 0;
        for (const cara of obst.caras) {
          const s = solapa(c, crecer(cara.caja, 4));
          if (s) coste += 3000 + s * (cara.id === g.autorId ? 220 : 180);
        }
        for (const otro of ocupados) {
          const s = solapa(crecer(c, 6 * disposicion.separacion), otro.caja);
          if (s) coste += s * 80 + 20000;
        }
        for (const cuerpo of obst.cuerpos) coste += solapa(c, cuerpo) * 0.35;
        if (y < MARGEN && !sonido) coste += (MARGEN - y) * 40;
        coste += Math.abs(x + w / 2 - ideal.x) * 1.4 + Math.abs(y + h / 2 - ideal.y) * 0.7 + y * 0.6;
        // Orden de lectura respecto a los globos anteriores.
        for (const previo of anteriores) {
          if (previo.globo.tipo === 'narracion') continue;
          const aSuDerecha = x >= previo.caja.x + previo.caja.ancho * 0.6;
          if (y < previo.caja.y - 8 && !(aSuDerecha && y > previo.caja.y - 40)) coste += 30000;
          else if (y < previo.caja.y + previo.caja.alto * 0.5 && !aSuDerecha) coste += 30000;
        }
        if (!mejor || coste < mejor.coste) mejor = { caja: c, coste, medida };
      }
    }
    // Se para en cuanto el mejor sitio ni tapa una cara ni pisa otro globo;
    // si no, se prueba con la letra siguiente, más pequeña.
    const tapa = mejor ? obst.caras.reduce((s, f) => s + solapa(mejor!.caja, f.caja), 0) : 0;
    const pisa = mejor ? ocupados.some((o) => solapa(mejor!.caja, o.caja) > 0) : false;
    if (mejor && tapa < mejor.caja.ancho * mejor.caja.alto * 0.04 && !pisa) break;
  }
  return mejor ? crearColocado(g, mejor.caja, mejor.medida, obst, anchoV, altoV, nombres) : null;
}

/** Punto de salida del rabito y punta: hacia la boca, parando en el borde de la cara. */
function calcularCola(
  caja: Caja,
  h: { boca: Punto; coronilla: Punto; cara: Caja; visible: boolean },
  anchoV: number,
  altoV: number,
): { base: Punto; punta: Punto } {
  const objetivo = h.visible
    ? h.boca
    : { x: Math.max(0, Math.min(anchoV, h.boca.x)), y: Math.max(0, Math.min(altoV, h.boca.y)) };
  const radio = Math.min(caja.alto / 2, 34);
  let base: Punto;
  if (objetivo.y >= caja.y + caja.alto) {
    base = { x: Math.max(caja.x + radio + 12, Math.min(caja.x + caja.ancho - radio - 12, objetivo.x)), y: caja.y + caja.alto - 3 };
  } else if (objetivo.y <= caja.y) {
    base = { x: Math.max(caja.x + radio + 12, Math.min(caja.x + caja.ancho - radio - 12, objetivo.x)), y: caja.y + 3 };
  } else if (objetivo.x < caja.x) {
    base = { x: caja.x + 3, y: Math.max(caja.y + radio, Math.min(caja.y + caja.alto - radio, objetivo.y)) };
  } else {
    base = { x: caja.x + caja.ancho - 3, y: Math.max(caja.y + radio, Math.min(caja.y + caja.alto - radio, objetivo.y)) };
  }

  // Parar al llegar a la cara (ampliada un poco): el rabito señala, no tapa.
  const cara = crecer(h.cara, 10);
  let punta = objetivo;
  const pasos = 40;
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos;
    const p = { x: base.x + (objetivo.x - base.x) * t, y: base.y + (objetivo.y - base.y) * t };
    if (h.visible && p.x > cara.x && p.x < cara.x + cara.ancho && p.y > cara.y && p.y < cara.y + cara.alto) {
      punta = p;
      break;
    }
  }
  const d = Math.hypot(punta.x - base.x, punta.y - base.y);
  const maximo = 110;
  if (d > maximo) punta = { x: base.x + ((punta.x - base.x) / d) * maximo, y: base.y + ((punta.y - base.y) / d) * maximo };
  if (d < 18) {
    const dx = objetivo.x - base.x;
    const dy = objetivo.y - base.y;
    const n = Math.max(1, Math.hypot(dx, dy));
    punta = { x: base.x + (dx / n) * 18, y: base.y + (dy / n) * 18 };
  }
  return { base, punta };
}

/* ---------------------------------------------------------------- dibujo -- */

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n: number) => (Math.round(n * 10) / 10).toString();

function rectRedondo(c: Caja, r: number): string {
  const { x, y, ancho: w, alto: h } = c;
  r = Math.min(r, w / 2, h / 2);
  return `M${f(x + r)} ${f(y)} L${f(x + w - r)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} L${f(x + w)} ${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} L${f(x + r)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
}

/** Óvalo que encierra la caja con poco desperdicio (superelipse de cuatro curvas). */
function ovalo(c: Caja): string {
  const cx = c.x + c.ancho / 2;
  const cy = c.y + c.alto / 2;
  const rx = c.ancho / 2;
  const ry = c.alto / 2;
  const k = 0.9;
  return `M${f(cx)} ${f(cy - ry)} C${f(cx + rx * k)} ${f(cy - ry)} ${f(cx + rx)} ${f(cy - ry * k)} ${f(cx + rx)} ${f(cy)} C${f(cx + rx)} ${f(cy + ry * k)} ${f(cx + rx * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)} C${f(cx - rx * k)} ${f(cy + ry)} ${f(cx - rx)} ${f(cy + ry * k)} ${f(cx - rx)} ${f(cy)} C${f(cx - rx)} ${f(cy - ry * k)} ${f(cx - rx * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)} Z`;
}

/** Recorre el perímetro de una elipse y devuelve puntos equiespaciados. */
function perimetro(c: Caja, n: number): Punto[] {
  const cx = c.x + c.ancho / 2;
  const cy = c.y + c.alto / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(a) * (c.ancho / 2), y: cy + Math.sin(a) * (c.alto / 2) };
  });
}

function dentado(c: Caja): string {
  const n = Math.max(14, Math.round((c.ancho + c.alto) / 26));
  const fuera = perimetro(crecer(c, 12), n);
  const dentro = perimetro(crecer(c, -2), n);
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = fuera[i]!;
    const b = dentro[(i + 0.5) % n === 0 ? 0 : i]!;
    const mid = { x: (b.x + dentro[(i + 1) % n]!.x) / 2, y: (b.y + dentro[(i + 1) % n]!.y) / 2 };
    d += `${i === 0 ? 'M' : 'L'}${f(a.x)} ${f(a.y)} L${f(mid.x)} ${f(mid.y)} `;
  }
  return d + 'Z';
}

function nube(c: Caja): string {
  const n = Math.max(10, Math.round((c.ancho + c.alto) / 34));
  const pts = perimetro(crecer(c, 4), n);
  const cx = c.x + c.ancho / 2;
  const cy = c.y + c.alto / 2;
  let d = `M${f(pts[0]!.x)} ${f(pts[0]!.y)} `;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dx = m.x - cx;
    const dy = m.y - cy;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bulto = 16;
    d += `Q${f(m.x + (dx / len) * bulto * 1.6)} ${f(m.y + (dy / len) * bulto * 1.6)} ${f(b.x)} ${f(b.y)} `;
  }
  return d + 'Z';
}

function colaPath(base: Punto, punta: Punto, ancho: number): string {
  const dx = punta.x - base.x;
  const dy = punta.y - base.y;
  const n = Math.max(1, Math.hypot(dx, dy));
  const px = (-dy / n) * ancho;
  const py = (dx / n) * ancho;
  // Ligeramente curva: el rabito de cómic nunca es un triángulo recto.
  const c = { x: base.x + dx * 0.55 + px * 0.5, y: base.y + dy * 0.55 + py * 0.5 };
  return `M${f(base.x - px)} ${f(base.y - py)} Q${f(c.x)} ${f(c.y)} ${f(punta.x)} ${f(punta.y)} Q${f(c.x + px * 0.4)} ${f(c.y + py * 0.4)} ${f(base.x + px)} ${f(base.y + py)} Z`;
}

/** Una línea del globo, con las palabras de énfasis en negrita. */
function lineaConEnfasis(linea: string, e: Estilo): string {
  if (!e.enfasis) return esc(linea);
  const { todoMayus } = e.enfasis;
  return linea
    .split(' ')
    .map((p) => (esEnfatica(p, todoMayus) ? `<tspan font-weight="700">${esc(sinMarcas(p))}</tspan>` : esc(p)))
    .join(' ');
}

/** Giro de una onomatopeya: siempre el mismo para el mismo globo. */
function giroDe(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const grados = 5 + (h % 8);
  return h % 2 ? grados : -grados;
}

export function dibujarGlobo(gc: GloboColocado, nuevo: boolean): string {
  const { globo: g, caja, estilo: e, lineas, cola } = gc;
  const tiembla = g.tipo === 'grito' && g.intensidad >= 0.75;
  const clases = `dh-globo dh-globo--${g.tipo}${tiembla ? ' dh-globo--tiembla' : ''}${nuevo ? ' dh-nuevo' : ''}`;
  const origen = cola ? `${f(cola.punta.x)}px ${f(cola.punta.y)}px` : `${f(caja.x)}px ${f(caja.y)}px`;
  const altoLinea = e.tam * 1.18;
  const offNombre = gc.nombre ? 20 : 0;
  const cx = caja.x + caja.ancho / 2;
  const primeraLinea = caja.y + e.padY + offNombre + e.tam * 0.86 + (caja.alto - e.padY * 2 - offNombre - lineas.length * altoLinea) / 2;

  const estiloTexto =
    `font-family="${e.fuente.replace(/"/g, "'")}" font-size="${e.tam}"` +
    (e.negrita ? ' font-weight="700"' : '') +
    (e.cursiva ? ' font-style="italic"' : '');

  const texto = (fill: string, extra = '') =>
    `<text x="${f(cx)}" y="${f(primeraLinea)}" text-anchor="middle" ${estiloTexto} fill="${fill}" ${extra}>` +
    lineas.map((l, i) => `<tspan x="${f(cx)}" dy="${i === 0 ? 0 : f(altoLinea)}">${lineaConEnfasis(l, e)}</tspan>`).join('') +
    `</text>`;

  const nombre = gc.nombre
    ? `<text x="${f(cx)}" y="${f(caja.y + e.padY + 12)}" text-anchor="middle" font-family="${fuentes.dialogo.replace(/"/g, "'")}" font-size="15" font-weight="700" letter-spacing="1.5" fill="${TINTA}" opacity="0.55">${esc(gc.nombre.toUpperCase())}</text>`
    : '';

  if (g.tipo === 'sonido') {
    // Gigante, inclinada y con sombra: el «¡ZAS!» de un cómic, no un texto.
    const cy = caja.y + caja.alto / 2;
    const grueso = Math.max(7, e.tam / 7);
    const desplaza = Math.max(4, e.tam / 14);
    return (
      `<g class="${clases}" style="transform-origin:${f(cx)}px ${f(cy)}px">` +
      `<g transform="rotate(${giroDe(g.id)} ${f(cx)} ${f(cy)})">` +
      `<g transform="translate(${f(desplaza)} ${f(desplaza)})">${texto(SOMBRA_SONIDO, `stroke="${TINTA}" stroke-width="${f(grueso)}" paint-order="stroke" stroke-linejoin="round"`)}</g>` +
      texto(RELLENO_SONIDO, `stroke="${TINTA}" stroke-width="${f(grueso)}" paint-order="stroke" stroke-linejoin="round" letter-spacing="2"`) +
      `</g></g>`
    );
  }

  if (g.tipo === 'narracion') {
    // La caja amarilla del narrador, con su sombra dura.
    return (
      `<g class="${clases}">` +
      `<rect x="${f(caja.x + 4)}" y="${f(caja.y + 4)}" width="${f(caja.ancho)}" height="${f(caja.alto)}" fill="${TINTA}" opacity="0.85"/>` +
      `<rect x="${f(caja.x)}" y="${f(caja.y)}" width="${f(caja.ancho)}" height="${f(caja.alto)}" fill="${FONDO_CARTELA}" stroke="${TINTA}" stroke-width="4"/>` +
      texto(TINTA, 'letter-spacing="0.5"') +
      `</g>`
    );
  }

  let forma: string;
  let trazo = `stroke="${TINTA}" stroke-width="4.5" stroke-linejoin="round"`;
  switch (g.tipo) {
    case 'grito':
      forma = dentado(caja);
      break;
    case 'pensamiento':
      forma = nube(caja);
      break;
    case 'susurro':
      forma = rectRedondo(caja, Math.min(40, caja.alto / 2));
      trazo += ' stroke-dasharray="10 8"';
      break;
    case 'reaccion':
      forma = ovalo(caja);
      break;
    default:
      forma = caja.alto <= 80 ? ovalo(crecer(caja, 4)) : rectRedondo(caja, Math.min(46, caja.alto / 2.4));
  }

  let colaSvg = '';
  let tapaCola = '';
  if (cola) {
    if (g.tipo === 'pensamiento') {
      const pasos = [0.35, 0.68, 0.95];
      colaSvg = pasos
        .map((t, i) => {
          const p = { x: cola.base.x + (cola.punta.x - cola.base.x) * t, y: cola.base.y + (cola.punta.y - cola.base.y) * t };
          return `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${[11, 8, 5][i]}" fill="${FONDO_GLOBO}" ${trazo}/>`;
        })
        .join('');
    } else {
      const ancho = g.tipo === 'grito' ? 15 : 11;
      const d = colaPath(cola.base, cola.punta, ancho);
      colaSvg = `<path d="${d}" fill="${FONDO_GLOBO}" ${trazo}/>`;
      // Tapa la costura entre rabito y globo: mismo relleno, sin trazo.
      tapaCola = `<path d="${colaPath(cola.base, { x: cola.base.x + (cola.punta.x - cola.base.x) * 0.25, y: cola.base.y + (cola.punta.y - cola.base.y) * 0.25 }, ancho - 4)}" fill="${FONDO_GLOBO}"/>`;
    }
  }

  const colorTexto = g.tipo === 'susurro' ? '#5A534B' : TINTA;
  return (
    `<g class="${clases}" style="transform-origin:${origen}">` +
    colaSvg +
    `<path d="${forma}" fill="${FONDO_GLOBO}" ${trazo}/>` +
    tapaCola +
    nombre +
    texto(colorTexto) +
    `</g>`
  );
}
