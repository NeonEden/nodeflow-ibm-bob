import { describe, expect, it } from 'vitest';
import { DIST_MIN, PASO_X, PASO_Y, ubicarCadena, type NodoPos } from './ubicarCadena';

function distMinCheck(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

describe('ubicarCadena — ubicar nodos en cadena sin solapes', () => {
  it('1. cantidad = 0 -> []', () => {
    const res = ubicarCadena([], { x: 10, y: 20 }, 0);
    expect(res).toEqual([]);
  });

  it('2. sin nodos existentes: 4 posiciones y TODAS separadas >= DIST_MIN', () => {
    const origen = { x: 100, y: 200 };
    const res = ubicarCadena([], origen, 4);
    expect(res).toHaveLength(4);

    for (let i = 0; i < res.length; i++) {
      for (let j = i + 1; j < res.length; j++) {
        const d2 = distMinCheck(res[i], res[j]);
        expect(d2).toBeGreaterThanOrEqual(DIST_MIN * DIST_MIN);
      }
    }
  });

  it('3. hay un nodo existente justo en la candidata base del primero -> la primera no queda a < DIST_MIN', () => {
    const origen = { x: 50, y: 60 };
    const basePrimero = { x: origen.x + 1 * PASO_X, y: origen.y };

    const nodosExistentes: NodoPos[] = [
      {
        id: 'existente',
        position: basePrimero,
      },
    ];

    const res = ubicarCadena(nodosExistentes, origen, 1);
    expect(res).toHaveLength(1);

    const d2 = distMinCheck(res[0], basePrimero);
    expect(d2).toBeGreaterThanOrEqual(DIST_MIN * DIST_MIN);
  });

  it('4. determinista: mismas entradas -> mismas salidas', () => {
    const origen = { x: 123, y: 456 };
    const nodosExistentes: NodoPos[] = [
      { id: 'n1', position: { x: origen.x + PASO_X, y: origen.y } },
      { id: 'n2', position: { x: origen.x + 2 * PASO_X, y: origen.y + PASO_Y } },
    ];

    const res1 = ubicarCadena(nodosExistentes, origen, 4);
    const res2 = ubicarCadena(nodosExistentes, origen, 4);

    expect(res1).toEqual(res2);
  });
});
