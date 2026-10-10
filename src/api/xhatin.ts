import { refinadorRemoto } from '../escena/interpretacion/refinador-remoto.js';
import type { Refinador } from '../escena/interpretacion/interprete.js';
import type { Existen } from '../chat/entorno.js';

/**
 * El API de Xhatín en dhcore: los personajes que se pueden elegir, el estilo
 * y el personaje de cada usuario, su caricatura por foto y el refinador de IA.
 *
 *   GET    /xhatin/personajes              pública: nombre y descripción
 *   GET    /xhatin/perfil                  mi estilo y mi personaje
 *   PUT    /xhatin/perfil                  cambiarlos
 *   GET    /xhatin/perfiles?usuarios=      los de los participantes
 *   GET    /xhatin/caricatura              mi caricatura por foto
 *   POST   /xhatin/caricatura/foto         subir la foto (con consentimiento)
 *   POST   /xhatin/caricatura/repetir      otra hoja con la misma foto
 *   POST   /xhatin/caricatura/aprobar      fabricar la biblioteca
 *   DELETE /xhatin/caricatura              borrarla
 *   POST   /xhatin/interpretar             el refinador de IA
 *   GET    /xhatin/existen                 qué usuarios y grupos conoce este entorno
 *   POST   /xhatin/privado/<uuid>          abrir el chat privado con alguien
 *   POST   /xhatin/denuncias               denunciar un mensaje
 *   GET    /xhatin/bloqueos                a quién he bloqueado
 *   PUT    /xhatin/bloqueos/<uuid>         bloquear a alguien
 *   DELETE /xhatin/bloqueos/<uuid>         desbloquearle
 *
 * No sabe de dónde salen la URL ni la sesión: se las da quien lo crea. La web
 * (xhatin) las lee de DhPortero, que es como el shell las comparte con sus
 * remotes; la app, de su sesión de Auth0 y de su configuración.
 *
 * Todo falla en silencio (null o {}): sin API, el chat sigue con los valores
 * por defecto. No es un dato del que dependa pintar la conversación.
 */

export type IdEstilo = 'jovenes' | 'caricatura';

export interface PersonajePublico {
  slug: string;
  estilo: string;
  nombre: string;
  descripcion: string;
}

export interface PerfilXhatin {
  estilo: IdEstilo | null;
  personaje: string | null;
  /**
   * Si ha aceptado las normas del chat (NORMAS_XHATIN). Para aceptarlas,
   * `guardarMiPerfil({ normas: true })`; no se pueden «desaceptar».
   */
  normas?: boolean;
  /** Manifiesto de su caricatura propia, si la tiene lista (ruta de la API). */
  caricatura?: string;
}

/** Mi caricatura propia (hecha a partir de una foto mía). */
export interface MiCaricatura {
  estado: 'hoja_en_cola' | 'hoja_lista' | 'generando' | 'lista' | 'error' | null;
  progreso?: number;
  error?: string | null;
  /** URL absoluta de la hoja de modelo para revisarla. */
  hoja?: string | null;
  /** URL absoluta del manifiesto, cuando está lista. */
  manifiesto?: string | null;
  tieneFoto?: boolean;
  hojasRestantes: number;
  bibliotecasRestantes?: number;
  /** La función está encendida en el servidor (XHATIN_CARICATURAS). */
  disponible?: boolean;
}

/**
 * Una foto tal como la sube React Native: su `FormData` no lleva un Blob sino
 * la referencia al archivo.
 */
export interface FotoNativa {
  uri: string;
  name: string;
  type: string;
}

/** El estado de la caricatura tras una acción, o el error para enseñarlo. */
export interface ResultadoCaricatura {
  caricatura: MiCaricatura | null;
  error: string | null;
}

/**
 * Por qué se denuncia un mensaje, con el texto para enseñarlo. Son los mismos
 * que acepta dhcore (XhatinDenuncia::MOTIVOS).
 */
