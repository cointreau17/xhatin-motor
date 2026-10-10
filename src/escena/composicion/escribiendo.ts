/**
 * «Está escribiendo…» como viñeta viva: mientras alguien teclea, al final de
 * la tira sale su personaje con el móvil, tecleando, y un bocadillo de
 * pensamiento con puntos suspensivos. No es parte de la conversación —el
 * director no la conoce—: la pinta quien enseña la tira mientras dura, con el
 * mismo compositor que las demás.
 */

import type { PersonajeEnEscena, Vineta } from '../modelo.js';
import { identidadDe } from '../personaje/identidad.js';

/** Alguien que escribe: lo que se sabe de él en la conversación. */
export interface QuienEscribe {
  id: string;
  nombre?: string;
  /** Código HilarAvatar; sin él, su cara de respaldo. */
  avatar?: string | null;
}

/** Más no caben con el móvil en la mano en una viñeta cuadrada. */
const CABEN = 3;
const SITIOS: Record<number, number[]> = { 1: [0.5], 2: [0.3, 0.7], 3: [0.2, 0.5, 0.8] };

/**
 * La viñeta de quienes están escribiendo, o null si no hay nadie. El
 * escenario, el de la última viñeta de la tira: siguen donde estaban.
 */
export function vinetaEscribiendo(quienes: readonly QuienEscribe[], escenario = 'neutro'): Vineta | null {
  const salen = quienes.slice(0, CABEN);
  if (!salen.length) return null;
  const xs = SITIOS[salen.length]!;
  const personajes: PersonajeEnEscena[] = salen.map((q, i) => ({
    id: q.id,
    nombre: q.nombre || 'Alguien',
    identidad: identidadDe(q.avatar, q.id),
    x: xs[i]!,
    profundidad: 0,
    pose: 'usando-movil',
    expresion: 'pensando',
    intensidad: 0.3,
    mirada: { tipo: 'objeto' },
    // Mirando hacia el centro, como si fueran a contestarse.
    orientacion: xs[i]! > 0.5 ? 'izquierda' : 'derecha',
    habla: false,
    propEnMano: 'movil',
    animaciones: ['teclea'],
  }));
  return {
    id: 'escribiendo',
    version: 1,
    formato: 'cuadrada',
    escenario,
    camara: { plano: salen.length > 1 ? 'grupo' : 'medio', foco: salen.map((q) => q.id) },
    personajes,
    props: [],
    globos: salen.map((q, i) => ({
      id: `escribe-${q.id}`,
      mensajeId: '',
      autorId: q.id,
      autorNombre: q.nombre || 'Alguien',
      tipo: 'pensamiento',
      texto: '…',
      orden: i,
      intensidad: 0.3,
    })),
    efectos: [],
    mensajes: [],
    transicion: 'fundido',
    abreEscena: false,
    notas: ['escribiendo'],
  };
}

/** «Ana está escribiendo…», «Ana y Beto están escribiendo…»: para quien no ve la viñeta. */
export function textoEscribiendo(quienes: readonly QuienEscribe[]): string {
  const nombres = quienes.map((q) => q.nombre || 'Alguien');
  if (!nombres.length) return '';
  if (nombres.length === 1) return `${nombres[0]} está escribiendo…`;
  const lista = nombres.length > 3 ? [...nombres.slice(0, 2), `${nombres.length - 2} más`] : nombres;
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]} están escribiendo…`;
}
