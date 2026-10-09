/**
 * El director: convierte una conversación en una sucesión de viñetas.
 *
 * Por cada mensaje:
 *   1. Pide al intérprete qué significa (emoción, intención, gesto…).
 *   2. Actualiza la memoria de la escena (EstadoEscena): quién está, de qué
 *      se habla, cómo va el tono.
 *   3. Decide si el mensaje cabe en la viñeta abierta o abre una nueva
 *      (agrupación), y si la escena cambia de sitio.
 *   4. Coloca el globo, actualiza al que habla y deja que las reglas de
 *      escena muevan al resto (miradas, reacciones, orientación, cámara).
 *   5. Reparte a los personajes en el set, decide formato, props y efectos.
 *
 * Es determinista: la misma conversación produce siempre las mismas
 * viñetas, así que el historial se puede reconstruir en cualquier momento
 * (`reconstruir`) y los tests pueden comparar resultados exactos.
 *
 * No sabe nada de SVG ni de Angular. Produce objetos `Vineta`.
 */

import { CATALOGO, type Catalogo } from '../catalogo/catalogo.js';
import type {
  EstadoEscena,
  EstadoPersonaje,
  EventoPresencia,
  FormatoVineta,
  Globo,
  Interpretacion,
  MensajeEntrada,
  PersonajeEnEscena,
  TipoPlano,
  Transicion,
  Vineta,
} from '../modelo.js';
import { InterpreteReglas, type ContextoInterpretacion, type Interprete, type InterpretacionConDeltas, type Refinador } from '../interpretacion/interprete.js';
import { MotorReglas, Pizarra } from '../interpretacion/reglas.js';
import { identidadDe } from '../personaje/identidad.js';
import { POSES_PERSISTENTES, REGLAS_ESCENA, type CtxEscena } from './reglas-escena.js';
import { alturaGlobos } from '../composicion/globos.js';
import { TAM_VINETA } from '../modelo.js';

export interface ConfigDirector {
  /** Globos que caben en una viñeta, por formato. */
  maxGlobos: Record<FormatoVineta, number>;
  /** Caracteres de texto que caben en una viñeta, por formato. */
  maxCaracteres: Record<FormatoVineta, number>;
  /** Un mensaje más largo que esto se lleva viñeta propia. */
  mensajeLargo: number;
  /** Pausa que abre escena nueva ("Más tarde…"). */
  pausaEscenaMs: number;
  /** Pausa que abre viñeta nueva aunque haya sitio. */
  pausaVinetaMs: number;
  /** Personajes como mucho en una viñeta. */
  maxPersonajes: number;
  /** Mensajes sin hablar tras los que alguien deja de salir en las viñetas. */
  memoriaMensajes: number;
  /** Puntos de tema para cambiar de escenario sin que nadie diga "voy a…". */
  umbralTema: number;
  /** Cuánto se olvida el tema en cada mensaje (0–1). */
  olvidoTema: number;
  /** Peso de efectos por viñeta (ver catalogo/efectos.ts). */
  presupuestoEfectos: number;
  /** Escenario de partida. */
  escenarioInicial: string;
}

export const CONFIG_POR_DEFECTO: ConfigDirector = {
  maxGlobos: { cuadrada: 3, ancha: 4 },
  maxCaracteres: { cuadrada: 150, ancha: 300 },
  mensajeLargo: 170,
  pausaEscenaMs: 30 * 60_000,
  pausaVinetaMs: 5 * 60_000,
  maxPersonajes: 5,
  memoriaMensajes: 10,
  umbralTema: 2.2,
  olvidoTema: 0.72,
  presupuestoEfectos: 3,
  escenarioInicial: 'neutro',
};

export interface OpcionesDirector {
  catalogo?: Catalogo;
  interprete?: Interprete;
  reglasEscena?: MotorReglas<CtxEscena>;
  config?: Partial<ConfigDirector>;
  /** Mejoras asíncronas de la interpretación (IA). Ver interpretacion/interprete.ts. */
  refinadores?: Refinador[];
}

export interface ResultadoDirector {
  vineta: Vineta;
  /** Se ha abierto una viñeta nueva (si no, se ha actualizado la abierta). */
  nueva: boolean;
  interpretacion: Interpretacion;
  /** Por qué se abrió viñeta nueva (vacío si se siguió en la misma). */
  motivos: string[];
}

interface Registro {
  mensaje: MensajeEntrada;
  id: string;
  autorId: string;
  texto: string;
  fecha: Date;
  interpretacion: Interpretacion;
  vinetaId: string;
}

interface Decision {
  nueva: boolean;
  motivos: string[];
  escenario: string;
  abreEscena: boolean;
  rotulo?: string;
  transicion: Transicion;
}

/** Posiciones (0–1) y profundidades por número de personajes y formato. */
const REPARTO: Record<FormatoVineta, Array<Array<[number, number]>>> = {
  cuadrada: [
    [],
    [[0.5, 0]],
    [[0.27, 0], [0.73, 0]],
    [[0.17, 0], [0.5, 0.35], [0.83, 0]],
    [[0.14, 0.1], [0.38, 0.45], [0.62, 0.45], [0.86, 0.1]],
    [[0.12, 0], [0.31, 0.5], [0.5, 0.1], [0.69, 0.5], [0.88, 0]],
  ],
  ancha: [
    [],
    [[0.5, 0]],
    [[0.34, 0], [0.66, 0]],
    [[0.22, 0], [0.5, 0.25], [0.78, 0]],
    [[0.14, 0], [0.38, 0.3], [0.62, 0.3], [0.86, 0]],
    [[0.1, 0], [0.3, 0.42], [0.5, 0.05], [0.7, 0.42], [0.9, 0]],
  ],
};

