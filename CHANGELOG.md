# Cambios

## 0.13.0

La lectura de la IA, una vez por mensaje y para todos:

- **La lectura viaja con el mensaje.**
  - `MensajeEntrada.lectura` y `MensajeChat.lectura` llevan la lectura de la
    IA (`LecturaIA`: emoción, intensidad, globo, tono e intención) si ya se
    guardó.
  - El director la aplica como si el refinador acabara de contestar, el
    mismo parche, y no vuelve a preguntar por ese mensaje (`refinar` devuelve
    `false`).
  - Se valida contra el catálogo (`validarLectura`): una cara que ya no
    existe se ignora y queda lo de las reglas.
  - Así la web y la app dibujan igual el mensaje, también al recargar el
    historial, sin pagar otra vez.
- **El refinador remoto manda `mensajeId`,** para que el servicio (dhcore,
  `POST /xhatin/interpretar`) guarde la lectura en el mensaje.
  `parcheDeLectura` es la conversión de una lectura en cambios de la viñeta,
  pública para el director.
- **Mensajes que cambian.**
  - `PuertoChat.alActualizar` (opcional) avisa de los mensajes ya recibidos
    que cambian.
  - En Stream es `message.updated`, y `mensajeDeStream` lee el campo
    `xhatin_lectura`.
  - `ControladorComic.actualizar(mensaje)` recompone la tira con la lectura
    nueva. Lo llama el puerto o, si los mensajes llegan a mano, quien los
    trae.

## 0.12.0

El cómic, a lo grande:

- **La tira como página de cómic.** Viñetas de esquinas rectas y borde de
  tinta, sin sombra, sobre una página con su trama: `.dh-pagina` con
  `--dh-columnas`, `.dh-pagina__ancha` y `.dh-pagina--una` en vineta.css.
  `paginar(tira, columnas)` cambia el formato de la viñeta de antes cuando
  una fila se iba a quedar con hueco (y da siempre la misma copia, para no
  recomponerla).
- **Bocadillos con carácter.**
  - El grito crece con la intensidad y, si es muy fuerte, tiembla.
  - La onomatopeya va en amarillo con sombra de color y puede salirse del
    marco.
  - La narración va en cartela de esquina con sombra dura.
  - Las palabras con énfasis van en negrita de rotulista: mayúsculas sueltas,
    letras alargadas, `*asteriscos*` y palabras fuertes (`esEnfatica`).
- **«Está escribiendo…» como viñeta viva.**
  - El puerto avisa con `alEscribir`, y `escribiendo` lo dice al otro lado.
    En Stream son `typing.start`/`typing.stop` y `keystroke`, y lo propio no
    cuenta.
  - El controlador lo lleva en `estado.escribiendo`, con `Escribiendo`, que
    olvida a quien lleva `ESCRIBIENDO_MS` sin avisar. La app la usa también
    en su parte nativa.
  - `vinetaEscribiendo` pinta a quien teclea, con el móvil y un bocadillo de
    pensamiento; `textoEscribiendo` lo dice en texto.
- **Portada de la conversación.** `componerPortada` pinta la cabecera
  XHATÍN, el título, el número, la fecha y el reparto con sus caras;
  `numeroDeTira` da el número.
  - El título es `estado.titulo`, el nombre del canal (`PuertoChat.titulo`):
    en los chats de grupo, el del grupo.
- **Momentos fuertes a lo grande.**
  - El director marca `impacto` en la viñeta de un grito muy fuerte o de una
    sorpresa, susto o furia intensos.
  - El compositor pone ahí un fondo de rayos (`dh-impacto`) en vez del
    decorado.
  - En la tensión y el drama, la viñeta se tuerce (`.dh-vineta--tension`).
- **Rotulación con fuentes de verdad.** Cada estilo dice sus `letras`: Comic
  Neue y Bangers en «Jóvenes», Patrick Hand y Bangers en «Caricatura».
  - `prepararFuentes(opcion, base)` las carga de la carpeta del proyecto
    (`LETRAS`, licencia OFL), con la hoja de Google de respaldo donde la
    había.
  - Dice si hay que volver a medir, y olvida lo medido (`olvidarMedidas`).
- `componerVineta` dice `desborda` cuando algo se sale del marco.
- 26 tests nuevos (162 en total).

## 0.11.0

