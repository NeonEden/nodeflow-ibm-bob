# Requisitos del IBM Bob 2.0 Hackathon — lo que dice el guide oficial

> Fuente: `lablab-ibm-bob-2-hackathon-guide.s3.../index.html` (1.306.808 bytes de HTML, 24.550 de texto).
> Leído el 26/09/2026. Todo lo de abajo con comillas es **textual del guide**.
> Cierre: **Sun, Sep 27, 15:00 UTC = 12:00 AR** (verificado en `lablab.ai/ai-hackathons/ibm-bob-2-hackathon/live`).

## 1 · Los tres requisitos duros

**(a) El artefacto obligatorio es `bob_sessions/` con capturas — no hay `attribution_logs`**

> *«Participants are required to upload all relevant Bob IDE task session summary screenshots to their code
> repository as evidence of Bob usage.»*
>
> *«Create a folder named `bob_sessions` in your project submission code repository.»*
>
> *«Select the task header. A task session consumption summary will be displayed.»* → *«Take a screenshot of the
> task session consumption summary. Save screenshots in PNG format where possible … Use a clear file name that
> includes your team name, task number, and short task description.»* · Ejemplo del guide:
> `teamalpha_task01_login_flow_summary.png`

La palabra **attribution** aparece **0 veces** en el guide: era un requisito que habíamos asumido. Lo que se
pide es la captura del **resumen de consumo de cada tarea** (Tasks → tarea → cabecera → resumen de consumo).

**(b) El tema es un **workflow de desarrollador**, y esa es la parte que hoy no contamos**

> *«Create a solution that improves a specific developer workflow, such as onboarding, debugging, code review,
> testing, application maintenance, or release and deployment processes. Start by clearly defining a problem
> where time, effort, or errors are too high today. Then, using IBM Bob 2.0, build a working prototype …»*
>
> *«Clearly demonstrate impact by showing how your solution increases productivity, reduces manual effort,
> errors, and rework, or significantly shortens the time required to complete tasks.»*
>
> *«Leverage features like Agent mode, parallel tasks, subagents, and document understanding to manage and
> improve multiple steps, not just assist with coding.»*

**(c) Bob tiene que ser componente central** (si no, no se juzga)

> *«You may use any framework or technology to build your solution as long as you adhere to the product usage
> policies. However, to be eligible for judging, your solution must showcase IBM Bob IDE as a core component.»*
>
> *«IDE v1.0.3 and v2.0.0 will stop working on September 30, 2026.»* → hay que estar en **v2.0.2 o superior**.

## 2 · Otros datos del guide que importan

- **Bobcoins**: 40 por participante; al 100% no se recargan. Se monitorean en Bob IDE → Settings → General
  (instancia `ibm-coding-challenge-*`, region us-east).
- **Datasets**: son del participante. Nada de datos confidenciales, de clientes, personales ni de redes; si se
  usan webs públicas, **llevar la lista de esas webs**.
- **watsonx (opcional)**: Orchestrate y/o watsonx.ai (modelos Granite). El guide los ofrece como vía de
  inferencia. Un competidor (TransCreate) sí apoya su historia en **IBM Granite 3.1**.
- **Formato de envío** (lablab): Basic info · Cover image · Video presentation · Slide presentation · Public
  GitHub repository · Application URL.

## 3 · Dónde estamos, contra (a), (b) y (c)

| Requisito | Estado | Qué falta |
|---|---|---|
| `bob_sessions/` con capturas del resumen de consumo | ⚠️ la carpeta existe; hay **1** PNG y está en `docs/hackathon/capturas-bob/sesion-pedido-03-completada.png` (nombre que no sigue el ejemplo del guide) | **capturas de las tareas de Bob** (Tasks → cabecera → resumen) y nombrarlas `nodeflow_taskNN_*.png` |
| Tema: mejorar un workflow **de desarrollo** con impacto medido | ⚠️ hoy contamos la app (lienzo por voz) y decimos que Bob escribió partes | **reescribir el relato**: el workflow es *idea → contrato → pieza de código → verificación*, con los números reales |
| Bob como componente central | ⚠️ sí, pero poco visible | **sección propia en el README** + evidencia + los contratos `PEDIDO-0*.md` commiteados antes del código |
| Bob IDE v2.0.2+ | ❓ por verificar en la máquina | mirar la versión del IDE instalado |
| Bobcoins (40) | ❓ | Settings → General → consumo |
| Cover image · slides · video | ❌ faltan los tres | producir (imagen y slides las puedo hacer; el video es tuyo) |

## 4 · Lo que el guide valora y nosotros tenemos de verdad

Tenemos números **medidos**, no inventados — que es exactamente lo que pide el punto (b):

- Rust **324/324** tests; front **135/135**; `tsc` limpio en cada tanda.
- **PRs #9 a #23** mergeados con automerge en menos de 48 h, cada uno con su contrato commiteado antes.
- **Bob escribió el segmentador de voz del backend** (pedido 01: 316 tests pasando) y **el cliente del parcial**
  (pedido 02), más los arreglos del pedido 03/04.
- Una **pieza** (firma exacta + 12 casos) entregada por un agente en **1 intento**, contra una tarea entera que
  en 80 llamadas no produjo archivos: eso es **reducción de retrabajo**, medida.
- Auditorías independientes que encontraron defectos reales (temporalidad del segmentador, dos hallazgos del
  toggle, el crash del fantasma nulo) — el costo de un defecto en producción, evitado.

Ese es el ángulo honesto: **no vendemos métricas de uso que no tenemos; mostramos el proceso y su evidencia.**
