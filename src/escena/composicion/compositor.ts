/**
 * Compositor: `Vineta` (datos) → SVG.
 *
 * Es el único sitio del motor que produce marcado, y no toma decisiones:
 * dibuja lo que dicen la viñeta, el layout y la cámara. Capas, de atrás
 * adelante:
 *
 *   escenario → ambiente → [props y personajes por profundidad]
 *     (efecto "detrás" → personaje → prop en mano → efecto de personaje)
 *   → primer término del escenario → efectos de pantalla → globos
 *
 * Todo lo del mundo va dentro de un grupo con la transformación de la
 * cámara; los globos van fuera, en coordenadas de viñeta, para que el
 * texto tenga siempre el mismo tamaño se encuadre como se encuadre.
 *
 * Las animaciones son clases CSS (ver escena.css). El compositor solo marca
 * con `dh-nuevo` lo que acaba de aparecer, para que al añadir un globo a una
 * viñeta abierta no se repitan las entradas de lo que ya estaba.
 */

import { DATOS } from '../../hilaravatar/piezas.js';
import type { Catalogo } from '../catalogo/catalogo';
import { DEFS_ESCENARIOS } from '../catalogo/escenarios';
import { TECHO_MUNDO, type Vineta } from '../modelo';
import type { DefEscenario } from '../catalogo/tipos';
import { dibujarPersonaje, estiloColores } from '../personaje/personaje';
import { configDe } from '../personaje/cabeza';
import { encuadrar, matrizDe, aVineta, type Encuadre } from './camara';
import { colocarGlobos, conFuentes, dibujarGlobo, type GloboColocado, type Obstaculos } from './globos';
import { aMundo, calcularLayout, manoDelProp, type Colocacion, type ColocacionProp, type Layout } from './layout';
import { colocarFigura, elegirFigura, type FiguraColocada } from '../estilos/figuras';
import type { UsoEstilo } from '../estilos/tipos';

export interface OpcionesComposicion {
  /**
   * Ids de personajes, globos y efectos que acaban de aparecer (se animan).
   * `'*'` = todo es nuevo (viñeta recién abierta).
   */
  novedades?: ReadonlySet<string> | '*';
  /** Añade clases de animación. Falso para exportar a PNG o en tests. */
  animar?: boolean;
  /** Muestra el nombre en los globos aunque haya pocos personajes. */
  nombresSiempre?: boolean;
  /**
   * Dibujar con un estilo de imagen (p. ej. «caricatura») en vez de con los
   * personajes vectoriales. Solo cambia el dibujo: la escena es la misma. Ver
   * estilos/tipos.ts.
   */
  estilo?: UsoEstilo;
}

