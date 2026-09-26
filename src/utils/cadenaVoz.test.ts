import { describe, expect, it } from 'vitest';
import {
  buildChain,
  isDraftId,
  filterOutDrafts,
  filterOutDraftEdges,
  materializeChain,
  discardChain,
  PREFIX_BORRADOR,
} from './cadenaVoz';
import { OFFSET_FANTASMA } from './draftVoz';

describe('cadenaVoz — Lógica de la cadena de temas dictados', () => {
  const anchorId = 'nodo-raiz';
  const anchorPos = { position: { x: 100, y: 100 } };
  const turno = 123;

  it('1. 1 tema -> 1 borrador colgando del ancla', () => {
    const temas = [{ titulo: 'Tema 1', texto: 'Contenido 1' }];
    const { nodes, edges } = buildChain(temas, anchorId, anchorPos, turno);

    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(1);

    expect(nodes[0].id).toBe(`${PREFIX_BORRADOR}${turno}-1`);
    expect(nodes[0].data.title).toBe('Tema 1');
    expect(nodes[0].position).toEqual({
      x: 100 + OFFSET_FANTASMA,
      y: 100 + OFFSET_FANTASMA,
    });

    expect(edges[0].source).toBe(anchorId);
    expect(edges[0].target).toBe(nodes[0].id);
  });

  it('2. 4 temas -> 4 borradores encadenados en el orden dictado (ancla -> 1 -> 2 -> 3 -> 4)', () => {
    const temas = [
      { titulo: 'T1', texto: 'D1' },
      { titulo: 'T2', texto: 'D2' },
      { titulo: 'T3', texto: 'D3' },
      { titulo: 'T4', texto: 'D4' },
    ];
    const { nodes, edges } = buildChain(temas, anchorId, anchorPos, turno);

    expect(nodes).toHaveLength(4);
    expect(edges).toHaveLength(4);

    // Verificación de la cadena
    expect(edges[0].source).toBe(anchorId);
    expect(edges[0].target).toBe(nodes[0].id);

    expect(edges[1].source).toBe(nodes[0].id);
    expect(edges[1].target).toBe(nodes[1].id);

    expect(edges[2].source).toBe(nodes[1].id);
    expect(edges[2].target).toBe(nodes[2].id);

    expect(edges[3].source).toBe(nodes[2].id);
    expect(edges[3].target).toBe(nodes[3].id);

    // Posiciones incrementales
    expect(nodes[3].position).toEqual({
      x: 100 + 4 * OFFSET_FANTASMA,
      y: 100 + 4 * OFFSET_FANTASMA,
    });
  });

  it('3. los ids son nf-borrador-<turno>-<i> y no colisionan entre turnos distintos', () => {
    const temas = [{ titulo: 'T', texto: 'D' }];
    const res1 = buildChain(temas, anchorId, anchorPos, 'turnoA');
    const res2 = buildChain(temas, anchorId, anchorPos, 'turnoB');

    expect(res1.nodes[0].id).toBe(`${PREFIX_BORRADOR}turnoA-1`);
    expect(res2.nodes[0].id).toBe(`${PREFIX_BORRADOR}turnoB-1`);
    expect(res1.nodes[0].id).not.toBe(res2.nodes[0].id);
  });

  it('4. el filtro saca los borradores de nodos Y de aristas; y un nodo real cuyo TITULO empiece con nf-borrador NO se filtra', () => {
    const nodes = [
      { id: 'nodo-real', data: { title: 'nf-borrador-falso' } },
      { id: `${PREFIX_BORRADOR}123-1`, data: { title: 'Borrador' } },
    ] as any;

    const edges = [
      { id: 'edge-real', source: 'a', target: 'b' },
      { id: `edge-${PREFIX_BORRADOR}123-1`, source: 'nodo-real', target: `${PREFIX_BORRADOR}123-1` },
    ] as any;

    const filteredNodes = filterOutDrafts(nodes);
    const filteredEdges = filterOutDraftEdges(edges);

    expect(filteredNodes).toHaveLength(1);
    expect(filteredNodes[0].id).toBe('nodo-real');

    expect(filteredEdges).toHaveLength(1);
    expect(filteredEdges[0].id).toBe('edge-real');
  });

  it('5. confirmar materializa todos los temas con sus titulos; descartar limpia todo y no deja aristas huerfanas', () => {
    const temas = [{ titulo: 'T1', texto: 'D1' }];
    const { nodes, edges } = buildChain(temas, anchorId, anchorPos, turno);

    // Confirmar
    const { nodes: confirmedNodes, edges: confirmedEdges } = materializeChain(nodes, edges, turno);
    expect(confirmedNodes[0].id).toBe(`n-${turno}-1`);
    expect(confirmedNodes[0].data.ghost).toBe(false);
    expect(confirmedEdges[0].id).toBe(`e-${turno}-1`);
    expect(confirmedEdges[0].target).toBe(confirmedNodes[0].id);
    expect(isDraftId(confirmedNodes[0].id)).toBe(false);

    // Descartar
    const { nodes: emptyNodes, edges: emptyEdges } = discardChain(nodes, edges, turno);
    expect(emptyNodes).toHaveLength(0);
    expect(emptyEdges).toHaveLength(0);
  });

  it('6. temas ausente o vacio -> no se dibuja nada', () => {
    const res1 = buildChain([], anchorId, anchorPos, turno);
    const res2 = buildChain(null as any, anchorId, anchorPos, turno);
    const res3 = buildChain(undefined, anchorId, anchorPos, turno);

    expect(res1.nodes).toHaveLength(0);
    expect(res2.nodes).toHaveLength(0);
    expect(res3.nodes).toHaveLength(0);
  });
});
