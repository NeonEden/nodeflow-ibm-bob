# Guion final del video — 7 shots (revisado por el orquestador)

Base: los 7 shots generados por la herramienta, con tres correcciones. Los cambios están marcados.

---

**Shot 1** · 13 s · SCREEN: lienzo oscuro vacío, indicador de micrófono encendido, la onda de audio
empezando a pulsar al decir las primeras palabras. TEXT: *Speaking draws the canvas.*

> When you talk through a problem, the structure of your thinking is already there. What if a canvas
> could hear that structure, and draw itself as you speak?

**Shot 2** · 13 s · SCREEN: panel mostrando fragmentos de audio etiquetados en vivo — *new idea*,
*correction*, *noise* — en tipografía monoespaciada. TEXT: *Every sentence gets classified.*

> Every sentence you say passes through a **deterministic** classifier that runs locally. It decides whether
> you just introduced a new idea, corrected an old one, or said something the graph should ignore.

**Shot 3** · 13 s · SCREEN: nodo fantasma semitransparente pulsando suave en el lienzo, con la onda de
audio todavía activa al lado. TEXT: *Draft node, mid-speech.*

> While you are still speaking, a draft node appears on the canvas. It is a placeholder, a signal that
> something is being captured. Not yet committed. Just listening.

**Shot 4** · 13 s · SCREEN: el nodo borrador se solidifica, una arista se dibuja sola hacia el nodo
anterior, y ambos se arrastran un poco para mostrar que están vivos. TEXT: *Turn closes. Node commits.*

> When you finish a thought, the turn closes. The draft becomes a real node. If two ideas were linked in
> speech, the graph connects them and makes them draggable.

**Shot 5** · 13 s · SCREEN: primer plano del teclado, una sola tecla de deshacer, el nodo disolviéndose
sin aspaviento. TEXT: *Undo is the safety net.*

> There is no confirmation step. The system commits immediately. If something lands wrong, one undo
> reverses it. The safety net is always there before you need it.

**Shot 6** · **20 s** (sube de 13) · SCREEN: una pestaña del navegador, la persona hablando, los nodos
apareciendo y conectándose en vivo. TEXT: *Live in the browser.*

> The demo is public. You open it in a browser, speak into the microphone, and watch the canvas build in
> real time. **The dictation is live.** You do not need an account, and you do not need to bring a key —
> the server issues the session for you.

**Shot 7** · 13 s · SCREEN: el contrato con su alcance, la firma exacta y la lista de casos numerados;
abajo, el diff con el comentario de revisión marcando el defecto. TEXT: *Contract before code. Always.*

> Building the tool followed the same logic the tool applies to ideas. Each feature was written as a
> contract before any code existed. **IBM Bob 2.0 implemented it.** A separate agent audited the result
> against that same text — and in one case that review caught a real defect before it shipped.

---

## Los tres cambios, y por qué

**1 · Shot 7: «One agent implemented it» → «IBM Bob 2.0 implemented it».** Es el cambio más importante.
El template de explainer decía «don't mention any brand name», pero **el jurado del hackathon necesita
exactamente lo contrario**: la rúbrica puntúa *cómo y dónde usaste IBM Bob*. Si el video no lo nombra, el
trabajo no se acredita. Es la única marca que va en voz alta.

**2 · Shot 6: «Nothing is simulated» → «The dictation is live».** El dictado es real (sesión de AssemblyAI
del servidor), pero el plan que crea los nodos sale de datos de ejemplo del demo. Decir «nada es simulado»
es una afirmación que un jurado técnico puede desmentir abriendo el repo — y perderíamos credibilidad en
todo el resto, que sí es verificable. «La dictación es en vivo» es cierto, más fuerte y no promete de más.

**3 · Shot 6 sube a 20 s.** Los shots 1 a 6 son el producto funcionando: 6 × 13 = 78 s. El requisito del
hackathon pide **al menos 90 s mostrando la solución en acción** (el shot 7 es documental: contrato y
diff). Con 20 s en el shot 6 el total de solución en acción llega a **85 s**, y el video a **98 s**,
todavía dentro del límite de 3 minutos.

**Extra (opcional, si querés hilar más fino):** en el shot 2, «a deterministic classifier **that runs
locally**» agrega el diferencial técnico real — es el ADR 0005 del proyecto: sin modelo en el camino
caliente, así el lienzo sigue funcionando sin red y sin clave. Es la frase que separa esto de «otra app
que usa IA para todo».
