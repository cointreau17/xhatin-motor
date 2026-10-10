// Geometría mínima de SVG para el generador de piezas: convierte los trazos
// de un dibujo en puntos para medirlos (dónde empieza la cabeza, qué ancho
// tiene a cada altura). Entiende lo que usan los dibujos de HilarAvatar:
// path (M L H V C S Q T A Z, absolutos y relativos), circle, ellipse y rect.
// Los arcos se aproximan por sus extremos y su centro: para medir sobra.

const PASOS = 24;

/** Puntos de un atributo `d`, seguidos (los subtrazos, uno detrás de otro). */
export function puntosDePath(d) {
  return subtrazosDePath(d).flatMap((s) => (s.cerrado ? [...s.pts, s.pts[0]] : s.pts));
}

/**
 * Los subtrazos de un atributo `d` (cada `M` empieza uno), como polilíneas:
 * `{ pts, cerrado }`. Las curvas se aproximan con PASOS tramos rectos.
 */
export function subtrazosDePath(d) {
  const fichas = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const subtrazos = [];
  let pts = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let x0 = 0;
  let y0 = 0;
  let cx = 0;
  let cy = 0; // último punto de control (para S y T)
  const n = () => parseFloat(fichas[i++]);
  const esNumero = (f) => f !== undefined && !/^[A-Za-z]$/.test(f);
  const bezier3 = (x1, y1, x2, y2, xe, ye) => {
    for (let k = 1; k <= PASOS; k++) {
      const t = k / PASOS;
      const u = 1 - t;
      pts.push([
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * xe,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ye,
      ]);
    }
  };
  const bezier2 = (x1, y1, xe, ye) => {
    for (let k = 1; k <= PASOS; k++) {
      const t = k / PASOS;
      const u = 1 - t;
      pts.push([u * u * x + 2 * u * t * x1 + t * t * xe, u * u * y + 2 * u * t * y1 + t * t * ye]);
    }
  };
  while (i < fichas.length) {
    if (!esNumero(fichas[i])) cmd = fichas[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        x = ox + n();
        y = oy + n();
        x0 = x;
        y0 = y;
        pts = [];
        subtrazos.push({ pts, cerrado: false });
        pts.push([x, y]);
        cmd = rel ? 'l' : 'L'; // los pares siguientes son líneas
        break;
      }
      case 'L':
        x = ox + n();
        y = oy + n();
        pts.push([x, y]);
        break;
      case 'H':
        x = ox + n();
        pts.push([x, y]);
        break;
      case 'V':
        y = oy + n();
        pts.push([x, y]);
        break;
      case 'C': {
        const x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n(), xe = ox + n(), ye = oy + n();
        bezier3(x1, y1, x2, y2, xe, ye);
        cx = x2;
        cy = y2;
        x = xe;
        y = ye;
        break;
      }
      case 'S': {
        const x1 = 2 * x - cx, y1 = 2 * y - cy;
        const x2 = ox + n(), y2 = oy + n(), xe = ox + n(), ye = oy + n();
        bezier3(x1, y1, x2, y2, xe, ye);
        cx = x2;
        cy = y2;
        x = xe;
        y = ye;
        break;
      }
      case 'Q': {
        const x1 = ox + n(), y1 = oy + n(), xe = ox + n(), ye = oy + n();
        bezier2(x1, y1, xe, ye);
        cx = x1;
        cy = y1;
        x = xe;
        y = ye;
        break;
      }
      case 'T': {
        const x1 = 2 * x - cx, y1 = 2 * y - cy;
        const xe = ox + n(), ye = oy + n();
        bezier2(x1, y1, xe, ye);
        cx = x1;
        cy = y1;
        x = xe;
        y = ye;
        break;
      }
      case 'A': {
        const rx = n(), ry = n();
        n(); // rotación
        n(); // arco grande
        n(); // sentido
        const xe = ox + n(), ye = oy + n();
        // Aproximación: el punto medio, desplazado lo que da el radio.
        pts.push([(x + xe) / 2, (y + ye) / 2 - Math.min(rx, ry) * 0.3]);
        x = xe;
        y = ye;
        pts.push([x, y]);
        break;
      }
      case 'Z':
        x = x0;
        y = y0;
        if (subtrazos.length) subtrazos[subtrazos.length - 1].cerrado = true;
        break;
      default:
        i++;
    }
  }
  return subtrazos;
}

/** Puntos de los elementos de un fragmento SVG (path, circle, ellipse, rect, line, polygon). */
export function puntosDeFragmento(svg) {
  const pts = [];
  for (const m of svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)) pts.push(...puntosDePath(m[1]));
  for (const m of svg.matchAll(/<(circle|ellipse)\b([^>]*)>/g)) {
    const a = atributos(m[2]);
    const rx = a.r ?? a.rx;
    const ry = a.r ?? a.ry;
    if ([a.cx, a.cy, rx, ry].some((v) => v === undefined)) continue;
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      pts.push([a.cx + rx * Math.cos(t), a.cy + ry * Math.sin(t)]);
    }
  }
  for (const m of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const a = atributos(m[1]);
    const x = a.x ?? 0, y = a.y ?? 0;
    if (a.width === undefined || a.height === undefined) continue;
    pts.push([x, y], [x + a.width, y], [x, y + a.height], [x + a.width, y + a.height]);
  }
  for (const m of svg.matchAll(/<line\b([^>]*)>/g)) {
    const a = atributos(m[1]);
    pts.push([a.x1, a.y1], [a.x2, a.y2]);
  }
  for (const m of svg.matchAll(/<polygon\b[^>]*\spoints="([^"]+)"/g)) {
    const v = m[1].trim().split(/[\s,]+/).map(Number);
    for (let k = 0; k + 1 < v.length; k += 2) pts.push([v[k], v[k + 1]]);
  }
  return pts;
}

function atributos(texto) {
  const a = {};
  for (const m of texto.matchAll(/\s([a-z-]+)="(-?[\d.]+)"/g)) a[m[1]] = parseFloat(m[2]);
  return a;
}

/** Caja que envuelve unos puntos. */
export function caja(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * Ancho de un contorno cerrado a una altura: los cruces del polígono con la
 * horizontal `y`. Devuelve [izquierda, derecha] o null si no la corta.
 */
export function anchoA(pts, y) {
  const xs = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
  }
  return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
}
