/**
 * El catálogo: todos los assets del motor en un solo sitio.
 *
 * Es una instancia, no un módulo de constantes, para que:
 * - cada chat pueda tener su propio catálogo ampliado (un grupo temático con
 *   escenarios propios, por ejemplo);
 * - los tests usen uno controlado;
 * - se puedan cargar paquetes remotos en caliente (`cargarPaquete` /
 *   `cargarDesde`) sin recompilar el remote. Hoy los assets viajan dentro del
 *   bundle; mañana pueden venir de un CDN o de la API de Diario Hilario con el
 *   mismo formato.
 */

import { EFECTOS } from './efectos';
import { ESCENARIOS } from './escenarios';
import { EXPRESIONES, MARCAS, idExpresion } from './expresiones';
import { POSES } from './poses';
import { PROPS } from './props';
import { Registro } from './registro';
import type { DefEfecto, DefEscenario, DefExpresion, DefMarca, DefPose, DefProp, PaqueteCatalogo } from './tipos';

export class Catalogo {
  readonly poses = new Registro<DefPose>('poses', POSES, 'de-pie');
  readonly expresiones = new Registro<DefExpresion>('expresiones', EXPRESIONES, 'neutral');
  readonly marcas = new Registro<DefMarca>('marcas', MARCAS);
  readonly escenarios = new Registro<DefEscenario>('escenarios', ESCENARIOS, 'neutro');
  readonly props = new Registro<DefProp>('props', PROPS);
  readonly efectos = new Registro<DefEfecto>('efectos', EFECTOS);

  /** Sube con cada paquete cargado: sirve para invalidar caches de dibujo. */
  version = 1;

  /** Resuelve ids antiguos (`risa`, `grito`…) y desconocidos. */
  expresion(idOAlias: string | undefined | null): DefExpresion {
    return this.expresiones.obtener(idExpresion(idOAlias, this.expresiones.listar()));
  }

  /** Mezcla un paquete. Lo que ya existía con el mismo id queda sustituido. */
  cargarPaquete(paquete: PaqueteCatalogo): this {
    if (paquete.poses) this.poses.registrarVarios(paquete.poses);
    if (paquete.expresiones) this.expresiones.registrarVarios(paquete.expresiones);
    if (paquete.marcas) this.marcas.registrarVarios(paquete.marcas);
    if (paquete.escenarios) this.escenarios.registrarVarios(paquete.escenarios);
    if (paquete.props) this.props.registrarVarios(paquete.props);
    if (paquete.efectos) this.efectos.registrarVarios(paquete.efectos);
    this.version++;
    return this;
  }

  /**
   * Carga un paquete JSON remoto. Preparado para cuando los assets vivan
   * fuera del bundle; nada del motor depende de que se llame.
   *
   * Los SVG de un paquete remoto se inyectan en el DOM tal cual, así que el
   * origen tiene que ser de confianza (el propio Diario Hilario). Por eso se
   * rechazan los que traen `<script` o manejadores `on…=`.
   */
  async cargarDesde(url: string, init?: RequestInit): Promise<this> {
    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`[Escena] no se pudo cargar el paquete ${url}: ${res.status}`);
    const paquete = (await res.json()) as PaqueteCatalogo;
    const texto = JSON.stringify(paquete);
    if (/<script|\son[a-z]+\s*=|javascript:/i.test(texto)) {
      throw new Error(`[Escena] el paquete ${url} contiene marcado activo y se ha rechazado`);
    }
    return this.cargarPaquete(paquete);
  }
}

/** Catálogo por defecto, compartido. Para uno aislado: `new Catalogo()`. */
export const CATALOGO = new Catalogo();
