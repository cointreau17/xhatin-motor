/**
 * La capa entre el mensaje y el dibujo.
 *
 *   Message → Semantic interpretation → Scene instruction → Renderer
 *             ^^^^^^^^^^^^^^^^^^^^^^^
 *
 * `Interprete` es una interfaz de un método. La implementación de serie
 * (`InterpreteReglas`) usa señales + reglas y es síncrona, determinista y
 * gratis: la tira se dibuja al instante.
 *
 * Para meter un modelo de IA no hay que tocar el director ni el renderer:
 * - o se implementa `Interprete` entero con el modelo,
 * - o (mejor) se añade un `Refinador`: recibe la interpretación de las
 *   reglas y devuelve solo lo que quiere cambiar, de forma asíncrona. El
 *   director pinta primero lo de las reglas y, si el refinador contesta a
 *   tiempo, rehace la viñeta abierta. Ver `Director.refinadores`.
 */

import type { Catalogo } from '../catalogo/catalogo.js';
import type { EstadoEscena, Interpretacion, Intencion, MensajeEntrada, TipoGlobo, TipoMirada, TipoPlano, Tono } from '../modelo.js';
import { REGLAS_BASE, intensidadDe, type CtxMensaje } from './reglas-base.js';
import { MotorReglas, Pizarra } from './reglas.js';
import { extraerSenales, type Senales } from './senales.js';

export interface ContextoInterpretacion {
  estado: EstadoEscena;
  catalogo: Catalogo;
  presentes: ReadonlyArray<{ id: string; nombre: string }>;
  anterior?: { autorId: string; texto: string; interpretacion: Interpretacion };
}

export interface Interprete {
  interpretar(mensaje: MensajeEntrada, ctx: ContextoInterpretacion): Interpretacion;
}

/** Mejora asíncrona de una interpretación (p. ej. un modelo de lenguaje). */
export interface Refinador {
  nombre: string;
  /** Devuelve los campos a cambiar, o `null` si no aporta nada. */
  refinar(mensaje: MensajeEntrada, ctx: ContextoInterpretacion, base: Interpretacion): Promise<Partial<Interpretacion> | null>;
}

/** Lo que ve el laboratorio: la interpretación y cómo se llegó a ella. */
export interface DetalleInterpretacion {
  interpretacion: Interpretacion;
  senales: Senales;
  votos: Record<string, Record<string, number>>;
}

export class InterpreteReglas implements Interprete {
  constructor(readonly motor: MotorReglas<CtxMensaje> = new MotorReglas<CtxMensaje>(REGLAS_BASE)) {}

  interpretar(mensaje: MensajeEntrada, ctx: ContextoInterpretacion): Interpretacion {
    return this.interpretarConDetalle(mensaje, ctx).interpretacion;
  }

  interpretarConDetalle(mensaje: MensajeEntrada, ctx: ContextoInterpretacion): DetalleInterpretacion {
    const s = extraerSenales(
      mensaje.texto,
      ctx.catalogo,
      ctx.presentes.map((p) => p.nombre),
      mensaje.adjuntos ?? [],
    );
    const p = new Pizarra();
    const c: CtxMensaje = { p, m: mensaje, s, estado: ctx.estado, catalogo: ctx.catalogo, presentes: ctx.presentes, anterior: ctx.anterior };

    const traza = [...this.motor.ejecutar(c, 1), ...this.motor.ejecutar(c, 2)];

    const cat = ctx.catalogo;
    let emocion = cat.expresion(p.lider('emocion') ?? 'neutral').id;
    let pose = cat.poses.existe(p.lider('pose')) ? p.lider('pose')! : 'de-pie';
    // Una pose que impone expresión (dormir) manda sobre la cara.
    const defPose = cat.poses.obtener(pose);
    if (defPose.expresion && !mensaje.expresion) emocion = cat.expresion(defPose.expresion).id;

    const escenarioLider = p.lider('escenario');
    const interpretacion: Interpretacion = {
      intencion: (p.lider('intencion') as Intencion) ?? (s.esPregunta ? 'pregunta' : 'afirmacion'),
      emocion,
      intensidad: intensidadDe(c),
      pose,
      mirada: { tipo: (p.lider('mirada') as TipoMirada) ?? 'interlocutor' },
      camara: p.lider('camara') as TipoPlano | undefined,
      globo: (p.lider('globo') as TipoGlobo) ?? 'dialogo',
      efectos: p.lista('efectos').filter((id) => cat.efectos.existe(id)),
      props: p.lista('props').filter((id) => cat.props.existe(id)),
      escenario: escenarioLider
        ? { id: escenarioLider, confianza: Math.min(1, p.pesoDe('escenario', escenarioLider) / 2), motivo: (s.escenarios[escenarioLider] ?? 0) + ' punto(s) de tema' }
        : undefined,
      destino: p.lider('destino'),
      destinatarioId: p.lider('destinatario'),
      tono: (p.lider('tono') as Tono) ?? 'neutro',
      movimiento: p.lider('movimiento') as Interpretacion['movimiento'],
      vinetaPropia: p.lider('vinetaPropia') === 'si',
      confianza: {
        emocion: p.confianza('emocion'),
        pose: p.confianza('pose'),
        camara: p.confianza('camara'),
        escenario: p.confianza('escenario'),
        destinatarioId: p.confianza('destinatario'),
      },
      traza,
    };
    // Cambios de tensión/euforia propuestos por las reglas, para el director.
    (interpretacion as InterpretacionConDeltas).deltas = { tension: p.suma('tension'), euforia: p.suma('euforia') };

    return { interpretacion, senales: s, votos: p.resumen() };
  }
}

/** Interpretación con los ajustes de clima que el director aplica al estado. */
export type InterpretacionConDeltas = Interpretacion & { deltas?: { tension: number; euforia: number } };
