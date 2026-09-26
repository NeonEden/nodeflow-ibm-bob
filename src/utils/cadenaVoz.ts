/**
 * Cadena de ideas dictadas (pedido 06).
 *
 * Al cerrar el turno de voz, cada tema del dictado se convierte en un **nodo REAL** del grafo, encadenado
 * desde el ancla: el primero cuelga del ancla y cada uno del anterior.
 *
 * Antes (pedido 05) estos nodos nacían como borradores pasivos que esperaban una confirmación del usuario.
 * El flujo de ideas al vuelo no tiene aprobación: se crean, se pueden mover y conectar, y se deshacen con
 * Ctrl+Z. Eso es lo que borra de este módulo la materialización (`ghost` -> nodo real) y el filtro por
 * prefijo: ya no hay nada transitorio que esconder del resto de la app.
 *
 * Acá vive sólo la parte pura: qué nodos y qué aristas, con qué ids y con qué datos. **Dónde** queda cada
 * uno lo decide `ubicarCadena` (para que no se apilen) y quién los mete en el lienzo es `App.tsx`.
 */

/** Un tema del dictado, tal como lo parte el segmentador del backend (`temas[]`). */
export interface Tema {
  titulo: string;
  texto: string;
}

/** Nodo listo para React Flow. Estructural a propósito: no depende de los tipos de la app. */
export interface NodoCadena {
  id: string;
  type: 'ideaNode';
  position: { x: number; y: number };
  data: {
    id: string;
    title: string;
    description: string;
    maturity: number;
  };
}

/** Arista de la cadena. Sin campos de estilo: la apariencia la pone el lienzo. */
export interface AristaCadena {
  id: string;
  source: string;
  target: string;
}

/**
 * Prefijo de los ids de la cadena: `node-cadena-<turno>-<i>`.
 * Se distingue del fantasma (`ghost-voz-turno`, id fijo) para poder contarlos sin ambigüedad.
 */
export const PREFIX_CADENA = 'node-cadena-';

/** Id del tema `i` (0-based) del turno `turno`. */
export function idDeTema(turno: string | number, i: number): string {
  return `${PREFIX_CADENA}${turno}-${i + 1}`;
}

/**
 * Construye la cadena: un nodo por tema, en el orden en que se dijeron, encadenados desde el ancla.
 *
 * `posiciones` viene de `ubicarCadena` (una por tema, sin solaparse). Si falta alguna, ese nodo cae en un
 * lugar por defecto en vez de romper: un dictado no puede fallar por un cálculo de layout.
 */
export function construirCadena(
  temas: Tema[] | undefined | null,
  posiciones: { x: number; y: number }[],
  anclaId: string | null,
  turno: string | number
): { nodes: NodoCadena[]; edges: AristaCadena[] } {
  if (!temas || temas.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: NodoCadena[] = [];
  const edges: AristaCadena[] = [];
  let previo = anclaId;

  temas.forEach((tema, i) => {
    const id = idDeTema(turno, i);
    nodes.push({
      id,
      type: 'ideaNode',
      position: posiciones[i] ?? { x: 80, y: 80 },
      data: {
        id,
        title: tema.titulo,
        description: tema.texto,
        maturity: 1,
      },
    });
    // La cadena: ancla -> 1 -> 2 -> ... Sin ancla, el primero queda suelto y el resto se encadena igual.
    if (previo) {
      edges.push({ id: `e-${previo}-${id}`, source: previo, target: id });
    }
    previo = id;
  });

  return { nodes, edges };
}
