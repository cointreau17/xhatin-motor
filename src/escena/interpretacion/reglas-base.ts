/**
 * Reglas de interpretación de mensajes.
 *
 * Cada regla lee señales (senales.ts) y VOTA. Los pesos siguen una escala
 * sencilla para que sea fácil razonar al añadir reglas:
 *   0.5–1  indicio débil (una palabra ambigua)
 *   1.5–2  indicio claro
 *   2.5–3  señal fuerte (emoji inequívoco, frase hecha)
 *   100    decisión del usuario (expresión elegida a mano)
 *
 * Fase 1 lee el mensaje. Fase 2 deriva de lo que va ganando: la pose que
 * pega con la emoción, la cámara según la intensidad, los efectos…
 */

import type { Catalogo } from '../catalogo/catalogo';
import type { EstadoEscena, Interpretacion, MensajeEntrada } from '../modelo';
import type { ContextoConPizarra, Regla } from './reglas';
import { cuantas, hay, type Senales } from './senales';

export interface CtxMensaje extends ContextoConPizarra {
  m: MensajeEntrada;
  s: Senales;
  estado: EstadoEscena;
  catalogo: Catalogo;
  presentes: ReadonlyArray<{ id: string; nombre: string }>;
  anterior?: { autorId: string; texto: string; interpretacion: Interpretacion };
}

type R = Regla<CtxMensaje>;

const corto = (s: Senales, n = 4) => s.palabras.length <= n;
/** El término aparece al principio del mensaje (una respuesta, no una palabra suelta). */
const alPrincipio = (s: Senales, cat: keyof Senales['lexico']) =>
  (s.lexico[cat] ?? []).some((t) => s.lectura.startsWith(t) || s.lectura.startsWith('¡' + t) || s.lectura.startsWith('¿' + t));

/* =========================================================== FASE 1 ====== */

