// tsc solo compila los .ts. HilarAvatar es JavaScript con sus tipos escritos
// a mano y la hoja de las viñetas es CSS: se copian tal cual a dist/, junto a
// lo compilado, para que las rutas relativas del motor sigan valiendo.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ESTATICOS = [
  'hilaravatar/hilaravatar.js',
  'hilaravatar/hilaravatar.d.ts',
  'hilaravatar/piezas.js',
  'hilaravatar/piezas.d.ts',
  'vineta.css',
];

for (const ruta of ESTATICOS) {
  const destino = join('dist', ruta);
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(join('src', ruta), destino);
}
