# xhatin-motor

Paquete **`@diariohilario/xhatin-motor`**: el motor de Xhatín sin framework.
HilarAvatar (los avatares por piezas) y el motor de escena, que convierte una
conversación en viñetas de cómic.

Lo comparten los dos proyectos mellizos de Xhatín:

- **xhatin**: el remote de Angular que el shell de Diario Hilario carga en la web.
- **diario-hilario-mobile**: la app de Expo / React Native.

Una sola copia del motor es lo que hace que la web y el móvil dibujen igual.

Los avatares de HilarAvatar son los de todo el ecosistema DiarioHilario: un
usuario es el mismo personaje en el diario, en el chat y, a futuro, en
HilarioWorld (en 3D y en VR; cómo se hará ese personaje está por decidir). Por
eso el código `v1|…` es un contrato compartido: no se cambia su formato sin
subir versión, y cada pieza o expresión nueva se anota en el CHANGELOG.

## Qué se importa

| Ruta | Qué es |
|---|---|
| `@diariohilario/xhatin-motor` | Todo junto: HilarAvatar, `Escena` (como espacio de nombres) y el contrato del chat |
| `…/escena` | Motor de escena: `Director`, `componerVineta`, `CATALOGO`, `refinadorRemoto`… y lo que rodea a la tira: `paginar`, `componerPortada`, `vinetaEscribiendo` |
| `…/escena/*` | Módulos sueltos del motor, p. ej. `escena/pruebas/conversaciones` (los usa el laboratorio) |
| `…/avatar` | HilarAvatar: `componer`, `aCodigo`, `deCodigo`, `aleatorio`, `expresionDeTexto`… |
| `…/piezas` | Los datos de las piezas del avatar |
| `…/chat` | `PuertoChat` (lo implementa quien tenga el cliente de chat), `PuertoChatFalso`, `ControladorComic`, la conversación como cómic sin framework, `puertoStream`, el puerto sobre un canal de Stream, `interlocutores`/`conQuien` para la cabecera «Hablando con…», la lista de conversaciones (`resumenDe`) y qué conversaciones son de cada entorno (`filtrarPorEntorno`) |
| `…/api` | `crearApiXhatin({ url, token })`: el API de Xhatín en dhcore (perfiles, personajes, caricatura y refinador de IA). La URL y el token se los da quien lo usa |
| `…/estilos` | Los estilos de cómic (`ESTILOS`, `opcionDe`), su letra (`LETRAS`, `prepararFuentes`), el reparto de personajes (`repartir`, `usoDe`) y las caricaturas propias |
| `…/vineta.css` | La hoja de las viñetas: las animaciones, colgadas de `.dh-vineta`, y la página (`.dh-pagina`) y la portada (`.dh-portada`) |

```ts
import { aleatorio, componer } from '@diariohilario/xhatin-motor';
import { Director, componerVineta, CATALOGO } from '@diariohilario/xhatin-motor/escena';

const director = new Director();
const { vineta } = director.procesar(mensaje);
contenedor.innerHTML = componerVineta(vineta, CATALOGO).svg;
```

`componerVineta` admite, además de `novedades`, `animar` y `estilo`, tres
opciones para viñetas pequeñas (las usa la app móvil, con dos por fila):
`escalaLetra` agranda la letra de los globos, `separacion` los junta y
`desborde` les deja salirse por encima del marco. Con `desborde`, la viñeta
tiene que llevar la clase `dh-vineta--desborda` para no recortarlos.

La tira se pinta como una página de cómic: el contenedor lleva `.dh-pagina`
y `--dh-columnas` (`.dh-pagina--una` con una columna), cada viñeta ancha
`.dh-pagina__ancha`, y `paginar(tira, columnas)` cambia el formato de alguna
viñeta para que las filas queden llenas. Encima, `componerPortada` (con
`numeroDeTira` y `estado.titulo` del controlador); al final, mientras alguien
escribe, `vinetaEscribiendo(estado.escribiendo)`, con la clase
`dh-vineta--escribiendo`. Las viñetas de tensión llevan `dh-vineta--tension`.

La letra de los globos se sirve desde el propio proyecto:
`prepararFuentes(opcion, base)` carga de `base` los archivos de `LETRAS`
(Comic Neue, Bangers y Patrick Hand, de licencia OFL) y dice si hay que
volver a componer. Sin ellos se queda la letra del sistema.

El motor de escena va como espacio de nombres en la raíz porque comparte
nombres con HilarAvatar: el `normalizar` del léxico no es el del avatar.

## Qué no está aquí

- **Componentes de Angular**: el selector, el cómic y la viñeta se quedan en el
  remote. Aquí solo hay lo que no depende de ningún framework.
- **El cliente de Stream**: lo pone quien tiene la conexión (el shell en la
  web, la app en el móvil). El motor no importa `stream-chat`: `puertoStream`
  recibe el canal ya creado y solo usa cinco cosas de él (`CanalStream`).
