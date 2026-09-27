---
title: Sistema de orquestación de @deep-orq
version: 2 (borrador para auditoría de Astra)
fecha: 2026-09-27
estado: en revisión
---

# Sistema de orquestación — @deep-orq

Documento vivo. Es el contrato entre el orquestador, los ejecutores y el dueño del repo.
Todo lo que está acá abajo existe porque **algo se rompió así**, y está medido.

## 0 · Qué cambió en la v2 (y por qué)

| Incidente medido | Regla que nace |
|---|---|
Un ejecutor reportó «102 textos traducidos, tsc 0 errores» y **7 valores eran texto en español** | El informe no es evidencia. El árbitro de CONTENIDO se **ejecuta** |
Un ejecutor escribió 2 archivos en `main` mientras decía trabajar en su worktree | Verificar `git status` **también en el repo base** tras cada despacho |
`gpt-oss:120b` **pisó la línea vecina** al insertar, 2 de 2 veces (`onboarding.empezar`, `apikey.guardando`, `continuo`, `onTurnoCerrado`) | Anclas largas + verificación **después de la última edición** + revisar que el diff traiga sólo los archivos del pedido |
`max_session_duration_seconds=30` pasó los 3 árbitros y explotó con **422** contra el proveedor | Los **rangos documentados** del proveedor se validan antes de escribir el contrato, y hay guard estático |
Un `grep -c` sobre un bundle que **no se había descargado** devolvió `0` y pareció «sin fugas» | Antes de medir, confirmar que el artefacto existe y **cuánto pesa** lo medido |
El tomo del PEDIDO-09 lo tomó el perfil **equivocado** por leer su rótulo | El inventario del enjambre se corre **antes** de asignar; el rótulo miente |

## 1 · Ciclo de vida del PEDIDO

```
LEER → CORTAR → CONTRATAR → RUTEAR → ARBITRAR → INTEGRAR
```

1. **Leer**: contexto amplio, archivos grandes, el estado real del repo (`git log`, `git status`, worktrees).
2. **Cortar**: piezas **atómicas y disjuntas** (archivos distintos por pieza, nunca dos escritores sobre uno).
3. **Contratar**: `docs/PEDIDO-NN-<tema>.md` commiteado ANTES de despachar. Incluye firma exacta, casos y árbitros.
4. **Rutear**: por **capacidad medida** (inventario + estado), no por rótulo. Ojo con el modelo del hijo delegado.
5. **Arbitrar**: el orquestador corre los árbitros sobre el **árbol final** de cada worktree. Nunca firma el ejecutor.
6. **Integrar**: rama `integracion/pedido-NN`, merge, árbitros sobre el árbol integrado, verificación post-deploy, merge a `main`.

**Aislamiento**: un `git worktree` por pieza, `node_modules` por junction, `.netlify/` copiado (si no, el build local falla
por «project ID»). Verificación cruzada: `git status` en el worktree **y** en el repo base.

## 2 · Reglas madre

Las cinco originales siguen; la v2 agrega cinco más que salieron de romperse:

1. El trabajo no está hecho hasta que **el árbitro lo confirma en disco**.
2. **El canal es el repo**, no el chat: decisiones y contratos en Markdown commiteado.
3. **Un solo escritor por archivo.**
4. **El árbitro se escribe antes que la tarea.**
5. **Aislamiento obligatorio** por worktree.
6. **El árbitro se corre sobre el árbol FINAL**, no sobre un estado intermedio: un «verde» anterior a la última
   edición no vale.
7. **El diff tiene que traer exactamente los archivos del pedido.** Un archivo de más es un síntoma, no una anécdota.
8. **Los límites del proveedor se leen en su doc** y se validan con un guard estático antes de cualquier deploy.
9. **Antes de medir, confirmar que el artefacto existe** (tamaño). Un negativo sin magnitud medida es un falso verde.
10. **Nada se declara terminado sin una verificación que toque el mundo real** cuando el pedido cruza una frontera
    externa (proveedor, deploy, credencial).

## 3 · Los cinco niveles de árbitro

El error típico es creer que «los árbitros del repo» alcanzan. No alcanzan: cada nivel cubre una clase distinta de falla.

| Nivel | Qué es | Qué caza | Qué NO ve |
|---|---|---|---|
1 · **Repo** | `npx tsc --noEmit` · `npm run build` · `cargo test --lib` · `npx netlify build` | tipos, compilación, tests, empaquetado | contenido, contrato, proveedor |
2 · **Contenido** | ejecutar el módulo real con esbuild+node y medir | datos faltantes o sin traducir | todo lo de afuera |
3 · **Contrato del pedido** | verificador propio que importa el módulo y prueba los casos | lógica, topes, caminos de error | la interfaz con el proveedor |
4 · **Integración** | merge + los 3 árbitros sobre el árbol integrado | conflictos, efectos cruzados | el runtime desplegado |
5 · **Post-deploy** | contra el sitio/proveedor real, con el commit identificado | credenciales, parámetros, configuración | nada: es el que más se parece a la verdad |

El nivel 5 es el único que habla con el mundo. Cuando el pedido cruza una frontera externa, **un deploy es un árbitro**.

## 4 · Matriz de routing (medida, no de rótulo)

El rótulo del perfil miente. Se corre `inventario_enjambre.py` (modelo/`max_turns`/credencial) y `estado_enjambre.py`.

- **Escribir código** → `agent-coder-azure` (gpt-5.3-codex, 80 turnos) o el orquestador.
- **PROHIBIDO para escribir código**: `gpt-oss:120b-cloud` (pisó la línea vecina 2/2). Sirve para leer y verificar.
- **Mecánico corto** → `agent-coder-nano` (30 turnos: una pieza que exige crear contenido NO es mecánica).
- **Auditoría con otro sesgo** → otro proveedor (`agent-auditor-grok`, 40).
- **Cerebro de razonamiento** → `@agent-commander` (Astra, gpt-6-astra).
- El orquestador hace: leer, cortar, contratar, integrar, arbitrar... **y reparar** cuando el costo de un tercer
  despacho supera al de rehacer la pieza (medido: 6 patches quirúrgicos vs 20 min de agente).

## 5 · Protocolo de sobre

```
PEDIDO: <slug>            CONTRATO: docs/PEDIDO-NN-<tema>.md (commiteado)
WORKTREE: <ruta>          ENTREGABLE: <archivo nuevo/exacto> + su test
FIRMA (tipos reales):     CASOS (uno por línea)
PROHIBIDO TOCAR:          ÁRBITROS: <comando exacto>
CIERRE: archivos · salida cruda · hallazgos      COMMIT: no (integra el orquestador)
```

## 6 · Lo que NO se automatiza

Merge a `main`, deploy a producción, cualquier cosa que toque secretos, y declarar «terminado».
Lo decide el dueño. El orquestador prepara, verifica y pide el OK.

## 7 · Deuda y puntos ciegos abiertos

- El camino feliz del demo de voz no está verificado en navegador real (micrófono/permisos): lo prueba el dueño.
- El evaluador de «testigo» local no cubre Web Audio en jsdom.
- `agent-coder-nano` en TOPE: sus 30 turnos lo dejan fuera de cualquier pieza con contenido nuevo.
- Pendiente de medir: costo real por pieza del enjambre (tokens, no sólo tiempo).