const emociones: R[] = [
  {
    id: 'expresion-manual',
    descripcion: 'Si el usuario eligió la expresión a mano, manda sobre todo',
    cuando: (c) => !!c.m.expresion,
    entonces: (c) => c.p.votar('emocion', c.catalogo.expresion(c.m.expresion).id, 100),
  },
  {
    id: 'risa',
    descripcion: 'Risas (jaja, xD, 😂) → riendo; una risa corta es solo "divertido"',
    cuando: (c) => c.s.risa > 0 || hay(c.s, 'risa'),
    entonces: (c) => {
      const r = Math.max(c.s.risa, 0.45);
      c.p.votar('emocion', r >= 0.55 ? 'riendo' : 'divertido', 3 + r * 2);
      c.p.votar('intencion', 'risa', 2);
      // La risa se ve de cuerpo: plano medio, no primer plano.
      c.p.votar('camara', 'medio', 2.5);
      c.p.sumar('intensidad', 0.1 + r * 0.3);
    },
  },
  {
    id: 'sorpresa',
    descripcion: 'Frases de sorpresa (no me lo creo, ostras, 😮) → sorprendido',
    cuando: (c) => hay(c.s, 'sorpresa'),
    entonces: (c) => {
      c.p.votar('emocion', 'sorprendido', 2.5 + cuantas(c.s, 'sorpresa') * 0.5);
      const fuerte = /no me lo (puedo )?cre(o|er)|no puede ser|madre mia|no jodas|alucino/.test(c.s.lectura);
      c.p.sumar('intensidad', 0.15 + (fuerte ? 0.15 : 0) + (c.s.exclamaciones > 0 ? 0.1 : 0));
    },
  },
  {
    id: 'interrobang',
    descripcion: '¡¿…?! o ?! → sorpresa fuerte',
    cuando: (c) => c.s.interrobang,
    entonces: (c) => {
      c.p.votar('emocion', 'sorprendido', 2.5);
      c.p.sumar('intensidad', 0.3);
    },
  },
  {
    id: 'enfado',
    descripcion: 'Enfado explícito → enfadado; gritado o con !! → furioso',
    cuando: (c) => hay(c.s, 'enfado'),
    entonces: (c) => {
      const fuerte = c.s.gritado || c.s.exclamaciones >= 2;
      c.p.votar('emocion', fuerte ? 'furioso' : 'enfadado', 3 + (fuerte ? 1 : 0));
      c.p.votar('tono', 'tenso', 2);
      c.p.sumar('intensidad', fuerte ? 0.3 : 0.15);
    },
  },
  {
    id: 'insulto',
    descripcion: 'Insultos → enfado y tono tenso',
    cuando: (c) => hay(c.s, 'insulto'),
    entonces: (c) => {
      c.p.votar('emocion', c.s.gritado ? 'furioso' : 'enfadado', 2.5);
      c.p.votar('intencion', 'insulto', 3);
      c.p.votar('tono', 'tenso', 3);
      c.p.sumar('intensidad', 0.2);
    },
  },
  {
    id: 'tristeza',
    descripcion: 'Tristeza → triste; llanto → llorando',
    cuando: (c) => hay(c.s, 'tristeza'),
    entonces: (c) => {
      const llanto = /llor|😭|snif/.test(c.s.norm + c.s.emojis.join(''));
      c.p.votar('emocion', llanto ? 'llorando' : 'triste', 3);
      c.p.votar('tono', 'triste', 2);
    },
  },
  {
    id: 'miedo',
    descripcion: 'Miedo, susto, 😱 → asustado',
    cuando: (c) => hay(c.s, 'miedo'),
    entonces: (c) => {
      c.p.votar('emocion', 'asustado', 3);
      c.p.sumar('intensidad', 0.15);
    },
  },
  {
    id: 'verguenza',
    descripcion: 'Qué vergüenza, ups, 😳 → avergonzado',
    cuando: (c) => hay(c.s, 'verguenza'),
    entonces: (c) => c.p.votar('emocion', 'avergonzado', 3),
  },
  {
    id: 'cansancio',
    descripcion: 'Cansado, agotado, sin dormir → cansado',
    cuando: (c) => hay(c.s, 'cansancio'),
    entonces: (c) => c.p.votar('emocion', 'cansado', 3),
  },
  {
    id: 'aburrimiento',
    descripcion: 'Qué rollo, meh, 🥱 → aburrido',
    cuando: (c) => hay(c.s, 'aburrimiento'),
    entonces: (c) => c.p.votar('emocion', 'aburrido', 2.5),
  },
  {
    id: 'sueno',
    descripcion: 'zzz, me duermo, 😴 → dormido',
    cuando: (c) => hay(c.s, 'sueno'),
    entonces: (c) => {
      const zzz = /\bz{3,}\b|😴|💤|me duermo/.test(c.s.norm + c.s.emojis.join(''));
      c.p.votar('emocion', zzz ? 'dormido' : 'cansado', zzz ? 3.5 : 1.5);
    },
  },
  {
    id: 'amor',
    descripcion: 'Te quiero, ❤️, 😍 → enamorado',
    cuando: (c) => hay(c.s, 'amor'),
    entonces: (c) => {
      c.p.votar('emocion', 'enamorado', 3);
      c.p.votar('tono', 'tierno', 2);
    },
  },
  {
    id: 'duda',
    descripcion: 'No sé, quizá, 🤔 → pensando',
    cuando: (c) => hay(c.s, 'duda'),
    entonces: (c) => c.p.votar('emocion', 'pensando', 2.2),
  },
  {
    id: 'confusion',
    descripcion: 'No entiendo, ¿eh?, 😕 → confundido',
    cuando: (c) => hay(c.s, 'confusion') || (c.s.interrogaciones >= 3 && !c.s.gritado),
    entonces: (c) => c.p.votar('emocion', 'confundido', 3),
  },
  {
    id: 'sospecha',
    descripcion: 'Ya, ya… / no me fío / 🤨 → sospechando',
    cuando: (c) => hay(c.s, 'sospecha'),
    entonces: (c) => c.p.votar('emocion', 'sospechando', 3),
  },
  {
    id: 'entusiasmo',
    descripcion: 'Qué ganas, brutal, 🤩 → emocionado',
    cuando: (c) => hay(c.s, 'entusiasmo'),
    entonces: (c) => {
      c.p.votar('emocion', 'emocionado', 2 + (c.s.exclamaciones > 0 ? 1 : 0));
      c.p.sumar('intensidad', 0.15);
    },
  },
  {
    id: 'alegria',
    descripcion: 'Genial, qué bien, :) → feliz; con énfasis → muy feliz',
    cuando: (c) => hay(c.s, 'alegria'),
    entonces: (c) => {
      const enfasis = c.s.exclamaciones > 0 || c.s.alargamientos > 0;
      c.p.votar('emocion', enfasis ? 'muy-feliz' : 'feliz', 2 + (enfasis ? 0.5 : 0));
    },
  },
  {
    id: 'sarcasmo',
    descripcion: 'Sí, claro / como no / 🙄 → sarcástico',
    cuando: (c) => hay(c.s, 'sarcasmo'),
    entonces: (c) => {
      c.p.votar('emocion', 'sarcastico', 2.2 + (c.s.suspensivos ? 1 : 0));
      c.p.votar('tono', 'comico', 1);
    },
  },
  {
    id: 'preocupacion',
    descripcion: 'Me preocupa, qué nervios, uf → preocupado',
    cuando: (c) => hay(c.s, 'preocupacion'),
    entonces: (c) => c.p.votar('emocion', 'preocupado', 2.3),
  },
  {
    id: 'idea',
    descripcion: '¡Ya sé!, tengo una idea, 💡 → bombilla',
    cuando: (c) => hay(c.s, 'idea') && !hay(c.s, 'encogerse'),
    entonces: (c) => {
      c.p.votar('emocion', 'emocionado', 1.5);
      c.p.votar('pose', 'levantando-mano', 2.6);
      c.p.anadir('efectos', 'bombilla');
    },
  },
  {
    id: 'emoji-emocion',
    descripcion: 'Un emoji de cara dice la emoción mejor que una muletilla: pesa más',
    cuando: (c) => c.s.emojis.length > 0,
    entonces: (c) => {
      const cara: Partial<Record<string, string>> = {
        risa: 'riendo', sorpresa: 'sorprendido', enfado: 'enfadado', tristeza: 'triste', miedo: 'asustado',
        verguenza: 'avergonzado', amor: 'enamorado', duda: 'pensando', confusion: 'confundido', sospecha: 'sospechando',
        entusiasmo: 'emocionado', alegria: 'feliz', sarcasmo: 'sarcastico', preocupacion: 'preocupado', cansancio: 'cansado',
        aburrimiento: 'aburrido', sueno: 'dormido',
      };
      for (const [cat, terminos] of Object.entries(c.s.lexico)) {
        const exp = cara[cat];
        if (exp && terminos!.some((t) => c.s.emojis.includes(t))) c.p.votar('emocion', exp, 1.5);
      }
    },
  },
  {
    id: 'mayusculas',
    descripcion: 'TODO EN MAYÚSCULAS → gritando, globo de grito (salvo que sea una risa)',
    cuando: (c) => c.s.gritado && c.s.risa === 0,
    entonces: (c) => {
      c.p.votar('emocion', 'gritando', 2.2);
      c.p.votar('globo', 'grito', 3);
      c.p.sumar('intensidad', 0.3);
    },
  },
  {
    id: 'exclamaciones',
    descripcion: 'Cada ! suma intensidad; !! sin otra emoción → exclamación',
    cuando: (c) => c.s.exclamaciones > 0,
    entonces: (c) => {
      c.p.sumar('intensidad', Math.min(0.3, c.s.exclamaciones * 0.08));
      c.p.votar('intencion', 'exclamacion', 1);
      if (c.s.exclamaciones >= 3) c.p.votar('emocion', 'gritando', 1.2);
    },
  },
  {
    id: 'enfasis',
    descripcion: 'Letras alargadas e intensificadores suben la intensidad',
    cuando: (c) => c.s.alargamientos > 0 || hay(c.s, 'intensificador'),
    entonces: (c) => c.p.sumar('intensidad', Math.min(0.2, c.s.alargamientos * 0.1 + cuantas(c.s, 'intensificador') * 0.05)),
  },
  {
    id: 'emoji-repetido',
    descripcion: 'El mismo emoji varias veces: más intensidad',
    cuando: (c) => c.s.emojis.length >= 2 && new Set(c.s.emojis).size < c.s.emojis.length,
    entonces: (c) => c.p.sumar('intensidad', 0.15),
  },
  {
    id: 'suspensivos',
    descripcion: 'Puntos suspensivos: bajan la intensidad',
    cuando: (c) => c.s.suspensivos,
    entonces: (c) => c.p.sumar('intensidad', -0.08),
  },
];

