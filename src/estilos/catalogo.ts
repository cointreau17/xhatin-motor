import { CARICATURA } from '../escena/estilos/caricatura.js';
import { olvidarMedidas } from '../escena/composicion/globos.js';
import type { EstiloComic, PersonajeImagen, UsoEstilo } from '../escena/estilos/tipos.js';
import type { IdEstilo, PerfilXhatin } from '../api/xhatin.js';

/**
 * Los estilos de cómic que ofrece Xhatín, y quién sale con qué personaje.
 *
 * «Jóvenes» es el de siempre: los personajes vectoriales hechos con el avatar
 * de cada uno. Los demás son estilos de imagen con su propia biblioteca de
 * personajes (ver escena/estilos/).
 *
 * Lo que depende de dónde se ejecuta se pasa desde fuera: dónde están las
 * imágenes de los estilos (`usoDe`, la carpeta public/ del remote de xhatin)
 * y la URL del manifiesto de una caricatura (`cargarCaricatura`, que da el
 * API con `absoluta`).
 */
export interface OpcionEstilo {
  id: IdEstilo;
  nombre: string;
  descripcion: string;
  /** Biblioteca de imagen; sin ella, el dibujo vectorial de siempre. */
  biblioteca?: EstiloComic;
  /**
   * La letra del estilo: la de los globos y la de los rótulos. Se sirve desde
   * el propio proyecto (ver LETRAS y `prepararFuentes`).
   */
  letras: readonly string[];
  /**
   * Respaldo mientras no estén los archivos: la hoja de Google Fonts que
   * usaba el estilo antes. Los estilos nuevos no la llevan.
   */
  fuentes?: string;
}

/**
 * Una letra servida desde el propio proyecto. Todas son de licencia OFL, que
 * deja incluirlas: Comic Neue (Craig Rozynski), Bangers (Vernon Adams) y
 * Patrick Hand (Patrick Wagesreiter). Los archivos van en la carpeta que se
 * le dé a `prepararFuentes` (en la web, `public/fuentes/` del remote).
 */
export interface Letra {
  familia: string;
  archivo: string;
  peso?: string;
  estilo?: 'normal' | 'italic';
}

export const LETRAS: Readonly<Record<string, readonly Letra[]>> = {
  'Comic Neue': [
    { familia: 'Comic Neue', archivo: 'ComicNeue-Regular.woff2' },
    { familia: 'Comic Neue', archivo: 'ComicNeue-Bold.woff2', peso: '700' },
    { familia: 'Comic Neue', archivo: 'ComicNeue-Italic.woff2', estilo: 'italic' },
    { familia: 'Comic Neue', archivo: 'ComicNeue-BoldItalic.woff2', peso: '700', estilo: 'italic' },
  ],
  Bangers: [{ familia: 'Bangers', archivo: 'Bangers-Regular.woff2' }],
  'Patrick Hand': [{ familia: 'Patrick Hand', archivo: 'PatrickHand-Regular.woff2' }],
};

export const ESTILOS: readonly OpcionEstilo[] = [
  {
    id: 'jovenes',
    nombre: 'Jóvenes',
    descripcion: 'Los personajes de siempre, hechos con el avatar de cada uno.',
    letras: ['Comic Neue', 'Bangers'],
  },
  {
    id: 'caricatura',
    nombre: CARICATURA.nombre,
    descripcion: CARICATURA.descripcion,
    biblioteca: CARICATURA,
    letras: ['Patrick Hand', 'Bangers'],
    fuentes: 'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Bangers&display=swap',
  },
];

export const ESTILO_POR_DEFECTO: IdEstilo = 'jovenes';

export function opcionDe(id: string | null | undefined): OpcionEstilo {
  return ESTILOS.find((e) => e.id === id) ?? ESTILOS[0]!;
}

/** Cada archivo, una vez por página: lo que prometió cargarlo (true si llegó). */
const archivos = new Map<string, Promise<boolean>>();
const hojas = new Set<string>();

function cargarArchivo(base: string, l: Letra): Promise<boolean> {
  const url = base + l.archivo;
  let p = archivos.get(url);
  if (!p) {
    const cara = new FontFace(l.familia, `url("${url}") format("woff2")`, {
      weight: l.peso ?? '400',
      style: l.estilo ?? 'normal',
      display: 'swap',
    });
    p = cara
      .load()
      .then((cargada) => {
        document.fonts.add(cargada);
        return true;
      })
      .catch(() => false);
    archivos.set(url, p);
  }
  return p;
}

async function cargarHoja(href: string): Promise<void> {
  if (hojas.has(href)) return;
  hojas.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  await new Promise((ok) => {
    link.onload = ok;
    link.onerror = ok;
  });
}

/**
 * Carga la letra de un estilo (una vez por página) y espera a que esté: los
 * globos se miden con ella, y medirlos con otra los deja mal ajustados.
 *
 * `base` es la carpeta (URL acabada en «/») donde están los archivos de
 * LETRAS. Si falta alguno, el estilo que traía hoja de Google Fonts la usa de
 * respaldo; el que no, se queda con la letra del sistema, como antes.
 *
 * Devuelve true si la letra ha cambiado: entonces lo medido se olvida y quien
 * pinta tiene que volver a componer las viñetas. Sin navegador no hace nada.
 */
