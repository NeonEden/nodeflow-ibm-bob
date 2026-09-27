# Prompt para adaptar el lienzo de shots a NodeFlow

Pegar en la misma herramienta, después del ejemplo de shots que ya generó.
Mantiene SU formato (un shot por sección, misma longitud, sin marcas, sin sonar a aviso)
y sólo cambia el tema.

---

## El prompt (copiar tal cual)

```
Keep the exact same format and rules as the shots above: one shot per section, the
same voice over length in every shot, no brand names, it must not sound like an ad,
just an interesting explainer video. But replace the topic with this brief:

BRIEF
NodeFlow is a local-first desktop app where you speak and the canvas draws itself.
While you talk, a deterministic segmenter decides whether what you just said is a new
idea, a correction, or noise. A draft node appears as you speak, and when the turn
closes each topic becomes a real node in the graph, chained and draggable. There is no
confirmation step: the safety net is undo. The demo is public and it dictates for real
in the browser.

The workflow we are submitting: every request is written as a contract, with scope, the
exact function signature and an enumerated list of cases, and the contract is committed
before any code exists. An AI development partner implements against that text, and an
independent review by a different agent audits the delivery against the same contract.
Real case: it built the backend segmenter and the client that feeds the canvas; the
review found that nodes were being created once per audio segment instead of once per
turn, and that was fixed before merging.

The point: the method we needed to work with the agent is the same method the product
applies to ideas.

OUTPUT
Produce 7 shots. Each shot gets 13 seconds of voice over, so the total is about 91
seconds. For each shot give me three lines:
- VO: the exact words to say. Plain text, short sentences, no symbols, no markdown,
  no parentheses or dashes: it goes straight into a text to speech engine.
- SCREEN: what is on screen, one line, concrete (the desktop app dictating, the canvas
  drawing a node, the web demo in a browser, the review finding in the diff).
- TEXT: the on screen caption, six words maximum.

Do not use the word "revolutionary", "seamless", "game changer" or any marketing word.
Do not claim time savings or productivity numbers.
```

---

## Por qué así

- **«Keep the exact same format and rules as the shots above»** — es lo que hace que *edite* el
  lienzo anterior en vez de inventar uno nuevo.
- **13 s × 7 = 91 s** — entra en tu ventana de 1:30 y, de paso, cumple el requisito del hackathon
  (al menos 90 segundos mostrando la solución en acción).
- **«no symbols, no parentheses or dashes»** — los motores de voz tropiezan con ellos y agregan
  pausas raras.
- **La lista de palabras prohibidas** — evita que el texto suene a aviso, que es justo lo que tu
  template pedía y lo que un jurado castiga.
- **Sin cifras de ahorro** — es una regla que ya aplicamos en los textos de la submission: no
  afirmamos nada que el repo no pueda respaldar.

## Los 7 shots, si la herramienta no los da bien (plan B)

| # | En pantalla | VO (para pegar en el TTS) |
|---|---|---|
1 | El lienzo abriéndose en el navegador | "Imagine you are walking and a good idea shows up. By the time you sit down, it is already gone." |
2 | La app de escritorio: hablás y aparece el nodo borrador | "Here you just speak. While you talk, the canvas starts drawing what you mean." |
3 | El turno se cierra y los nodos reales se crean, encadenados | "When you stop, each topic becomes a real node in the graph: chained, draggable, and yours." |
4 | Zoom al nodo borrador y al gesto de deshacer | "There is no confirmation step. The safety net is that you can undo anything." |
5 | El repo: el contrato commiteado antes del código | "The request itself is written down first, as a contract, before a single line of code exists." |
6 | El IDE: la sesión del agente, el todo list completado | "An AI development partner implements against that text. And a different agent audits the delivery against the same contract." |
7 | El demo web dictando en vivo, cerrando en el lienzo | "In one case that review caught a real defect before it shipped. Speak the request. Watch the graph grow." |
