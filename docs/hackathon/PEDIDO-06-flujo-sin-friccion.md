# Pedido 06 — Ideas al vuelo: sin fricción (y la aprobación se muda al canvas completo)

**Origen:** feedback del usuario con la app corriendo, después de la primera prueba real de voz.

## Lo que dijo (verbatim, 26/09/2026)

> «El corte funciona, el mantener también, entiende las palabras, crea el nodo, hasta ahí bien. Pero queda en el
> lienzo fijo, no me deja moverlo, se crea uno solo y se pone detrás de la idea que ya estaba. Para este flujo de
> ideas al vuelo no estaría bueno que funcionara más libremente: al no ser acciones, solo nodos o ideas que se
> crean, no debería haber fricción. Algo genial podría ser que los nodos vayan apareciendo, se vayan conectando
> con los otros que tienen relación o que los podamos conectar nosotros, de una manera rápida e interactiva. La
> idea es hacer el crear ideas divertido, interesante, no algo tedioso, rígido y con muchas reglas. Si tenemos que
> quitar la aprobación para esta función la quitamos, quizá esa sea una función para editar el canvas completo luego.»

## Los tres defectos, con su causa (no son bugs sueltos)

Los tres salen de **una misma decisión**: el nodo que se dibuja al dictar es un *fantasma* pasivo, no un nodo del
grafo. Está escrito como invariante en `src/utils/draftVoz.ts:15-17` («el fantasma NO es un nodo del grafo»).

| Síntoma del usuario | Causa exacta | Dónde |
|---|---|---|
| «queda fijo, no me deja moverlo» | `draggable: false`, `selectable: false` **+** `pointer-events: none` en el CSS: es inalcanzable al mouse | `draftVoz.ts:77-78,105-106` · `index.css:338` |
| «se crea uno solo» | id **fijo** (`ghost-voz-turno`) y una función que devuelve **un** nodo por turno | `draftVoz.ts:27` · `App.tsx:640,654` |
| «se pone detrás de la idea que ya estaba» | posición = ancla **+ 72 px en diagonal** (cae encima, desplazado) y opacidad 0.62 sin interacción: el nodo real lo tapa | `draftVoz.ts:98-100` · `index.css:336-339` |

## El flujo nuevo

**Mientras hablás** (sin cambios): un *preview* pasivo, atenuado, que se actualiza con los parciales. No es un nodo
del grafo: no se persiste ni viaja al backend. Sirve para ver que te está escuchando.

**Al cerrar el turno** (esto cambia): los temas del dictado se convierten en **nodos reales** del grafo.

- **Uno por tema**, encadenados: el primero cuelga del ancla (o, si no hay, aparece en un lugar libre), y cada
  uno del anterior. Los temas ya vienen del backend (`temas[]`, pedido 04).
- **Movibles y seleccionables**, como cualquier nodo. Se acabó el `pointer-events: none`.
- **Se persisten** (localStorage y bóveda) y pasan por el validador de siempre (`voz.rs`).
- **Sin aprobación previa.** No hay aviso de «quedan N nodos»: se crean y ya.
- **Sin apilarse**: el offset de 72 px en diagonal deja el segundo nodo encima del primero. La cadena se ubica en
  abanico/secuencia a partir del ancla, con separación real, y si el punto está ocupado se corre al primero libre.
- **Con deshacer (Ctrl+Z)**: la salida sin fricción no es aprobar antes, es **poder revertir después**. El atajo
  **ya existe y ya está atado** (`App.tsx:822` → `handleUndo`; botón en `App.tsx:3879`; redo con Ctrl+Y). Lo
  único que falta es que la creación de la cadena tome su **snapshot antes** de crear: `takeSnapshot`
  (`src/hooks/useUndoRedo.ts:21`) mete el estado previo en la pila, y sin esa llamada el Ctrl+Z no tiene a dónde
  volver.

**La aprobación no desaparece: se muda.** Queda para el flujo del motor (el plan grande de «editar el canvas
completo»), que es donde tiene sentido revisar antes de tocar.

## Qué sobrevive del pedido 05 (y qué se cae)

- ✅ **La cadena**: `cadenaVoz.ts` armando nodos + aristas desde `temas[]` y el ancla, con sus tests. Es
  exactamente lo que hace falta para crear los nodos reales.
- ❌ **El filtro por prefijo de borradores**: deja de hacer falta para los temas (ahora son nodos de verdad). El
  único borrador que queda es el *preview* de un turno en curso, que sigue con su id fijo y sus nueve filtros.
- ❌ **La UI de confirmar/descartar** y sus textos de i18n: se reemplazan por deshacer.

## Lo que YA existe (verificado en el código: no hay que construirlo)

Decisiones del usuario para esta parte, y lo que hay en el repo para cumplirlas:

| Lo que se pidió | Estado real | Dónde |
|---|---|---|
| «que los podamos conectar nosotros» (arrastrar de un nodo a otro) | **Ya funciona** para nodos del grafo: cuatro `Handle` en el nodo y el lienzo con `onConnect` | `IdeaNode.tsx:255,262,271,278` · `App.tsx:1009,4397` |
| «el deshacer con Ctrl+Z» | **Ya funciona**: Ctrl+Z / Ctrl+Y atados, con botón en la UI | `App.tsx:822,829,3879` |
| Persistencia y validación de un nodo real | **Ya funciona**: `localStorage` + bóveda + el validador de `voz.rs` | `src/App.tsx` (guardados) |

O sea: el trabajo de esta pasada no es construir mecanismos nuevos, es **conectar el cierre del turno a los que
ya existen** — crear la cadena como nodos reales (y no como fantasma), tomar el snapshot para el Ctrl+Z, y
ubicarlos sin solaparse. Eso es lo que hace que el flujo deje de tener fricción.

## Alcance de esta pasada

**Entra:** crear los nodos reales al cerrar el turno (uno por tema, encadenados), movibles, sin apilarse, sin
aprobación, más el deshacer de la última creación.

**No entra (fase siguiente):** conectar automáticamente cada idea con las que **tienen relación** por contenido.
Eso necesita comparar texto/etiquetas contra el resto del grafo y decidir el umbral — es un pedido propio, con su
contrato, y no debe frenar el flujo divertido. Mientras tanto, la cadena ya da una conexión con sentido, y el
usuario conecta a mano (que es lo que pidió como alternativa: «o que los podamos conectar nosotros»).

## Archivos que toca

- `src/utils/draftVoz.ts` — el fantasma deja de ser el entregable del cierre; el preview mantiene su id fijo.
- `src/utils/cadenaVoz.ts` (del 05) — armar la cadena, en su versión de nodos reales.
- `src/App.tsx` — el cierre del turno crea la cadena (en vez de dibujar el fantasma y esperar), la ubicación sin
  solapamiento, y el deshacer. Ojo: los filtros `n.id !== ID_FANTASMA` están en **nueve** lugares.
- `src/index.css` — estilo de la cadena recién creada (que se note que llegó) sin `pointer-events: none`.

## Cómo se verifica

Dictar una idea que traiga dos temas («…otra cosa…»), cerrar el turno y ver: **dos nodos reales**, encadenados,
que **se pueden arrastrar**, **no uno encima del otro**, persistidos (sobreviven a recargar), y un deshacer que
revierte la creación. En la traza: los temas del cierre y la creación de N nodos.
