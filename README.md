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
| `…/escena` | Motor de escena: `Director`, `componerVineta`, `CATALOGO`, `refinadorRemoto`… |
| `…/escena/*` | Módulos sueltos del motor, p. ej. `escena/pruebas/conversaciones` (los usa el laboratorio) |
| `…/avatar` | HilarAvatar: `componer`, `aCodigo`, `deCodigo`, `aleatorio`, `expresionDeTexto`… |
| `…/piezas` | Los datos de las piezas del avatar |
| `…/chat` | `PuertoChat` (lo implementa quien tenga el cliente de chat), `PuertoChatFalso` y `ControladorComic`, la conversación como cómic sin framework |
| `…/vineta.css` | La hoja de las viñetas: las animaciones, colgadas de `.dh-vineta` |

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

El motor de escena va como espacio de nombres en la raíz porque comparte
nombres con HilarAvatar: el `normalizar` del léxico no es el del avatar.

## Qué no está aquí

- **Componentes de Angular**: el selector, el cómic y la viñeta se quedan en el
  remote. Aquí solo hay lo que no depende de ningún framework.
- **El cliente de Stream**: lo pone quien tiene la conexión (el shell en la
  web, la app en el móvil) implementando `PuertoChat`.
- **`api-xhatin.ts` y `estilos.ts`**: leen el token y la URL del API de
  DhPortero y la URL de los estilos de `import.meta.url`. Vendrán cuando
  reciban esos datos desde fuera.
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
npm test            # tests del motor de escena (vitest)
npm run check       # las tres cosas
```

## De dónde sale

Sacado del remote de xhatin (`remote-angular/src/app`, commit `9e60a9b`, del
28-09-2026), sin más cambio que la extensión `.js` en los imports relativos:

- `escena/` entera, con sus tests;
- de `hilaravatar/`: `hilaravatar.js`, `piezas.js` y sus `.d.ts`,
  `puerto-chat.ts`, `puerto-falso.ts` y `vineta.css`.

El `piezas.js` es el del remote, no el de `src/` en la raíz de xhatin: el de la
raíz no tiene el arreglo `10b132b` (atributos repetidos que rompían `aDataUrl`
y `aPng`).

El remote ya no tiene su copia: importa de aquí. Los cambios del motor se
hacen en este repo.