const intenciones: R[] = [
  {
    id: 'pregunta',
    descripcion: '¿…? → intención pregunta, pose de preguntar',
    cuando: (c) => c.s.esPregunta,
    entonces: (c) => {
      c.p.votar('intencion', 'pregunta', 2);
      c.p.votar('pose', 'preguntando', 1.3);
      c.p.votar('emocion', 'neutral', 0.6);
      c.p.votar('globo', 'pregunta', 1.2);
    },
  },
  {
    id: 'saludo',
    descripcion: 'Hola, buenas, 👋 → saluda con la mano',
    cuando: (c) => hay(c.s, 'saludo') && (alPrincipio(c.s, 'saludo') || c.s.emojis.includes('👋')),
    entonces: (c) => {
      c.p.votar('intencion', 'saludo', 3);
      c.p.votar('pose', 'saludando', 3);
      c.p.votar('emocion', 'feliz', 1.2);
      c.p.votar('mirada', 'interlocutor', 1);
    },
  },
  {
    id: 'despedida',
    descripcion: 'Adiós, me voy, hasta luego → se despide (y sale de escena)',
    cuando: (c) => hay(c.s, 'despedida'),
    entonces: (c) => {
      c.p.votar('intencion', 'despedida', 3);
      c.p.votar('pose', 'saludando', 2.5);
      c.p.votar('emocion', 'feliz', 0.8);
      // ¿Se va o solo contesta a quien se va? "Me voy" siempre es irse; un
      // "adiós" a secas solo si no es la respuesta a la despedida de otro.
      const seVa = /me voy|me piro|me las piro|me marcho|me tengo que ir|os dejo|te dejo|me retiro/.test(c.s.lectura);
      const responde = !!c.anterior && c.anterior.autorId !== c.m.autorId && c.anterior.interpretacion.intencion === 'despedida';
      if (seVa || (!responde && /adios|agur|hasta manana|buenas noches|chao|bye/.test(c.s.lectura))) {
        c.p.votar('movimiento', 'salir', 2);
      }
    },
  },
  {
    id: 'acuerdo',
    descripcion: 'Vale, sí, 👍 al empezar un mensaje corto → pulgar arriba',
    cuando: (c) => hay(c.s, 'acuerdo') && (alPrincipio(c.s, 'acuerdo') || c.s.emojis.includes('👍')) && corto(c.s, 6),
    entonces: (c) => {
      c.p.votar('intencion', 'acuerdo', 2);
      if (corto(c.s, 3)) c.p.votar('pose', 'pulgar-arriba', 2);
      c.p.votar('emocion', 'feliz', 0.8);
    },
  },
  {
    id: 'desacuerdo',
    descripcion: 'No, qué va, ni de coña → niega; con tensión, brazos cruzados',
    // "¡No me lo creo!" empieza por "no" y no es un desacuerdo.
    cuando: (c) => hay(c.s, 'desacuerdo') && !hay(c.s, 'sorpresa') && (alPrincipio(c.s, 'desacuerdo') || corto(c.s, 3)),
    entonces: (c) => {
      c.p.votar('intencion', 'desacuerdo', 2);
      c.p.votar('pose', c.estado.tension > 0.35 ? 'brazos-cruzados' : 'negando', 1.8);
      c.p.sumar('tension', 0.1);
    },
  },
  {
    id: 'llamada',
    descripcion: 'Ven, mira, oye → señala al interlocutor',
    cuando: (c) => hay(c.s, 'llamada') && alPrincipio(c.s, 'llamada'),
    entonces: (c) => {
      c.p.votar('intencion', 'llamada', 2);
      c.p.votar('pose', 'senalando', 2.5);
      c.p.votar('mirada', 'interlocutor', 2);
    },
  },
  {
    id: 'mostrar',
    descripcion: 'Mira esto / adjunta una imagen → enseña el objeto',
    cuando: (c) => hay(c.s, 'mostrar') || c.s.adjuntos.some((a) => a.tipo === 'imagen' || a.tipo === 'video'),
    entonces: (c) => {
      const conImagen = c.s.adjuntos.some((a) => a.tipo === 'imagen' || a.tipo === 'video');
      c.p.votar('intencion', 'mostrar', conImagen ? 3.5 : 1.5);
      c.p.votar('pose', 'mostrando', conImagen ? 3.5 : 1.2);
      if (conImagen) {
        c.p.anadir('props', 'foto');
        c.p.votar('camara', 'personaje-objeto', 2.5);
        c.p.votar('mirada', 'interlocutor', 1);
      }
    },
  },
  {
    id: 'agradecimiento',
    descripcion: 'Gracias → contento',
    cuando: (c) => hay(c.s, 'agradecimiento'),
    entonces: (c) => {
      c.p.votar('intencion', 'agradecimiento', 2);
      c.p.votar('emocion', 'feliz', 1.5);
    },
  },
  {
    id: 'disculpa',
    descripcion: 'Perdón, lo siento → avergonzado',
    cuando: (c) => hay(c.s, 'disculpa'),
    entonces: (c) => {
      c.p.votar('intencion', 'disculpa', 2);
      c.p.votar('emocion', 'avergonzado', 1.5);
      c.p.sumar('tension', -0.15);
    },
  },
  {
    id: 'felicitacion',
    descripcion: 'Felicidades, enhorabuena → celebración',
    cuando: (c) => hay(c.s, 'felicitacion'),
    entonces: (c) => {
      c.p.votar('intencion', 'felicitacion', 3);
      c.p.votar('emocion', 'muy-feliz', 2);
      c.p.votar('pose', 'celebrando', 2);
      c.p.votar('tono', 'festivo', 2);
      c.p.sumar('euforia', 0.3);
    },
  },
  {
    id: 'secreto',
    descripcion: 'Psst, en voz baja, 🤫 → susurro',
    cuando: (c) => hay(c.s, 'secreto'),
    entonces: (c) => {
      c.p.votar('globo', 'susurro', 3.5);
      c.p.votar('movimiento', 'acercarse', 1.5);
    },
  },
  {
    id: 'accion',
    descripcion: '*se sienta* o /me … → narración, no diálogo',
    cuando: (c) => !!c.s.accion,
    entonces: (c) => {
      c.p.votar('globo', 'narracion', 4);
      c.p.votar('intencion', 'accion', 3);
    },
  },
  {
    id: 'pensamiento',
    descripcion: '(texto entre paréntesis) → globo de pensamiento',
    cuando: (c) => c.s.entreParentesis,
    entonces: (c) => {
      c.p.votar('globo', 'pensamiento', 4);
      c.p.votar('emocion', 'pensando', 1);
      c.p.votar('mirada', 'arriba', 1);
    },
  },
  {
    id: 'onomatopeya',
    descripcion: '¡BOOM!, toc toc → sonido dibujado',
    cuando: (c) => c.s.onomatopeya,
    entonces: (c) => {
      c.p.votar('globo', 'sonido', 4);
      if (/b[ou]+m|crash|bang|pum|zas|plaf/.test(c.s.norm)) c.p.anadir('efectos', 'impacto');
    },
  },
  {
    id: 'reaccion-emoji',
    descripcion: 'Solo emojis → reacción (globo pequeño y cara que lo dice todo)',
    cuando: (c) => c.s.soloEmojis,
    entonces: (c) => {
      c.p.votar('intencion', 'reaccion', 3);
      c.p.votar('globo', 'reaccion', 3);
    },
  },
  {
    id: 'reaccion-corta',
    descripcion: 'Mensajes de 1–3 letras ("?", "ok", "!!") → reacción',
    cuando: (c) => c.s.muyCorto && !c.s.soloEmojis,
    entonces: (c) => {
      c.p.votar('globo', 'reaccion', 1.5);
      if (/^\?+$/.test(c.s.texto)) c.p.votar('emocion', 'confundido', 2);
      if (/^!+$/.test(c.s.texto)) c.p.votar('emocion', 'sorprendido', 2);
    },
  },
];

