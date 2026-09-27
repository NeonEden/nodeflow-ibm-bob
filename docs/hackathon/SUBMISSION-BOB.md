# Submission — IBM Bob 2.0 Hackathon

**Cierre: 27/09/2026 15:00 UTC = 12:00 (hora Argentina).** Verificado en
`https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon/live`: *«You have until Sep 27, 2026, 15:00 UTC to submit»*.
Premios: $10.000 ($5.000 / $3.000 / $2.000).

## ⚠️ El mismo paquete sirve para los DOS hackathons

lablab.ai usa la **misma plantilla de submission** en los dos eventos. Comprobado con la página del de AssemblyAI
(cierra **30/09 a las 12:00 AR**), que pide textualmente: *«Basic information»*, *«Cover image»*,
*«Video presentation»*, *«Slide presentation»*, *«Public GitHub repository»*, *«Application URL»*.

O sea: todo lo que se arme para Bob —cover, slides, video, textos— **se reusa el miércoles**, con dos cambios:

| Pieza | Para Bob (27/09) | Para AssemblyAI (30/09) |
|---|---|---|
| **Foco del video** | el desarrollo asistido: Bob escribió el segmentador y el cliente | la voz: el lienzo dibujándose **mientras hablás** |
| **Descripción larga** | arranca por el uso de Bob 2.0 y la evidencia | arranca por la experiencia de voz y el flujo sin fricción |
| Cover, slides, repo, app URL | **los mismos** | **los mismos** |

Conviene grabar **una sola toma** con ambos focos cubiertos (dictar una idea ya muestra las dos cosas: la voz
funcionando y el código que Bob escribió detrás), y después recortar/montar dos versiones de 3 minutos. El trabajo
del video es el más caro: hacerlo una vez en lugar de dos es la diferencia entre llegar y no llegar.

---

## 1 · Textos del formulario (listos para copiar)

**Project Title**
> NodeFlow — el lienzo que se dibuja mientras pensás

**Short Description** (1–2 líneas)
> NodeFlow convierte tu voz en un grafo de ideas: hablás, el canvas crece en vivo, y cada idea queda como un
> nodo movible y conectable. Sin formularios, sin fricción, sin aprobaciones.

**Long Description**
> **NodeFlow es el caso real de un workflow de desarrollo asistido por IBM Bob 2.0: transformar una idea en
> un contrato versionado, implementarlo con Bob y revisar la entrega mediante pruebas y auditoría
> independiente.** Lo aplicamos al desarrollo de un lienzo por voz; mostramos sus entregas, sus fallos y sus
> correcciones, sin atribuirle ahorros de tiempo que todavía no medimos.
>
> **El problema:** un pedido ambiguo no produce una entrega verificable, y el retrabajo se paga tres veces
> —al implementar, al revisar y al corregir—. Nuestro workflow lo ataca por el principio: la idea se escribe
> como **contrato commiteado antes de tocar código** (`docs/hackathon/PEDIDO-0*.md`), Bob lo implementa, y una
> revisión independiente audita la entrega contra ese contrato. Cuando el contrato no fijaba algo (por
> ejemplo, la cardinalidad de un evento), la auditoría lo encontró **antes** de que llegara a producción.
>
> **Bob es el implementador, y cada pedido tiene la misma cadena verificable:** contrato → sesión de Bob →
> commit de entrega → revisión independiente → corrección. Un pedido completo: el contrato del segmentador de
> voz se commiteó en `00edcf6`; Bob implementó el módulo y su endpoint y entregó en `cff0baa`; la auditoría
> encontró un defecto real de temporalidad, corregido en `0e059ed`. El resto está en `docs/hackathon/` con sus
> entregas, y las capturas de las sesiones de Bob están en `bob_sessions/`.
>
> **Lo que se construyó:** un lienzo por voz (Tauri + Rust + React Flow) donde hablás y el canvas se dibuja en
> vivo: un segmentador determinista del backend decide qué es idea, corrección o ruido; aparece un borrador; y
> al cerrar el turno cada tema se vuelve un nodo real —encadenado, movible, conectable— con `Ctrl+Z` para
> revertir. El flujo sin fricción no es aprobar antes: es poder deshacer después.

**Technology & Category Tags**
> Tauri · Rust · React · TypeScript · React Flow · IBM Bob 2.0 · Speechmatics (STT en streaming) · AssemblyAI ·
> agentes de código · desarrollador remoto · idea → grafo

