/**
 * Conversaciones artificiales para probar el motor.
 *
 * Las usan los tests (escena.spec.ts), el laboratorio (/lab) y el puerto
 * falso. Cubren los casos del encargo: conversación normal, discusión,
 * humor, sorpresa, tres personas, muchas personas, mensajes muy cortos y
 * muy largos, emojis, cambio de tema, alguien que entra y alguien que sale.
 *
 * El reparto son los personajes de ejemplo de HilarAvatar (assets/ejemplos),
 * uno por sección de Diario Hilario, más dos sin avatar guardado para probar
 * el respaldo determinista.
 */

import { aCodigo } from '../../hilaravatar/hilaravatar';
import type { MensajeEntrada } from '../modelo';

type Piezas = Record<string, string>;
const av = (piezas: Piezas, colores: Record<string, string>) => aCodigo({ piezas, colores } as never);

export interface PersonaPrueba {
  id: string;
  nombre: string;
  avatar: string | null;
}

export const REPARTO: Record<string, PersonaPrueba> = {
  alberto: {
    id: 'u-alberto',
    nombre: 'Alberto',
    avatar: av(
      { fondo: 'trama', 'pelo-tras': 'nada', cuerpo: 'camiseta', cabeza: 'ovalo', cejas: 'pobladas', ojos: 'normales', nariz: 'aguilena', boca: 'sonrisa', barba: 'tres-dias', pelo: 'entradas', gafas: 'pasta', sombrero: 'nada', extra: 'nada' },
      { piel: 'clara', pelo: 'castano', ropa: 'teal', fondo: 'mostaza' },
    ),
  },
  juan: {
    id: 'u-juan',
    nombre: 'Juan',
    avatar: av(
      { fondo: 'trama', 'pelo-tras': 'nada', cuerpo: 'camiseta', cabeza: 'redonda', cejas: 'pobladas', ojos: 'normales', nariz: 'ancha', boca: 'sonrisa', barba: 'completa', pelo: 'coronilla', gafas: 'redondas', sombrero: 'nada', extra: 'nada' },
      { piel: 'clara', pelo: 'castano', ropa: 'verde', fondo: 'verde' },
    ),
  },
  marta: {
    id: 'u-marta',
    nombre: 'Marta',
    avatar: av(
      { fondo: 'trama', 'pelo-tras': 'nada', cuerpo: 'bata', cabeza: 'redonda', cejas: 'arqueadas', ojos: 'despiertos', nariz: 'boton', boca: 'dientes', barba: 'nada', pelo: 'mono', gafas: 'nada', sombrero: 'nada', extra: 'nada' },
      { piel: 'media', pelo: 'caoba', ropa: 'rojo', fondo: 'mostaza' },
    ),
  },
  lucia: {
    id: 'u-lucia',
    nombre: 'Lucía',
    avatar: av(
      { fondo: 'rayas', 'pelo-tras': 'nada', cuerpo: 'chaqueta', cabeza: 'ovalo', cejas: 'finas', ojos: 'entrecerrados', nariz: 'respingona', boca: 'mueca', barba: 'nada', pelo: 'melena', gafas: 'sol', sombrero: 'nada', extra: 'nada' },
      { piel: 'morena', pelo: 'tinta', ropa: 'grafito', fondo: 'rojo' },
    ),
  },
  pedro: {
    id: 'u-pedro',
    nombre: 'Pedro',
    avatar: av(
      { fondo: 'estallido', 'pelo-tras': 'nada', cuerpo: 'chandal', cabeza: 'patata', cejas: 'rectas', ojos: 'saltones', nariz: 'patata', boca: 'sonrisa', barba: 'nada', pelo: 'despeinado', gafas: 'pasta', sombrero: 'nada', extra: 'auriculares-cuello' },
      { piel: 'hueso', pelo: 'tinta', ropa: 'azul', fondo: 'teal' },
    ),
  },
  sara: {
    id: 'u-sara',
    nombre: 'Sara',
    avatar: av(
      { fondo: 'trama', 'pelo-tras': 'nada', cuerpo: 'capucha', cabeza: 'ovalo', cejas: 'asimetricas', ojos: 'cansados', nariz: 'boton', boca: 'neutra', barba: 'nada', pelo: 'coleta', gafas: 'nada', sombrero: 'auriculares', extra: 'cafe' },
      { piel: 'hueso', pelo: 'chicle', ropa: 'teal', fondo: 'humo' },
    ),
  },
  hilario: {
    id: 'u-hilario',
    nombre: 'Hilario',
    avatar: 'v1|trama.nada.tirantes.patata.unica.bizcos.patata.dientes.morsa.calvo.nada.papel.chapa|clara.zanahoria.rojo.mostaza',
  },
  // Sin avatar: tienen que salir con su cara determinista, como en el chat real.
  carlos: { id: 'u-carlos', nombre: 'Carlos', avatar: null },
  eva: { id: 'u-eva', nombre: 'Eva', avatar: null },
  nacho: { id: 'u-nacho', nombre: 'Nacho', avatar: null },
};