export async function prepararFuentes(opcion: OpcionEstilo, base?: string | null): Promise<boolean> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) return false;
  const letras = opcion.letras.flatMap((familia) => LETRAS[familia] ?? []);
  const llegaron = base ? await Promise.all(letras.map((l) => cargarArchivo(base, l))) : [];
  const todas = !!letras.length && llegaron.length === letras.length && llegaron.every(Boolean);
  if (!todas && opcion.fuentes) await cargarHoja(opcion.fuentes);
  await Promise.all(opcion.letras.map((f) => document.fonts.load(`29px '${f}'`))).catch(() => undefined);
  // Ha cambiado si llegó la letra propia o la de respaldo; si no, se sigue
  // con la del sistema y lo medido vale.
  const cambia = todas || !!opcion.fuentes;
  if (cambia) olvidarMedidas();
  return cambia;
}

/** Hash corto y estable, para repartir personajes sin guardar nada. */
function hash(txt: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/* ------------------------------------------------ caricaturas propias --- */

const manifiestos = new Map<string, Promise<PersonajeImagen | null>>();

/**
 * La biblioteca de la caricatura propia de alguien (la sirve dhcore), a partir
 * de la URL absoluta de su manifiesto: la da `api.absoluta(perfil.caricatura)`
 * o, para la mía, `MiCaricatura.manifiesto`. Las rutas del manifiesto son
 * relativas a él: se vuelven absolutas aquí, y el compositor las usa tal cual.
 * Una descarga por URL.
 */
export function cargarCaricatura(url: string | null | undefined): Promise<PersonajeImagen | null> {
  if (!url) return Promise.resolve(null);
  let p = manifiestos.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<PersonajeImagen>) : null))
      .then((m) => {
        if (!m?.figuras?.['hablando']) return null;
        const abs = (src: string) => new URL(src, url).href;
        for (const f of Object.values(m.figuras)) {
          f.src = abs(f.src);
          if (f.capas?.habla) f.capas.habla.src = abs(f.capas.habla.src);
          if (f.capas?.parpado) f.capas.parpado.src = abs(f.capas.parpado.src);
        }
        return m;
      })
      .catch(() => null);
    manifiestos.set(url, p);
  }
  return p;
}

/**
 * El estilo con las caricaturas propias de los participantes añadidas como
 * personajes (con su id de usuario como clave). El estilo base no se toca.
 */
export function conCaricaturas(biblioteca: EstiloComic, propias: Readonly<Record<string, PersonajeImagen>>): EstiloComic {
  return Object.keys(propias).length ? { ...biblioteca, personajes: { ...biblioteca.personajes, ...propias } } : biblioteca;
}

/**
 * Qué personaje del estilo es cada participante, por este orden:
 *
 * 1. el que eligió expresamente (Larry, Lara…), si es de este estilo;
 * 2. su caricatura propia, si la tiene (va en `propias`, con su id);
 * 3. uno asignado por su id —siempre el mismo, en cualquier dispositivo— y,
 *    mientras se pueda, uno que no esté ya cogido: en una conversación de
 *    dos, que no salgan dos Larrys.
 */
export function repartir(
  biblioteca: EstiloComic,
  usuarios: readonly string[],
  perfiles: Readonly<Record<string, PerfilXhatin>>,
  propias: Readonly<Record<string, PersonajeImagen>> = {},
): Record<string, string> {
  const slugs = Object.keys(biblioteca.personajes).filter((s) => !propias[s]).sort();
  const reparto: Record<string, string> = {};
  const cogidos = new Set<string>();
  const orden = [...new Set(usuarios)].sort();
  for (const u of orden) {
    const elegido = perfiles[u]?.personaje;
    if (elegido && biblioteca.personajes[elegido] && !propias[elegido]) {
      reparto[u] = elegido;
      cogidos.add(elegido);
    } else if (propias[u]) {
      reparto[u] = u;
    }
  }
  for (const u of orden) {
    if (reparto[u] || !slugs.length) continue;
    const inicio = hash(u) % slugs.length;
    const libre = slugs.map((_, i) => slugs[(inicio + i) % slugs.length]!).find((s) => !cogidos.has(s));
    reparto[u] = libre ?? slugs[inicio]!;
    cogidos.add(reparto[u]);
  }
  return reparto;
}

/**
 * Lo que necesita el compositor para dibujar con un estilo de imagen.
 * `base` es desde dónde se sirven sus imágenes (la carpeta public/ del remote
 * de xhatin, que es quien las tiene).
 */
export function usoDe(opcion: OpcionEstilo, reparto: Record<string, string>, base: string): UsoEstilo | undefined {
  return opcion.biblioteca ? { estilo: opcion.biblioteca, base, reparto } : undefined;
}
