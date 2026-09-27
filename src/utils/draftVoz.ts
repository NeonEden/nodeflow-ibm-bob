/**
 * Borrador del turno de voz: lo que se está entendiendo **mientras** se habla.
 *
 * Por qué existe: hasta hoy el lienzo reaccionaba recién en `end_of_turn`, con el turno ya cerrado. El
 * cliente de AssemblyAI **ya emite** los `Turn` parciales (`assemblyaiRt.ts` → `ev.onParcial`), pero su
 * único consumidor los usaba para texto en pantalla y para el barge-in: la idea aparecía en el lienzo
 * sólo al terminar la frase. Esto convierte ese parcial en un NODO FANTASMA —visible, atenuado y que
 * NO se persiste— para que el lienzo crezca al ritmo de la voz.
 *
 * Reglas locales y deterministas, sin modelo (ADR 0005): el dibujo no puede depender de que un LLM
 * responda. El segmentador completo (`nada · semilla · corrección`, con estabilidad y confianza del
 * turno) vive en el backend (`/api/voz/parcial`); esto es la regla mínima del cliente, y existe para
 * que la Fase C no se caiga entera si el backend no contesta.
 *
 * Invariante que no se negocia: el fantasma NO es un nodo del grafo. No viaja al backend, no entra a la
 * cola de propuestas y se filtra en los dos guardados (localStorage y bóveda). Lo que se persiste sigue
 * pasando por el validador de `voz.rs`.
 */

/** Menos palabras que esto no es una idea: es el arranque de una palabra. */
export const MIN_PALABRAS = 3;

/** Cuántas palabras del parcial forman el título del fantasma (el título se ve; el texto va completo). */
export const PALABRAS_TITULO = 7;

/** Id fijo: hay un solo fantasma por turno, y un turno es una frase. */
export const ID_FANTASMA = 'ghost-voz-turno';

/** Clase CSS del contenedor del nodo fantasma (el estilo vive en `index.css`). */
export const CLASE_FANTASMA = 'nf-fantasma';

export function palabras(texto: string): string[] {
  return (texto || '').trim().split(/\s+/).filter(Boolean);
}

/**
 * Palabras que no aportan contenido cuando alguien piensa en voz alta: vacilaciones y funcionales.
 * Existe porque en la web el clasificador del backend NO corre, así que esta regla es el flujo real
 * del demo: sin el filtro, cualquier «eh bueno este» dibujaba un nodo en el lienzo.
 */
const VACIAS = new Set([
  // vacilaciones
  'eh', 'em', 'emm', 'mmm', 'ah', 'uh', 'bueno', 'che', 'dale', 'ok', 'okay', 'listo', 'hola',
  'este', 'esto', 'eso', 'esa', 'ese',
  // funcionales
  'a', 'al', 'algo', 'ante', 'bajo', 'bien', 'como', 'con', 'cual', 'cuando', 'de', 'del', 'desde',
  'donde', 'el', 'ella', 'en', 'entre', 'es', 'esta', 'está', 'hacia', 'hasta', 'la', 'las', 'le',
  'les', 'lo', 'los', 'mas', 'más', 'me', 'mi', 'muy', 'nada', 'ni', 'no', 'nos', 'o', 'otra', 'otro',
  'para', 'pero', 'por', 'que', 'qué', 'quien', 'quién', 'se', 'sin', 'sobre', 'son', 'su', 'sus',
  'tal', 'te', 'todo', 'tu', 'tus', 'u', 'un', 'una', 'unas', 'unos', 'ver', 'y', 'ya', 'yo',
]);

/**
 * Vacilaciones que se sacan del ARRANQUE del título. Sólo tokens inequívocos: «este» no está porque
 * «este nodo» es contenido legítimo, no un titubeo.
 */
const MULETILLAS_INICIO = new Set(['eh', 'em', 'emm', 'mmm', 'ah', 'uh', 'bueno', 'che', 'dale', 'ok', 'okay', 'listo', 'hola']);