const gestos: R[] = [
  {
    id: 'encogerse',
    descripcion: 'Ni idea, yo qué sé, 🤷 → encoge los hombros',
    cuando: (c) => hay(c.s, 'encogerse'),
    entonces: (c) => {
      c.p.votar('pose', 'encogiendo-hombros', 3);
      c.p.votar('emocion', 'confundido', 1);
    },
  },
  {
    id: 'turno',
    descripcion: '¡Yo!, me apunto, 🙋 → levanta la mano',
    cuando: (c) => hay(c.s, 'turno') && corto(c.s, 5) && (alPrincipio(c.s, 'turno') || c.s.emojis.some((e) => e.startsWith('🙋') || e === '✋')),
    entonces: (c) => c.p.votar('pose', 'levantando-mano', 2.5),
  },
  {
    id: 'senalar',
    descripcion: 'Tú, ese, ahí, 👉 → señala (indicio débil)',
    cuando: (c) => hay(c.s, 'senalar'),
    entonces: (c) => c.p.votar('pose', 'senalando', c.s.emojis.includes('👉') ? 2.5 : 0.8),
  },
  {
    id: 'escribir',
    descripcion: 'Lo apunto, tomo nota → escribe en una libreta',
    cuando: (c) => hay(c.s, 'escribir'),
    entonces: (c) => c.p.votar('pose', 'escribiendo', 2.5),
  },
  {
    id: 'movil',
    descripcion: 'WhatsApp, te llamo, 📱 → con el móvil',
    cuando: (c) => hay(c.s, 'movil'),
    entonces: (c) => c.p.votar('pose', 'usando-movil', 2),
  },
  {
    id: 'ordenador',
    descripcion: 'Programando, el servidor, 💻 → con el portátil',
    cuando: (c) => hay(c.s, 'ordenador'),
    entonces: (c) => c.p.votar('pose', 'usando-ordenador', 1.6),
  },
  {
    id: 'prisa',
    descripcion: 'Corre, llego tarde, 🏃 → corriendo',
    cuando: (c) => hay(c.s, 'prisa'),
    entonces: (c) => {
      c.p.votar('pose', 'corriendo', 2.5);
      c.p.sumar('intensidad', 0.15);
    },
  },
  {
    id: 'celebrar',
    descripcion: '¡Ganamos!, aprobé, 🎉 → celebrando',
    cuando: (c) => hay(c.s, 'celebrar'),
    entonces: (c) => {
      c.p.votar('pose', 'celebrando', 2.5);
      c.p.votar('emocion', 'emocionado', 1.5);
      c.p.votar('tono', 'festivo', 1.5);
      c.p.sumar('euforia', 0.25);
    },
  },
  {
    id: 'bailar',
    descripcion: 'A bailar, 💃 → bailando',
    cuando: (c) => hay(c.s, 'bailar'),
    entonces: (c) => c.p.votar('pose', 'bailando', 2.5),
  },
  {
    id: 'sentarse',
    descripcion: 'Sentado, en el sofá → sentado',
    cuando: (c) => hay(c.s, 'sentarse'),
    entonces: (c) => c.p.votar('pose', 'sentado', 2),
  },
  {
    id: 'props-mencionados',
    descripcion: 'Los objetos que se nombran pueden aparecer en la escena',
    cuando: (c) => c.s.props.length > 0,
    entonces: (c) => {
      for (const prop of c.s.props) c.p.anadir('props', prop);
    },
  },
];

