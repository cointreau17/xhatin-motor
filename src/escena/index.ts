/**
 * Motor de escena de Xhatin: conversación → viñetas.
 *
 *   const director = new Director();
 *   const { vineta } = director.procesar(mensaje);
 *   el.innerHTML = componerVineta(vineta, director.catalogo).svg;
 *
 * Sin Angular: lo usa el componente `dh-comic-chat`, el laboratorio, los
 * tests y cualquier remote que quiera pintar una conversación. Ver ESCENA.md.
 */

export * from './modelo.js';

export { Catalogo, CATALOGO } from './catalogo/catalogo.js';
export { Registro } from './catalogo/registro.js';
export type * from './catalogo/tipos.js';

export { Director, CONFIG_POR_DEFECTO } from './director/director.js';
export type { ConfigDirector, OpcionesDirector, ResultadoDirector } from './director/director.js';
export { REGLAS_ESCENA, POSES_PERSISTENTES } from './director/reglas-escena.js';
export type { CtxEscena } from './director/reglas-escena.js';

export { InterpreteReglas } from './interpretacion/interprete.js';
export type { Interprete, Refinador, ContextoInterpretacion, DetalleInterpretacion } from './interpretacion/interprete.js';
export { MotorReglas, Pizarra } from './interpretacion/reglas.js';
export type { Regla } from './interpretacion/reglas.js';
export { REGLAS_BASE } from './interpretacion/reglas-base.js';
export { refinadorRemoto } from './interpretacion/refinador-remoto.js';
export type { OpcionesRefinadorRemoto } from './interpretacion/refinador-remoto.js';
export type { CtxMensaje } from './interpretacion/reglas-base.js';
export { extraerSenales } from './interpretacion/senales.js';
export type { Senales } from './interpretacion/senales.js';
export { LEXICO, EMOJIS, normalizar, compactar } from './interpretacion/lexico.js';

export { componerVineta, describir } from './composicion/compositor.js';
export type { Composicion, OpcionesComposicion } from './composicion/compositor.js';
export { usarMedidor, medidorCanvas, medirEstimado } from './composicion/globos.js';

export type * from './estilos/tipos.js';
export { CARICATURA } from './estilos/caricatura.js';
export { elegirFigura, colocarFigura, ALTO_CABEZA } from './estilos/figuras.js';

export { identidadDe } from './personaje/identidad.js';
export { dibujarPersonaje } from './personaje/personaje.js';
