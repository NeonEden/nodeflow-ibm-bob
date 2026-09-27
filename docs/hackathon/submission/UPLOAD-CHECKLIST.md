# ⬆️ UPLOAD — pegar y subir (5 minutos)

**Submission page:** https://lablab.ai/ai-hackathons/ibm-bob-2-hackathon → *Submit Project*
**Deadline: hoy 27/09 15:00 UTC — 12:00 hora Argentina. ⏰ Cerrá con 30 min de margen.**

Todo el texto de abajo está listo para **copiar y pegar**. No lo edites a mano: si cambiás una palabra,
los conteos de 500 se mueven y hay que volver a medirlos.

---

## 1 · Project Title

```
NodeFlow — speak the request, and IBM Bob 2.0 builds it against a contract
```

## 2 · Short Description

```
NodeFlow turns spoken ideas into a working graph. Each idea becomes a versioned contract that IBM Bob 2.0 implements, while a different agent audits the delivery against that same text — the spec-first workflow we used to build NodeFlow itself, running inside the product.
```

## 3 · Long Description

```
The problem. An unclear request costs you three times: in implementation (you build too much or too little), in review (there is nothing to compare against, so review becomes opinion) and in fixes (the defect surfaces late, when other code already sits on top of it).

The workflow. Every request starts as a contract — scope, function signature, enumerated cases — committed before any code, so the request has a fixed date. IBM Bob 2.0 implements against that text. Then an independent review by a different agent audits the delivery against the same contract. One real request: the contract for the partial-transcript segmenter was committed first (docs/hackathon/PEDIDO-BOB-01.md); Bob implemented the module and its endpoint and delivered cff0baa; a later revision fixed its stability (e84fb5b). A second request — creating nodes when the voice turn closes — landed in 8582026, and the review caught that nodes were being created once per audio segment instead of once per turn, fixed in 0e059ed. The steps are manual and deliberate: this is not an automatic voice-to-code pipeline.

What we built. A local-first desktop app (Tauri + Rust + React Flow) where you think out loud and the canvas draws itself: a deterministic segmenter decides whether what you said is an idea, a correction or noise; a draft node appears while you speak; and when the turn closes, each topic becomes a real node — chained, draggable, connectable — created without a confirmation step, because the safety net is undo. A public web demo runs the same interface in the browser, with real dictation powered by a temporary session the server issues, so nobody has to bring their own key. The interface ships in Spanish and English.

Why it holds together. The canvas is where the request becomes the contract: you talk, the nodes appear, and it is written down while it is still fresh. The contract is what makes review objective, and the review is what catches the defect before merge.

The limits, stated up front. The test counts (324/324 Rust, 141/141 frontend) are recorded results from the suites on the named commits, not a measured saving. The defect caught in review is one case, not a controlled experiment. The process was applied to this project: it does not prove general productivity.
```

## 4 · Problem & Solution Statement — **449 / 500 words** ✅

> Sale completo de `SUBMISSION-FINAL-EN.md` §4. Copialo desde ahí (es la versión medida).
> Ruta: `docs/hackathon/SUBMISSION-FINAL-EN.md` → sección `## 4 · Problem & Solution Statement`.

## 5 · IBM Bob Usage Statement — **484 / 500 words** ✅

> Ídem, sección `## 5 · IBM Bob Usage Statement` del mismo archivo.

## 6 · Technology & Category Tags

```
Tauri · Rust · React · TypeScript · React Flow · AssemblyAI Universal-Streaming v3 · IBM Bob 2.0 · agentic coding workflow · spec-first development · independent code review · voice interface · local-first · idea-to-graph
```

## 7 · Improvements made during the event

```
Before the hackathon NodeFlow already had dictation and voice actions. During the event we added the full path from voice to graph — the deterministic segmenter, the live draft node, one node per topic, the frictionless flow with undo — and we made the demo public and keyless: a web build where the server issues a temporary speech session so anyone can dictate without an account. And, more importantly, we adopted the workflow we are now submitting: contract committed before the code, an implementing agent, and a separate reviewing agent.
```

---

## 8 · Archivos a subir

| Campo | Archivo | Ruta |
|---|---|---|
**Cover image** (1280×640) | `cover-en.png` | `docs/hackathon/submission/cover-en.png` |
**Slides** (8 slides, 16:9) | `slides-en.pdf` | `docs/hackathon/submission/slides-en.pdf` |
**Video** (≤3 min, ≥90 s de solución) | ⬜ **lo tenés vos** | guion en `docs/hackathon/VIDEO-SCRIPT-EN.md` |
**Repo** | público ✅ | `github.com/NeonEden/nodeflow-ibm-bob` |
**Application URL** | ✅ | `https://nodeflowsss.netlify.app` |

**Abrir la carpeta para arrastrar los archivos:**
```
C:\Users\tomas\Desktop\Nodeflow BOB\nodeflow-ibm-bob\docs\hackathon\submission\
```

---

## 9 · ⚠️ Lo único que NO puede hacer un agente

**Las capturas del *task session consumption summary* de Bob** (obligatorias: «screenshots from each team
member»). Se sacan dentro del IDE:

> **Tasks → elegir la tarea → clic en el encabezado de la tarea → captura de pantalla**

Guardalas en `bob_sessions/` (ya hay dos de tareas previas: `nodeflow_task01_*`, `nodeflow_task03_*`).
Después: `python scripts/bob-evidencia.py` las referencia y `docs/hackathon/EVIDENCIA-BOB.md` las explica.

---

## 10 · Antes de darle Submit — 30 segundos de control

- [ ] Los dos statements pegados y **por debajo de 500 palabras** (449 y 484 medidos hoy).
- [ ] Cover y slides subidos (los archivos de la tabla).
- [ ] Video subido, ≤3 min, con ≥90 s de la solución funcionando.
- [ ] Repo público y URL de la app = `https://nodeflowsss.netlify.app`.
- [ ] Capturas de Bob en `bob_sessions/` (obligatorio) y pusheadas a GitHub.
- [ ] **Pull request / commit pusheado**, no sólo local.

---

## Lo que NO decimos (auditado y a propósito)

Sin «antes de llegar a producción», sin «Bob escribió el motor de voz» (implementó el **segmentador y el cliente
de parciales**; la transcripción y la síntesis son servicios contratados), sin «release firmado», sin contador de
PRs como ahorro, y sin presentar el flujo como automático: los pasos son manuales, deliberados y revisados.