/** [quién, texto, minutos desde el anterior?, adjunto?] */
type Linea = [keyof typeof REPARTO, string, number?, 'imagen'?];

const IMAGEN =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60"><rect width="80" height="60" fill="#9DB8C0"/><circle cx="60" cy="16" r="9" fill="#F0D58A"/><path d="M0 60 L24 30 L40 46 L54 34 L80 60 Z" fill="#6E8B5A"/></svg>',
  );

function construir(prefijo: string, lineas: Linea[]): MensajeEntrada[] {
  let t = Date.UTC(2026, 8, 24, 10, 0, 0);
  return lineas.map(([quien, texto, minutos, adjunto], i) => {
    t += (minutos ?? 1) * 60_000;
    const p = REPARTO[quien]!;
    return {
      id: `${prefijo}-${i}`,
      texto,
      autorId: p.id,
      autorNombre: p.nombre,
      avatar: p.avatar,
      fecha: new Date(t),
      adjuntos: adjunto ? [{ tipo: 'imagen', url: IMAGEN, nombre: 'foto.png' }] : undefined,
    };
  });
}

export interface ConversacionPrueba {
  id: string;
  nombre: string;
  descripcion: string;
  mensajes: MensajeEntrada[];
}

export const CONVERSACIONES: ConversacionPrueba[] = [
  {
    id: 'normal',
    nombre: 'Conversación normal',
    descripcion: 'Dos personas, charla tranquila. Tiene que agruparse en pocas viñetas.',
    mensajes: construir('normal', [
      ['alberto', 'Hola Juan, ¿qué tal el finde?'],
      ['juan', 'Bien, tranquilo. Estuve en el pueblo.'],
      ['alberto', '¿Y qué tal por allí?'],
      ['juan', 'Como siempre, con las vacas y la niebla 😄'],
      ['alberto', 'Qué envidia, yo me pasé el sábado arreglando el servidor.'],
      ['juan', 'Vaya plan…'],
    ]),
  },
  {
    id: 'agrupar',
    nombre: 'Agrupación (ejemplo del encargo)',
    descripcion: '"¿Has visto lo que ha pasado?" / "No." / "Mira esto." / "😮": una escena con varias intervenciones.',
    mensajes: construir('agrupar', [
      ['alberto', '¿Has visto lo que ha pasado?'],
      ['juan', 'No.'],
      ['alberto', 'Mira esto.', 1, 'imagen'],
      ['juan', '😮'],
    ]),
  },
  {
    id: 'discusion',
    nombre: 'Discusión',
    descripcion: 'La tensión sube: lenguaje corporal, primeros planos, plano inclinado y ambiente.',
    mensajes: construir('discusion', [
      ['marta', 'Oye, ¿quién se ha comido mi tortilla de la nevera?'],
      ['pedro', 'Ni idea 🤷'],
      ['marta', 'Pedro, que te he visto con el tupper.'],
      ['pedro', 'Pues no, te equivocas.'],
      ['marta', '¡ESTOY HARTA DE QUE ME COJAS LA COMIDA!'],
      ['pedro', 'Bueno, bueno, tampoco te pongas así'],
      ['marta', 'Eres un cara, de verdad 😠'],
      ['pedro', 'Vale, perdón, mañana te hago otra.'],
    ]),
  },
  {
    id: 'humor',
    nombre: 'Conversación divertida',
    descripcion: 'Risas y contagio: quien escucha también sonríe.',
    mensajes: construir('humor', [
      ['lucia', '¿Sabéis que Hilario se ha presentado a la reunión con el gorro de papel?'],
      ['alberto', 'JAJAJAJA no me digas'],
      ['lucia', 'Y encima dice que es "tendencia" 😂'],
      ['alberto', 'me meo 🤣🤣'],
      ['lucia', 'jajaja lo peor es que le queda bien'],
    ]),
  },
  {
    id: 'sorpresa',
    nombre: 'Sorpresa',
    descripcion: 'Reacciones fuertes: primer plano, efectos, viñeta propia.',
    mensajes: construir('sorpresa', [
      ['juan', 'Me han dado el trabajo en Santander'],
      ['alberto', '¡¿Qué?! ¡No me lo puedo creer!'],
      ['juan', 'Empiezo el lunes'],
      ['alberto', '¡¡ENHORABUENA!! 🎉🎉'],
    ]),
  },
  {
    id: 'tres',
    nombre: 'Tres personas',
    descripcion: 'Tres personajes: formato ancho, miradas cruzadas, nombres en los globos.',
    mensajes: construir('tres', [
      ['alberto', 'Buenas, ¿quedamos el viernes?'],
      ['marta', 'Yo me apunto'],
      ['juan', 'Yo también, pero después de las siete'],
      ['alberto', 'Perfecto. Marta, ¿reservas tú?'],
      ['marta', 'Vale, lo apunto'],
      ['juan', '👍'],
    ]),
  },
  {
    id: 'muchos',
    nombre: 'Muchos usuarios',
    descripcion: 'Siete personas en un grupo: plano general, reparto limitado a los que hablan.',
    mensajes: construir('muchos', [
      ['alberto', 'Hola a todos, ¿qué tal?'],
      ['marta', '¡Hola!'],
      ['juan', 'Buenas'],
      ['lucia', 'Holaaa 👋'],
      ['pedro', 'Ey'],
      ['sara', 'buenas buenas'],
      ['carlos', '¿Alguien ha visto el partido?'],
      ['pedro', '¡Golazo en el último minuto!'],
      ['marta', 'Yo no, ¿quién ganó?'],
      ['carlos', 'Ganamos 2-1'],
      ['sara', '¡Toma ya! 🎉'],
    ]),
  },
  {
    id: 'cortos',
    nombre: 'Mensajes muy cortos',
    descripcion: 'Monosílabos y signos sueltos: reacciones, no globos grandes.',
    mensajes: construir('cortos', [
      ['juan', '?'],
      ['alberto', 'ok'],
      ['juan', 'ya'],
      ['alberto', 'no'],
      ['juan', '!!'],
      ['alberto', 'zzz'],
    ]),
  },
  {
    id: 'largos',
    nombre: 'Mensajes largos',
    descripcion: 'Párrafos: viñeta propia, globo que se parte en líneas y se recorta si no cabe.',
    mensajes: construir('largos', [
      ['sara', 'Os cuento lo de ayer porque fue de película: salgo de casa tarde, pierdo el autobús, llego corriendo a la estación, me doy cuenta de que me he dejado la cartera, vuelvo, y cuando por fin llego a la oficina resulta que la reunión se había cancelado y nadie me había avisado.'],
      ['alberto', 'Madre mía, qué día'],
      ['sara', 'Y lo mejor: el jefe me pregunta que por qué llego tarde a una reunión que no existe. Le expliqué todo con pelos y señales y me dice que la próxima vez mire el correo antes de salir, que para eso está. Yo ya no sabía si reírme o llorar, sinceramente.'],
    ]),
  },
  {
    id: 'emojis',
    nombre: 'Mensajes con emojis',
    descripcion: 'Emojis que cambian la cara, el gesto, el objeto o el sitio.',
    mensajes: construir('emojis', [
      ['lucia', '😍😍'],
      ['juan', '🤔'],
      ['lucia', '☕ ?'],
      ['juan', '👍'],
      ['lucia', '😴💤'],
      ['juan', '🤦'],
    ]),
  },
  {
    id: 'tema',
    nombre: 'Cambio de tema y de sitio',
    descripcion: 'Del trabajo a la cafetería: el escenario cambia de forma progresiva.',
    mensajes: construir('tema', [
      ['alberto', 'Mañana tengo reunión con el jefe y el cliente a primera hora'],
      ['juan', 'Uf, suerte con el proyecto'],
      ['alberto', 'Estoy agotado, llevo toda la semana con el informe'],
      ['juan', 'Pues desconecta un rato. ¿Un café?'],
      ['alberto', 'Venga, voy a la cafetería'],
      ['juan', 'Te espero en la barra'],
      ['alberto', 'Un cortado, por favor ☕'],
      ['juan', 'Y dos cruasanes 😋'],
    ]),
  },
  {
    id: 'entrada',
    nombre: 'Entra alguien nuevo',
    descripcion: 'Dos hablando; aparece una tercera persona y todos se giran.',
    mensajes: construir('entrada', [
      ['marta', '¿Has terminado lo del artículo?'],
      ['juan', 'Casi, me falta la foto de portada'],
      ['hilario', '¡Hola, hola! ¿Qué se cuece por aquí?', 2],
      ['marta', '¡Hilario! Justo hablábamos de ti'],
      ['hilario', 'Eso me suena sospechoso…'],
    ]),
  },
  {
    id: 'salida',
    nombre: 'Alguien se va',
    descripcion: 'Una despedida: se despide con la mano y en la siguiente viñeta ya no está.',
    mensajes: construir('salida', [
      ['alberto', 'Bueno, que me voy, ¡hasta mañana!'],
      ['juan', 'Venga, hasta mañana'],
      ['marta', 'Adiós Alberto 👋'],
      ['juan', 'Marta, ¿seguimos con lo del artículo?'],
      ['marta', 'Sí, dame cinco minutos'],
    ]),
  },
];

// La conversación de salida empieza con los tres ya presentes: un saludo previo.
CONVERSACIONES.find((c) => c.id === 'salida')!.mensajes.unshift(
  ...construir('salida-pre', [
    ['marta', 'Buenas tardes'],
    ['juan', 'Hola Marta'],
    ['alberto', 'Buenas'],
  ]).map((m, i) => ({ ...m, fecha: new Date(Date.UTC(2026, 8, 24, 9, 50 + i)) })),
);