- HilarAvatar, mejor dibujado:
  - las piezas se ajustan a cada cabeza (antes se pintaban igual en todas y
    en las estrechas o anchas se salían, se metían en la cara o flotaban);
  - patillas que siguen el borde de la cara y ya no tapan los ojos;
  - barba completa que deja ver la boca;
  - afro de rizos en vez de manchas;
  - candado en aro, cresta de punta, trenza de gajos, rizos sin manchas,
    coronilla, barba de tres días y diadema redibujadas.
- Al pintar, la barba va debajo de ojos y boca y su bigote encima de la boca
  (en el avatar y en la cabeza del cómic). El código de cada avatar no cambia.
- Los dibujos, en `hilaravatar/` (manifiesto y un SVG por pieza), y
  `npm run piezas` regenera `piezas.js`, que incluye ahora, por cabeza, su
  contorno, los ajustes medidos y las piezas pegadas al borde
  (`DATOS.caras`).
- Nuevo en el API del avatar: `ajustarACabeza`, `barbaPorPartes`, `piezaDe` y
  `recorteDeCara`.
- Moderación y privados, para la app en las tiendas (y la web):
  - API: `abrirPrivado` (`POST /xhatin/privado/<uuid>`: el privado lo crea
    dhcore si compartís grupo y nadie ha bloqueado a nadie), `denunciar`
    (`POST /xhatin/denuncias`), `leerBloqueos`, `bloquear` y `desbloquear`
    (`/xhatin/bloqueos`), y `MOTIVOS_DENUNCIA`.
  - `ControladorComic`: `ocultar(autores)` (y la opción `ocultos`) deja fuera
    de la tira los mensajes de quien he bloqueado, también los que lleguen
    después; `mensajesDe(viñeta)` da los mensajes de una viñeta, para el menú
    de denunciar.
  - La lista de conversaciones: `sinBloqueados` quita los privados con gente
    bloqueada y, en los grupos, la vista previa de su último mensaje
    (`MENSAJE_OCULTO`). Para eso `resumenDe` dice también `ultimoDe`.
  - `NORMAS_XHATIN`: las normas del chat que hay que aceptar antes de usarlo
    (Apple, 1.2), el mismo texto en la web y la app; `PerfilXhatin.normas`
    dice si ya se aceptaron.
- 13 tests nuevos (136 en total).

## 0.10.0

- Xhatín enseña solo las conversaciones ya abiertas en Stream: un chat de
  grupo se inicia desde el grupo, no desde Xhatín. Fuera
  `juntarGruposYConversaciones` (y `GrupoConChat`, `GrupoDeLista`), y en el
  API `leerMisGrupos` y `abrirChatDeGrupo`, que ya no usa nadie.
- `chat/entorno`, sacado de la app para que la web también separe las
  conversaciones de desarrollo y de producción: `conversacionesDe`,
  `deEsteEntorno`, `filtrarPorEntorno` (que ahora sabe de qué entorno es el
  API al que se pregunta) y `porComprobar`. En el API, `leerExisten`
  (`GET /xhatin/existen`, de 100 en 100).

## 0.9.0

- La lista de conversaciones de Xhatín, sacada de la app para que la web la
  pinte igual en su portada: `resumenDe` (un canal de Stream visto por mí:
  título, último mensaje, no leídos, con quién y sus caras, de qué grupo),
  `grupoDeCanal`, `nombreDeGente` y `juntarGruposYConversaciones` (mis
  grupos, cada uno con su chat común `group-<uuid>`, y el resto de chats).
  Y `EVENTOS_DE_LA_LISTA`, los eventos de Stream con los que se vuelve a pedir.
- API: `leerMisGrupos` (`GET /user/groups`) y `abrirChatDeGrupo`
  (`POST /group/{uuid}/chat`, que crea el canal del grupo y pone al día sus
  miembros).
- 8 tests nuevos (121 en total).

## 0.8.0

- `PuertoChat.marcarLeido()` (opcional): da por leída la conversación. En
  `puertoStream` es `markRead()` del canal; vale para la web y la app, porque
  lo leído es del usuario y no del dispositivo.
- 1 test nuevo (113 en total).

## 0.7.0

- `PuertoChat.historialAnterior(antesDe, limite)` (opcional): los mensajes
  anteriores a uno dado, para cargar más historial al subir. Lo implementan
  `puertoStream` (Stream pagina con `id_lt`) y `PuertoChatFalso`.
- `ControladorComic.cargarHistorial(historial, { animar: false })`: para esos
  mensajes antiguos, que no deben volver a animar la última viñeta.
