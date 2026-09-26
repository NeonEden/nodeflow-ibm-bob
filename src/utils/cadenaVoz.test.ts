import { describe, expect, it } from 'vitest';
import { construirCadena, idDeTema, PREFIX_CADENA } from './cadenaVoz';

/**
 * Pedido 06: al cerrar el turno, cada tema del dictado se crea como un NODO REAL del grafo,
 * encadenado desde el ancla. Ya no hay borradores que esperan confirmación (eso era el 05).
 */
describe('cadenaVoz — la cadena del dictado nace como nodos reales', () => {
  const ancla = 'nodo-raiz';
  const posiciones = [
    { x: 400, y: 100 },
    { x: 700, y: 100 },
    { x: 1000, y: 100 },
    { x: 1300, y: 100 },
  ];
  const turno = 123;
  const temas = [
    { titulo: 'T1', texto: 'D1' },
    { titulo: 'T2', texto: 'D2' },
    { titulo: 'T3', texto: 'D3' },
    { titulo: 'T4', texto: 'D4' },
  ];

  it('1. un tema -> un nodo colgando del ancla, con el titulo y el texto del tema', () => {
    const { nodes, edges } = construirCadena([temas[0]], posiciones, ancla, turno);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(1);
    expect(nodes[0].id).toBe(idDeTema(turno, 0));
    expect(nodes[0].id).toBe(`${PREFIX_CADENA}${turno}-1`);
    expect(nodes[0].data.title).toBe('T1');
    expect(nodes[0].data.description).toBe('D1');
    expect(edges[0].source).toBe(ancla);
    expect(edges[0].target).toBe(nodes[0].id);
  });

  it('2. cuatro temas -> cuatro nodos encadenados en el orden dictado (ancla -> 1 -> 2 -> 3 -> 4)', () => {
    const { nodes, edges } = construirCadena(temas, posiciones, ancla, turno);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(4);

    expect(edges[0].source).toBe(ancla);
    expect(edges[0].target).toBe(nodes[0].id);
    expect(edges[1].source).toBe(nodes[0].id);
    expect(edges[1].target).toBe(nodes[1].id);
    expect(edges[2].source).toBe(nodes[1].id);
    expect(edges[2].target).toBe(nodes[2].id);
    expect(edges[3].source).toBe(nodes[2].id);
    expect(edges[3].target).toBe(nodes[3].id);

    // El orden dictado manda: el primero es el primer tema.
    expect(nodes.map((n) => n.data.title)).toEqual(['T1', 'T2', 'T3', 'T4']);
  });

  it('3. cada nodo cae donde le dijo ubicarCadena (no apilados) y no es un fantasma', () => {
    const { nodes } = construirCadena(temas, posiciones, ancla, turno);

    nodes.forEach((n, i) => {
      expect(n.position).toEqual(posiciones[i]);
      // Nada de `ghost`: son nodos del grafo (el fantasma es sólo el preview del parcial en vivo).
      expect((n.data as Record<string, unknown>).ghost).toBeUndefined();
      expect(n.type).toBe('ideaNode');
    });
    // Y ninguna posicion se repite: el defecto que reporto el usuario era verlos uno encima del otro.
    const claves = nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(claves).size).toBe(nodes.length);
  });

  it('4. los ids llevan el turno y no colisionan entre turnos distintos', () => {
    const a = construirCadena(temas, posiciones, ancla, 'turnoA').nodes;
    const b = construirCadena(temas, posiciones, ancla, 'turnoB').nodes;

    expect(a[0].id).toBe(`${PREFIX_CADENA}turnoA-1`);
    expect(b[0].id).toBe(`${PREFIX_CADENA}turnoB-1`);
    expect(a[0].id).not.toBe(b[0].id);
    // IDs unicos dentro del mismo turno
    expect(new Set(a.map((n) => n.id)).size).toBe(4);
  });

  it('5. sin ancla el primero queda suelto y el resto se encadena igual', () => {
    const { nodes, edges } = construirCadena(temas, posiciones, null, turno);

    expect(nodes).toHaveLength(4);
    // 3 aristas: 1->2, 2->3, 3->4 (la primera al ancla no existe porque no hay ancla)
    expect(edges).toHaveLength(3);
    expect(edges[0].source).toBe(nodes[0].id);
    expect(edges[0].target).toBe(nodes[1].id);
  });

  it('6. sin temas (vacio, null o undefined) no se crea nada', () => {
    expect(construirCadena([], posiciones, ancla, turno).nodes).toHaveLength(0);
    expect(construirCadena(null, posiciones, ancla, turno).nodes).toHaveLength(0);
    expect(construirCadena(undefined, posiciones, ancla, turno).nodes).toHaveLength(0);
    expect(construirCadena([], posiciones, ancla, turno).edges).toHaveLength(0);
  });
});
