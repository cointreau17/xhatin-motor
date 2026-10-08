# Cambios

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
