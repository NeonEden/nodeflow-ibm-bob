# Diseño: el lienzo en vivo (los nodos que aparecen mientras hablás)

> Sesión de diseño sobre **una sola función** del producto: lo que pasa en el lienzo mientras el usuario
> piensa en voz alta. No es sobre el proyecto entero, ni el pasado, ni las herramientas: es sobre *esto*.
> La §4 tiene las preguntas; las secciones 1–3 son el contexto mínimo para responderlas sin adivinar.

## 1 · La visión, en palabras del usuario

- «Los nodos vayan apareciendo, se vayan conectando con los otros que tienen relación o que los podamos
  conectar nosotros, **de una manera rápida e interactiva**.»
- «La idea es hacer **crear ideas divertido, interesante**, no algo tedioso, rígido y con muchas reglas.»
- «Que se vean luego de tirar la idea, y después yo decido si se quedan o se descartan.»
- «Si me alcanza con **arrastrar de un nodo a otro**, lo hace más interactivo; el deshacer con `Ctrl+Z` me gusta.»

El objetivo declarado: **que crear ideas sea un placer**, no un formulario. La app *es* el lienzo.

## 2 · Qué existe hoy (medido, no supuesto)

**El flujo actual, en orden:**

1. El usuario aprieta `Ctrl+Alt+Espacio` y habla. El STT (AssemblyAI, streaming) devuelve parciales.
2. Mientras habla, el lienzo dibuja un **borrador**: un nodo fantasma (`ID_FANTASMA`) con el texto parcial,
   que crece con lo que se va dictando. Mientras la idea está «en el aire» ese fantasma es lo único que se ve.
3. Al soltar el atajo, el turno **cierra** y el texto completo se manda al segmentador (`POST /api/voz/parcial`),
   que parte el dictado en **temas** con reglas deterministas (conectores como «otra cosa», «además»,
   «por otro lado»; máximo 4 unidades; unidad mínima de 3 palabras pegada a la anterior).
4. Con los temas, el lienzo **materializa nodos reales encadenados** (`construirCadena`), ubicados sin
   apilarse (`ubicarCadena`), y **retira el borrador** filtrando `ID_FANTASMA`. Se toma un snapshot antes de
   mutar, así `Ctrl+Z` revierte la creación entera.
5. Los nodos reales son arrastrables y conectables a mano (React Flow), y el grafo persiste en la bóveda de
   Obsidian (el guardado **excluye** el fantasma en 12 sitios distintos).

**Lo que funciona hoy (verificado):**

- Dictar dos ideas con un «otra cosa» en el medio crea **dos nodos encadenados** (antes creaba uno solo:
  el campo `temas` se perdía en el cliente — arreglado y con tests que lo anclan).
- El turno cierra una sola vez por dictado, sin bucles ni cierres duplicados.
- El grafo crece: `vault: rev=14 · 7 nodos · 6 aristas` después de un turno (antes se quedaba fijo).
- El `Ctrl+Z` revierte la creación; el borrador no parpadea cuando el juicio del segmentador dice «nada».

## 3 · El defecto que queda (y su causa probable)

**Síntoma del usuario:** «el segundo se creó dos veces: uno se mueve y el otro quedó fantasma».

**Hipótesis (con el código a la vista):** es una **carrera al final del turno**. La secuencia sería:

1. El turno cierra y se materializan los nodos reales; el filtro de `ID_FANTASMA` limpia el borrador.
2. **Un parcial tardío** del motor (que sigue procesando el audio ya enviado) llega **después** de esa
   materialización y vuelve a dibujar el borrador: el fantasma reaparece, ahora al lado del nodo real.
3. Ese fantasma queda en el estado de React (fijo, no arrastrable) aunque **no** en el grafo guardado.

Hay un `onTurnoCerrado` que retira el borrador, pero no cubre el parcial que llega **después** del cierre.
O sea: el defecto no es de datos, es de **secuencia** — y por eso el grafo está limpio y la pantalla no.

## 4 · Lo que quiero que analices

**Conceptual (el camino):**

1. ¿Cuál es el **modelo mental** correcto para el borrador? Hoy conviven «nodo fantasma en el lienzo» y
   «nodos reales materializados» como dos estados del mismo flujo, y esa convivencia es la que produce la
   carrera. ¿Conviene un tercer estado explícito (p. ej. un «turno abierto» que inhibe la materialización),
   o el fantasma debería dejar de ser un nodo y pasar a ser una **capa visual** (overlay) separada del grafo?
2. ¿Qué debería pasar si el usuario **vuelve a hablar** mientras el turno anterior todavía se está
   materializando? ¿Encolar, reemplazar, o ignorar? Hoy es donde vive el fantasma.
3. La visión pide «que se vayan conectando **con los otros** que tienen relación». Hoy sólo se encadenan
   entre sí. ¿Cuál es el paso más simple que aporte más a esa sensación, sin convertirlo en algo rígido?

**Programación (las últimas pinceladas):**

4. Para el defecto de §3: ¿cuál es el arreglo más limpio y **el más barato**, sabiendo que el fantasma no
   debe persistirse y que el estado vive en React? (¿un flag por turno con id, un `turno_id` en el parcial,
   comparar contra el último cierre, cancelar el timer de borrador al materializar?)
5. ¿Ves otros lugares donde esta función pueda quedar con dos fuentes de verdad para lo mismo?
6. ¿Hay alguna consecuencia de **accesibilidad o de performance** que convenga atender en este flujo antes
   de dar la función por terminada?

**Formato de la respuesta:** consejos concretos y ordenados por impacto. Si algo del planteo te parece mal
enfocado, decilo primero.
