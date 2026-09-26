# Plan de gpt-6-astra para el lienzo en vivo (guardado para después)

> **Pedido**: sesión de diseño acotada a UNA función —los nodos que aparecen mientras dictás— sobre el
> documento `docs/DISENO-lienzo-en-vivo.md` (visión del usuario en sus palabras, estado medido, el defecto
> y las 6 preguntas).
>
> **Perfil**: `agent-commander` (gpt-6-astra) · 1m26s · **29 llamadas a herramientas**: leyó el doc,
> `draftVoz.ts`, `cadenaVoz.ts`, cuatro tramos de `App.tsx`, tres de `VozPanel.tsx`, `useUndoRedo.ts` y el
> `AGENTS.md`.
>
> **Veredicto**: *«NECESITA CAMBIOS en el ciclo de vida del turno, no en la idea del borrador.»*
>
> **Por qué se guarda**: pedido de Tomás (26/09/2026): *«astra tiene un razonamiento superior, nos guardamos
> su plan para después»*.

## Estado: qué se aplicó ya y qué queda

**Aplicado** (PR #21 y #22 → release v0.3.13):

- El **crash** de `nodoFantasma` nulo (§4) → se valida antes de usarlo.
- La **materialización antes del eco** (§4) → el guard es parte de la condición.
- El **mínimo del ciclo de vida** (§1): la **fase del turno** (`inactivo / escuchando / resolviendo`,
  pegajosa) informada por el panel, el efecto del borrador delegando en la pieza pura `decidirBorrador`
  (en `resolviendo` **siempre retira**), y el guard de la vía HTTP (una decisión de un turno ya cerrado no
  entrega nada al lienzo).

**Queda** (el ciclo de vida completo, para después del video):

- **Identidad de turno de verdad**: hoy `turno_id` recibe la **sesión**, no el turno (§1) → capturar la
  identidad al emitir la petición y correlacionar el audio tardío en el adaptador STT.
- **Separar el borrador del grafo** (§2 y §6): hoy el fantasma entra en `nodes` (pese al comentario que dice
  lo contrario) y cada carácter del dictado **reactiva el autoguardado**; combinarlos sólo para renderizar.
- **El `undo` recibe `nodes` sin filtrar** (§4) → por eso puede conservar un fantasma.
- **El filtro global por `ID_FANTASMA`** puede borrar el borrador del turno **siguiente** (§3).
- **El debounce puede posponer indefinidamente la vista** si siguen llegando cambios; medir latencia y costo
  de render antes de fijar presupuestos (§6).
- **«Que se conecten con los otros»**: dictar desde un nodo **seleccionado** como contexto explícito (barato
  y muy visible), y después sugerencias por **coincidencias locales explicables** (sin LLM obligatorio,
  mostrando el motivo, sin modal) (§5).

⚠️ **Nota de verificación**: el informe cita `src/index.css:336-343` (contraste y `pointer-events`), pero esa
lectura **no aparece en su traza de herramientas**. Esa cita puntual queda **sin verificar** hasta mirarla en
el archivo.

---

## El informe, textual

```
VEREDICTO: NECESITA CAMBIOS en el ciclo de vida del turno, no en la idea del borrador.
Informe de lectura estática: no edité, compilé, ejecuté tests ni commiteé. Rutas relativas al repositorio.

1. Enfoque y arreglo de la carrera (pregunta 4; mayor impacto)
   La hipótesis es plausible, pero incompleta: cerrar no retira realmente el fantasma. Se vacían los
   estados, pero el efecto conserva el nodo existente cuando el texto queda vacío (src/App.tsx:4829–4832,
   688–692). Puede quedar sin ningún parcial tardío.
   También puede resucitar por una respuesta HTTP: las decisiones con esFinal eluden el control de
   obsolescencia y llegan al mismo callback del borrador (src/components/VozPanel.tsx:595–609). Cancelar
   solamente el timer no alcanza.
   Arreglo mínimo robusto: identidad de turno, fase explícita y revisión de parcial; cerrar invalida sus
   actualizaciones visuales y cancela sus timers. Tanto el callback como la actualización diferida deben
   comprobar identidad y fase.
   La decisión final sólo materializa una vez ese turno y retira SU borrador, no el del turno siguiente. Hoy
   onTurnoFinal recibe sólo temas y genera otra identidad con Date.now() (src/App.tsx:4837–4856).
   No confundir sesión con turno: turno_id recibe sesionRef.current aunque la conexión se reutiliza
   (src/components/VozPanel.tsx:759–766, 800–805). Capturar identidad al emitir la petición; para audio
   tardío, correlacionarla en el adaptador STT, no etiquetarlo con el turno vigente al recibirlo.

2. Modelo mental del borrador (pregunta 1)
   El borrador significa «esto estoy entendiendo», no «esto ya pertenece al mapa». Los nodos reales
   significan «esto quedó», pero siguen siendo editables y descartables, sin aprobación obligatoria.
   Recomiendo estados por turno: escuchando → resolviendo → materializado, descartado o error. "Resolviendo"
   conserva una vista congelada con estado visible; no acepta parciales y no bloquea nuevas ideas.
   Estado explícito y capa visual no son alternativas: uno resuelve la secuencia y la otra separa
   responsabilidades. Un overlay solo también puede mostrar respuestas viejas.
   La solución más limpia es mantener grafo y borrador separados y combinarlos sólo para renderizar; puede
   conservarse React Flow, sin construir otra capa HTML. Hoy el fantasma sí entra en nodes pese al comentario
   contrario (src/App.tsx:640–644, 685).

3. Volver a hablar mientras termina lo anterior (pregunta 2)
   Aceptar el nuevo turno inmediatamente; ni reemplazar el anterior ni ignorar voz. Mantener resultados
   pendientes por identidad y serializar sólo su incorporación al grafo, preferentemente en orden de dictado.
   Cada cierre conserva texto, lienzo de destino y ancla; al incorporar, revalidar que el destino y el ancla
   existan y calcular espacio contra el grafo actual.
   Si falla la clasificación, conservar el texto recuperable y permitir reintentar o descartar. Hoy null o
   temas vacíos terminan sin materialización ni resolución visible desde ese handler
   (src/components/VozPanel.tsx:800–807; src/App.tsx:4838).
   Un resultado anterior nunca debe limpiar el borrador nuevo: el filtro global por ID_FANTASMA actual sí
   puede hacerlo (src/App.tsx:4853–4855).

4. Otras fuentes de verdad y fallos asociados (pregunta 5)
   draftVoz, decisionParcial y el fantasma almacenado duplican la interpretación actual: consolidarlos en
   estado transitorio por turno y derivar su representación, sin almacenar otra copia en el grafo.
   Undo recibe nodes sin filtrar; por eso puede conservar un fantasma aunque el guardado lo excluya
   (src/App.tsx:548–551; src/hooks/useUndoRedo.ts:21–30). Separarlo evita contaminar historial, layout y
   elección de ancla; hoy esta última puede elegir nodes[0] (src/App.tsx:4840).
   Hay otro riesgo concreto: nodoFantasma puede devolver null, pero el cast no lo impide y luego se accede a
   data o se inserta el resultado; validar antes de usarlo (src/utils/draftVoz.ts:96–97; src/App.tsx:677–685).
   La materialización también se dispara antes de descartar eco: puede crear nodos con la voz de la propia
   app; filtrar ese caso antes de solicitarla (src/components/VozPanel.tsx:800–813).

5. "Que se conecten con los otros" (pregunta 3)
   Encadenar por orden de dictado no demuestra relación semántica: «otra cosa» incluso puede indicar
   separación (src/utils/cadenaVoz.ts:73–90).
   Primer paso barato: permitir dictar desde un nodo seleccionado como contexto explícito, en lugar de anclar
   siempre a la raíz; conservar conexión manual y deshacer.
   Después, sugerir relaciones con nodos existentes mediante coincidencias locales explicables de títulos o
   etiquetas, sin LLM obligatorio ni aristas semánticas automáticas. Mostrar el motivo y permitir aceptar o
   ignorar desde el lienzo, sin modal.

6. Accesibilidad y performance (pregunta 6)
   Identificar «Borrador» y «Procesando» con texto, no sólo opacidad; revisar contraste y exclusión del foco.
   pointer-events: none no garantiza esta última (src/index.css:336–343).
   Ofrecer conexión por teclado y alternativa al atajo de voz; anunciar creación o error mediante una región
   de estado, no cada parcial, y no desplazar foco ni cámara automáticamente.
   Cada cambio del fantasma en nodes reactiva el autoguardado aunque luego se filtre (src/App.tsx:704–754).
   Separarlo elimina ese trabajo; conservar referencias estables del grafo evita propagar cambios
   innecesarios.
   El debounce actual puede posponer indefinidamente la vista si siguen llegando cambios: preferir
   actualización periódica limitada con entrega del último parcial (src/App.tsx:641–702). No verifiqué
   latencia ni costo de render; medirlos antes de fijar presupuestos.
```
