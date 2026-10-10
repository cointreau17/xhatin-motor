/**
 * La portada de la conversación: la cabecera de cómic con la que empieza la
 * tira, como la de un número. El título de la serie («XHATÍN»), el número y
 * la fecha, de qué va (con quién hablas, o el grupo) y el reparto con sus
 * caras. Es un SVG suelto: lo ponen la web y la app encima de la tira.
 */

import { aCodigo, aleatorio, componer, deCodigo } from '../../hilaravatar/hilaravatar.js';
import { FUENTE_COMIC, FUENTE_ROTULO } from './globos.js';

export interface DatosPortada {
  /** De qué va: con quién hablas o el nombre del grupo. */
  titulo: string;
  /** El número de la serie (`numeroDeTira`). */
  numero: number;
  /** La fecha del número: la del primer mensaje que se enseña. */
  fecha: Date;
  /** Quién sale. Las caras son sus HilarAvatar. */
  reparto: ReadonlyArray<{ id: string; nombre?: string; avatar?: string | null }>;
}

const TINTA = '#1B1714';
const PAPEL = '#F2E9D8';
const ACENTO = '#CF3A2B';
const MOSTAZA = '#D9A94A';
const ANCHO = 1200;
const ALTO = 420;
/** Caras que caben en la fila del reparto; las demás van en «+N». */
const CARAS = 7;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fuente = (f: string) => f.replace(/"/g, "'");

/** Hash corto y estable, para que dos portadas en la página no compartan ids. */
function hash(txt: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * El número de la serie: cuántos días distintos tiene la conversación que se
 * ve. Cada día que se habla sale un número nuevo, como un diario.
 */
export function numeroDeTira(fechas: readonly Date[]): number {
  const dias = new Set(fechas.map((f) => `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`));
  return Math.max(1, dias.size);
}

/** «10 OCT 2026». */
function fechaCorta(f: Date): string {
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  return `${f.getDate()} ${meses[f.getMonth()]} ${f.getFullYear()}`;
}

/** «10 de octubre de 2026», para lectores de pantalla. */
function fechaLarga(f: Date): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${f.getDate()} de ${meses[f.getMonth()]} de ${f.getFullYear()}`;
}

/**
 * Recorta un texto a lo que cabe, más o menos, en `ancho` a ese tamaño de
 * letra. `em` es lo que ocupa una letra de media: más en mayúsculas.
 */
function caber(texto: string, tam: number, ancho: number, em = 0.6): string {
  const max = Math.max(4, Math.floor(ancho / (tam * em)));
  return texto.length > max ? texto.slice(0, max - 1).trimEnd() + '…' : texto;
}

export function componerPortada(d: DatosPortada): string {
  const sufijo = hash(`${d.titulo}|${d.numero}|${d.reparto.map((p) => p.id).join(',')}`);
  const trama = `dh-portada-trama-${sufijo}`;
  const titulo = caber(d.titulo.toUpperCase(), 34, 620);
  const salen = d.reparto.slice(0, CARAS);
  const resto = d.reparto.length - salen.length;

  const caras = salen
    .map((p, i) => {
      const cx = 92 + i * 118;
      const cy = 318;
      const codigo = p.avatar && /^v\d+\|/.test(p.avatar) ? p.avatar : aCodigo(aleatorio(p.id));
      const cara = componer(deCodigo(codigo), { tam: 92, encuadre: 'cara' }).replace('<svg ', `<svg x="${cx - 46}" y="${cy - 46}" `);
      const clip = `dh-portada-cara-${sufijo}-${i}`;
      const nombre = caber(p.nombre || 'Alguien', 17, 112, 0.52);
      return (
        `<clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="44"/></clipPath>` +
        `<circle cx="${cx + 4}" cy="${cy + 4}" r="46" fill="${TINTA}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="46" fill="${PAPEL}"/>` +
        `<g clip-path="url(#${clip})">${cara}</g>` +
        `<circle cx="${cx}" cy="${cy}" r="46" fill="none" stroke="${TINTA}" stroke-width="5"/>` +
        `<text x="${cx}" y="${cy + 72}" text-anchor="middle" font-family="${fuente(FUENTE_COMIC)}" font-size="17" font-weight="700" fill="${TINTA}">${esc(nombre)}</text>`
      );
    })
    .join('');
  const mas = resto > 0
    ? `<circle cx="${92 + salen.length * 118}" cy="318" r="40" fill="${MOSTAZA}" stroke="${TINTA}" stroke-width="5"/>` +
      `<text x="${92 + salen.length * 118}" y="331" text-anchor="middle" font-family="${fuente(FUENTE_ROTULO)}" font-size="36" fill="${TINTA}">+${resto}</text>`
    : '';

  const nombres = d.reparto.map((p) => p.nombre || 'Alguien').join(', ');
  const descripcion = `Xhatín, número ${d.numero}, ${fechaLarga(d.fecha)}: ${d.titulo}.${nombres ? ` Reparto: ${nombres}.` : ''}`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" class="dh-portada-svg" role="img" aria-label="${esc(descripcion)}">` +
    `<defs><pattern id="${trama}" width="14" height="14" patternUnits="userSpaceOnUse">` +
    `<circle cx="7" cy="7" r="2.2" fill="${TINTA}" opacity="0.13"/></pattern></defs>` +
    `<rect x="0" y="0" width="${ANCHO}" height="${ALTO}" fill="${PAPEL}"/>` +
    `<rect x="0" y="0" width="${ANCHO}" height="${ALTO}" fill="url(#${trama})"/>` +
    // La cabecera de la serie, inclinada y con sombra, como las de los quioscos.
    `<g transform="rotate(-3 300 120)">` +
    `<text x="44" y="178" font-family="${fuente(FUENTE_ROTULO)}" font-size="168" letter-spacing="6" fill="${TINTA}" transform="translate(8 8)">XHATÍN</text>` +
    `<text x="44" y="178" font-family="${fuente(FUENTE_ROTULO)}" font-size="168" letter-spacing="6" fill="${ACENTO}" stroke="${TINTA}" stroke-width="10" paint-order="stroke" stroke-linejoin="round">XHATÍN</text>` +
    `</g>` +
    // De qué va el número, en una franja de tinta.
    `<rect x="40" y="208" width="660" height="54" fill="${TINTA}"/>` +
    `<text x="60" y="246" font-family="${fuente(FUENTE_COMIC)}" font-size="30" font-weight="700" letter-spacing="1" fill="${PAPEL}">${esc(titulo)}</text>` +
    // Número, fecha y precio, en la esquina.
    `<g transform="rotate(4 1010 130)">` +
    `<rect x="874" y="44" width="276" height="176" fill="${TINTA}" transform="translate(7 7)"/>` +
    `<rect x="874" y="44" width="276" height="176" fill="${PAPEL}" stroke="${TINTA}" stroke-width="6"/>` +
    `<text x="1012" y="128" text-anchor="middle" font-family="${fuente(FUENTE_ROTULO)}" font-size="76" fill="${TINTA}">Nº ${d.numero}</text>` +
    `<text x="1012" y="176" text-anchor="middle" font-family="${fuente(FUENTE_COMIC)}" font-size="26" font-weight="700" letter-spacing="2" fill="${TINTA}">${fechaCorta(d.fecha)}</text>` +
    `</g>` +
    `<circle cx="1118" cy="252" r="46" fill="${MOSTAZA}" stroke="${TINTA}" stroke-width="5"/>` +
    `<text x="1118" y="262" text-anchor="middle" font-family="${fuente(FUENTE_ROTULO)}" font-size="21" letter-spacing="1" fill="${TINTA}" transform="rotate(-12 1118 252)">GRATIS</text>` +
    caras +
    mas +
    `<rect x="4" y="4" width="${ANCHO - 8}" height="${ALTO - 8}" fill="none" stroke="${TINTA}" stroke-width="8"/>` +
    `</svg>`
  );
}
