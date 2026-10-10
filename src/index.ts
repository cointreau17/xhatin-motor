/**
 * Motor de Xhatín, sin framework. Lo comparten xhatin (el remote de Angular)
 * y diario-hilario-mobile (React Native): la misma superficie que el `./Api`
 * del remote, menos los componentes de Angular.
 *
 *   import { aleatorio, componer, Escena } from '@diariohilario/xhatin-motor';
 *   import { Director, componerVineta } from '@diariohilario/xhatin-motor/escena';
 *
 * Además, el cliente del API de Xhatín (`/api`) y el catálogo de estilos
 * (`/estilos`), que no dependen de DhPortero: la URL y la sesión se las da
 * quien los usa.
 *
 * El motor de escena va como espacio de nombres porque comparte nombres con
 * HilarAvatar (`normalizar`, del léxico, no es el `normalizar` del avatar).
 */

export * as Escena from './escena/index.js';

export {
  MANIFEST, CATEGORIAS, PALETAS, EXPRESIONES, Z_ORDER, VERSION,
  porDefecto, normalizar, componer, aDataUrl, aPng,
  aCodigo, deCodigo, aleatorio, expresionDeTexto, definirElemento,
} from './hilaravatar/hilaravatar.js';

export type {
  Categoria, CategoriaDef, ClaveColor, ConfigAvatar, Encuadre,
  Expresion, Manifest, Opcion, OpcionesRender, Tono,
} from './hilaravatar/hilaravatar.js';

export * from './chat/index.js';

export { crearApiXhatin, MOTIVOS_DENUNCIA } from './api/xhatin.js';
export type {
  ApiXhatin, Bloqueado, ConfigApiXhatin, FotoNativa, IdEstilo, MiCaricatura,
  MotivoDenuncia, PerfilXhatin, PersonajePublico, Resultado, ResultadoCaricatura,
} from './api/xhatin.js';

export {
  ESTILOS, ESTILO_POR_DEFECTO, LETRAS, opcionDe, prepararFuentes,
  cargarCaricatura, conCaricaturas, repartir, usoDe,
} from './estilos/catalogo.js';
export type { Letra, OpcionEstilo } from './estilos/catalogo.js';
