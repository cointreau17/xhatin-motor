/**
 * Tipos de HilarAvatar. Acompanan al motor en JavaScript plano: asi hay una
 * sola implementacion, compartida por el remote de Angular, por los remotes
 * que no son Angular y por cualquier script suelto.
 */

export type Categoria =
  | 'fondo' | 'pelo-tras' | 'cuerpo' | 'cabeza' | 'cejas' | 'ojos'
  | 'nariz' | 'boca' | 'barba' | 'pelo' | 'gafas' | 'sombrero' | 'extra';

export type ClaveColor = 'piel' | 'pelo' | 'ropa' | 'fondo';

export type Encuadre = 'completo' | 'busto' | 'cara';

export interface Opcion {
  id: string;
  nombre: string;
  rol: 'base' | 'expresion';
  tags: string[];
  req: Partial<Record<Categoria, string>>;
}

export interface CategoriaDef {
  id: Categoria;
  nombre: string;
  obligatoria: boolean;
  oculta: boolean;
  opciones: Opcion[];
}

export interface Tono {
  id: string;
  nombre: string;
  color: string;
  sombra?: string;
  secundario?: string;
}

export interface Expresion {
  nombre: string;
  slots: Partial<Record<Categoria, string>>;
}

export interface ConfigAvatar {
  v: number;
  piezas: Record<Categoria, string>;
  colores: Record<ClaveColor, string>;
}

export interface OpcionesRender {
  /** Lado en px. `null` deja que lo decida el CSS. */
  tam?: number | null;
  expresion?: string;
  clase?: string;
  /** Si se indica, se anade un <title> y el SVG pasa a role="img". */
  titulo?: string;
  solo?: Categoria[];
  omitir?: Categoria[];
  encuadre?: Encuadre;
  /** 'recorte' rellena huecos no cuadrados (vinetas apaisadas). */
  ajuste?: 'recorte';
  /** Por defecto true. Ver la documentacion del motor. */
  idsUnicos?: boolean;
}

export interface Manifest {
  nombre: string;
  version: number;
  lienzo: { ancho: number; alto: number };
  zOrder: Categoria[];
  categorias: CategoriaDef[];
  paletas: Record<ClaveColor, Tono[]>;
  expresiones: Record<string, Expresion>;
  porDefecto: { piezas: Record<Categoria, string>; colores: Record<ClaveColor, string> };
}

export declare const MANIFEST: Manifest;
export declare const CATEGORIAS: CategoriaDef[];
export declare const PALETAS: Record<ClaveColor, Tono[]>;
export declare const EXPRESIONES: Record<string, Expresion>;
export declare const Z_ORDER: Categoria[];
export declare const VERSION: number;

export declare function porDefecto(): ConfigAvatar;
export declare function normalizar(config: Partial<ConfigAvatar> | null | undefined): ConfigAvatar;
export declare function componer(config: Partial<ConfigAvatar> | null | undefined, op?: OpcionesRender): string;
export declare function aDataUrl(config: Partial<ConfigAvatar> | null | undefined, op?: OpcionesRender): string;
export declare function aPng(config: Partial<ConfigAvatar> | null | undefined, op?: OpcionesRender): Promise<Blob>;
export declare function aCodigo(config: Partial<ConfigAvatar> | null | undefined): string;
export declare function deCodigo(codigo: string | null | undefined): ConfigAvatar;
export declare function aleatorio(semilla?: string | number): ConfigAvatar;
export declare function expresionDeTexto(texto: string): string;
export declare function definirElemento(nombre?: string): void;