export interface Composicion {
  svg: string;
  layout: Layout;
  encuadre: Encuadre;
  globos: GloboColocado[];
  /** Texto para lectores de pantalla. */
  descripcion: string;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * URL de una imagen de la biblioteca: relativa a la base del estilo (las del
 * remote) o ya absoluta (las caricaturas de cada usuario, que sirve dhcore).
 */
const url = (base: string, src: string) => (/^(https?:|data:|blob:|file:)/.test(src) ? src : base + src);
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Hash corto y estable para los ids de la viñeta. */
function hash(txt: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function semillaNum(id: string): number {
  return parseInt(hash(id), 36) % 10000;
}

function esNuevo(op: OpcionesComposicion, id: string): boolean {
  return op.novedades === '*' || (!!op.novedades && op.novedades.has(id));
}

/** Color con el que se prolonga el decorado hacia arriba. */
function cieloDe(e: DefEscenario): string {
  if (e.cielo) return e.cielo;
  const m = e.svg.match(/fill="(#[0-9a-fA-F]{3,8}|var\([^)]*\))"/);
  return m ? m[1]! : '#F2E9D8';
}

/* ------------------------------------------------------------- ambiente --- */

function ambiente(v: Vineta): string {
  switch (v.ambiente) {
    case 'tension':
      return `<rect class="dh-ambiente dh-ambiente--tension" x="0" y="-420" width="1200" height="1020" fill="#CF3A2B" opacity="0.13"/>` +
        `<rect x="0" y="-420" width="1200" height="1020" fill="url(#dh-esc-rayas)" opacity="0.07"/>`;
    case 'drama':
      return `<rect x="0" y="-420" width="1200" height="1020" fill="#1B1714" opacity="0.12"/>`;
    case 'fiesta':
      return `<rect x="0" y="-420" width="1200" height="1020" fill="#D9A94A" opacity="0.08"/>`;
    default:
      return '';
  }
}

/* ------------------------------------------------------------- props ------ */

function dibujarProp(cp: ColocacionProp, imagen?: string): string {
  const { def, x, y, escala } = cp;
  return `<g class="dh-prop dh-prop--${def.id}" transform="translate(${f(x)} ${f(y)}) scale(${f(escala)})">${def.svg}${pantalla(def, imagen)}</g>`;
}

function pantalla(def: ColocacionProp['def'], imagen?: string): string {
  if (!imagen || !def.pantalla) return '';
  const p = def.pantalla;
  return `<image href="${esc(imagen)}" x="${p.x}" y="${p.y}" width="${p.ancho}" height="${p.alto}" preserveAspectRatio="xMidYMid slice"/>` +
    `<rect x="${p.x}" y="${p.y}" width="${p.ancho}" height="${p.alto}" fill="none" stroke="#1B1714" stroke-width="3"/>`;
}

/* ---------------------------------------------------------- personajes --- */

function dibujarColocacion(c: Colocacion, v: Vineta, catalogo: Catalogo, op: OpcionesComposicion): string {
  const p = c.personaje;
  const pose = catalogo.poses.obtener(p.pose);
  const expresion = catalogo.expresion(p.expresion);
  const dibujo = dibujarPersonaje({
    identidad: p.identidad,
    pose,
    expresion,
    marcas: catalogo.marcas.listar(),
    mirada: c.mirada,
    giro: c.giro,
    habla: p.habla,
    semilla: semillaNum(p.id),
  });
  const config = configDe(p.identidad.codigo);

  const nuevo = esNuevo(op, p.id);
  const clases = [
    'dh-pj',
    pose.animacion ? `dh-anim-${pose.animacion}` : '',
    p.habla ? 'dh-habla' : '',
    ...p.animaciones.map((a) => `dh-anim-${a}`),
    nuevo ? 'dh-nuevo' : '',
    p.entra ? `dh-entra-${p.entra}` : '',
    p.sale ? `dh-sale-${p.sale}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const retraso = ((semillaNum(p.id) % 100) / 100) * 1.5;

  const sx = c.espejo ? -c.escala : c.escala;
  let s =
    `<g class="dh-personaje" data-id="${esc(p.id)}" transform="translate(${f(c.x)} ${f(c.y)}) scale(${f(sx)} ${f(c.escala)})">` +
    `<g class="${clases}" style="${estiloColores(config, p.identidad)};--dh-retraso:${retraso.toFixed(2)}s">` +
    dibujo.svg +
    `</g></g>`;

  // Prop en mano: fuera del grupo en espejo, para que una foto o un cartel no salgan del revés.
  if (p.propEnMano) {
    const def = catalogo.props.buscar(p.propEnMano);
    if (def) {
      const mano = manoDelProp(c, catalogo);
      const invertir = c.espejo && !def.pantalla ? -1 : 1;
      s += `<g class="dh-prop-mano${nuevo ? ' dh-nuevo' : ''}" transform="translate(${f(mano.x)} ${f(mano.y)}) scale(${f(c.escala * invertir)} ${f(c.escala)})">${def.svg}${pantalla(def, p.imagenEnMano)}</g>`;
    }
  }
  return s;
}

/** Un personaje dibujado con una figura de la biblioteca del estilo. */
function dibujarFiguraImagen(c: Colocacion, fc: FiguraColocada, base: string, op: OpcionesComposicion): string {
  const p = c.personaje;
  const pose = p.pose;
  const clases = [
    'dh-pj',
    'dh-pj--imagen',
    p.habla ? 'dh-habla' : '',
    ...p.animaciones.map((a) => `dh-anim-${a}`),
    esNuevo(op, p.id) ? 'dh-nuevo' : '',
    p.entra ? `dh-entra-${p.entra}` : '',
    p.sale ? `dh-sale-${p.sale}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const retraso = ((semillaNum(p.id) % 100) / 100) * 1.5;
  const { figura: fig, k } = fc;
  const img = (src: string, x: number, y: number, ancho: number, alto: number) =>
    `<image href="${esc(url(base, src))}" x="${f(fc.x + x * k)}" y="${f(fc.y + y * k)}" width="${f(ancho * k)}" height="${f(alto * k)}" preserveAspectRatio="none"/>`;

  // Las capas usan las mismas clases que la boca y los párpados vectoriales:
  // las animaciones de hablar y parpadear de vineta.css les valen tal cual.
  const habla = fig.capas?.habla;
  const parpado = fig.capas?.parpado;
  const sx = c.espejo ? -c.escala : c.escala;
  return (
    `<g class="dh-personaje" data-id="${esc(p.id)}" data-figura="${esc(fc.id)}" data-pose="${esc(pose)}" transform="translate(${f(c.x)} ${f(c.y)}) scale(${f(sx)} ${f(c.escala)})">` +
    `<g class="${clases}" style="--dh-retraso:${retraso.toFixed(2)}s">` +
    img(fig.src, 0, 0, fig.ancho, fig.alto) +
    (habla ? `<g class="dh-boca-b">${img(habla.src, habla.x, habla.y, habla.ancho, habla.alto)}</g>` : '') +
    (parpado ? `<g class="dh-parpados" style="animation-delay:${retraso.toFixed(2)}s">${img(parpado.src, parpado.x, parpado.y, parpado.ancho, parpado.alto)}</g>` : '') +
    `</g></g>`
  );
}

/**
 * Muebles que ya vienen en los decorados pintados: si el motor pone además
 * los suyos, quedan mesas sueltas delante de la barra de la cafetería.
 */
const MUEBLES = new Set(['mesa', 'silla']);

/** Un objeto de la biblioteca, encajado en la caja que el layout le dio al prop. */
function dibujarObjetoImagen(cp: ColocacionProp, uso: UsoEstilo): string {
  const obj = uso.estilo.objetos[cp.def.id];
  if (!obj || MUEBLES.has(cp.def.id)) return '';
  const k = Math.min(cp.caja.ancho / obj.ancho, cp.caja.alto / obj.alto);
  const ancho = obj.ancho * k;
  const alto = obj.alto * k;
  const x = cp.caja.x + (cp.caja.ancho - ancho) / 2;
  const y = cp.caja.y + cp.caja.alto - alto;
  return `<g class="dh-prop dh-prop--${cp.def.id}"><image href="${esc(url(uso.base, obj.src))}" x="${f(x)}" y="${f(y)}" width="${f(ancho)}" height="${f(alto)}"/></g>`;
}

function efectosDe(c: Colocacion, v: Vineta, catalogo: Catalogo, op: OpcionesComposicion, ambito: 'personaje' | 'detras'): string {
  let s = '';
  for (const ef of v.efectos) {
    if (ef.sobre !== c.personaje.id) continue;
    const def = catalogo.efectos.buscar(ef.tipo);
    if (!def || def.ambito !== ambito) continue;
    const clases = `dh-fx dh-fx--${def.id}${def.animacion ? ` dh-fx-${def.animacion}` : ''}${esNuevo(op, `fx:${def.id}:${c.personaje.id}`) || esNuevo(op, c.personaje.id) ? ' dh-nuevo' : ''}`;
    const conTexto = def.svg.includes('<text');
    // Los efectos con letras no se reflejan: se colocan al otro lado sin invertir.
    const sx = c.espejo && !conTexto ? -c.escala : c.escala;
    const ancla = ambito === 'personaje' ? c.coronilla : { x: c.x, y: c.y };
    const desplaza = c.espejo && conTexto ? ` translate(${-120} 0)` : '';
    s += `<g class="${clases}" transform="translate(${f(ancla.x)} ${f(ancla.y)}) scale(${f(sx)} ${f(c.escala)})${desplaza}"><g class="dh-fx-in">${def.svg}</g></g>`;
  }
  return s;
}

/* -------------------------------------------------------------- viñeta --- */

export function componerVineta(v: Vineta, catalogo: Catalogo, op: OpcionesComposicion = {}): Composicion {
  return conFuentes(op.estilo?.estilo.fuentes, () => componer(v, catalogo, op));
}

function componer(v: Vineta, catalogo: Catalogo, op: OpcionesComposicion): Composicion {
  const layout = calcularLayout(v, catalogo);
  const uso = op.estilo;

  // Estilo de imagen: cada participante con personaje en el reparto pasa a
  // ser una figura de la biblioteca. Se hace ANTES de encuadrar: la cámara y
  // los globos tienen que ver la cara y la boca del dibujo que se va a pintar.
  const figuras = new Map<string, FiguraColocada>();
  if (uso) {
    for (const c of layout.personajes) {
      const slug = uso.reparto[c.personaje.id];
      const personaje = slug ? uso.estilo.personajes[slug] : undefined;
      if (!personaje) continue;
      const { id, figura } = elegirFigura(personaje, c.personaje);
      figuras.set(c.personaje.id, colocarFigura(c, id, figura));
    }
  }

  const encuadre = encuadrar(v, layout);
  const esc0 = catalogo.escenarios.obtener(v.escenario);
  // El sufijo de ids tiene que ser único EN LA PÁGINA, no solo en la tira:
  // "v2" existe en cada conversación, y dos SVG con el mismo id de clipPath
  // se recortan uno contra el otro. Los ids de mensaje sí son únicos.
  const sufijo = '-' + hash([v.id, v.version, v.formato, v.escenario, ...v.mensajes, ...v.personajes.map((p) => p.id)].join('|'));

  // Capas del mundo ordenadas por profundidad (lo de atrás primero).
  type Item = { prof: number; orden: number; svg: string };
  const items: Item[] = [];
  for (const cp of layout.props) {
    const capa = cp.def.capa === 'delante' ? -0.01 : 0.01;
    // Con estilo de imagen, los props sin dibujo en la biblioteca no se pintan:
    // un objeto vectorial en medio de un decorado pintado desentona más de lo
    // que cuenta.
    const svg = uso ? dibujarObjetoImagen(cp, uso) : dibujarProp(cp);
    if (svg) items.push({ prof: cp.prop.profundidad + capa, orden: cp.def.anclaje === 'mesa' ? 1 : 0, svg });
  }
  for (const c of layout.personajes) {
    const fc = figuras.get(c.personaje.id);
    items.push({
      prof: c.personaje.profundidad,
      orden: 0,
      svg:
        efectosDe(c, v, catalogo, op, 'detras') +
        (fc && uso ? dibujarFiguraImagen(c, fc, uso.base, op) : dibujarColocacion(c, v, catalogo, op)) +
        efectosDe(c, v, catalogo, op, 'personaje'),
    });
  }
  items.sort((a, b) => b.prof - a.prof || a.orden - b.orden);

  // Cámara, con zoom desde el plano anterior si lo hay.
  let camaraAttr = `transform="${matrizToAttr(encuadre, layout)}"`;
  let camaraClase = 'dh-camara';
  if (op.animar !== false && v.camara.desde && v.camara.desde !== v.camara.plano && op.novedades === '*') {
    const desde = encuadrar(v, layout, v.camara.desde, v.personajes.map((p) => p.id));
    camaraClase += ' dh-camara--zoom';
    camaraAttr += ` style="--cam-desde:${matrizDe(desde, layout)};--cam-hasta:${matrizDe(encuadre, layout)}"`;
  }

  // Efectos de pantalla (0–1 estirado a la viñeta).
  const pantallaFx = v.efectos
    .map((ef) => catalogo.efectos.buscar(ef.tipo))
    .filter((d): d is NonNullable<typeof d> => !!d && d.ambito === 'pantalla')
    .map(
      (d) =>
        `<svg class="dh-fx dh-fx--${d.id}${d.animacion ? ` dh-fx-${d.animacion}` : ''}${esNuevo(op, `fx:${d.id}:`) || op.novedades === '*' ? ' dh-nuevo' : ''}" x="0" y="0" width="${layout.ancho}" height="${layout.alto}" viewBox="0 0 1 1" preserveAspectRatio="none" overflow="visible">${d.svg}</svg>`,
    )
    .join('');

  // Globos: obstáculos en coordenadas de viñeta.
  const obst: Obstaculos = { caras: [], cuerpos: [], hablantes: {} };
  for (const c of layout.personajes) {
    const cara = aVineta(encuadre, c.cara);
    const visible = cara.x + cara.ancho > 0 && cara.x < layout.ancho && cara.y + cara.alto > 0 && cara.y < layout.alto;
    if (visible) obst.caras.push({ id: c.personaje.id, caja: cara });
    obst.cuerpos.push(aVineta(encuadre, c.caja));
    const boca = aVineta(encuadre, { x: c.boca.x, y: c.boca.y, ancho: 0, alto: 0 });
    const coronilla = aVineta(encuadre, { x: c.coronilla.x, y: c.coronilla.y, ancho: 0, alto: 0 });
    obst.hablantes[c.personaje.id] = { boca: { x: boca.x, y: boca.y }, coronilla: { x: coronilla.x, y: coronilla.y }, cara, visible };
  }
  for (const cp of layout.props) {
    if (cp.def.id === 'globos' || cp.def.id === 'coche' || cp.def.id === 'television') obst.cuerpos.push(aVineta(encuadre, cp.caja));
  }
  const hablantesDistintos = new Set(v.globos.map((g) => g.autorId).filter(Boolean)).size;
  const algunoFuera = v.globos.some((g) => g.autorId && obst.hablantes[g.autorId] && !obst.hablantes[g.autorId]!.visible);
  const nombres = !!op.nombresSiempre || v.personajes.length >= 3 || algunoFuera || (hablantesDistintos >= 2 && v.personajes.length >= 3);
  const globos = colocarGlobos(v.globos, layout.ancho, layout.alto, obst, { nombres, rotulo: v.rotulo });
  const globosSvg = globos.map((g) => dibujarGlobo(g, g.globo.id === 'rotulo' ? op.novedades === '*' : esNuevo(op, g.globo.id))).join('');

  const descripcion = describir(v, catalogo);
  let svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.ancho} ${layout.alto}" class="dh-vineta-svg" role="img" aria-label="${esc(descripcion)}" style="--dh-tinta:#1B1714;--dh-papel:#F2E9D8;--dh-acento:#CF3A2B;--dh-boca:#A8402F;--dh-cristal:#8FB8C4">` +
    `<defs>${DATOS.defs}${DEFS_ESCENARIOS}<clipPath id="dh-clip"><rect x="0" y="0" width="${layout.ancho}" height="${layout.alto}"/></clipPath></defs>` +
    `<g clip-path="url(#dh-clip)">` +
    `<g class="${camaraClase}" ${camaraAttr}>` +
    escenario(esc0, v, uso) +
    ambiente(v) +
    items.map((i) => i.svg).join('') +
    (esc0.frente && !uso ? `<g class="dh-frente">${esc0.frente}</g>` : '') +
    `</g>` +
    pantallaFx +
    `<g class="dh-globos">${globosSvg}</g>` +
    `</g></svg>`;

  // Ids únicos por viñeta: dos viñetas en la misma página no pueden
  // compartir el id de un <pattern> o el segundo pierde sus colores.
  svg = svg.replace(/(id="|url\(#)(dh-[a-z-]+)/g, (_m, p, id) => p + id + sufijo);

  // Los rótulos de los efectos ("JA JA", "¡ZAS!") vienen del catálogo con su
  // letra escrita: con estilo, se cambia por la del estilo.
  const rotulo = uso?.estilo.fuentes?.rotulo;
  if (rotulo) svg = svg.split(`font-family="${FUENTE_ROTULO_EFECTOS}"`).join(`font-family="${rotulo.replace(/"/g, "'")}"`);

  return { svg, layout, encuadre, globos, descripcion };
}

/** La letra que llevan escrita los efectos del catálogo (efectos.ts). */
const FUENTE_ROTULO_EFECTOS = "'Bangers','Impact','Arial Black',sans-serif";

/** El decorado: el vectorial del catálogo o el pintado del estilo. */
function escenario(esc0: DefEscenario, v: Vineta, uso: UsoEstilo | undefined): string {
  const img = uso && (uso.estilo.escenarios[v.escenario] ?? uso.estilo.escenarios['neutro']);
  if (!img) {
    return `<g class="dh-escenario"><rect x="-600" y="${TECHO_MUNDO - 20}" width="2400" height="${-TECHO_MUNDO + 24}" fill="${cieloDe(esc0)}"/>${esc0.svg}</g>`;
  }
  // Por encima y a los lados se prolonga con el color del cielo del dibujo:
  // la cámara a veces pide más aire para los globos del que tiene el decorado.
  return (
    `<g class="dh-escenario"><rect x="-600" y="${TECHO_MUNDO - 20}" width="2400" height="${-TECHO_MUNDO + 640}" fill="${img.cielo}"/>` +
    `<image href="${esc(url(uso.base, img.src))}" x="0" y="0" width="1200" height="600" preserveAspectRatio="none"/></g>`
  );
}

function matrizToAttr(e: Encuadre, layout: Layout): string {
  // matrix() como atributo SVG va sin comas ni paréntesis extra de CSS.
  return matrizDe(e, layout).replace(/,/g, '');
}

/** Descripción para lectores de pantalla: dónde, quién y qué dice cada uno. */
export function describir(v: Vineta, catalogo: Catalogo): string {
  const sitio = catalogo.escenarios.obtener(v.escenario).nombre;
  const quien = v.personajes
    .map((p) => `${p.nombre} (${catalogo.expresion(p.expresion).nombre.toLowerCase()})`)
    .join(', ');
  const dicen = v.globos
    .map((g) => (g.tipo === 'narracion' ? g.texto : `${g.autorNombre ?? ''}: «${g.texto}»`))
    .join(' ');
  return `${v.rotulo ? v.rotulo + '. ' : ''}${sitio}. ${quien}. ${dicen}`.trim();
}

export { aMundo };