/** Una palabra reducida a letras/números, sin puntuación de borde. */
function letras(w: string): string {
  return (w || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** ¿La palabra aporta contenido? (no es vacilación ni funcional, y tiene cuerpo suficiente) */
export function esPalabraDeContenido(w: string): boolean {
  const l = letras(w);
  return l.length >= 3 && !VACIAS.has(l);
}

/** ¿Ya hay una idea que valga la pena dibujar? */
export function esIdeaEnVivo(texto: string): boolean {
  const p = palabras(texto);
  if (p.length < MIN_PALABRAS) return false;
  return p.some(esPalabraDeContenido);
}

/**
 * Título corto del borrador. Se recorta a `PALABRAS_TITULO` y se le saca la puntuación de los bordes:
 * el título es el encabezado de una idea a medio decir, no una cita textual.
 */
export function tituloDelBorrador(texto: string): string {
  // La vacilación no es el título: se sacan las muletillas del arranque, pero NUNCA todas — si todo era
  // muletilla, un título feo es mejor que un nodo sin nombre.
  let restantes = palabras(texto);
  while (restantes.length > 1 && MULETILLAS_INICIO.has(letras(restantes[0]))) restantes = restantes.slice(1);
  const p = restantes.slice(0, PALABRAS_TITULO);
  if (!p.length) return '';
  const t = p.join(' ').replace(/^[\s,.;:¡!¿?"'()«»“”\-]+/, '').replace(/[\s,.;:«»“”]+$/, '');
  return t || p.join(' ');
}

/**
 * ¿El parcial trae una corrección de lo que ya dijo? Se mira sólo en los primeros 5 tokens: un «no»
 * perdido en el medio de una frase es parte del contenido, no un arrepentimiento.
 *
 * `no` suelto **no** cuenta: «nodo», «norte», «nota» y «no sé» empiezan igual. Se piden marcadores
 * inequívocos — y esto es deliberadamente corto: la versión áspera (dudas, pausas, estabilidad del
 * parcial) es del segmentador del backend.
 */
const MARCADORES_CORRECCION = ['no,', 'mejor dicho', 'en realidad', 'olvidate', 'quise decir', 'corrijo', 'esperá,', 'espera,'];

export function esCorreccion(texto: string): boolean {
  const arranque = palabras(texto).slice(0, 5).join(' ').toLowerCase();
  return MARCADORES_CORRECCION.some((m) => arranque.includes(m));
}

/** Lo mínimo que necesita el fantasma para ubicarse: la posición del nodo que le sirve de ancla. */
export interface AnclaFantasma {
  position: { x: number; y: number };
}

/** El nodo fantasma listo para React Flow. Estructural: no depende de los tipos de la app. */
export interface FantasmaVoz {
  id: string;
  type: 'ideaNode';
  position: { x: number; y: number };
  draggable: false;
  selectable: false;
  className: string;
  data: {
    id: string;
    title: string;
    description: string;
    maturity: number;
    ghost: true;
  };
}

/** Desplazamiento respecto del ancla: el borrador cae al lado del árbol, no encima. */
export const OFFSET_FANTASMA = 72;

/**
 * Construye el nodo fantasma, o `null` si todavía no hay idea que dibujar. Es pura a propósito: es la
 * parte que decide **qué se ve mientras se habla** y tiene que poder probarse sin montar el lienzo.
 */
export function nodoFantasma(texto: string, ancla: AnclaFantasma | null | undefined): FantasmaVoz | null {
  if (!esIdeaEnVivo(texto)) return null;
  const position = ancla
    ? { x: ancla.position.x + OFFSET_FANTASMA, y: ancla.position.y + OFFSET_FANTASMA }
    : { x: 80, y: 80 };
  return {
    id: ID_FANTASMA,
    type: 'ideaNode',
    position,
    draggable: false,
    selectable: false,
    className: CLASE_FANTASMA,
    data: {
      id: ID_FANTASMA,
      title: tituloDelBorrador(texto),
      description: (texto || '').trim(),
      maturity: 1,
      ghost: true,
    },
  };
}