const PLANOS_DE_UNO: ReadonlySet<TipoPlano> = new Set(['primer-plano', 'primerisimo', 'personaje-objeto']);
const POSES_DE_TAZA = new Set(['de-pie', 'mirando', 'escuchando', 'hablando']);

function estadoInicial(escenario: string): EstadoEscena {
  return {
    escenario,
    temas: {},
    personajes: {},
    orden: [],
    props: [],
    camara: 'medio',
    tono: 'neutro',
    tension: 0,
    euforia: 0,
    interlocutores: {},
    indiceMensaje: 0,
    vinetasSinEfectos: 3,
  };
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export class Director {
  readonly catalogo: Catalogo;
  readonly interprete: Interprete;
  readonly reglasEscena: MotorReglas<CtxEscena>;
  readonly config: ConfigDirector;
  readonly refinadores: Refinador[];

  estado: EstadoEscena;
  private lista: Vineta[] = [];
  private registros: Registro[] = [];
  /** Última interpretación de cada personaje en la viñeta abierta. */
  private enVinetaAbierta: Record<string, Interpretacion> = {};
  private secuencia = 0;
  /** Correcciones de los refinadores (IA), por mensaje. Sobreviven a `reconstruir`. */
  private readonly parches = new Map<string, Partial<Interpretacion>>();

  constructor(op: OpcionesDirector = {}) {
    this.catalogo = op.catalogo ?? CATALOGO;
    this.interprete = op.interprete ?? new InterpreteReglas();
    this.reglasEscena = op.reglasEscena ?? new MotorReglas<CtxEscena>(REGLAS_ESCENA);
    this.config = { ...CONFIG_POR_DEFECTO, ...(op.config ?? {}) };
    this.refinadores = op.refinadores ?? [];
    this.estado = estadoInicial(this.config.escenarioInicial);
  }

  get vinetas(): readonly Vineta[] {
    return this.lista;
  }

  interpretacionDe(mensajeId: string): Interpretacion | undefined {
    return this.registros.find((r) => r.id === mensajeId)?.interpretacion;
  }

  yaProcesado(mensajeId: string): boolean {
    return this.registros.some((r) => r.id === mensajeId);
  }

  /** Fecha del último mensaje procesado (para detectar mensajes que llegan desordenados). */
  get ultimaFecha(): Date | undefined {
    return this.estado.ultimaFecha;
  }

  reiniciar(): void {
    this.estado = estadoInicial(this.config.escenarioInicial);
    this.lista = [];
    this.registros = [];
    this.enVinetaAbierta = {};
    this.secuencia = 0;
  }

  /** Vuelve a montar la tira entera (historial, mensajes desordenados…). */
  reconstruir(mensajes: readonly MensajeEntrada[]): readonly Vineta[] {
    this.reiniciar();
    const ordenados = [...mensajes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    for (const m of ordenados) this.procesar(m);
    return this.lista;
  }

  /* ================================================================ mensaje */

  procesar(original: MensajeEntrada): ResultadoDirector {
    const e = this.estado;
    // "*se sienta* ¿Café?": la acción va en cartela y el resto es diálogo.
    const partido = original.texto.match(/^\s*\*([^*]{2,})\*\s*(\S[\s\S]*)$/);
    const accion = partido ? partido[1]!.trim() : null;
    const m: MensajeEntrada = partido ? { ...original, texto: partido[2]!.trim() } : original;
    const indice = e.indiceMensaje++;
    const est = this.asegurarPersonaje(m.autorId, m.autorNombre, m.avatar, m.fecha);
    const eraNuevo = est.nuevo;
    est.presente = true;

    const anterior = this.registros[this.registros.length - 1];
    const interp = this.interprete.interpretar(m, this.contextoPara(m)) as InterpretacionConDeltas;
    const parche = this.parches.get(m.id);
    if (parche) Object.assign(interp, parche, { traza: [...interp.traza, { regla: 'refinador', propuestas: Object.keys(parche) }] });
    if (interp.destinatarioId && (!e.personajes[interp.destinatarioId]?.presente || interp.destinatarioId === m.autorId)) {
      interp.destinatarioId = undefined;
    }

    this.actualizarClima(interp);

    const abierta = this.lista[this.lista.length - 1];
    const decision = this.decidir(m, interp, est, eraNuevo, abierta);

    let v: Vineta;
    if (decision.nueva) {
      v = this.abrirVineta(decision, m.autorId, interp, abierta);
      this.enVinetaAbierta = {};
      this.lista.push(v);
    } else {
      v = structuredClone(abierta!);
      v.version++;
      this.lista[this.lista.length - 1] = v;
    }

    if (accion) this.anadirNarracion(v, this.narrar({ ...m, texto: accion }), m.autorId);
    this.anadirMensaje(v, m, interp, est, eraNuevo);
    const traza = this.aplicarReglasEscena(v, m.autorId, interp, abierta !== v ? this.lista[this.lista.length - 2] : undefined);
    this.distribuir(v);
    this.decidirEfectos(v);
    this.decidirAmbiente(v);
    v.notas.push(
      `#${indice} ${m.autorNombre}: ${interp.emocion}/${interp.pose}/${interp.globo}` +
        (decision.nueva ? ` · nueva viñeta (${decision.motivos.join(', ')})` : ' · sigue en la viñeta') +
        ` · escena: ${traza.join(', ')}`,
    );

    // Memoria.
    est.emocion = interp.emocion;
    est.intensidad = interp.intensidad;
    est.pose = interp.pose;
    est.ultimoIndice = indice;
    est.ultimaFecha = m.fecha;
    for (const p of v.personajes) {
      const ep = e.personajes[p.id];
      if (ep) ep.nuevo = false;
    }
    e.interlocutores[m.autorId] = interp.destinatarioId ?? (anterior && anterior.autorId !== m.autorId ? anterior.autorId : e.interlocutores[m.autorId] ?? '');
    e.hablanteAnterior = m.autorId;
    e.ultimaFecha = m.fecha;
    e.camara = v.camara.plano;
    if (interp.destino && interp.destino !== e.escenario) {
      e.escenarioPendiente = { id: interp.destino, motivo: `${m.autorNombre} va a ${interp.destino}` };
    }
    if (interp.movimiento === 'salir') est.saliendo = true;

    this.registros.push({ mensaje: original, id: m.id, autorId: m.autorId, texto: m.texto, fecha: m.fecha, interpretacion: interp, vinetaId: v.id });

    return { vineta: v, nueva: decision.nueva, interpretacion: interp, motivos: decision.motivos };
  }

  /**
   * Pasa un mensaje ya dibujado por los refinadores (p. ej. un modelo de IA).
   *
   * La tira se pinta al instante con las reglas; si después un refinador
   * corrige algo (otra emoción, otro sitio…), se guarda la corrección y se
   * recompone la conversación. Devuelve si ha cambiado algo.
   */
  async refinar(mensajeId: string): Promise<boolean> {
    const reg = this.registros.find((r) => r.id === mensajeId);
    if (!reg || !this.refinadores.length) return false;
    let cambio: Partial<Interpretacion> = {};
    for (const r of this.refinadores) {
      try {
        const p = await r.refinar(reg.mensaje, this.contextoPara(reg.mensaje), { ...reg.interpretacion, ...cambio });
        if (p) cambio = { ...cambio, ...p };
      } catch (err) {
        console.warn(`[Escena] el refinador ${r.nombre} ha fallado; se queda lo de las reglas`, err);
      }
    }
    if (!Object.keys(cambio).length) return false;
    this.parches.set(mensajeId, cambio);
    this.reconstruir(this.registros.map((x) => x.mensaje));
    return true;
  }

  /**
   * El contexto con el que se interpretaría este mensaje AHORA. Lo usa el
   * laboratorio para enseñar señales y reglas sin procesar el mensaje.
   */
  contextoPara(m: MensajeEntrada): ContextoInterpretacion {
    const anterior = this.registros[this.registros.length - 1];
    const presentes = Object.values(this.estado.personajes)
      .filter((p) => p.presente || p.id === m.autorId)
      .map((p) => ({ id: p.id, nombre: p.nombre }));
    return {
      estado: this.estado,
      catalogo: this.catalogo,
      presentes,
      anterior: anterior && { autorId: anterior.autorId, texto: anterior.texto, interpretacion: anterior.interpretacion },
    };
  }

  /* ============================================================== presencia */

  /**
   * Alguien entra o sale sin escribir (si el puerto lo sabe). Devuelve la
   * viñeta modificada, o `null` si no hay nada que dibujar.
   */
  presencia(ev: EventoPresencia): Vineta | null {
    const e = this.estado;
    const abierta = this.lista[this.lista.length - 1];

    if (ev.tipo === 'entra') {
      const est = this.asegurarPersonaje(ev.usuarioId, ev.nombre ?? 'Alguien', ev.avatar ?? null, ev.fecha);
      if (est.presente && !est.nuevo) return null;
      est.presente = true;
      est.saliendo = false;
      if (!abierta || abierta.personajes.some((p) => p.id === est.id)) return null;
      if (abierta.personajes.length >= this.limitePersonajes(abierta.formato)) return null;

      const v = structuredClone(abierta);
      v.version++;
      const pj = this.personajeDesde(est);
      pj.pose = 'caminando';
      pj.animaciones = ['entrada'];
      v.personajes.push(pj);
      this.anadirNarracion(v, `${est.nombre} entra.`, ev.usuarioId);
      this.aplicarReglasEscena(v, null, null, undefined);
      this.distribuir(v);
      est.nuevo = false;
      this.lista[this.lista.length - 1] = v;
      return v;
    }

    const est = e.personajes[ev.usuarioId];
    if (!est || !est.presente) return null;
    est.saliendo = true;
    if (!abierta) return null;
    const pj = abierta.personajes.find((p) => p.id === ev.usuarioId);
    if (!pj) {
      est.presente = false;
      est.saliendo = false;
      return null;
    }
    const v = structuredClone(abierta);
    v.version++;
    const sale = v.personajes.find((p) => p.id === ev.usuarioId)!;
    sale.pose = 'caminando';
    sale.sale = sale.x >= 0.5 ? 'derecha' : 'izquierda';
    sale.animaciones = [...sale.animaciones.filter((a) => a !== 'entrada'), 'salida'];
    sale.habla = false;
    this.anadirNarracion(v, `${est.nombre} se va.`, ev.usuarioId);
    this.aplicarReglasEscena(v, null, null, undefined);
    this.lista[this.lista.length - 1] = v;
    return v;
  }

  /* ============================================================== internos */

  private asegurarPersonaje(id: string, nombre: string, avatar: string | null, fecha: Date): EstadoPersonaje {
    const e = this.estado;
    let est = e.personajes[id];
    if (!est) {
      est = {
        id,
        nombre,
        identidad: identidadDe(avatar, id),
        ultimoIndice: -1,
        ultimaFecha: fecha,
        emocion: 'neutral',
        intensidad: 0.2,
        pose: 'de-pie',
        presente: true,
        saliendo: false,
        nuevo: true,
        cercania: 0,
      };
      e.personajes[id] = est;
      e.orden.push(id);
    } else {
      est.nombre = nombre || est.nombre;
      if (avatar && avatar !== est.identidad.codigo) est.identidad = identidadDe(avatar, id);
      if (!est.presente) {
        // Vuelve alguien que se había ido: entra de nuevo.
        est.nuevo = true;
        est.saliendo = false;
      }
    }
    return est;
  }

  private actualizarClima(interp: InterpretacionConDeltas): void {
    const e = this.estado;
    const exp = this.catalogo.expresion(interp.emocion);
    const negativa = exp.valencia < -0.5 && exp.activacion > 0.6;
    e.tension = clamp(e.tension * 0.8 + (interp.tono === 'tenso' || negativa ? 0.22 * interp.intensidad + 0.08 : 0) + (interp.deltas?.tension ?? 0), 0, 1);
    e.euforia = clamp(e.euforia * 0.8 + (interp.tono === 'festivo' ? 0.25 : 0) + (interp.deltas?.euforia ?? 0), 0, 1);
    if (interp.tono !== 'neutro') e.tono = interp.tono;
    else if (e.tension < 0.2 && e.euforia < 0.2) e.tono = 'neutro';

    for (const k of Object.keys(e.temas)) {
      e.temas[k] = e.temas[k]! * this.config.olvidoTema;
      if (e.temas[k]! < 0.05) delete e.temas[k];
    }
    if (interp.escenario) {
      e.temas[interp.escenario.id] = (e.temas[interp.escenario.id] ?? 0) + interp.escenario.confianza * 2;
    }
  }

  /** El escenario al que apunta la conversación, si ha acumulado bastante tema. */
  private temaGanador(): string | null {
    let mejor: string | null = null;
    let puntos = this.config.umbralTema;
    for (const [id, p] of Object.entries(this.estado.temas)) {
      if (p >= puntos && this.catalogo.escenarios.existe(id)) {
        mejor = id;
        puntos = p;
      }
    }
    return mejor;
  }

  private limitePersonajes(f: FormatoVineta): number {
    return f === 'ancha' ? this.config.maxPersonajes : Math.min(3, this.config.maxPersonajes);
  }

  /** La pregunta central: ¿este mensaje va en la viñeta abierta o en una nueva? */
  private decidir(m: MensajeEntrada, interp: Interpretacion, est: EstadoPersonaje, eraNuevo: boolean, abierta: Vineta | undefined): Decision {
    const e = this.estado;
    const cfg = this.config;
    const motivos: string[] = [];
    let escenario = e.escenario;
    let abreEscena = false;
    let rotulo: string | undefined;
    let transicion: Transicion = 'corte';

    // ¿Cambia el sitio? Primero lo anunciado ("voy a…"), luego el tema.
    const tema = this.temaGanador();
    const destino = e.escenarioPendiente?.id ?? (tema && tema !== e.escenario ? tema : null);
    if (destino && destino !== e.escenario) {
      escenario = destino;
      abreEscena = true;
      transicion = 'barrido';
      rotulo = this.catalogo.escenarios.obtener(destino).rotulo;
      motivos.push(e.escenarioPendiente ? `cambio de escenario anunciado → ${destino}` : `el tema lleva a ${destino}`);
    }

    if (!abierta) {
      const esc = this.catalogo.escenarios.obtener(escenario);
      return {
        nueva: true,
        motivos: ['primera viñeta', ...motivos],
        escenario,
        abreEscena: true,
        rotulo: esc.id !== 'neutro' ? esc.rotulo : undefined,
        transicion: 'fundido',
      };
    }

    if (e.ultimaFecha) {
      const pausa = m.fecha.getTime() - e.ultimaFecha.getTime();
      if (pausa > cfg.pausaEscenaMs) {
        abreEscena = true;
        transicion = 'fundido';
        rotulo ??= 'Más tarde…';
        motivos.push('pausa larga');
      } else if (pausa > cfg.pausaVinetaMs) {
        motivos.push('pausa');
      }
    }

    const enViñeta = abierta.personajes.some((p) => p.id === m.autorId);
    const globos = abierta.globos.filter((g) => g.tipo !== 'narracion');
    const texto = abierta.globos.reduce((n, g) => n + g.texto.length, 0);
    const formatoPosible: FormatoVineta = abierta.personajes.length + (enViñeta ? 0 : 1) >= 3 ? 'ancha' : abierta.formato;

    // Alguien nuevo "entra" (viñeta propia, los demás se giran) solo si la
    // escena ya estaba en marcha. Al principio de una charla, el segundo en
    // hablar ya estaba ahí: se suma a la viñeta.
    const escenaEnMarcha = this.registros.length >= 3 || Object.values(e.personajes).filter((p) => p.ultimoIndice >= 0).length >= 2;
    // Si la viñeta abierta aún tiene sitio (poca charla, cabe otro), el
    // recién llegado entra EN ella: en un grupo que se saluda, cada "hola"
    // no merece viñeta propia.
    const cascada = abierta.personajes.some((p) => p.animaciones.includes('entrada')) || abierta.personajes.length < 2;
    const hayHueco = cascada && globos.length < 2 && abierta.personajes.length < this.limitePersonajes('ancha') - 1;
    if (eraNuevo && escenaEnMarcha && !hayHueco && abierta.personajes.some((p) => p.id !== m.autorId)) motivos.push(`entra ${m.autorNombre}`);
    if (interp.vinetaPropia && abierta.mensajes.length > 0) motivos.push('momento fuerte');
    if (PLANOS_DE_UNO.has(abierta.camara.plano) && abierta.mensajes.length > 0) motivos.push('la viñeta anterior era un primer plano');
    // Tres globos solo caben en una cuadrada si son cortos.
    const maxGlobos = formatoPosible === 'cuadrada' && texto + m.texto.length > 90 ? 2 : cfg.maxGlobos[formatoPosible];
    if (globos.length >= maxGlobos) motivos.push('viñeta llena');
    else if (texto + m.texto.length > cfg.maxCaracteres[formatoPosible]) motivos.push('no cabe más texto');
    if (m.texto.length > cfg.mensajeLargo && abierta.mensajes.length > 0) motivos.push('mensaje largo');
    // ¿Caben de verdad? Se estima con el mismo reparto en filas que usará la
    // colocación: si los globos ocupan más de 2/3 del alto, acabarían tapando.
    if (!motivos.length) {
      const tam = TAM_VINETA[formatoPosible];
      const xs: Record<string, number> = {};
      const ids = [...abierta.personajes.map((p) => p.id), ...(enViñeta ? [] : [m.autorId])];
      const orden = this.estado.orden.filter((id) => ids.includes(id));
      orden.forEach((id, i) => (xs[id] = ((i + 0.5) / orden.length) * tam.ancho));
      const prueba: Globo[] = [...abierta.globos, { id: 'prueba', mensajeId: m.id, autorId: m.autorId, autorNombre: m.autorNombre, tipo: interp.globo, texto: m.texto, orden: abierta.globos.length, intensidad: interp.intensidad }];
      const alto = alturaGlobos(prueba, tam.ancho, abierta.rotulo, orden.length >= 3, (id) => (id && xs[id] !== undefined ? xs[id]! : tam.ancho / 2));
      if (alto > tam.alto * 0.46) motivos.push('los globos no caben');
    }
    if (!enViñeta && abierta.personajes.length >= this.limitePersonajes('ancha')) motivos.push('no cabe otro personaje');
    const ultimos = abierta.globos.slice(-2);
    if (ultimos.length === 2 && ultimos.every((g) => g.autorId === m.autorId)) motivos.push('tercer mensaje seguido');

    return { nueva: motivos.length > 0, motivos, escenario, abreEscena, rotulo, transicion };
  }

  private personajeDesde(est: EstadoPersonaje): PersonajeEnEscena {
    const reciente = this.estado.indiceMensaje - est.ultimoIndice <= 3;
    const pose = POSES_PERSISTENTES.has(est.pose) ? est.pose : 'mirando';
    return {
      id: est.id,
      nombre: est.nombre,
      identidad: est.identidad,
      x: 0.5,
      profundidad: 0,
      pose,
      expresion: reciente ? est.emocion : 'neutral',
      intensidad: reciente ? est.intensidad * 0.6 : 0.2,
      mirada: { tipo: 'interlocutor' },
      orientacion: 'derecha',
      habla: false,
      propEnMano: this.catalogo.poses.buscar(pose)?.sujeta?.prop,
      animaciones: [],
    };
  }

  /** Quién sale en la viñeta nueva. */
  private elegirReparto(hablanteId: string, interp: Interpretacion, anterior: Vineta | undefined): string[] {
    const e = this.estado;
    // Los que se despidieron ya no están.
    for (const p of Object.values(e.personajes)) {
      if (p.saliendo) {
        p.presente = false;
        p.saliendo = false;
      }
    }
    const idx = e.indiceMensaje;
    const recientes = Object.values(e.personajes)
      .filter((p) => p.presente && p.id !== hablanteId && idx - p.ultimoIndice <= this.config.memoriaMensajes && p.ultimoIndice >= 0)
      .sort((a, b) => b.ultimoIndice - a.ultimoIndice)
      .map((p) => p.id);
    const deAntes = (anterior?.personajes ?? []).map((p) => p.id).filter((id) => e.personajes[id]?.presente);

    const elegidos: string[] = [hablanteId];
    const meter = (id: string | undefined) => {
      if (id && !elegidos.includes(id) && e.personajes[id]?.presente && elegidos.length < this.config.maxPersonajes) elegidos.push(id);
    };
    meter(interp.destinatarioId);
    meter(e.interlocutores[hablanteId]);
    for (const id of recientes) if (deAntes.includes(id)) meter(id);
    for (const id of recientes) meter(id);
    // Nadie habla solo si hay más gente: que al menos salga quien estaba.
    if (elegidos.length === 1) for (const id of deAntes) meter(id);

    return e.orden.filter((id) => elegidos.includes(id));
  }

  private abrirVineta(d: Decision, hablanteId: string, interp: Interpretacion, anterior: Vineta | undefined): Vineta {
    const e = this.estado;
    if (d.escenario !== e.escenario || d.abreEscena) {
      if (d.escenario !== e.escenario) {
        e.props = [];
        e.temas = {};
        // Al cambiar de sitio, todos se ponen de pie (nadie se lleva la silla).
        for (const p of Object.values(e.personajes)) if (POSES_PERSISTENTES.has(p.pose)) p.pose = 'de-pie';
      }
      e.escenario = d.escenario;
    }
    e.escenarioPendiente = undefined;
    e.vinetasSinEfectos = anterior && anterior.efectos.length ? 0 : e.vinetasSinEfectos + 1;

    const seFueron = Object.values(e.personajes).filter((p) => p.saliendo && p.id !== hablanteId).map((p) => p.nombre);
    const reparto = this.elegirReparto(hablanteId, interp, anterior);
    const v: Vineta = {
      id: `v${++this.secuencia}`,
      version: 1,
      formato: 'cuadrada',
      escenario: d.escenario,
      camara: { plano: 'medio', foco: [] },
      personajes: reparto.map((id) => this.personajeDesde(e.personajes[id]!)),
      props: [],
      globos: [],
      efectos: [],
      mensajes: [],
      transicion: d.transicion,
      abreEscena: d.abreEscena,
      rotulo: d.rotulo,
      notas: [],
    };
    if (anterior && !d.abreEscena) v.camara.desde = anterior.camara.plano;
    // Quien se despidió ya no está: la viñeta lo cuenta.
    if (seFueron.length) {
      this.anadirNarracion(v, seFueron.length === 1 ? `${seFueron[0]} se ha ido.` : `${seFueron.join(' y ')} se han ido.`, null);
    }
    return v;
  }

  private describirAdjuntos(m: MensajeEntrada): string {
    const a = m.adjuntos ?? [];
    if (!a.length) return '…';
    const que = { imagen: 'una imagen', video: 'un vídeo', archivo: 'un archivo' }[a[0]!.tipo];
    return a.length > 1 ? `(envía ${que} y ${a.length - 1} más)` : `(envía ${que})`;
  }

  private anadirNarracion(v: Vineta, texto: string, autorId: string | null): void {
    v.globos.push({ id: `n${v.id}-${v.globos.length}`, mensajeId: '', autorId, tipo: 'narracion', texto, orden: v.globos.length, intensidad: 0.2 });
  }

  private anadirMensaje(v: Vineta, m: MensajeEntrada, interp: Interpretacion, est: EstadoPersonaje, eraNuevo: boolean): void {
    const cat = this.catalogo;
    let pj = v.personajes.find((p) => p.id === m.autorId);
    if (!pj) {
      pj = this.personajeDesde(est);
      v.personajes.push(pj);
      v.personajes.sort((a, b) => this.estado.orden.indexOf(a.id) - this.estado.orden.indexOf(b.id));
    }

    pj.pose = interp.pose;
    pj.expresion = interp.emocion;
    pj.intensidad = interp.intensidad;
    pj.mirada = { ...interp.mirada };
    pj.habla = interp.globo !== 'narracion' && interp.globo !== 'pensamiento';
    pj.propEnMano = cat.poses.buscar(interp.pose)?.sujeta?.prop;
    pj.imagenEnMano = undefined;
    const escenaEnMarcha = this.registros.length >= 3 || Object.values(this.estado.personajes).filter((p) => p.id !== est.id && p.ultimoIndice >= 0).length >= 2;
    if (eraNuevo && escenaEnMarcha && v.personajes.length > 1 && !pj.animaciones.includes('entrada')) pj.animaciones.push('entrada');

    // Objetos: la imagen adjunta se enseña; lo que se nombra, se ve.
    const imagen = m.adjuntos?.find((a) => a.tipo === 'imagen');
    if (imagen) {
      pj.pose = 'mostrando';
      pj.propEnMano = 'foto';
      pj.imagenEnMano = imagen.url;
    }
    for (const id of interp.props) {
      const def = cat.props.buscar(id);
      if (!def || id === 'foto') continue;
      if (def.anclaje === 'suelo') {
        if (!this.estado.props.includes(id)) this.estado.props.push(id);
      } else if (def.anclaje === 'mesa') {
        if (!v.props.some((p) => p.tipo === id)) v.props.push({ id: `${id}-${v.id}`, tipo: id, x: 0.5, profundidad: 0.45 });
      } else if (!pj.propEnMano) {
        if (id === 'taza' && POSES_DE_TAZA.has(pj.pose)) {
          pj.pose = 'bebiendo';
          pj.propEnMano = 'taza';
        } else if (pj.pose === 'mostrando' || pj.pose === 'de-pie' || pj.pose === 'hablando') {
          pj.pose = 'mostrando';
          pj.propEnMano = id;
        }
      }
    }
    // Quien lleva el café en su avatar lo lleva en la mano si no hace otra cosa.
    if (!pj.propEnMano && est.identidad.propFavorito && POSES_DE_TAZA.has(pj.pose) && pj.pose !== 'hablando') {
      pj.pose = 'bebiendo';
      pj.propEnMano = est.identidad.propFavorito;
    }

    const texto = interp.globo === 'narracion' ? this.narrar(m) : m.texto?.trim() || this.describirAdjuntos(m);
    const globo: Globo = {
      id: `g-${m.id}`,
      mensajeId: m.id,
      autorId: m.autorId,
      autorNombre: m.autorNombre,
      tipo: interp.globo,
      texto,
      orden: v.globos.length,
      intensidad: interp.intensidad,
    };
    v.globos.push(globo);
    v.mensajes.push(m.id);
    this.enVinetaAbierta[m.autorId] = interp;
  }

  /** "*se sienta*" → "Alberto se sienta." */
  private narrar(m: MensajeEntrada): string {
    const accion = m.texto.replace(/^\*|\*$/g, '').replace(/^\/me\s+/i, '').trim();
    const frase = `${m.autorNombre} ${accion}`;
    return /[.!?…]$/.test(frase) ? frase : frase + '.';
  }

  private aplicarReglasEscena(v: Vineta, hablanteId: string | null, interp: Interpretacion | null, anterior: Vineta | undefined): string[] {
    const p = new Pizarra();
    const ctx: CtxEscena = {
      p,
      v,
      estado: this.estado,
      catalogo: this.catalogo,
      hablanteId,
      interp,
      enVineta: this.enVinetaAbierta,
      anterior,
    };
    // Las reglas de orientación y cámara necesitan las x: se reparte antes.
    this.distribuir(v);
    const traza = this.reglasEscena.ejecutar(ctx, 1);
    const plano = (p.lider('camara') as TipoPlano) ?? 'medio';
    v.camara = { ...v.camara, plano, foco: this.focoDe(v, plano, hablanteId, interp) };
    if (plano === 'lateral') {
      const h = v.personajes.find((x) => x.id === hablanteId);
      v.camara.inclinacion = h && h.x < 0.5 ? -4 : 4;
    } else {
      delete v.camara.inclinacion;
    }
    return traza.map((t) => t.regla);
  }

  private focoDe(v: Vineta, plano: TipoPlano, hablanteId: string | null, interp: Interpretacion | null): string[] {
    const todos = v.personajes.map((p) => p.id);
    if (!hablanteId) return todos;
    switch (plano) {
      case 'primer-plano':
      case 'primerisimo':
      case 'personaje-objeto':
      case 'medio':
        return [hablanteId];
      case 'dos': {
        const otro = interp?.destinatarioId && todos.includes(interp.destinatarioId) ? interp.destinatarioId : todos.find((id) => id !== hablanteId);
        return otro ? [hablanteId, otro] : [hablanteId];
      }
      default:
        return todos;
    }
  }

  /** Formato, posiciones y props de escena. */
  private distribuir(v: Vineta): void {
    const e = this.estado;
    const n = v.personajes.length;
    const textoTotal = v.globos.reduce((s, g) => s + g.texto.length, 0);
    const conCoche = e.props.includes('coche');
    // Ancha para repartos grandes o varias voces; un párrafo largo de una
    // sola persona va mejor en cuadrada, que tiene más alto para el globo.
    const unaVozLarga = new Set(v.globos.map((g) => g.autorId)).size <= 1 && textoTotal > this.config.maxCaracteres.cuadrada;
    v.formato = n >= 3 || (textoTotal > this.config.maxCaracteres.cuadrada && !unaVozLarga) || v.globos.length >= 4 || conCoche ? 'ancha' : 'cuadrada';

    const tabla = REPARTO[v.formato][Math.min(n, 5)] ?? [];
    v.personajes.sort((a, b) => e.orden.indexOf(a.id) - e.orden.indexOf(b.id));
    v.personajes.forEach((p, i) => {
      const [x, prof] = tabla[i] ?? [0.5, 0];
      p.x = x;
      p.profundidad = prof;
    });

    // Cercanía: quien se acerca a su interlocutor recorre parte del hueco.
    if (n === 2) {
      const [a, b] = v.personajes as [PersonajeEnEscena, PersonajeEnEscena];
      const minimo = v.formato === 'ancha' ? 0.18 : 0.34;
      const ca = e.personajes[a.id]?.cercania ?? 0;
      const cb = e.personajes[b.id]?.cercania ?? 0;
      const paso = v.formato === 'ancha' ? 0.05 : 0.07;
      a.x = clamp(a.x + ca * paso, 0.12, 0.5);
      b.x = clamp(b.x - cb * paso, 0.5, 0.88);
      if (b.x - a.x < minimo) {
        const medio = (a.x + b.x) / 2;
        a.x = medio - minimo / 2;
        b.x = medio + minimo / 2;
      }
    }

    // Props de escena: el mobiliario del escenario y lo que se ha nombrado.
    const esc = this.catalogo.escenarios.obtener(v.escenario);
    const deEscena = v.props.filter((p) => this.catalogo.props.buscar(p.tipo)?.anclaje === 'mesa');
    const props: typeof v.props = [];
    if (n >= 2 && n <= 3) {
      for (const mob of esc.mobiliario ?? []) {
        const x = mob.x === 'centro' ? (v.personajes[0]!.x + v.personajes[1]!.x) / 2 : mob.x;
        props.push({ id: `${mob.tipo}-${v.id}`, tipo: mob.tipo, x, profundidad: mob.profundidad });
      }
    } else if (n === 1 || n > 3) {
      for (const mob of esc.mobiliario ?? []) if (mob.x !== 'centro') props.push({ id: `${mob.tipo}-${v.id}`, tipo: mob.tipo, x: mob.x, profundidad: mob.profundidad });
    }
    // Objetos de suelo nombrados en la conversación: al fondo, en el hueco
    // más grande que dejen los personajes (y los demás objetos).
    for (const tipo of e.props) {
      if (props.some((p) => p.tipo === tipo)) continue;
      const ocupados = [...v.personajes.map((p) => p.x), ...props.map((p) => p.x)];
      let mejor = 0.5;
      let distancia = -1;
      for (let x = 0.08; x <= 0.92; x += 0.02) {
        const d = Math.min(...ocupados.map((o) => Math.abs(o - x)), 1);
        if (d > distancia) {
          distancia = d;
          mejor = x;
        }
      }
      props.push({ id: `${tipo}-${v.id}`, tipo, x: mejor, profundidad: 0.85 });
    }
    const mesa = props.find((p) => p.tipo === 'mesa');
    for (const p of deEscena) {
      if (mesa) {
        p.x = mesa.x + (props.filter((q) => this.catalogo.props.buscar(q.tipo)?.anclaje === 'mesa').length - 0.5) * 0.06;
        p.profundidad = mesa.profundidad;
      }
      props.push(p);
    }
    v.props = props;

    // Quien entra lo hace por el lado en el que queda.
    for (const p of v.personajes) {
      if (p.animaciones.includes('entrada') && !p.entra) p.entra = p.x >= 0.5 ? 'derecha' : 'izquierda';
    }
  }

  /** Efectos, con presupuesto: personalidad sí, fuegos artificiales no. */
  private decidirEfectos(v: Vineta): void {
    const cat = this.catalogo;
    const ultimoAutor = v.globos.filter((g) => g.autorId).slice(-1)[0]?.autorId;
    const presupuesto = this.estado.vinetasSinEfectos === 0 ? this.config.presupuestoEfectos - 1 : this.config.presupuestoEfectos;
    const candidatos: Array<{ tipo: string; sobre?: string; intensidad: number; prioridad: number }> = [];

    for (const p of v.personajes) {
      const interp = this.enVinetaAbierta[p.id];
      if (!interp) continue;
      const prioridad = p.id === ultimoAutor ? 2 : 1;
      for (const tipo of interp.efectos) {
        const def = cat.efectos.buscar(tipo);
        if (!def) continue;
        candidatos.push({ tipo, sobre: def.ambito === 'pantalla' ? undefined : p.id, intensidad: interp.intensidad, prioridad });
      }
    }
    // Líneas de tensión: solo en primerísimo plano de algo muy intenso.
    const h = v.personajes.find((p) => p.id === ultimoAutor);
    if (v.camara.plano === 'primerisimo' && h && h.intensidad >= 0.85) {
      candidatos.push({ tipo: 'lineas-velocidad', intensidad: h.intensidad, prioridad: 3 });
    }
    if (this.estado.euforia >= 0.55) candidatos.push({ tipo: 'confeti', intensidad: this.estado.euforia, prioridad: 0 });

    candidatos.sort((a, b) => b.prioridad - a.prioridad || b.intensidad - a.intensidad);
    const elegidos: typeof v.efectos = [];
    let gasto = 0;
    for (const c of candidatos) {
      const def = cat.efectos.obtener(c.tipo);
      if (elegidos.some((e) => e.tipo === c.tipo && e.sobre === c.sobre)) continue;
      // Un efecto por personaje: dos símbolos sobre la misma cabeza se pisan.
      if (c.sobre && def.ambito === 'personaje' && elegidos.some((e) => e.sobre === c.sobre && cat.efectos.obtener(e.tipo).ambito === 'personaje')) continue;
      if (gasto + def.peso > presupuesto) continue;
      elegidos.push({ tipo: c.tipo, sobre: c.sobre, intensidad: c.intensidad });
      gasto += def.peso;
      if (c.tipo === 'temblor' && c.sobre) {
        const p = v.personajes.find((x) => x.id === c.sobre);
        if (p && !p.animaciones.includes('temblor')) p.animaciones.push('temblor');
      }
    }
    v.efectos = elegidos;
  }

  private decidirAmbiente(v: Vineta): void {
    const e = this.estado;
    if (e.tension >= 0.55 || (v.ambiente === 'tension' && e.tension >= 0.25)) v.ambiente = 'tension';
    else if (e.euforia >= 0.5) v.ambiente = 'fiesta';
    else {
      const esc = this.catalogo.escenarios.obtener(v.escenario);
      v.ambiente = esc.ambiente === 'fiesta' ? 'fiesta' : undefined;
    }
    if (!v.ambiente) delete v.ambiente;
  }
}
