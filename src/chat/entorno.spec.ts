/**
 * Qué conversaciones se ven según su entorno (producción, desarrollo o todas).
 */

import { conversacionesDe, deEsteEntorno, filtrarPorEntorno, porComprobar } from './entorno.js';
import type { ResumenConversacion } from './conversaciones.js';

const ANA = '11111111-1111-1111-1111-111111111111';
const SOLO_DEV = '22222222-2222-2222-2222-222222222222';
const GRUPO = '33333333-3333-3333-3333-333333333333';
const GRUPO_DEV = '44444444-4444-4444-4444-444444444444';

const c = (id: string, otros: string[], grupo: string | null = null): ResumenConversacion => ({
  id,
  titulo: id,
  ultimo: null,
  ultimoDe: null,
  fecha: null,
  noLeidos: 0,
  otros,
  avatares: {},
  grupo,
});

describe('conversaciones por entorno', () => {
  it('esconde las que tienen a alguien o un grupo que el API no conoce', () => {
    const todas = [
      c('con-ana', [ANA]),
      c('con-dev', [SOLO_DEV]),
      c('tres', [ANA, SOLO_DEV]),
      c('group-' + GRUPO, [ANA], GRUPO),
      c('group-' + GRUPO_DEV, [ANA], GRUPO_DEV),
      c('con-admin', ['admin']),
      c('solo-yo', []),
    ];
    const existen = { usuarios: [ANA], grupos: [GRUPO] };
    expect(deEsteEntorno(todas, existen).map((x) => x.id)).toEqual(['con-ana', 'group-' + GRUPO, 'solo-yo']);
  });

  it('con el API de producción (la app): producción son las suyas; desarrollo, las demás', () => {
    const todas = [c('con-ana', [ANA]), c('con-dev', [SOLO_DEV]), c('group-' + GRUPO_DEV, [ANA], GRUPO_DEV)];
    const existen = { usuarios: [ANA], grupos: [GRUPO] };
    const ids = (modo: 'produccion' | 'desarrollo' | 'todas') => filtrarPorEntorno(todas, existen, modo).map((x) => x.id);
    expect(ids('produccion')).toEqual(['con-ana']);
    expect(ids('desarrollo')).toEqual(['con-dev', 'group-' + GRUPO_DEV]);
    expect(ids('todas')).toHaveLength(3);
  });

  it('con el API de desarrollo (la web en local): desarrollo son las suyas; producción, las demás', () => {
    const todas = [c('con-ana', [ANA]), c('con-dev', [SOLO_DEV])];
    const existen = { usuarios: [SOLO_DEV], grupos: [] };
    const ids = (modo: 'produccion' | 'desarrollo') =>
      filtrarPorEntorno(todas, existen, modo, 'desarrollo').map((x) => x.id);
    expect(ids('desarrollo')).toEqual(['con-dev']);
    expect(ids('produccion')).toEqual(['con-ana']);
  });

  it('solo pregunta por uuids, sin repetir', () => {
    const todas = [c('a', [ANA, 'admin']), c('b', [ANA.toUpperCase()]), c('g', [], GRUPO)];
    expect(porComprobar(todas)).toEqual({ usuarios: [ANA], grupos: [GRUPO] });
  });

  it('lee la variable; vacía o desconocida, la de por defecto', () => {
    expect(conversacionesDe(' Desarrollo ')).toBe('desarrollo');
    expect(conversacionesDe('todas')).toBe('todas');
    expect(conversacionesDe(undefined)).toBe('produccion');
    expect(conversacionesDe('lo-que-sea', 'desarrollo')).toBe('desarrollo');
  });
});