export const MOTIVOS_DENUNCIA = {
  spam: 'Spam o publicidad',
  acoso: 'Acoso o insultos',
  odio: 'Odio o discriminación',
  sexual: 'Contenido sexual',
  violencia: 'Violencia o amenazas',
  otro: 'Otro motivo',
} as const;
export type MotivoDenuncia = keyof typeof MOTIVOS_DENUNCIA;

/** Alguien a quien he bloqueado. */
export interface Bloqueado {
  id: string;
  nombre: string;
  /** Su código HilarAvatar, o null si no tiene. */
  avatar: string | null;
}

/** Lo que devuelve una acción que puede fallar con un mensaje para enseñar. */
export interface Resultado<T> {
  datos: T | null;
  error: string | null;
}

export interface ConfigApiXhatin {
  /**
   * URL base del API de dhcore, sin barra final. Es una función porque puede
   * llegar más tarde (en la web la fija el shell al arrancar). Sin ella, todas
   * las llamadas devuelven null.
   */
  url: () => string | null | undefined;
  /** El token de la sesión, o null si no hay. Se pide en cada llamada: caduca. */
  token: () => Promise<string | null | undefined>;
  /** Por defecto, el `fetch` global. Para los tests. */
  fetch?: typeof fetch;
}

export interface ApiXhatin {
  /** La URL base del API ahora mismo, o null. */
  url(): string | null;
  /** Las cabeceras con el token de la sesión, si la hay. */
  cabeceras(): Promise<Record<string, string>>;
  /** Ruta de la API → URL absoluta. Las absolutas se quedan como están. */
  absoluta(ruta: string | null | undefined): string | null;
  leerPersonajes(): Promise<PersonajePublico[] | null>;
  leerMiPerfil(): Promise<PerfilXhatin | null>;
  /** Solo cambia lo que se pase: `{ estilo }` no toca el personaje, y al revés. */
  guardarMiPerfil(cambio: Partial<PerfilXhatin>): Promise<PerfilXhatin | null>;
  /** Los de los participantes, por id de usuario (solo uuid; hasta 50). */
  leerPerfiles(usuarios: readonly string[]): Promise<Record<string, PerfilXhatin>>;
  leerMiCaricatura(): Promise<MiCaricatura | null>;
  /** Sube la foto, con el consentimiento. Ver `subirFoto` más abajo. */
  subirFoto(foto: Blob | FotoNativa): Promise<ResultadoCaricatura>;
  accionCaricatura(accion: 'repetir' | 'aprobar' | 'borrar'): Promise<ResultadoCaricatura>;
  /**
   * De estos usuarios y grupos, los que conoce el API (para separar las
   * conversaciones de cada entorno, ver chat/entorno). Pregunta de 100 en 100;
   * null si alguna consulta falla.
   */
  leerExisten(usuarios: readonly string[], grupos: readonly string[]): Promise<Existen | null>;
  /**
   * El refinador de IA contra `POST /xhatin/interpretar`, o null si no se sabe
   * dónde está el API: entonces el chat sigue con las reglas.
   */
  refinador(): Refinador | null;
  /**
   * El chat privado con alguien: el id de su canal de Stream. Lo crea dhcore
   * si compartís un grupo y ninguno ha bloqueado al otro; si no, el error dice
   * por qué.
   */
  abrirPrivado(usuario: string): Promise<Resultado<string>>;
  /** Denuncia un mensaje (su id en Stream). Repetir la misma denuncia no suma. */
  denunciar(mensaje: string, motivo: MotivoDenuncia, comentario?: string): Promise<Resultado<true>>;
  /** A quién he bloqueado; null si no se puede saber. */
  leerBloqueos(): Promise<Bloqueado[] | null>;
  /** Bloquea a alguien. Devuelve la lista ya con él. */
  bloquear(usuario: string): Promise<Resultado<Bloqueado[]>>;
  /** Le desbloquea. Devuelve la lista ya sin él. */
  desbloquear(usuario: string): Promise<Resultado<Bloqueado[]>>;
}

