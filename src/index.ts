/**
 * Motor de Xhatín, sin framework. Lo comparten xhatin (el remote de Angular)
 * y diario-hilario-mobile (React Native): la misma superficie que el `./Api`
 * del remote, menos los componentes de Angular.
 *
 *   import { aleatorio, componer, Escena } from '@diariohilario/xhatin-motor';
 *   import { Director, componerVineta } from '@diariohilario/xhatin-motor/escena';
 *
 * El motor de escena va como espacio de nombres porque comparte nombres con
 * HilarAvatar (`normalizar`, del léxico, no es el `normalizar` del avatar).
 */

export * as Escena from './escena';

export {
  MANIFEST, CATEGORIAS, PALETAS, EXPRESIONES, Z_ORDER, VERSION,
  porDefecto, normalizar, componer, aDataUrl, aPng,
  aCodigo, deCodigo, aleatorio, expresionDeTexto, definirElemento,
} from './hilaravatar/hilaravatar';

export type {
  Categoria, CategoriaDef, ClaveColor, ConfigAvatar, Encuadre,
  Expresion, Manifest, Opcion, OpcionesRender, Tono,
} from './hilaravatar/hilaravatar';

export * from './chat';