**Improvements made** (el proyecto es propio y evolucionó durante el evento)
> Antes del hackathon NodeFlow era un lienzo manual. Durante el evento se le agregó el camino completo de voz a
> grafo: segmentador determinista, preview en vivo, creación de nodos por tema, y el flujo sin fricción con
> deshacer. El detalle de cada cambio está en los commits, uno por pedido.

---

## 2 · Checklist de materiales

| Material | Estado | Quién |
|---|---|---|
| Repo con el código donde Bob asistió | ✅ público: `github.com/NeonEden/nodeflow-ibm-bob` | — |
| **Capturas de las sesiones de Bob** (requisito explícito) | ⚠️ 1 de varias — `docs/hackathon/capturas-bob/` | asistente (GUI) |
| Video presentation | ❌ falta — guion abajo | Tomás (grabar) |
| Slide presentation | ❌ falta — se arma en markdown → PDF | asistente |
| Cover image | ❌ falta | asistente |
| App URL / plataforma de demo | ✅ **<https://nodeflowsss.netlify.app>** (demo web público, sin login) | — |
| Licencia MIT | ⚠️ verificar que el `LICENSE` sea MIT | asistente |
| `README` con instrucciones de prueba | ✅ existe (revisar que esté al día) | asistente |

---

## 3 · La decisión abierta: qué ponemos como «App URL»

NodeFlow es una app de **escritorio** (Tauri), no una web. Las opciones, de más honesta a más vistosa:

1. **El repo + instrucciones de build** (`npm install && npx tauri dev`) — verificable por un juez con toolchain,
   y no promete nada que no exista. **Recomendada.**
2. Un **video demo** como «platform» (el que igual hay que grabar) y el repo como URL.
3. Publicar un build (MSI) en Releases — más trabajo y sin firma Authenticode (Windows avisa). Sólo si sobra tiempo.

---

## 4 · Guion del video (máximo 3 minutos — hoy no tenemos ninguno)

| Seg. | Qué se ve | Qué se dice |
|---|---|---|
| 0–15 | El lienzo vacío y el atajo `Ctrl+Alt+Space` | «Esto es NodeFlow. Un lienzo para pensar en voz alta.» |
| 15–45 | Dictado en vivo: el preview aparece y crece mientras hablás | «Mientras hablo, el lienzo se dibuja. El segmentador decide qué es idea, qué es corrección y qué es ruido.» |
| 45–75 | Pausa a mitad de frase y el borrador que **no** parpadea | «Puedo pensar en voz alta: el borrador se queda, no se borra.» |
| 75–105 | Un «otra cosa» → aparecen **dos nodos encadenados**, movibles | «Al cerrar la idea, cada tema se convierte en un nodo. Encadenados, movibles.» |
| 105–135 | Arrastrar de un nodo a otro para conectarlos + `Ctrl+Z` | «Las conecto arrastrando. Y si no era idea, Ctrl+Z.» |
| 135–165 | Recargar la app: los nodos siguen ahí | «Todo queda guardado: el lienzo es de verdad, no un demo.» |
| 165–180 | Cierre: el repo y «construido con IBM Bob 2.0» | «El backend de voz lo escribió Bob 2.0 contra contratos commiteados. El repo está abierto.» |

---

## 5 · Lo que NO se hace

- No se inventan métricas de uso, benchmarks ni usuarios.
- No se reclama crédito por lo que Bob no tocó: la evidencia dice qué archivos escribió él
  (`docs/hackathon/EVIDENCIA-BOB.md`) y en qué pedido.
- No se declara `attribution_logs` con datos: está en cero y se declara en cero. (Y no es el artefacto
  pedido por el guide: lo que se pide son las capturas del resumen de consumo, en `bob_sessions/`.)
- **Los números se dicen con su procedencia y sin inflar:** `324/324` y `135/135` son resultados **declarados
  por las suites de tests** al cerrar cada tanda, no un ahorro medido ni tests escritos íntegramente por Bob;
  `316/316` fue la verificación posterior del conjunto del segmentador.
- **El contraste «una tarea entera produjo 0 archivos en 80 llamadas vs. una pieza entregada en 1 intento» es
  un caso observado**, no un experimento controlado ni un porcentaje de retrabajo ahorrado.
- **El baseline se delimita:** antes del hackathon la app ya tenía dictado y acciones de voz; lo que se agregó
  fue el camino completo de voz a grafo (segmentador, borrador en vivo, nodos por tema, flujo sin fricción).
- **La web es una simulación de voz** (sin backend Rust no hay micrófono): el video muestra la app de
  escritorio, y el demo web existe para que cualquiera abra el lienzo sin instalar nada.
