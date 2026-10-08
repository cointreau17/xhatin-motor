# xhatin-motor

Paquete **`@diariohilario/xhatin-motor`**: el motor de Xhatín sin framework.
HilarAvatar (los avatares por piezas) y el motor de escena, que convierte una
conversación en viñetas de cómic.

Lo comparten los dos proyectos mellizos de Xhatín:

- **xhatin**: el remote de Angular que el shell de Diario Hilario carga en la web.
- **diario-hilario-mobile**: la app de Expo / React Native.

Una sola copia del motor es lo que hace que la web y el móvil dibujen igual.

## Qué se importa

| Ruta | Qué es |
|---|---|
| `@diariohilario/xhatin-motor` | Todo junto: HilarAvatar, `Escena` (como espacio de nombres) y el contrato del chat |
| `…/escena` | Motor de escena: `Director`, `componerVineta`, `CATALOGO`, `refinadorRemoto`… |
| `…/escena/*` | Módulos sueltos del motor, p. ej. `escena/pruebas/conversaciones` (los usa el laboratorio) |
| `…/avatar` | HilarAvatar: `componer`, `aCodigo`, `deCodigo`, `aleatorio`, `expresionDeTexto`… |
| `…/piezas` | Los datos de las piezas del avatar |
| `…/chat` | `PuertoChat` (lo implementa quien tenga el cliente de chat) y `PuertoChatFalso` |
| `…/vineta.css` | La hoja de las viñetas: las animaciones, colgadas de `.dh-vineta` |

```ts
import { aleatorio, componer } from '@diariohilario/xhatin-motor';
import { Director, componerVineta, CATALOGO } from '@diariohilario/xhatin-motor/escena';

const director = new Director();
const { vineta } = director.procesar(mensaje);
contenedor.innerHTML = componerVineta(vineta, CATALOGO).svg;
```

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

Los imports internos no llevan extensión: el paquete está pensado para
empaquetadores (el builder de Angular con esbuild, Metro, Vite/Vitest), no para
cargarlo directamente con el ESM de Node.

## Instalarlo

Por tag de git, igual que `@diariohilario/portero`:

```bash
npm install git+ssh://git@gitlab.com/<grupo>/xhatin-motor.git#v0.1.0
```

En local, mientras se desarrolla a la vez que su consumidor:

```bash
npm install ../xhatin-motor
```

`dist/` no se versiona: el paquete se compila al instalarlo (script `prepare`).
npm 11 avisa de que es un script sin revisar. Sigue ejecutándolo, pero si algún
día lo bloquea, se aprueba con
`npm install-scripts approve @diariohilario/xhatin-motor`.

## Comandos

```bash
npm run build       # dist/: tsc + copia de HilarAvatar (JS) y vineta.css
npm run typecheck
npm test            # tests del motor de escena (vitest)
npm run check       # las tres cosas
```

## De dónde sale

Copiado del remote de xhatin (`remote-angular/src/app`, commit `9e60a9b`, del
28-09-2026), sin cambios:

- `escena/` entera, con sus tests;
- de `hilaravatar/`: `hilaravatar.js`, `piezas.js` y sus `.d.ts`,
  `puerto-chat.ts`, `puerto-falso.ts` y `vineta.css`.

El `piezas.js` es el del remote, no el de `src/` en la raíz de xhatin: el de la
raíz no tiene el arreglo `10b132b` (atributos repetidos que rompían `aDataUrl`
y `aPng`).

Hasta que el remote use este paquete, el motor existe en los dos sitios: un
cambio hay que llevarlo a ambos, o mejor, terminar antes la migración.
