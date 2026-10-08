/**
 * Objetos que pueden aparecer en una viñeta.
 *
 * Tres tipos según dónde se anclan:
 * - `mano`: los sujeta un personaje (móvil, taza, cartel…). El origen es el
 *   punto por donde se agarran.
 * - `suelo`: están en el decorado (mesa, coche, tele…). El origen es el
 *   centro de la base.
 * - `mesa`: se apoyan en una mesa si la hay (comida, tarta); si no, en la mano.
 *
 * Escala: la de un personaje de ~370 unidades de alto.
 * `pantalla` marca el hueco donde el compositor incrusta la imagen de un
 * adjunto (la foto que alguien "enseña" con el móvil, el cartel…).
 */

import type { DefProp } from './tipos';

const T = 'var(--dh-tinta, #1B1714)';
const P = 'var(--dh-papel, #F2E9D8)';
const A = 'var(--dh-acento, #CF3A2B)';
const MADERA = '#8A6A4A';
const MADERA_OSC = '#6B5038';
const GRIS = '#8E8A80';
const GRIS_OSC = '#4E4A44';
const MOSTAZA = '#D9A94A';
const TEAL = '#2E6B78';

const tr = (w = 5) => `stroke="${T}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

export const PROPS: DefProp[] = [
  /* ------------------------------------------------------------- mano --- */
  {
    id: 'movil',
    nombre: 'Móvil',
    tags: ['tecnologia'],
    palabras: ['movil', 'whatsapp', 'telefono', 'llamar', 'llamada', 'mensaje', 'insta', 'instagram', 'tiktok', 'twitter', 'app', 'selfie'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-12" y="-40" width="24" height="44" rx="5" fill="${GRIS_OSC}" ${tr()}/>
      <rect x="-8" y="-35" width="16" height="31" rx="2" fill="#9DB8C0"/>
      <circle cx="0" cy="-1" r="1.6" fill="${P}"/>`,
    caja: { x: -12, y: -40, ancho: 24, alto: 44 },
    pantalla: { x: -8, y: -35, ancho: 16, alto: 31 },
  },
  {
    id: 'taza',
    nombre: 'Taza',
    tags: ['comida', 'cafe'],
    palabras: ['cafe', 'cafelito', 'cortado', 'infusion', 'un te', 'taza', 'desayuno', 'colacao'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<path d="M-4 -10 C-16 -10 -16 6 -4 6" fill="none" ${tr(5)}/>
      <path d="M-6 -20 L22 -20 L19 8 Q8 12 -3 8 Z" fill="${P}" ${tr()}/>
      <path d="M-6 -12 L22 -12" stroke="${A}" stroke-width="5"/>
      <path d="M4 -28 q-4 -6 0 -12 M12 -28 q-4 -6 0 -12" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>`,
    caja: { x: -16, y: -40, ancho: 40, alto: 52 },
  },
  {
    id: 'libreta',
    nombre: 'Libreta',
    tags: ['trabajo', 'escuela'],
    palabras: ['apunto', 'apuntar', 'nota', 'notas', 'libreta', 'lista', 'escribo', 'escribiendo'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-4" y="-38" width="34" height="44" rx="3" fill="${P}" ${tr()}/>
      <path d="M2 -26 L24 -26 M2 -18 L24 -18 M2 -10 L18 -10" stroke="${T}" stroke-width="2.5" opacity="0.55"/>
      <path d="M2 -42 l0 8 M10 -42 l0 8 M18 -42 l0 8 M26 -42 l0 8" ${tr(3)}/>`,
    caja: { x: -4, y: -42, ancho: 34, alto: 48 },
  },
  {
    id: 'portatil',
    nombre: 'Portátil',
    tags: ['tecnologia', 'trabajo'],
    palabras: ['ordenador', 'portatil', 'pc', 'codigo', 'programar', 'programando', 'linux', 'web', 'servidor', 'deploy', 'bug', 'teclado', 'excel', 'correo', 'email'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<path d="M18 -2 L30 -50 L38 -50 L28 -2 Z" fill="${GRIS}" ${tr()}/>
      <circle cx="31" cy="-26" r="3.5" fill="${P}" opacity="0.8"/>
      <path d="M-34 -6 L30 -6 L32 2 L-36 2 Z" fill="${GRIS_OSC}" ${tr()}/>`,
    caja: { x: -36, y: -50, ancho: 74, alto: 52 },
  },
  {
    id: 'periodico',
    nombre: 'Periódico',
    tags: ['noticias'],
    palabras: ['periodico', 'diario', 'noticia', 'noticias', 'articulo', 'portada', 'titular', 'prensa'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<path d="M-8 -48 L52 -44 L50 8 L-10 4 Z" fill="${P}" ${tr()}/>
      <path d="M-2 -38 L44 -35" stroke="${T}" stroke-width="6"/>
      <path d="M-2 -26 L18 -25 M-2 -19 L18 -18 M-3 -12 L17 -11 M-3 -5 L17 -4 M26 -24 L44 -23 M26 -17 L44 -16 M25 -10 L43 -9" stroke="${T}" stroke-width="2.5" opacity="0.55"/>`,
    caja: { x: -10, y: -48, ancho: 62, alto: 56 },
    pantalla: { x: 24, y: -28, ancho: 20, alto: 24 },
  },
  {
    id: 'libro',
    nombre: 'Libro',
    tags: ['escuela', 'cultura'],
    palabras: ['libro', 'leer', 'leyendo', 'novela', 'biblioteca', 'estudiar', 'capitulo'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-6" y="-44" width="36" height="48" rx="3" fill="${TEAL}" ${tr()}/>
      <path d="M0 -44 L0 4" ${tr(4)}/>
      <rect x="6" y="-34" width="18" height="10" fill="${P}" ${tr(2.5)}/>`,
    caja: { x: -6, y: -44, ancho: 36, alto: 48 },
  },
  {
    id: 'microfono',
    nombre: 'Micrófono',
    tags: ['noticias', 'musica'],
    palabras: ['micro', 'microfono', 'podcast', 'entrevista', 'cantar', 'karaoke', 'radio', 'directo', 'concierto'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<path d="M-4 8 L-1 -22 L7 -22 L10 8 Z" fill="${GRIS_OSC}" ${tr()}/>
      <circle cx="3" cy="-32" r="13" fill="${GRIS}" ${tr()}/>
      <path d="M-6 -36 L12 -36 M-7 -29 L13 -29" stroke="${T}" stroke-width="2.5" opacity="0.5"/>`,
    caja: { x: -10, y: -46, ancho: 26, alto: 56 },
  },
  {
    id: 'camara',
    nombre: 'Cámara',
    tags: ['foto'],
    palabras: ['camara', 'foto', 'fotos', 'grabar', 'grabando', 'video', 'youtube', 'streaming'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-10" y="-34" width="50" height="34" rx="5" fill="${GRIS_OSC}" ${tr()}/>
      <rect x="-2" y="-42" width="16" height="9" rx="2" fill="${GRIS_OSC}" ${tr(4)}/>
      <circle cx="18" cy="-17" r="11" fill="${GRIS}" ${tr()}/><circle cx="18" cy="-17" r="5" fill="#9DB8C0"/>
      <circle cx="33" cy="-28" r="2.5" fill="${A}"/>`,
    caja: { x: -10, y: -42, ancho: 50, alto: 42 },
  },
  {
    id: 'cartel',
    nombre: 'Cartel',
    tags: ['protesta', 'aviso'],
    palabras: ['cartel', 'pancarta', 'anuncio', 'aviso', 'manifestacion', 'protesta'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<path d="M0 10 L0 -70" stroke="${T}" stroke-width="11" stroke-linecap="round"/><path d="M0 10 L0 -70" stroke="${MADERA}" stroke-width="5" stroke-linecap="round"/>
      <rect x="-54" y="-142" width="108" height="76" rx="4" fill="${P}" ${tr(6)}/>`,
    caja: { x: -54, y: -142, ancho: 108, alto: 152 },
    pantalla: { x: -46, y: -134, ancho: 92, alto: 60 },
  },
  {
    id: 'foto',
    nombre: 'Foto',
    tags: ['foto', 'adjunto'],
    // Sin palabras a propósito: el marco solo aparece cuando hay una imagen
    // adjunta que enseñar (ver la regla 'mostrar').
    palabras: [],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-8" y="-66" width="84" height="68" rx="3" fill="${P}" ${tr(5)}/>`,
    caja: { x: -8, y: -66, ancho: 84, alto: 68 },
    pantalla: { x: -1, y: -59, ancho: 70, alto: 54 },
  },
  {
    id: 'regalo',
    nombre: 'Regalo',
    tags: ['fiesta'],
    palabras: ['regalo', 'regalar', 'sorpresa', 'cumple', 'cumpleanos', 'reyes', 'navidad', 'amigo invisible'],
    anclaje: 'mano',
    capa: 'delante',
    svg: `<rect x="-24" y="-38" width="48" height="42" rx="3" fill="${A}" ${tr()}/>
      <path d="M0 -38 L0 4 M-24 -18 L24 -18" stroke="${MOSTAZA}" stroke-width="7"/>
      <path d="M0 -38 C-18 -58 -24 -40 0 -38 C24 -40 18 -58 0 -38 Z" fill="${MOSTAZA}" ${tr(4)}/>`,
    caja: { x: -24, y: -56, ancho: 48, alto: 60 },
  },
  {
    id: 'comida',
    nombre: 'Plato de comida',
    tags: ['comida'],
    palabras: ['comida', 'comer', 'tortilla', 'pizza', 'bocata', 'bocadillo', 'paella', 'cocido', 'receta', 'cocinar', 'cocinando', 'hambre', 'cena', 'almuerzo', 'tapa', 'tapas', 'pintxo'],
    anclaje: 'mesa',
    capa: 'delante',
    svg: `<ellipse cx="0" cy="-4" rx="36" ry="9" fill="${P}" ${tr()}/>
      <path d="M-24 -8 Q-22 -26 0 -27 Q22 -26 24 -8 Z" fill="${MOSTAZA}" ${tr()}/>
      <path d="M-12 -18 q4 -3 8 0 M4 -20 q4 -3 8 0" fill="none" stroke="${T}" stroke-width="2.5" opacity="0.5"/>`,
    caja: { x: -36, y: -28, ancho: 72, alto: 34 },
  },
  {
    id: 'tarta',
    nombre: 'Tarta',
    tags: ['fiesta', 'comida'],
    palabras: ['tarta', 'pastel', 'velas', 'cumple', 'cumpleanos'],
    anclaje: 'mesa',
    capa: 'delante',
    svg: `<ellipse cx="0" cy="-3" rx="42" ry="9" fill="${P}" ${tr()}/>
      <path d="M-32 -6 L-32 -40 Q0 -48 32 -40 L32 -6 Q0 2 -32 -6 Z" fill="#E7B7B0" ${tr()}/>
      <path d="M-32 -26 Q-24 -18 -16 -26 Q-8 -18 0 -26 Q8 -18 16 -26 Q24 -18 32 -26" fill="none" stroke="${P}" stroke-width="5"/>
      <path d="M-10 -44 L-10 -60 M10 -44 L10 -60" stroke="${A}" stroke-width="6" stroke-linecap="round"/>
      <path d="M-10 -66 q-4 -6 0 -10 q4 4 0 10 Z M10 -66 q-4 -6 0 -10 q4 4 0 10 Z" fill="${MOSTAZA}" ${tr(2.5)}/>`,
    caja: { x: -42, y: -76, ancho: 84, alto: 80 },
  },

  /* ------------------------------------------------------------ suelo --- */
  {
    id: 'mesa',
    nombre: 'Mesa',
    tags: ['mueble'],
    palabras: ['mesa'],
    anclaje: 'suelo',
    capa: 'delante',
    superficie: 96,
    svg: `<path d="M-64 -86 L-58 0 M64 -86 L58 0" ${tr(12)}/><path d="M-64 -86 L-58 0 M64 -86 L58 0" stroke="${MADERA_OSC}" stroke-width="5" stroke-linecap="round"/>
      <rect x="-94" y="-104" width="188" height="18" rx="5" fill="${MADERA}" ${tr(6)}/>`,
    caja: { x: -94, y: -104, ancho: 188, alto: 104 },
  },
  {
    id: 'silla',
    nombre: 'Silla',
    tags: ['mueble'],
    palabras: ['silla', 'sentarse', 'sientate'],
    anclaje: 'suelo',
    capa: 'detras',
    svg: `<path d="M-26 -60 L-30 0 M26 -60 L30 0 M-24 -60 L-24 -128" ${tr(10)}/><path d="M-26 -60 L-30 0 M26 -60 L30 0 M-24 -60 L-24 -128" stroke="${MADERA_OSC}" stroke-width="4" stroke-linecap="round"/>
      <rect x="-36" y="-70" width="72" height="14" rx="4" fill="${MADERA}" ${tr(6)}/>
      <rect x="-34" y="-128" width="22" height="46" rx="4" fill="${MADERA}" ${tr(6)}/>`,
    caja: { x: -36, y: -128, ancho: 72, alto: 128 },
  },
  {
    id: 'television',
    nombre: 'Televisión',
    tags: ['casa', 'ocio'],
    palabras: ['tele', 'television', 'serie', 'series', 'peli', 'netflix', 'partido', 'telediario', 'documental', 'capitulo'],
    anclaje: 'suelo',
    capa: 'detras',
    svg: `<rect x="-80" y="-58" width="160" height="58" rx="4" fill="${MADERA}" ${tr(6)}/>
      <path d="M-70 -30 L70 -30" stroke="${T}" stroke-width="4" opacity="0.5"/>
      <rect x="-74" y="-156" width="148" height="92" rx="8" fill="${GRIS_OSC}" ${tr(6)}/>
      <rect x="-64" y="-146" width="128" height="72" rx="4" fill="#9DB8C0"/>
      <path d="M-52 -134 L-30 -134" stroke="${P}" stroke-width="5" stroke-linecap="round" opacity="0.7"/>`,
    caja: { x: -80, y: -156, ancho: 160, alto: 156 },
    pantalla: { x: -64, y: -146, ancho: 128, alto: 72 },
  },
  {
    id: 'coche',
    nombre: 'Coche',
    tags: ['viaje', 'calle'],
    palabras: ['coche', 'conducir', 'conduciendo', 'atasco', 'aparcar', 'carretera', 'gasolina', 'itv'],
    anclaje: 'suelo',
    capa: 'detras',
    svg: `<path d="M-150 -30 L-146 -70 Q-140 -84 -118 -86 L-84 -88 L-54 -128 Q-44 -138 -24 -138 L60 -138 Q80 -138 92 -124 L120 -88 L140 -84 Q156 -80 156 -60 L156 -30 Z" fill="${TEAL}" ${tr(6)}/>
      <path d="M-44 -94 L-22 -126 L20 -126 L20 -94 Z M34 -94 L34 -126 L66 -126 Q76 -126 82 -118 L100 -94 Z" fill="#9DB8C0" ${tr(5)}/>
      <path d="M130 -64 l18 0 M-146 -58 l14 0" stroke="${MOSTAZA}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="-90" cy="-26" r="28" fill="${GRIS_OSC}" ${tr(6)}/><circle cx="-90" cy="-26" r="11" fill="${GRIS}"/>
      <circle cx="96" cy="-26" r="28" fill="${GRIS_OSC}" ${tr(6)}/><circle cx="96" cy="-26" r="11" fill="${GRIS}"/>`,
    caja: { x: -156, y: -138, ancho: 312, alto: 138 },
  },
  {
    id: 'maleta',
    nombre: 'Maleta',
    tags: ['viaje'],
    palabras: ['maleta', 'equipaje', 'viaje', 'viajar', 'vacaciones', 'vuelo'],
    anclaje: 'suelo',
    capa: 'delante',
    svg: `<path d="M-10 -80 L-10 -96 L10 -96 L10 -80" fill="none" ${tr(6)}/>
      <rect x="-30" y="-82" width="60" height="76" rx="8" fill="${A}" ${tr(6)}/>
      <path d="M-14 -72 L-14 -16 M14 -72 L14 -16" stroke="${T}" stroke-width="3" opacity="0.5"/>
      <circle cx="-20" cy="-3" r="5" fill="${GRIS_OSC}" ${tr(3)}/><circle cx="20" cy="-3" r="5" fill="${GRIS_OSC}" ${tr(3)}/>`,
    caja: { x: -30, y: -96, ancho: 60, alto: 96 },
  },
  {
    id: 'planta',
    nombre: 'Planta',
    tags: ['casa', 'oficina'],
    palabras: ['planta', 'plantas', 'maceta', 'jardin', 'regar'],
    anclaje: 'suelo',
    capa: 'detras',
    svg: `<path d="M0 -50 C-30 -80 -50 -110 -30 -140 C-20 -110 -6 -90 0 -60 C6 -100 20 -130 40 -140 C44 -110 26 -80 0 -50 Z" fill="#6E8B5A" ${tr(5)}/>
      <path d="M-26 -52 L26 -52 L20 0 L-20 0 Z" fill="#B86A45" ${tr(6)}/>`,
    caja: { x: -50, y: -140, ancho: 100, alto: 140 },
  },
  {
    id: 'globos',
    nombre: 'Globos',
    tags: ['fiesta'],
    palabras: ['globos', 'fiesta', 'cumple', 'cumpleanos', 'celebracion'],
    anclaje: 'suelo',
    capa: 'detras',
    svg: `<path d="M0 0 Q-10 -60 -24 -150 M0 0 Q6 -70 10 -176 M0 0 Q14 -50 40 -140" fill="none" stroke="${T}" stroke-width="2.5"/>
      <ellipse cx="-24" cy="-172" rx="24" ry="28" fill="${A}" ${tr(5)}/>
      <ellipse cx="12" cy="-200" rx="24" ry="28" fill="${MOSTAZA}" ${tr(5)}/>
      <ellipse cx="42" cy="-162" rx="22" ry="26" fill="${TEAL}" ${tr(5)}/>`,
    caja: { x: -50, y: -228, ancho: 116, alto: 228 },
  },
];