const lugar: R[] = [
  {
    id: 'desplazamiento',
    descripcion: '"Voy a la cafetería" → camina; el escenario cambia en la viñeta siguiente',
    // En un relato largo ("…cuando llego a la oficina…") no se va a ningún sitio.
    cuando: (c) => !!c.s.destino && c.s.longitud <= 90,
    entonces: (c) => {
      c.p.votar('intencion', 'desplazamiento', 3);
      c.p.votar('pose', 'caminando', 2.2);
      c.p.votar('destino', c.s.destino!, 3);
    },
  },
  {
    id: 'tema',
    descripcion: 'Palabras de un tema (trabajo, playa…) apuntan a un escenario',
    cuando: (c) => Object.keys(c.s.escenarios).length > 0,
    entonces: (c) => {
      for (const [esc, puntos] of Object.entries(c.s.escenarios)) c.p.votar('escenario', esc, puntos);
    },
  },
];

const interlocutor: R[] = [
  {
    id: 'mencion',
    descripcion: 'Nombrar a alguien presente → le habla a él',
    cuando: (c) => c.s.menciones.length > 0,
    entonces: (c) => {
      for (const p of c.presentes) {
        if (p.id === c.m.autorId) continue;
        const n = p.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (c.s.menciones.some((m) => n === m || n.startsWith(m) || m.startsWith(n.split(' ')[0]!))) c.p.votar('destinatario', p.id, 3);
      }
    },
  },
  {
    id: 'responde-al-anterior',
    descripcion: 'Sin nombre, se contesta a quien habló antes',
    cuando: (c) => !!c.anterior && c.anterior.autorId !== c.m.autorId,
    entonces: (c) => c.p.votar('destinatario', c.anterior!.autorId, 1),
  },
  {
    id: 'sigue-con-el-mismo',
    descripcion: 'Si vuelve a hablar, sigue dirigiéndose a quien se dirigía',
    cuando: (c) => !!c.anterior && c.anterior.autorId === c.m.autorId && !!c.estado.interlocutores[c.m.autorId],
    entonces: (c) => c.p.votar('destinatario', c.estado.interlocutores[c.m.autorId], 0.8),
  },
  {
    id: 'contagio',
    descripcion: 'Una risa o un grito del otro contagia un poco (memoria de escena)',
    cuando: (c) => !!c.anterior && c.anterior.autorId !== c.m.autorId && c.anterior.interpretacion.intensidad > 0.6,
    entonces: (c) => {
      const e = c.anterior!.interpretacion.emocion;
      if (e === 'riendo' || e === 'divertido') c.p.votar('emocion', 'divertido', 0.8);
      if (e === 'furioso' || e === 'enfadado') c.p.votar('emocion', 'preocupado', 0.6);
      if (e === 'sorprendido') c.p.votar('emocion', 'confundido', 0.4);
    },
  },
];

