/**
 * Reglas de ESCENA: cómo se comportan los personajes entre sí.
 *
 * Las reglas de mensaje (interpretacion/) dicen qué significa lo que alguien
 * escribe. Estas deciden lo que hace el resto de la viñeta con eso:
 *
 *   IF A habla a B AND B está THEN A mira a B, B mira a A
 *   IF A se ríe THEN los que escuchan sonríen
 *   IF A grita a B THEN B se preocupa (o se enfada, si la cosa ya estaba tensa)
 *   IF alguien entra THEN los demás se giran hacia él
 *
 * Trabajan sobre la viñeta en borrador (`ctx.v`) y la modifican. La cámara
 * sí se vota (varias reglas opinan sobre el encuadre).
 */

import type { Catalogo } from '../catalogo/catalogo.js';
import type { EstadoEscena, Interpretacion, Mirada, PersonajeEnEscena, TipoPlano, Vineta } from '../modelo.js';
import type { ContextoConPizarra, Regla } from '../interpretacion/reglas.js';

export interface CtxEscena extends ContextoConPizarra {
  v: Vineta;
  estado: EstadoEscena;
  catalogo: Catalogo;
  /** Quién acaba de hablar (o `null` si la viñeta cambia por presencia). */
  hablanteId: string | null;
  interp: Interpretacion | null;
  /** Última interpretación de cada personaje DENTRO de esta viñeta. */
  enVineta: Record<string, Interpretacion>;
  /** Viñeta anterior, si la hay (para no repetir efectos o planos). */
  anterior?: Vineta;
}

type R = Regla<CtxEscena>;

/** Poses que se mantienen aunque el personaje deje de hablar. */
export const POSES_PERSISTENTES = new Set([
  'sentado',
  'durmiendo',
  'usando-movil',
  'usando-ordenador',
  'brazos-cruzados',
  'manos-en-cintura',
  'triste',
  'cansado',
  'bebiendo',
  'escribiendo',
  'avergonzado',
]);

const pj = (c: CtxEscena, id: string | null | undefined): PersonajeEnEscena | undefined =>
  id ? c.v.personajes.find((p) => p.id === id) : undefined;

const hablante = (c: CtxEscena) => pj(c, c.hablanteId);

function mirarA(p: PersonajeEnEscena, objetivo: string): void {
  p.mirada = { tipo: 'personaje', objetivo };
}

const mirandoAlguien = (m: Mirada) => m.tipo === 'interlocutor' || m.tipo === 'personaje';

/** Reacción de quien escucha a una emoción (valencia/activación + casos con nombre). */
function reaccion(emocionHablante: string, c: CtxEscena, aludido: boolean): string | null {
  const exp = c.catalogo.expresion(emocionHablante);
  switch (exp.id) {
    case 'riendo':
    case 'divertido':
      return 'divertido';
    case 'furioso':
    case 'enfadado':
      return aludido ? (c.estado.tension > 0.6 ? 'enfadado' : 'preocupado') : 'preocupado';
    case 'gritando':
      return aludido ? 'sorprendido' : 'confundido';
    case 'sorprendido':
      return 'confundido';
    case 'triste':
    case 'llorando':
      return 'preocupado';
    case 'enamorado':
      return aludido ? 'avergonzado' : 'divertido';
    case 'sarcastico':
      return aludido ? 'sospechando' : 'divertido';
    case 'asustado':
      return 'preocupado';
    case 'muy-feliz':
    case 'emocionado':
      return 'feliz';
    case 'cansado':
    case 'aburrido':
    case 'dormido':
      return null;
  }
  if (exp.valencia > 0.4) return 'feliz';
  if (exp.valencia < -0.4) return 'preocupado';
  return null;
}

