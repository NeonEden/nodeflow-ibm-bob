export interface NodoPos { id: string; position: { x: number; y: number } }
export const PASO_X = 300;
export const PASO_Y = 240;
export const DIST_MIN = 200;

export function ubicarCadena(
  nodos: NodoPos[],
  origen: { x: number; y: number },
  cantidad: number,
): { x: number; y: number }[] {
  if (cantidad <= 0) return [];

  const distMinSq = DIST_MIN * DIST_MIN;

  const ocupados: { x: number; y: number }[] = [];
  const res: { x: number; y: number }[] = [];

  for (let i = 0; i < cantidad; i++) {
    const baseX = origen.x + (i + 1) * PASO_X;

    let elegida: { x: number; y: number } | null = null;

    for (let fila = 0; fila < 10; fila++) {
      const candidata = { x: baseX, y: origen.y + fila * PASO_Y };

      let invalida = false;

      for (const n of nodos) {
        const dx = candidata.x - n.position.x;
        const dy = candidata.y - n.position.y;
        if (dx * dx + dy * dy < distMinSq) {
          invalida = true;
          break;
        }
      }

      if (!invalida) {
        for (const p of ocupados) {
          const dx = candidata.x - p.x;
          const dy = candidata.y - p.y;
          if (dx * dx + dy * dy < distMinSq) {
            invalida = true;
            break;
          }
        }
      }

      if (!invalida) {
        elegida = candidata;
        break;
      }

      // Si es inválida, se sigue bajando de fila hasta 10.
      // Si llegamos a la fila 9 y sigue siendo inválida, elegimos igual al final.
      if (fila === 9) {
        elegida = candidata;
      }
    }

    // Para cantidades > 0 siempre habrá una posición elegida (fila 0..9).
    res.push(elegida!);
    ocupados.push(elegida!);
  }

  return res;
}
