/**
 * El cliente del API de Xhatín, con un `fetch` falso que apunta lo que se pide.
 */

import { Director } from '../escena/director/director.js';
import { InterpreteReglas } from '../escena/interpretacion/interprete.js';
import { crearApiXhatin, type ConfigApiXhatin } from './xhatin.js';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

interface Peticion {
  url: string;
  init: RequestInit;
}

/** Un fetch que contesta `respuesta` y apunta cada petición. */
function fetchFalso(respuesta: (p: Peticion) => Response = () => new Response('{}')) {
  const peticiones: Peticion[] = [];
  const fn = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const p = { url: String(url), init };
    peticiones.push(p);
    return respuesta(p);
  }) as typeof fetch;
  return { fn, peticiones };
}

function api(op: Partial<ConfigApiXhatin> = {}, respuesta?: (p: Peticion) => Response) {
  const red = fetchFalso(respuesta);
  const cliente = crearApiXhatin({
    url: () => 'https://api.prueba/',
    token: async () => 'tok',
    fetch: red.fn,
    ...op,
  });
  return { cliente, peticiones: red.peticiones };
}

const cabecera = (p: Peticion, nombre: string) => (p.init.headers as Record<string, string> | undefined)?.[nombre];

describe('API de Xhatín', () => {
  it('pide a la URL que le dan, con el token de la sesión', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify({ estilo: 'caricatura', personaje: 'lara' })));
    expect(await cliente.leerMiPerfil()).toEqual({ estilo: 'caricatura', personaje: 'lara' });
    expect(peticiones[0]!.url).toBe('https://api.prueba/xhatin/perfil');
    expect(cabecera(peticiones[0]!, 'Authorization')).toBe('Bearer tok');
  });

  it('sin token no manda Authorization, y si el token falla sigue sin él', async () => {
    const sinToken = api({ token: async () => null });
    await sinToken.cliente.leerPersonajes();
    expect(cabecera(sinToken.peticiones[0]!, 'Authorization')).toBeUndefined();

    const falla = api({ token: () => Promise.reject(new Error('caducado')) });
    await falla.cliente.leerPersonajes();
    expect(cabecera(falla.peticiones[0]!, 'Authorization')).toBeUndefined();
  });

  it('sin URL del API no pide nada y todo devuelve vacío', async () => {
    const { cliente, peticiones } = api({ url: () => null });
    expect(await cliente.leerMiPerfil()).toBeNull();
    expect(await cliente.leerPerfiles([A])).toEqual({});
    expect(await cliente.subirFoto(new Blob(['x']))).toEqual({ caricatura: null, error: 'Sin conexión con Diario Hilario.' });
    expect(cliente.refinador()).toBeNull();
    expect(cliente.absoluta('/xhatin/x')).toBeNull();
    expect(peticiones).toHaveLength(0);
  });

  it('un error de red o del servidor también devuelve vacío', async () => {
    const red = api({}, () => {
      throw new Error('sin red');
    });
    expect(await red.cliente.leerMiPerfil()).toBeNull();
    const servidor = api({}, () => new Response('{}', { status: 500 }));
    expect(await servidor.cliente.leerMiPerfil()).toBeNull();
  });

  it('guardar mi perfil solo manda lo que cambia', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify({ estilo: 'caricatura', personaje: null })));
    await cliente.guardarMiPerfil({ estilo: 'caricatura' });
    expect(peticiones[0]!.init.method).toBe('PUT');
    expect(JSON.parse(String(peticiones[0]!.init.body))).toEqual({ estilo: 'caricatura' });
  });

  it('los perfiles de los participantes: solo uuid, sin repetir', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify({ [A]: { estilo: null, personaje: 'larry' } })));
    const r = await cliente.leerPerfiles([A, A, B, 'u-falso']);
    expect(r[A]?.personaje).toBe('larry');
    expect(peticiones[0]!.url).toBe(`https://api.prueba/xhatin/perfiles?usuarios=${A},${B}`);
    expect(await api().cliente.leerPerfiles(['u-falso'])).toEqual({});
  });

  it('la caricatura vuelve con URLs absolutas', async () => {
    const { cliente } = api({}, () =>
      new Response(JSON.stringify({ estado: 'lista', hojasRestantes: 2, hoja: '/xhatin/caricaturas/abc/hoja.png', manifiesto: '/xhatin/caricaturas/abc/manifiesto.json' })),
    );
    const c = await cliente.leerMiCaricatura();
    expect(c?.hoja).toBe('https://api.prueba/xhatin/caricaturas/abc/hoja.png');
    expect(c?.manifiesto).toBe('https://api.prueba/xhatin/caricaturas/abc/manifiesto.json');
  });

  it('un error de la caricatura trae el mensaje del servidor para enseñarlo', async () => {
    const { cliente } = api({}, () => new Response(JSON.stringify({ message: 'Has llegado al límite de hoy.' }), { status: 429 }));
    expect(await cliente.accionCaricatura('repetir')).toEqual({ caricatura: null, error: 'Has llegado al límite de hoy.' });
  });

  it('las acciones de la caricatura van a su sitio', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify({ estado: null, hojasRestantes: 3 })));
    await cliente.accionCaricatura('aprobar');
    await cliente.accionCaricatura('borrar');
    expect(peticiones.map((p) => `${p.init.method} ${p.url}`)).toEqual([
      'POST https://api.prueba/xhatin/caricatura/aprobar',
      'DELETE https://api.prueba/xhatin/caricatura',
    ]);
  });

  it('sube la foto con el consentimiento; la de React Native, tal cual', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify({ estado: 'hoja_en_cola', hojasRestantes: 3 })));
    const r = await cliente.subirFoto(new Blob(['foto'], { type: 'image/jpeg' }));
    expect(r.error).toBeNull();
    const cuerpo = peticiones[0]!.init.body as FormData;
    expect(peticiones[0]!.url).toBe('https://api.prueba/xhatin/caricatura/foto');
    expect(cuerpo.get('consentimiento')).toBe('si');
    expect(cuerpo.get('foto')).toBeInstanceOf(Blob);
    // Sin JSON: el navegador pone el multipart con su frontera.
    expect(cabecera(peticiones[0]!, 'Content-Type')).toBeUndefined();
  });

  it('el refinador de IA va a /xhatin/interpretar', async () => {
    const { cliente, peticiones } = api({}, () => new Response(JSON.stringify(null)));
    const refinador = cliente.refinador();
    expect(refinador).not.toBeNull();
    const mensaje = { id: 'm1', texto: 'Pues vaya, qué bien', autorId: A, autorNombre: 'Ana', avatar: null, fecha: new Date() };
    const ctx = new Director().contextoPara(mensaje);
    await refinador!.refinar(mensaje, ctx, new InterpreteReglas().interpretar(mensaje, ctx));
    expect(peticiones[0]?.url).toBe('https://api.prueba/xhatin/interpretar');
    expect(cabecera(peticiones[0]!, 'Authorization')).toBe('Bearer tok');
  });

  it('absoluta deja las URL absolutas como están', () => {
    const { cliente } = api();
    expect(cliente.absoluta('/xhatin/x.json')).toBe('https://api.prueba/xhatin/x.json');
    expect(cliente.absoluta('https://otra.prueba/y.json')).toBe('https://otra.prueba/y.json');
    expect(cliente.url()).toBe('https://api.prueba');
  });
});
