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

export * from './modelo';

export { Catalogo, CATALOGO } from './catalogo/catalogo';
export { Registro } from './catalogo/registro';
export type * from './catalogo/tipos';

export { Director, CONFIG_POR_DEFECTO } from './director/director';
export type { ConfigDirector, OpcionesDirector, ResultadoDirector } from './director/director';
export { REGLAS_ESCENA, POSES_PERSISTENTES } from './director/reglas-escena';
export type { CtxEscena } from './director/reglas-escena';

export { InterpreteReglas } from './interpretacion/interprete';
export type { Interprete, Refinador, ContextoInterpretacion, DetalleInterpretacion } from './interpretacion/interprete';
export { MotorReglas, Pizarra } from './interpretacion/reglas';
export type { Regla } from './interpretacion/reglas';
export { REGLAS_BASE } from './interpretacion/reglas-base';
export { refinadorRemoto } from './interpretacion/refinador-remoto';
export type { OpcionesRefinadorRemoto } from './interpretacion/refinador-remoto';
export type { CtxMensaje } from './interpretacion/reglas-base';
export { extraerSenales } from './interpretacion/senales';
export type { Senales } from './interpretacion/senales';
export { LEXICO, EMOJIS, normalizar, compactar } from './interpretacion/lexico';

export { componerVineta, describir } from './composicion/compositor';
export type { Composicion, OpcionesComposicion } from './composicion/compositor';
export { usarMedidor, medidorCanvas, medirEstimado } from './composicion/globos';

export type * from './estilos/tipos';
export { CARICATURA } from './estilos/caricatura';
export { elegirFigura, colocarFigura, ALTO_CABEZA } from './estilos/figuras';

export { identidadDe } from './personaje/identidad';
export { dibujarPersonaje } from './personaje/personaje';