- **DhPortero**: es como el shell comparte la sesión con sus remotes, y solo
  existe en la web. El motor no lo usa: el API recibe la URL y el token, y
  los estilos, dónde están sus imágenes.
- **Las imágenes del estilo caricatura** (`public/estilos/`, unos 4 MB): las
  sirve el remote.

## Navegador y Node

El motor es puro salvo en dos sitios: `medidorCanvas`, que mide el texto de los
globos con un canvas (sin él se usa `medirEstimado`), y `aPng`. El resto
funciona igual en Node (SSR y tests).

Es ESM estándar, con la extensión `.js` en cada import relativo
(`moduleResolution: NodeNext` lo exige al compilar). Así sirve tanto a los
empaquetadores (Angular con esbuild, Metro) como a quien lo carga directamente
con Node, que es lo que hacen los tests de Angular con lo que hay en
`node_modules`.

## Instalarlo

Por tag de git, igual que `@diariohilario/portero`:

```bash
npm install github:cointreau17/xhatin-motor#v0.1.0
```

El repo es privado: donde se instale sin tu clave SSH (el CI de xhatin, EAS
Build de la app) hará falta un token de GitHub con permiso de lectura.

Mientras no haya tag, xhatin lo usa desde este checkout:
`"@diariohilario/xhatin-motor": "file:../../xhatin-motor"` en
`remote-angular/package.json`. npm lo enlaza y no lo compila, así que después
de cambiar el motor hay que ejecutar aquí `npm run build` (o dejar
`npx tsc -p tsconfig.build.json --watch`) y reiniciar el dev server de xhatin,
que empaqueta al arrancar. Ese `file:` no se puede subir: el CI de xhatin no
tiene esta carpeta.

`dist/` no se versiona: instalado desde git, el paquete se compila solo
(script `prepare`).
npm 11 avisa de que es un script sin revisar. Sigue ejecutándolo, pero si algún
día lo bloquea, se aprueba con
`npm install-scripts approve @diariohilario/xhatin-motor`.

## Comandos

```bash
npm run build       # dist/: tsc + copia de HilarAvatar (JS) y vineta.css
npm run clean       # borra dist/ (build no lo hace, para no dejar sin motor a quien lo usa)
npm run typecheck
npm test            # tests del motor de escena y de HilarAvatar (vitest)
npm run check       # las tres cosas
npm run piezas      # regenera src/hilaravatar/piezas.js desde hilaravatar/
```

## Las piezas de HilarAvatar

Los dibujos están en `hilaravatar/`: `manifest.json` (categorías, opciones,
paletas, expresiones) y un SVG por pieza en `piezas/<categoría>/<id>.svg`,
completo y de 512×512, para abrirlo y retocarlo en cualquier editor. De ahí
sale `src/hilaravatar/piezas.js`, que no se edita a mano: después de tocar
un dibujo, `npm run piezas` (con `-- --check` solo comprueba que está al día).

Todo se dibuja sobre la cabeza ovalada. Para que encaje en las demás, el
generador mide cada cabeza (el contorno marcado con `data-contorno="cara"` y
las orejas) y las piezas dicen en sus grupos cómo ajustarse:

| Marca | Qué hace |
|---|---|
| `data-ajuste="craneo"`, `"mandibula"`, `"barbilla"`, `"orejas"`, `"oreja-izquierda"`, `"brazo-derecho"`… | un `transform` medido que lleva la ovalada a esa cabeza (pelo, sombreros, perillas, gafas…) |
| `data-recorte="cara"` | recorta el grupo por el contorno de la cara (barbas) |
| `<path data-repaso="cara"/>` | vuelve a trazar el contorno de la cara encima de lo recortado |
| `data-pegado="cara-izquierda"` / `"cara-derecha"` | lo redibuja para cada cabeza pegado a su borde y sin meterse en los ojos (patillas) |
| `<g class="dh-bigote">` dentro de una barba | se pinta encima de la boca; el resto de la barba, debajo de ojos y boca |

Algunas piezas se dibujan con cuentas (ondas, puntos, simetrías) en
`scripts/redibujar.py`; si se retoca a mano una de ellas, no volver a
ejecutarlo o se pierde el retoque.

## De dónde sale

Sacado del remote de xhatin (`remote-angular/src/app`, commit `9e60a9b`, del
28-09-2026), sin más cambio que la extensión `.js` en los imports relativos:

- `escena/` entera, con sus tests;
- de `hilaravatar/`: `hilaravatar.js`, `piezas.js` y sus `.d.ts`,
  `puerto-chat.ts`, `puerto-falso.ts` y `vineta.css`.

El `piezas.js` era el del remote, no el de `src/` en la raíz de xhatin: el de
la raíz no tiene el arreglo `10b132b` (atributos repetidos que rompían
`aDataUrl` y `aPng`). Desde la 0.11.0 se genera desde `hilaravatar/` (ver «Las
piezas de HilarAvatar»), y las copias de `assets/hilaravatar` de xhatin ya no
son el origen.

El remote ya no tiene su copia: importa de aquí. Los cambios del motor se
hacen en este repo.
