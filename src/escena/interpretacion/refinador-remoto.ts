/**
 * Un `Refinador` que pide una segunda opinión a un servicio remoto (en Diario
 * Hilario, Gemini a través de dhcore: `POST /xhatin/interpretar`).
 *
 * La viñeta ya está pintada con las reglas cuando esto contesta; si el
 * servicio lee el mensaje de otra forma (ironía, sarcasmo, el contexto del
 * mensaje anterior), el director recompone. Si falla, tarda demasiado o no
 * hay IA configurada, se queda lo de las reglas: nunca rompe el chat.
 *
 * Sin Angular y sin DhPortero: la URL y las cabeceras las pone quien lo crea,
 * así que vale igual en el remote, en el laboratorio o en un test.
 */

import type { Intencion, Interpretacion, LecturaIA, MensajeEntrada, TipoGlobo, Tono } from '../modelo.js';
import type { ContextoInterpretacion, Refinador } from './interprete.js';

/** Los valores que puede devolver el servicio, además de las expresiones del catálogo. */
export const GLOBOS: readonly TipoGlobo[] = ['dialogo', 'pregunta', 'pensamiento', 'grito', 'susurro', 'narracion', 'sonido', 'reaccion'];
export const TONOS: readonly Tono[] = ['neutro', 'comico', 'tenso', 'tierno', 'triste', 'festivo'];
export const INTENCIONES: readonly Intencion[] = [
  'afirmacion', 'pregunta', 'exclamacion', 'saludo', 'despedida', 'llamada', 'acuerdo', 'desacuerdo',
  'agradecimiento', 'disculpa', 'felicitacion', 'insulto', 'risa', 'reaccion', 'desplazamiento', 'mostrar', 'duda', 'accion',
];

/** Por debajo de esto, una diferencia de intensidad no merece recomponer. */
const UMBRAL_INTENSIDAD = 0.2;

export interface OpcionesRefinadorRemoto {
  /**
   * Endpoint que recibe `{ mensajeId, texto, anterior, reglas, opciones }`.
   * Con `mensajeId`, dhcore guarda la lectura en el mensaje (si lo pide su
   * autor) y desde entonces viaja con él: ver `MensajeEntrada.lectura`.
   */
  url: string;
  /** Cabeceras de cada petición (p. ej. el token). Se piden en cada llamada: el token caduca. */
  cabeceras?: () => Promise<Record<string, string>>;
  /** Milisegundos antes de rendirse. Por defecto, 8 s. */
  tiempoMax?: number;
  /** Para los tests. Por defecto, el `fetch` global. */
  fetch?: typeof fetch;
}

export function refinadorRemoto(op: OpcionesRefinadorRemoto): Refinador {
  const pedir = op.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  /** Tras un 503 (sin IA configurada) no tiene sentido seguir preguntando. */
  let apagado = false;

  return {
    nombre: 'remoto',

    async refinar(mensaje: MensajeEntrada, ctx: ContextoInterpretacion, base: Interpretacion) {
      // Sin letras (solo emojis, un adjunto) las reglas ya lo leen bien.
      if (apagado || !/\p{L}/u.test(mensaje.texto ?? '')) return null;

      const emociones = ctx.catalogo.expresiones.listar().map((e) => e.id);
      const cuerpo = {
        mensajeId: mensaje.id,
        texto: mensaje.texto,
        anterior: ctx.anterior?.texto,
        reglas: { emocion: base.emocion, intensidad: base.intensidad, globo: base.globo, tono: base.tono, intencion: base.intencion },
        opciones: { emociones, globos: GLOBOS, tonos: TONOS, intenciones: INTENCIONES },
      };

      const corte = new AbortController();
      const reloj = setTimeout(() => corte.abort(), op.tiempoMax ?? 8000);
      let respuesta: Response;
      try {
        respuesta = await pedir(op.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await op.cabeceras?.()) },
          body: JSON.stringify(cuerpo),
          signal: corte.signal,
        });
      } finally {
        clearTimeout(reloj);
      }

      if (respuesta.status === 503) {
        apagado = true;
        return null;
      }
      if (!respuesta.ok) return null;

      const lectura = validarLectura(await respuesta.json(), emociones);
      return lectura ? parcheDeLectura(base, lectura, ctx) : null;
    },
  };
}

/**
 * Lo que llega de fuera no se usa sin mirar: solo valores que se saben
 * dibujar. Vale para la respuesta del servicio y para la lectura guardada en
 * un mensaje, que puede venir de otra versión del catálogo.
 */
export function validarLectura(datos: unknown, emociones: readonly string[]): LecturaIA | null {
  if (!datos || typeof datos !== 'object') return null;
  const d = datos as Record<string, unknown>;
  const de = <T extends string>(v: unknown, lista: readonly T[]) => (typeof v === 'string' && lista.includes(v as T) ? (v as T) : null);

  const emocion = de(d['emocion'], emociones);
  const globo = de(d['globo'], GLOBOS);
  const tono = de(d['tono'], TONOS);
  const intencion = de(d['intencion'], INTENCIONES);
  const intensidad = typeof d['intensidad'] === 'number' && Number.isFinite(d['intensidad']) ? Math.min(1, Math.max(0, d['intensidad'])) : null;

  return emocion && globo && tono && intencion && intensidad !== null ? { emocion, globo, tono, intencion, intensidad } : null;
}

/**
 * Lo que de verdad cambia respecto a las reglas, o `null` si nada merece
 * recomponer la viñeta.
 *
 * Solo cuentan la cara y el bocadillo: son lo que se ve. Tono e intención
 * acompañan a ese cambio, pero por sí solos no mueven nada en el dibujo, y
 * un matiz de intensidad tampoco.
 */
export function parcheDeLectura(base: Interpretacion, l: LecturaIA, ctx: ContextoInterpretacion): Partial<Interpretacion> | null {
  const otraCara = l.emocion !== base.emocion;
  const otroGlobo = l.globo !== base.globo;
  const otraIntensidad = Math.abs(l.intensidad - base.intensidad) >= UMBRAL_INTENSIDAD;
  if (!otraCara && !otroGlobo && !otraIntensidad) return null;

  const parche: Partial<Interpretacion> = { intensidad: l.intensidad, tono: l.tono, intencion: l.intencion };
  if (otroGlobo) parche.globo = l.globo;

  if (otraCara) {
    parche.emocion = l.emocion;
    // La pose y la cámara que eligieron las reglas iban con la emoción de
    // antes: una pose de reírse con cara de sarcasmo no cuadra. Si la pose
    // venía de la emoción, se cambia por la de la nueva; si era un gesto
    // (saludar, señalar), se respeta. La cámara y los efectos los vuelve a
    // decidir el director.
    const antes = ctx.catalogo.expresion(base.emocion);
    const ahora = ctx.catalogo.expresion(l.emocion);
    if (base.pose === 'de-pie' || base.pose === antes.pose) parche.pose = ahora.pose ?? 'de-pie';
    parche.camara = undefined;
    parche.efectos = [];
  }

  return parche;
}
