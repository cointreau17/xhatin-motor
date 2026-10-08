/**
 * Motor de reglas.
 *
 * Una regla es un objeto `{ id, cuando(ctx), entonces(ctx) }`. No hay
 * cientos de `if` mezclados con la interfaz: cada decisión tiene nombre, se
 * puede quitar o añadir en caliente y aparece en la traza del laboratorio.
 *
 * Las reglas no ASIGNAN, VOTAN. "JAJAJA ¡no me lo creo!" dispara la regla de
 * risa y la de sorpresa; cada una vota con su peso y gana la que más suma.
 * Así el orden de las reglas no importa y dos reglas que discrepan no se
 * pisan en silencio: la traza muestra las dos.
 *
 * El motor es genérico (`MotorReglas<C>`): el mismo sirve para las reglas de
 * mensaje (qué significa) y para las de escena (cómo reaccionan los demás).
 */

import type { PasoTraza } from '../modelo.js';

export interface Regla<C> {
  id: string;
  descripcion: string;
  /**
   * Fase 1: leer el mensaje (emoción, intención, gestos).
   * Fase 2: derivar de lo decidido en la 1 (pose por emoción, cámara, efectos).
   */
  fase?: 1 | 2;
  cuando(ctx: C): boolean;
  entonces(ctx: C): void;
}

interface Voto {
  peso: number;
  orden: number;
}

/**
 * Donde se acumulan los votos. Cada campo (`emocion`, `pose`…) guarda un
 * total por valor; las listas (`efectos`, `props`) son conjuntos.
 */
export class Pizarra {
  private readonly votos = new Map<string, Map<string, Voto>>();
  private readonly listas = new Map<string, Set<string>>();
  private readonly sumas = new Map<string, number>();
  private orden = 0;
  private propuestas: string[] = [];

  votar(campo: string, valor: string | undefined | null, peso = 1): void {
    if (!valor || peso === 0) return;
    let m = this.votos.get(campo);
    if (!m) this.votos.set(campo, (m = new Map()));
    const v = m.get(valor);
    if (v) v.peso += peso;
    else m.set(valor, { peso, orden: this.orden++ });
    this.propuestas.push(`${campo}=${valor} (${peso > 0 ? '+' : ''}${round(peso)})`);
  }

  anadir(lista: string, valor: string | undefined | null): void {
    if (!valor) return;
    let s = this.listas.get(lista);
    if (!s) this.listas.set(lista, (s = new Set()));
    if (!s.has(valor)) {
      s.add(valor);
      this.propuestas.push(`${lista}+${valor}`);
    }
  }

  quitar(lista: string, valor: string): void {
    if (this.listas.get(lista)?.delete(valor)) this.propuestas.push(`${lista}-${valor}`);
  }

  sumar(campo: string, delta: number): void {
    if (!delta) return;
    this.sumas.set(campo, (this.sumas.get(campo) ?? 0) + delta);
    this.propuestas.push(`${campo}${delta > 0 ? '+' : ''}${round(delta)}`);
  }

  /** Ganador actual de un campo; en empate, el primero que se propuso. */
  lider(campo: string): string | undefined {
    const m = this.votos.get(campo);
    if (!m) return undefined;
    let mejor: [string, Voto] | undefined;
    for (const e of m) {
      if (!mejor || e[1].peso > mejor[1].peso || (e[1].peso === mejor[1].peso && e[1].orden < mejor[1].orden)) mejor = e;
    }
    return mejor && mejor[1].peso > 0 ? mejor[0] : undefined;
  }

  /** Peso del ganador frente al total: una medida de confianza (0–1). */
  confianza(campo: string): number {
    const m = this.votos.get(campo);
    const lider = this.lider(campo);
    if (!m || !lider) return 0;
    let total = 0;
    for (const v of m.values()) total += Math.max(0, v.peso);
    const peso = m.get(lider)!.peso;
    // Mucho peso absoluto también da confianza, no solo ganar por goleada.
    return Math.min(1, (peso / total) * Math.min(1, peso / 3));
  }

  pesoDe(campo: string, valor: string): number {
    return this.votos.get(campo)?.get(valor)?.peso ?? 0;
  }

  lista(nombre: string): string[] {
    return [...(this.listas.get(nombre) ?? [])];
  }

  suma(campo: string): number {
    return this.sumas.get(campo) ?? 0;
  }

  /** Lo que ha propuesto la regla en curso (lo recoge el motor). */
  tomarPropuestas(): string[] {
    const p = this.propuestas;
    this.propuestas = [];
    return p;
  }

  /** Todos los votos, para el laboratorio. */
  resumen(): Record<string, Record<string, number>> {
    const r: Record<string, Record<string, number>> = {};
    for (const [campo, m] of this.votos) {
      r[campo] = Object.fromEntries([...m].map(([k, v]) => [k, round(v.peso)]));
    }
    return r;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ContextoConPizarra {
  p: Pizarra;
}

export class MotorReglas<C extends ContextoConPizarra> {
  private readonly lista: Regla<C>[] = [];

  constructor(reglas: readonly Regla<C>[] = []) {
    for (const r of reglas) this.anadir(r);
  }

  /** Añade o sustituye (mismo id) una regla. */
  anadir(regla: Regla<C>): this {
    const i = this.lista.findIndex((r) => r.id === regla.id);
    if (i >= 0) this.lista[i] = regla;
    else this.lista.push(regla);
    return this;
  }

  quitar(id: string): this {
    const i = this.lista.findIndex((r) => r.id === id);
    if (i >= 0) this.lista.splice(i, 1);
    return this;
  }

  reglas(): readonly Regla<C>[] {
    return this.lista;
  }

  /**
   * Ejecuta las reglas de una fase y devuelve la traza. Una regla que lanza
   * una excepción se anota y se salta: una regla rota no puede tumbar el chat.
   */
  ejecutar(ctx: C, fase: 1 | 2): PasoTraza[] {
    const traza: PasoTraza[] = [];
    for (const r of this.lista) {
      if ((r.fase ?? 1) !== fase) continue;
      try {
        if (!r.cuando(ctx)) continue;
        r.entonces(ctx);
        traza.push({ regla: r.id, propuestas: ctx.p.tomarPropuestas() });
      } catch (err) {
        ctx.p.tomarPropuestas();
        traza.push({ regla: r.id, propuestas: [`ERROR: ${(err as Error).message}`] });
      }
    }
    return traza;
  }
}
