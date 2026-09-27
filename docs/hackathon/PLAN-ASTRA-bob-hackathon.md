# Plan de gpt-6-astra para la submission de Bob (26/09/2026, ~12 h antes del cierre)

> Sesión: `agent-commander` (gpt-6-astra), 1m17s, **19 llamadas a herramientas**. Leyó el guide
> (`docs/hackathon/REQUISITOS-BOB.md`), la submission, el README, `EVIDENCIA-BOB.md`, el plan del lienzo,
> `AGENTS.md`, el contrato del pedido 01 y **consultó git** para verificar fechas de contrato y entrega.
> Informe completo reproducible: `hermes --resume 20260926_211104_fc6aa9 -p agent-commander`.
>
> **Veredicto: NECESITA CAMBIOS** — pero no en la app: en el relato y en la evidencia.

## 1 · El encuadre (lo que más pesa)

El tema del hackathon pide **un workflow de desarrollador con impacto**. Un lienzo por voz, por sí solo, es
una herramienta de pensamiento: **no cumple el tema**. La forma honesta y fuerte:

> **«NodeFlow es el caso real de un workflow de desarrollo asistido por IBM Bob 2.0: transformar una idea en
> un contrato versionado, implementarlo con Bob y revisar la entrega mediante pruebas y auditoría
> independiente.»**
>
> **«Lo aplicamos al desarrollo de un lienzo por voz; mostramos sus entregas, sus fallos y sus correcciones,
> sin atribuirle ahorros de tiempo que todavía no medimos.»**

- El **problema** no es «tomar notas cuesta mucho»: es **el pedido ambiguo que no produce una entrega
  verificable**.
- **Límite crucial**: no presentar *voz → contrato → Bob* como **integración automática**. Los pasos son
  manuales y hay que mostrarlos como tales. Una app construida con Bob **no demuestra** una solución al tema
  por sí sola.
- La apertura anterior **vendía pensamiento visual y relegaba a Bob a «compañero»**: había que invertir la
  jerarquía. → aplicado en `docs/hackathon/SUBMISSION-BOB.md`.

## 2 · Bob protagonista: tres cambios baratos

1. **Una cadena enlazada al comienzo del README y de la submission**:
   **contrato → sesión de Bob → commit de entrega → revisión/corrección → resultado**, con **un solo pedido
   como ejemplo completo**. El pedido 01 sirve: contrato `00edcf6` → entrega `cff0baa` (fechas verificadas en
   git). → aplicado en `README.md`.
2. **Capturas del resumen de consumo de todas las tareas relevantes** en `bob_sessions/`, enlazadas desde esa
   cadena. Los exports (`attribution.md`, `tareas.md`) **no reemplazan** el artefacto pedido.
   ⚠️ **Mapear sesiones reales, no fabricar una por pedido**: una sola tarea de Bob cubrió los pedidos 01 y 02.
3. **Mostrar Bob IDE temprano en el video**, con el contrato y la tarea real; después, una entrega y una
   corrección independiente. Mostrar **sólo capacidades acreditadas**: hay registro de modo *agent* y de
   tareas internas; **no** hay prueba suficiente de paralelismo ni de subagentes de Bob.

## 3 · Prioridades para las horas que quedan

1. **Elegibilidad primero**: las capturas de `bob_sessions/` y la corrección del encuadre y de las
   afirmaciones contradictorias.
2. **El video de 3 minutos** (es la demostración conjunta de producto + workflow).
3. **Slides mínimas** (problema, cadena de evidencia, resultado) y **cover legible con captura real** —
   ambos figuran en el formato de envío: asegurarlos **antes** de pulir estética.
4. **Último**: mejoras de producto, y sólo defectos que impidan grabar o reproducir el recorrido.

**Lo que NO haría**: integración con watsonx (es opcional), funciones nuevas, refactor, automatizar
*voz → contrato*, benchmarks apresurados, ni una presentación distinta por material.

## 4 · El video (montaje propuesto, 3 min)

| Seg. | Qué se ve |
|---|---|
| 0–20 | El problema del desarrollador + la apertura + **la cadena del workflow, ya** |
| 20–55 | Vos dictando **un cambio de software concreto**: borrador, nodos, `Ctrl+Z` (la app real) |
| 55–100 | **Bob IDE**: el contrato histórico, la tarea y el resumen de consumo (señalar firma, casos y entrega **sin fingir una ejecución nueva**) |
| 100–135 | El commit entregado **y el defecto encontrado después**: cómo la auditoría cerró un agujero del contrato |
| 135–165 | Resultados históricos **con procedencia**; el contraste tarea/pieza **sólo** si se muestran ambos registros y se identifica al agente real |
| 165–180 | Resultado funcionando, enlace al repo y **límites** (proceso aplicado a este proyecto, no productividad general demostrada) |

**Cortaría**: la pausa dedicada al borrador, la recarga de la app y el arrastre prolongado. **Bob no puede
quedar para los últimos segundos.**

## 5 · Riesgos, y cómo se neutralizan

| Riesgo | Estado |
|---|---|
| **Elegibilidad**: faltan las capturas del resumen de consumo | ⬜ pendiente (sólo se hacen en el Bob IDE) |
| **Credibilidad**: decíamos que la rúbrica exigía `attribution_logs` — **es falso**, el guide no lo menciona | ✅ corregido en `EVIDENCIA-BOB.md` y `SUBMISSION-BOB.md` |
| **Impacto**: `324/324` y `135/135` son resultados **declarados por suites**, no ahorro medido ni tests escritos enteramente por Bob | ✅ acotado en `SUBMISSION-BOB.md` §5 |
| **Comparación**: «80 llamadas sin archivos vs. pieza en 1 intento» es **un caso observado**, no un experimento | ✅ acotado |
| **Baseline**: «antes era un lienzo manual» hay que delimitarlo (ya había dictado y acciones de voz) | ✅ delimitado |
| **Demo**: declarar que la web **simula** voz y que el video muestra **escritorio** | ✅ declarado |
| **[NO VERIFICABLE]**: si la submission parece **sólo una retrospectiva**, el riesgo temático persiste | la defensa es un **procedimiento reutilizable** y una cadena concreta, no grandilocuencia |

> *«Alcance de esta revisión: lectura y consulta de git; sin editar, compilar ni ejecutar tests. Las métricas
> y las afirmaciones sobre competidores no las verifiqué independientemente.»*