/* =========================================================== FASE 2 ====== */

const derivadas: R[] = [
  {
    id: 'pose-por-emocion',
    fase: 2,
    descripcion: 'Si no hay un gesto claro, la pose que pega con la emoción',
    cuando: (c) => !!c.p.lider('emocion'),
    entonces: (c) => {
      const exp = c.catalogo.expresion(c.p.lider('emocion'));
      if (exp.pose) c.p.votar('pose', exp.pose, 1.2 + exp.activacion * 0.5);
    },
  },
  {
    id: 'pose-hablando',
    fase: 2,
    descripcion: 'Quien habla mucho gesticula',
    cuando: (c) => c.s.palabras.length >= 6,
    entonces: (c) => c.p.votar('pose', c.s.palabras.length > 22 ? 'explicando' : 'hablando', 1),
  },
  {
    id: 'monologo',
    fase: 2,
    descripcion: 'Un párrafo largo se cuenta: pose de explicar (los gestos de palabras sueltas de un relato no cuentan)',
    cuando: (c) => c.s.palabras.length > 22,
    entonces: (c) => c.p.votar('pose', 'explicando', 3.2),
  },
  {
    id: 'pose-base',
    fase: 2,
    descripcion: 'Si nadie propone nada, de pie',
    cuando: () => true,
    entonces: (c) => c.p.votar('pose', 'de-pie', 0.3),
  },
  {
    id: 'mirada-por-pose-y-emocion',
    fase: 2,
    descripcion: 'Pensar mira arriba, la tristeza abajo, la vergüenza aparta…',
    cuando: () => true,
    entonces: (c) => {
      const pose = c.catalogo.poses.buscar(c.p.lider('pose'));
      const exp = c.catalogo.expresion(c.p.lider('emocion'));
      if (pose?.mirada) c.p.votar('mirada', pose.mirada, 1.5);
      if (exp.mirada) c.p.votar('mirada', exp.mirada, 1.2);
      c.p.votar('mirada', 'interlocutor', 0.5);
    },
  },
  {
    id: 'camara-reaccion-fuerte',
    fase: 2,
    descripcion: 'Emoción muy activada e intensa → primer plano (o primerísimo)',
    cuando: (c) => {
      const exp = c.catalogo.expresion(c.p.lider('emocion'));
      // Un primer plano es para una reacción, no para un párrafo.
      return intensidadDe(c) >= 0.75 && exp.activacion >= 0.75 && !exp.tags.includes('humor') && c.s.longitud <= 70;
    },
    entonces: (c) => {
      c.p.votar('camara', intensidadDe(c) >= 0.93 ? 'primerisimo' : 'primer-plano', 3);
    },
  },
  {
    id: 'camara-reaccion-emoji',
    fase: 2,
    descripcion: 'Una reacción con emoji se ve en primer plano',
    cuando: (c) => c.s.soloEmojis && c.p.lider('emocion') !== undefined,
    entonces: (c) => c.p.votar('camara', 'primer-plano', 2),
  },
  {
    id: 'globo-grito',
    fase: 2,
    descripcion: 'Emoción muy activada con exclamaciones → globo de grito',
    cuando: (c) => c.s.exclamaciones >= 2 && c.catalogo.expresion(c.p.lider('emocion')).activacion >= 0.75,
    entonces: (c) => c.p.votar('globo', 'grito', 2),
  },
  {
    id: 'globo-base',
    fase: 2,
    descripcion: 'Por defecto, globo de diálogo',
    cuando: () => true,
    entonces: (c) => c.p.votar('globo', 'dialogo', 1),
  },
  {
    id: 'efectos-de-emocion',
    fase: 2,
    descripcion: 'Efectos de la expresión si la intensidad pasa su umbral',
    cuando: () => true,
    entonces: (c) => {
      const exp = c.catalogo.expresion(c.p.lider('emocion'));
      const i = intensidadDe(c);
      for (const id of exp.efectos ?? []) {
        const ef = c.catalogo.efectos.buscar(id);
        if (ef && i >= ef.umbral) c.p.anadir('efectos', id);
      }
      const pose = c.catalogo.poses.buscar(c.p.lider('pose'));
      for (const id of pose?.efectos ?? []) c.p.anadir('efectos', id);
    },
  },
  {
    id: 'tono-de-emocion',
    fase: 2,
    descripcion: 'El tono de la escena sigue a la emoción',
    cuando: (c) => !!c.catalogo.expresion(c.p.lider('emocion')).tono,
    entonces: (c) => c.p.votar('tono', c.catalogo.expresion(c.p.lider('emocion')).tono!, 1),
  },
  {
    id: 'vineta-propia',
    fase: 2,
    descripcion: 'Momentos fuertes (reacción, enseñar algo, irse) piden viñeta propia',
    cuando: (c) =>
      intensidadDe(c) >= 0.85 ||
      c.p.lider('intencion') === 'mostrar' ||
      c.p.lider('camara') === 'primerisimo' ||
      (c.p.lider('camara') === 'primer-plano' && intensidadDe(c) >= 0.7),
    entonces: (c) => c.p.votar('vinetaPropia', 'si', 2),
  },
];

/** Intensidad provisional (la misma fórmula que usa el intérprete al cerrar). */
export function intensidadDe(c: CtxMensaje): number {
  return Math.max(0.1, Math.min(1, 0.35 + c.p.suma('intensidad')));
}

export const REGLAS_BASE: readonly R[] = [...emociones, ...intenciones, ...gestos, ...lugar, ...interlocutor, ...derivadas];
