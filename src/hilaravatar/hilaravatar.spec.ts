/**
 * Tests de HilarAvatar: que las piezas encajen en todas las cabezas.
 *
 * Las piezas se dibujan sobre la cabeza ovalada; scripts/piezas.mjs mide las
 * demás y deja en piezas.js cómo ajustarlas (o, para lo pegado al borde de la
 * cara, el dibujo ya hecho para cada una).
 */

import { CATALOGO } from '../escena/catalogo/catalogo.js';
import { dibujarCabeza } from '../escena/personaje/cabeza.js';
import { CATEGORIAS, componer, normalizar, piezaDe, porDefecto } from './hilaravatar.js';

const CABEZAS = CATEGORIAS.find((c) => c.id === 'cabeza')!.opciones.map((o) => o.id);
const BARBAS = CATEGORIAS.find((c) => c.id === 'barba')!.opciones.map((o) => o.id);
/** Los ojos normales (los que tienen todas las caras por defecto). */
const OJO = { cx: [212, 300], cy: 226, rx: 31, ry: 25 };

const conPiezas = (piezas: Record<string, string>) =>
  normalizar({ ...porDefecto(), piezas: { ...porDefecto().piezas, ...piezas } });

/** Vértices de un trazado hecho solo de M, L y Z (como los de lo pegado al borde). */
function vertices(d: string): [number, number][] {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let k = 0; k + 1 < nums.length; k += 2) pts.push([nums[k]!, nums[k + 1]!]);
  return pts;
}

describe('HilarAvatar: piezas en todas las cabezas', () => {
  it('no quedan marcas de ajuste sin resolver en ninguna combinación de barba y cabeza', () => {
    for (const cabeza of CABEZAS)
      for (const barba of BARBAS) {
        const svg = componer(conPiezas({ cabeza, barba }));
        expect(svg).not.toMatch(/data-(ajuste|pegado|recorte|repaso)=/);
      }
  });

  it('las patillas tienen un dibujo propio para cada cabeza', () => {
    const dibujos = new Set(CABEZAS.map((cabeza) => piezaDe('barba', 'patillas', cabeza)));
    expect(dibujos.size).toBe(CABEZAS.length);
    for (const d of dibujos) expect(d).not.toContain('data-pegado');
  });

  it('las patillas no se meten en los ojos, ni en las cabezas estrechas', () => {
    for (const cabeza of CABEZAS) {
      const pieza = piezaDe('barba', 'patillas', cabeza);
      const trazos = [...pieza.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]!);
      expect(trazos.length).toBe(2);
      trazos.forEach((d, lado) => {
        for (const [x, y] of vertices(d)) {
          const dentro = ((x - OJO.cx[lado]!) / OJO.rx) ** 2 + ((y - OJO.cy) / OJO.ry) ** 2;
          expect(dentro, `${cabeza}: (${x}, ${y})`).toBeGreaterThan(1);
        }
      });
    }
  });

  it('la barba se pinta debajo de ojos y boca; el bigote, encima de la boca', () => {
    const svg = componer(conPiezas({ barba: 'chivo' }));
    const donde = (clase: string) => svg.indexOf(`class="${clase}"`);
    expect(donde('dh-barba')).toBeGreaterThan(-1);
    expect(donde('dh-barba')).toBeLessThan(donde('dh-ojos'));
    expect(donde('dh-ojos')).toBeLessThan(donde('dh-boca'));
    expect(svg.indexOf('class="dh-bigote"')).toBeGreaterThan(donde('dh-boca'));
  });

  it('en el cómic, el mismo orden: la barba antes que los ojos', () => {
    const cabeza = dibujarCabeza(conPiezas({ barba: 'completa', cabeza: 'pera' }), {
      expresion: CATALOGO.expresion('neutral'),
      marcas: CATALOGO.marcas.listar(),
      mirada: { x: 0, y: 0 },
      giro: 0.5,
      habla: false,
      parpadea: false,
      retrasoParpadeo: 0,
    });
    expect(cabeza).not.toMatch(/data-(ajuste|pegado|recorte|repaso)=/);
    expect(cabeza).toContain('clip-path="url(#dh-cara-pera)"');
    expect(cabeza.indexOf('class="dh-barba"')).toBeLessThan(cabeza.indexOf('class="dh-rasgos"'));
  });
});
