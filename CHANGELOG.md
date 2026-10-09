# Cambios

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