- `interlocutores` y `conQuien` (en `/chat`): con quién hablas y cómo se
  nombra en la cabecera «Hablando con…», sacados de `comic-chat.ts` de
  xhatin para que la app los cuente igual. `CARAS_EN_CABECERA` = 3.
- 6 tests nuevos (112 en total).

## 0.6.0

- `puertoStream` (en `/chat`): un canal de Stream como `PuertoChat`, sacado
  de `puerto-stream.ts` de xhatin para que la app móvil no lo copie. Sigue
  sin importar `stream-chat` ni abrir conexiones: recibe una función que da
  el canal (en la web, del cliente que publica el shell; en la app, de su
  conexión nativa) y declara la forma mínima que usa (`CanalStream`).
  `mensajeDeStream` traduce un mensaje suelto.
- Si vigilar el canal falla, la siguiente llamada lo vuelve a intentar. Antes
  el fallo se quedaba guardado y `reintentar()` no servía de nada.
- 6 tests nuevos (106 en total).

## 0.5.0

- `/api`: el cliente del API de Xhatín en dhcore (`crearApiXhatin`), sacado
  de `api-xhatin.ts` de xhatin: personajes, mi perfil (estilo y personaje),
  los perfiles de los participantes, la caricatura por foto y el refinador de
  IA (`refinador()`). Ya no depende de DhPortero: la URL del API y el token se
  los da quien lo crea. La foto se puede subir como Blob (la web, que la
  reduce en el navegador) o como `{ uri, name, type }` (React Native).
- `/estilos`: el catálogo de estilos de cómic y el reparto de personajes,
  sacado de `estilos.ts` de xhatin. `usoDe` recibe dónde están las imágenes
  de los estilos y `cargarCaricatura`, la URL ya absoluta del manifiesto: las
  dos cosas dependían del remote.
- 23 tests nuevos (100 en total).

## 0.4.0

- `ControladorComic` (en `/chat`): la conversación como cómic sin framework,
  sacada de `comic-chat.ts` de xhatin. Conecta con un `PuertoChat` (sin
  perder lo que llega mientras viaja el historial y sin que una conexión
  vieja escriba en la nueva), lleva el director con sus refinadores, las
  viñetas del modo clásico, la gente, el avatar de respaldo y qué se anima.
  Avisa de cada cambio con un `EstadoComic` nuevo (`suscribir`). Quien no
  tenga puerto le da los mensajes a mano (`cargarHistorial`, `anadir`,
  `presencia`, `conocerParticipantes`). Con 13 tests.

## 0.3.0

- `componerVineta` acepta `separacion` (multiplica los huecos entre globos;
  menos de 1, más pegados) y `desborde` (unidades que un globo puede salirse
  por encima del marco, como en los cómics; 0 = nunca). Con `desborde`, lo
  que los globos crecen por `escalaLetra` sube por encima del marco en vez de
  bajar hacia las caras, y la búsqueda de sitio también puede sacarlos, pagando
  por ello. Por defecto todo queda como antes.
- Los globos se dibujan fuera del recorte de la escena (el SVG lleva
  `overflow="visible"`). Para que se vean fuera del marco, la viñeta lleva la
  clase nueva `dh-vineta--desborda` de vineta.css, que deja de recortarla.
- El escalonado del segundo globo de una fila se ajusta al hueco entre filas
  para no pisar la fila siguiente.

## 0.2.1

- Con `escalaLetra` la cámara encuadra como con la letra de siempre: antes se
  alejaba para dejar sitio a los globos grandes y los personajes encogían.
  Ahora los globos se acomodan al encuadre.
- Un globo que pisa a otro también prueba con letra más pequeña, igual que el
  que tapa una cara (antes solo se reducía por las caras).
- `npm run build` ya no borra `dist/` antes de compilar: los proyectos que lo
  usan desde este checkout (Metro, el dev server de xhatin) se quedaban sin
  motor a mitad de la compilación. Para empezar de cero, `npm run clean`.

## 0.2.0

- `componerVineta` acepta `escalaLetra` para agrandar la letra de los globos
  (1 = la de siempre). Los globos se miden y se colocan con esa letra y la
  cámara les deja su sitio. Si un globo no cabe, se reduce hasta el mismo
  tamaño mínimo que sin escala, para no tapar caras. Lo usa la app móvil, que
  pone dos viñetas por fila.

## 0.1.0

- Primera versión: el motor de escena, HilarAvatar, `PuertoChat` y
  `PuertoChatFalso` y `vineta.css`, sacados del remote de xhatin, con
  extensión `.js` en los imports para que también cargue en Node.