export const REGLAS_ESCENA: readonly R[] = [
  {
    id: 'mirada-conversacion',
    descripcion: 'IF A habla a B AND B está THEN A mira a B y B mira a A',
    cuando: (c) => {
      const h = hablante(c);
      return !!h && !!c.interp?.destinatarioId && !!pj(c, c.interp.destinatarioId) && mirandoAlguien(h.mirada);
    },
    entonces: (c) => {
      const h = hablante(c)!;
      const b = pj(c, c.interp!.destinatarioId)!;
      mirarA(h, b.id);
      if (mirandoAlguien(b.mirada) || b.mirada.tipo === 'frente') mirarA(b, h.id);
    },
  },
  {
    id: 'hablar-al-grupo',
    descripcion: 'Sin destinatario, quien habla mira al personaje más cercano (o a cámara si está solo)',
    cuando: (c) => {
      const h = hablante(c);
      return !!h && !c.interp?.destinatarioId && h.mirada.tipo === 'interlocutor';
    },
    entonces: (c) => {
      const h = hablante(c)!;
      const otros = c.v.personajes.filter((p) => p.id !== h.id);
      if (!otros.length) {
        h.mirada = { tipo: 'espectador' };
        return;
      }
      const cercano = otros.reduce((a, b) => (Math.abs(a.x - h.x) <= Math.abs(b.x - h.x) ? a : b));
      mirarA(h, cercano.id);
    },
  },
  {
    id: 'oyentes-miran-al-que-habla',
    descripcion: 'Los que escuchan se giran hacia quien acaba de hablar',
    cuando: (c) => !!hablante(c),
    entonces: (c) => {
      const h = hablante(c)!;
      for (const p of c.v.personajes) {
        if (p.id === h.id) continue;
        if (p.pose === 'durmiendo') continue;
        // Quien está con el móvil o pensando sigue a lo suyo, salvo que le hablen.
        const aludido = c.interp?.destinatarioId === p.id;
        if (!aludido && (p.mirada.tipo === 'objeto' || p.mirada.tipo === 'arriba' || p.mirada.tipo === 'abajo')) continue;
        mirarA(p, h.id);
      }
    },
  },
  {
    id: 'oyentes-dejan-el-gesto',
    descripcion: 'Quien viene de otra viñeta suelta el gesto (saludar, señalar…) y escucha; quien habló en esta lo conserva',
    cuando: (c) => !!hablante(c),
    entonces: (c) => {
      for (const p of c.v.personajes) {
        if (p.id === c.hablanteId) continue;
        // Solo mueve la boca el último que habla.
        p.habla = false;
        if (c.enVineta[p.id]) continue;
        if (POSES_PERSISTENTES.has(p.pose)) continue;
        if (p.pose === 'sentado-hablando') {
          p.pose = 'sentado';
          continue;
        }
        p.pose = p.animaciones.includes('entrada') ? 'caminando' : 'mirando';
        p.propEnMano = undefined;
        p.imagenEnMano = undefined;
      }
    },
  },
  {
    id: 'reaccion-oyentes',
    descripcion: 'Los que escuchan reaccionan a la emoción de quien habla',
    cuando: (c) => !!hablante(c) && !!c.interp,
    entonces: (c) => {
      const h = hablante(c)!;
      for (const p of c.v.personajes) {
        if (p.id === h.id || p.pose === 'durmiendo') continue;
        // Quien ya ha hablado en esta viñeta con una emoción fuerte la conserva.
        const propia = c.enVineta[p.id];
        if (propia && propia.intensidad >= 0.6) continue;
        const aludido = c.interp!.destinatarioId === p.id || c.v.personajes.length === 2;
        const r = reaccion(h.expresion, c, aludido);
        if (r) {
          p.expresion = r;
          p.intensidad = Math.min(0.6, h.intensidad * 0.7);
        } else if (!propia) {
          p.expresion = 'neutral';
          p.intensidad = 0.2;
        }
      }
    },
  },
  {
    id: 'bienvenida',
    descripcion: 'Cuando alguien entra, los demás se giran hacia él',
    cuando: (c) => c.v.personajes.some((p) => p.animaciones.includes('entrada')),
    entonces: (c) => {
      const nuevo = c.v.personajes.find((p) => p.animaciones.includes('entrada'))!;
      for (const p of c.v.personajes) {
        if (p.id === nuevo.id || p.id === c.hablanteId || p.pose === 'durmiendo') continue;
        mirarA(p, nuevo.id);
        if (p.expresion === 'neutral') p.expresion = 'feliz';
      }
    },
  },
  {
    id: 'acercarse',
    descripcion: 'Susurrar, abrazar o encararse acerca al interlocutor; el miedo aleja',
    cuando: (c) => !!hablante(c) && !!c.interp && (!!c.interp.movimiento || c.interp.emocion === 'furioso' || c.interp.emocion === 'asustado'),
    entonces: (c) => {
      const h = hablante(c)!;
      const est = c.estado.personajes[h.id];
      if (!est) return;
      const m = c.interp!.movimiento;
      if (m === 'acercarse' || c.interp!.emocion === 'furioso') est.cercania = Math.min(2, est.cercania + 1);
      if (m === 'alejarse' || c.interp!.emocion === 'asustado') est.cercania = Math.max(-1, est.cercania - 1);
    },
  },
  {
    id: 'orientacion',
    descripcion: 'Cada uno se orienta hacia lo que mira; quien no mira a nadie, hacia el centro del grupo',
    cuando: () => true,
    entonces: (c) => {
      const centro = c.v.personajes.reduce((s, p) => s + p.x, 0) / Math.max(1, c.v.personajes.length);
      for (const p of c.v.personajes) {
        if (p.entra) {
          p.orientacion = p.entra === 'derecha' ? 'izquierda' : 'derecha';
          continue;
        }
        if (p.sale) {
          p.orientacion = p.sale;
          continue;
        }
        const obj = p.mirada.objetivo ? pj(c, p.mirada.objetivo) : undefined;
        if (obj && obj.id !== p.id) {
          p.orientacion = obj.x >= p.x ? 'derecha' : 'izquierda';
        } else if (p.mirada.tipo === 'apartar') {
          p.orientacion = p.x >= centro ? 'derecha' : 'izquierda';
        } else if (c.v.personajes.length > 1) {
          p.orientacion = centro >= p.x ? 'derecha' : 'izquierda';
        }
      }
    },
  },

  /* ------------------------------------------------------------- cámara -- */
  {
    id: 'camara-por-reparto',
    descripcion: 'Uno: plano medio. Dos: plano de dos. Tres o más: grupo. Muchos: general',
    cuando: () => true,
    entonces: (c) => {
      const n = c.v.personajes.length;
      const plano: TipoPlano = n <= 1 ? 'medio' : n === 2 ? 'dos' : n <= 4 ? 'grupo' : 'general';
      c.p.votar('camara', plano, 1);
    },
  },
  {
    id: 'camara-plano-de-situacion',
    descripcion: 'La primera viñeta de una escena es un plano general (situar al lector)',
    cuando: (c) => c.v.abreEscena && c.v.mensajes.length <= 1 && c.v.personajes.length >= 2,
    entonces: (c) => c.p.votar('camara', c.v.personajes.length >= 3 ? 'general' : 'grupo', 2.2),
  },
  {
    id: 'camara-propuesta-del-mensaje',
    descripcion: 'Si el mensaje pide un encuadre (primer plano, objeto) y la viñeta es suya, se le hace caso',
    cuando: (c) => !!c.interp?.camara && c.v.mensajes.length === 1,
    entonces: (c) => c.p.votar('camara', c.interp!.camara!, 3),
  },
  {
    id: 'camara-tension',
    descripcion: 'Discusión tensa entre dos: plano holandés (inclinado)',
    // Una viñeta que ya era tensa no se "destensa" por su último mensaje.
    cuando: (c) => (c.estado.tension >= 0.55 || (c.v.ambiente === 'tension' && c.estado.tension >= 0.25)) && c.v.personajes.length === 2,
    entonces: (c) => c.p.votar('camara', 'lateral', 1.6),
  },
  {
    id: 'camara-varias-voces',
    descripcion: 'Si en la viñeta hablan varios, el encuadre tiene que abarcarlos a todos',
    cuando: (c) => new Set(c.v.globos.map((g) => g.autorId).filter(Boolean)).size >= 2,
    entonces: (c) => c.p.votar('camara', c.v.personajes.length > 2 ? 'grupo' : 'dos', 2.5),
  },
];
