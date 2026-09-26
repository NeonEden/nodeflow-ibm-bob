import { AnclaFantasma, OFFSET_FANTASMA } from './draftVoz';

/**
 * Lógica para la cadena de borradores en el lienzo.
 * Se activa al cerrar un turno de voz con múltiples temas.
 */

export const PREFIX_BORRADOR = 'nf-borrador-';

export interface Tema {
  titulo: string;
  texto: string;
}

export interface NodeBorrador {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    id: string;
    title: string;
    description: string;
    maturity: number;
    ghost: boolean;
  };
  draggable?: boolean;
  selectable?: boolean;
  className?: string;
}

export interface EdgeBorrador {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  className?: string;
  style?: any;
}

export function isDraftId(id: string): boolean {
  return id.startsWith(PREFIX_BORRADOR);
}

/**
 * Construye la cadena de borradores (nodos y aristas).
 */
export function buildChain(
  temas: Tema[] | undefined | null,
  anchorId: string | null,
  anchorPos: AnclaFantasma | null,
  turno: string | number
): { nodes: NodeBorrador[]; edges: EdgeBorrador[] } {
  if (!temas || temas.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: NodeBorrador[] = [];
  const edges: EdgeBorrador[] = [];

  let prevId = anchorId;
  let prevPos = anchorPos?.position || { x: 80, y: 80 };

  temas.forEach((tema, i) => {
    const index = i + 1;
    const currentId = `${PREFIX_BORRADOR}${turno}-${index}`;
    const currentPos = {
      x: prevPos.x + OFFSET_FANTASMA,
      y: prevPos.y + OFFSET_FANTASMA,
    };

    nodes.push({
      id: currentId,
      type: 'ideaNode',
      position: currentPos,
      draggable: false,
      selectable: false,
      className: 'nf-borrador-pendiente',
      data: {
        id: currentId,
        title: tema.titulo,
        description: tema.texto,
        maturity: 1,
        ghost: true,
      },
    });

    if (prevId) {
      edges.push({
        id: `edge-${currentId}`,
        source: prevId,
        target: currentId,
        animated: true,
        className: 'nf-edge-borrador',
      });
    }

    prevId = currentId;
    prevPos = currentPos;
  });

  return { nodes, edges };
}

/**
 * Filtra borradores de una lista de nodos y aristas.
 * OJO: el filtro es por ID, no por título.
 */
export function filterOutDrafts<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isDraftId(item.id));
}

/**
 * Filtra aristas que conectan con o desde borradores.
 */
export function filterOutDraftEdges(edges: EdgeBorrador[]): EdgeBorrador[] {
  return edges.filter((e) => !isDraftId(e.id) && !isDraftId(e.source) && !isDraftId(e.target));
}

/**
 * Materializa la cadena: cambia IDs y propiedades para que dejen de ser borradores.
 */
export function materializeChain(
  nodes: NodeBorrador[],
  edges: EdgeBorrador[],
  turno: string | number
): { nodes: NodeBorrador[]; edges: EdgeBorrador[] } {
  const prefixTurno = `${PREFIX_BORRADOR}${turno}-`;
  
  // Mapeo de IDs viejos a nuevos para actualizar aristas
  const idMap: Record<string, string> = {};
  
  const materializedNodes = nodes.map((n) => {
    if (n.id.startsWith(prefixTurno)) {
      const newId = n.id.replace(PREFIX_BORRADOR, 'n-');
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        draggable: true,
        selectable: true,
        className: undefined,
        data: {
          ...n.data,
          id: newId,
          ghost: false,
        },
      };
    }
    return n;
  });

  const materializedEdges = edges.map((e) => {
    let newId = e.id;
    if (e.id.startsWith(`edge-${PREFIX_BORRADOR}`)) {
      newId = e.id.replace(`edge-${PREFIX_BORRADOR}`, 'e-');
    }
    
    const source = idMap[e.source] || e.source;
    const target = idMap[e.target] || e.target;
    
    if (idMap[e.source] || idMap[e.target]) {
      return {
        ...e,
        id: newId,
        source,
        target,
        animated: false,
        className: undefined,
      };
    }
    return e;
  });

  return { nodes: materializedNodes, edges: materializedEdges };
}

/**
 * Limpia la cadena (descartar).
 */
export function discardChain(
  nodes: NodeBorrador[],
  edges: EdgeBorrador[],
  turno: string | number
): { nodes: NodeBorrador[]; edges: EdgeBorrador[] } {
  const prefixTurno = `${PREFIX_BORRADOR}${turno}-`;
  
  const remainingNodes = nodes.filter((n) => !n.id.startsWith(prefixTurno));
  const remainingEdges = edges.filter((e) => 
    !e.id.startsWith(`edge-${prefixTurno}`) && 
    !e.source.startsWith(prefixTurno) && 
    !e.target.startsWith(prefixTurno)
  );

  return { nodes: remainingNodes, edges: remainingEdges };
}