const SIN_CONEXION = 'Sin conexión con Diario Hilario.';

export function crearApiXhatin(config: ConfigApiXhatin): ApiXhatin {
  const red = config.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  const url = (): string | null => config.url()?.replace(/\/+$/, '') || null;

  async function cabeceras(): Promise<Record<string, string>> {
    const token = await config.token().catch(() => null);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function absoluta(ruta: string | null | undefined): string | null {
    const base = url();
    return ruta && base ? new URL(ruta, base + '/').href : null;
  }

  async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T | null> {
    const base = url();
    if (!base) return null;
    try {
      const r = await red(`${base}${ruta}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(await cabeceras()), ...(init.headers ?? {}) },
      });
      return r.ok ? ((await r.json()) as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Llamada que devuelve el cuerpo aunque sea un error: los mensajes de la
   * caricatura («has llegado al límite…») son para enseñarlos.
   */
  async function pedirConError<T>(ruta: string, init: RequestInit = {}): Promise<{ ok: boolean; datos: T | null; error: string | null }> {
    const base = url();
    if (!base) return { ok: false, datos: null, error: SIN_CONEXION };
    try {
      const r = await red(`${base}${ruta}`, { ...init, headers: { ...(await cabeceras()), ...(init.headers ?? {}) } });
      const cuerpo = (await r.json().catch(() => null)) as { message?: string; error?: string } | null;
      const error = r.ok ? null : (cuerpo?.message ?? cuerpo?.error ?? 'Algo ha fallado. Vuelve a intentarlo.');
      return { ok: r.ok, datos: cuerpo as T, error };
    } catch {
      return { ok: false, datos: null, error: SIN_CONEXION };
    }
  }

  const conUrls = (c: MiCaricatura | null): MiCaricatura | null =>
    c && { ...c, hoja: absoluta(c.hoja), manifiesto: absoluta(c.manifiesto) };

  return {
    url,
    cabeceras,
    absoluta,

    leerPersonajes: () => pedir<PersonajePublico[]>('/xhatin/personajes'),
    leerMiPerfil: () => pedir<PerfilXhatin>('/xhatin/perfil'),
    guardarMiPerfil: (cambio) => pedir<PerfilXhatin>('/xhatin/perfil', { method: 'PUT', body: JSON.stringify(cambio) }),

    async leerPerfiles(usuarios) {
      const ids = [...new Set(usuarios)].filter((id) => UUID.test(id));
      if (!ids.length) return {};
      return (await pedir<Record<string, PerfilXhatin>>(`/xhatin/perfiles?usuarios=${ids.join(',')}`)) ?? {};
    },

    async leerMiCaricatura() {
      const r = await pedirConError<MiCaricatura>('/xhatin/caricatura');
      return r.ok ? conUrls(r.datos) : null;
    },

    async subirFoto(foto) {
      const cuerpo = new FormData();
      if (esFotoNativa(foto)) cuerpo.append('foto', foto as unknown as Blob);
      else cuerpo.append('foto', await reducir(foto), 'foto.jpg');
      cuerpo.append('consentimiento', 'si');
      const r = await pedirConError<MiCaricatura>('/xhatin/caricatura/foto', { method: 'POST', body: cuerpo });
      return { caricatura: r.ok ? conUrls(r.datos) : null, error: r.error };
    },

    async accionCaricatura(accion) {
      const r =
        accion === 'borrar'
          ? await pedirConError<MiCaricatura>('/xhatin/caricatura', { method: 'DELETE' })
          : await pedirConError<MiCaricatura>(`/xhatin/caricatura/${accion}`, { method: 'POST' });
      return { caricatura: r.ok ? conUrls(r.datos) : null, error: r.error };
    },

    async leerExisten(usuarios, grupos) {
      const resultado: Existen = { usuarios: [], grupos: [] };
      const vueltas = Math.max(Math.ceil(usuarios.length / MAX_EXISTEN), Math.ceil(grupos.length / MAX_EXISTEN));
      for (let i = 0; i < vueltas; i++) {
        const u = usuarios.slice(i * MAX_EXISTEN, (i + 1) * MAX_EXISTEN);
        const g = grupos.slice(i * MAX_EXISTEN, (i + 1) * MAX_EXISTEN);
        const r = await pedir<Partial<Existen>>(
          `/xhatin/existen?usuarios=${encodeURIComponent(u.join(','))}&grupos=${encodeURIComponent(g.join(','))}`,
        );
        if (!r || !Array.isArray(r.usuarios) || !Array.isArray(r.grupos)) return null;
        resultado.usuarios.push(...r.usuarios);
        resultado.grupos.push(...r.grupos);
      }
      return resultado;
    },

    refinador() {
      const base = url();
      return base ? refinadorRemoto({ url: `${base}/xhatin/interpretar`, cabeceras, fetch: config.fetch }) : null;
    },

    async abrirPrivado(usuario) {
      if (!UUID.test(usuario)) return { datos: null, error: 'No se sabe con quién abrir la conversación.' };
      const r = await pedirConError<{ canal?: string }>(`/xhatin/privado/${usuario.toLowerCase()}`, { method: 'POST', headers: JSON_ });
      return r.ok && r.datos?.canal ? { datos: r.datos.canal, error: null } : { datos: null, error: r.error ?? 'No se ha podido abrir la conversación.' };
    },

    async denunciar(mensaje, motivo, comentario) {
      const r = await pedirConError<{ denuncia: string | null }>('/xhatin/denuncias', {
        method: 'POST',
        headers: JSON_,
        body: JSON.stringify({ mensaje, motivo, ...(comentario?.trim() ? { comentario: comentario.trim() } : {}) }),
      });
      return r.ok ? { datos: true, error: null } : { datos: null, error: r.error };
    },

    async leerBloqueos() {
      const r = await pedir<{ bloqueados?: Bloqueado[] }>('/xhatin/bloqueos');
      return Array.isArray(r?.bloqueados) ? r.bloqueados : null;
    },

    bloquear: (usuario) => cambiarBloqueo(usuario, 'PUT'),
    desbloquear: (usuario) => cambiarBloqueo(usuario, 'DELETE'),
  };

  async function cambiarBloqueo(usuario: string, method: 'PUT' | 'DELETE'): Promise<Resultado<Bloqueado[]>> {
    if (!UUID.test(usuario)) return { datos: null, error: 'No se sabe a quién.' };
    const r = await pedirConError<{ bloqueados?: Bloqueado[] }>(`/xhatin/bloqueos/${usuario.toLowerCase()}`, { method });
    return r.ok && Array.isArray(r.datos?.bloqueados) ? { datos: r.datos.bloqueados, error: null } : { datos: null, error: r.error ?? 'No se ha podido.' };
  }
}

const JSON_ = { 'Content-Type': 'application/json' };

const UUID = /^[0-9a-f-]{36}$/i;

/** Lo más que acepta dhcore en `/xhatin/existen` por consulta de cada lista. */
const MAX_EXISTEN = 100;

function esFotoNativa(foto: Blob | FotoNativa): foto is FotoNativa {
  return typeof (foto as FotoNativa).uri === 'string';
}

/**
 * Reduce la foto en el navegador antes de subirla: 1600 px como mucho y JPEG.
 * Una foto de móvil (3-8 MB) queda en unos cientos de KB, sube antes, no
 * choca con los límites del servidor y ya no lleva los metadatos del móvil
 * (ubicación incluida). Si no hay navegador, o no sabe, se sube tal cual: la
 * app la reduce antes, en su lado nativo.
 */
async function reducir(foto: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return foto;
  try {
    const img = await createImageBitmap(foto, { imageOrientation: 'from-image' });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.width * k);
    lienzo.height = Math.round(img.height * k);
    lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    img.close();
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.9));
    return blob ?? foto;
  } catch {
    return foto;
  }
}
