---
tipo: evidencia-hackathon
evento: IBM Bob 2.0 Hackathon
fecha: 2026-09-26
repo: NeonEden/nodeflow-ibm-bob
---

# Evidencia del uso de IBM Bob

Este documento responde a la pregunta de la rúbrica —**«dónde usaste Bob»**— con lo que se puede
verificar en el repositorio y en la propia base de Bob. Declara también lo que **no** se pudo obtener.
Todo dato de acá sale de un comando o de una fila de su base; nada está estimado ni atribuido de memoria.

## 1 · Lo que pide la rúbrica y lo que hay

El guide oficial **no** menciona `attribution_logs` —la palabra aparece **0 veces** en él (`docs/hackathon/REQUISITOS-BOB.md`)—.
Lo que la submission exige son las **capturas del `task session consumption summary`** de cada tarea de Bob,
en `bob_sessions/`. La tabla `attribution_logs` de la base de Bob es un dato adicional que vale la pena
tener —cada fila con el **archivo**, la **rama**, la **herramienta** y el **rango de líneas**— pero **no es
lo que se pide**.

**Estado de esa tabla: 0 filas.** No la llenó ninguna de las dos tareas de hoy:

- Bob commiteó el segmentador (`cff0baa`) por su cuenta y la tabla siguió vacía.
- Sus propios campos `git_branch` y `git_sha` están en blanco (los dos se ven en `bob_sessions/tareas.md`).
- Se buscó quién escribe esa tabla en `app.asar`, en las extensiones y en `node_modules` sin resultado.

Lo que **sí** guarda la app es el **plan desglosado de la tarea** (la columna `env.task` de su base):
nueve tareas internas con su estado, las nueve en `done`. Es la respuesta más cercana a «qué hizo Bob»
que existe, aunque no traiga rangos de líneas — y está transcripto en la sección 3.

`bob_sessions/attribution.md` es la copia exportada de esa tabla vacía, generada por
`scripts/bob-evidencia.py`.

## 2 · La evidencia que sí existe (verificable con git)

### El contrato se commiteó antes del código, siempre

| Pedido (documento **en el repo**) | Commiteado | Entrega de Bob | Ventana |
|---|---|---|---|
| `docs/hackathon/PEDIDO-BOB-01.md` — el segmentador del parcial | `00edcf6` · 26/09 13:56 | `cff0baa` · 26/09 14:36 | 40 min |
| `docs/hackathon/PEDIDO-02-cliente-parcial.md` — el cliente del parcial | `5717791` · 15:17<br>(+ banco de pruebas `490775c` · 15:25) | `2f55131` · 26/09 15:49 | 24 min |

Cada pedido es un documento autocontenido: contrato de campos, casos de borde, **los tests exigidos** y
el criterio de cierre. Bob no decidió el alcance en ninguna de las dos tareas.

### Tarea 1 · El segmentador — `cff0baa` (364 líneas)

| Archivo | Líneas | Qué es |
|---|---|---|
| `src-tauri/src/segmentador.rs` | +312 | El juicio de un parcial: `nada` · `semilla` · `correccion`, sin modelo |
| `src-tauri/src/server.rs` | +51 | El endpoint `POST /api/voz/parcial` + sus tests |
| `src-tauri/src/lib.rs` | +1 | El módulo |

Verificación humana posterior: `cargo test --lib` **316/316**. Y un defecto de diseño encontrado y
corregido a mano: la regla de estabilidad comparaba el parcial con el anterior en vez de medir
**tiempo**, así que habría matado la demo (con audio real, el parcial nuevo siempre difiere del
anterior). Se corrigió y se agregaron tests.

### Tarea 2 · El cliente del parcial — `2f55131` (384 líneas)

| Archivo | Líneas | Qué es |
|---|---|---|
| `src/services/vozService.ts` | +62 | `clasificarParcial()`: `AbortController`, `null` ante cualquier fallo |
| `src/services/vozService.test.ts` | +207 | 11 tests, incluido el **banco de pruebas del pipeline sin micrófono** |
| `src/components/VozPanel.tsx` | +66 | Manda el parcial con throttle y descarte de respuestas viejas |
| `src/App.tsx` | +54 | El fantasma obedece la decisión del backend |

Verificación humana posterior: `tsc` limpio, **64/64** en vitest, build OK. Después hubo una ronda de
correcciones y una auditoría independiente (sección 5).

## 3 · El plan de Bob, transcripto de su base (columna `env.task`)

Las nueve tareas internas de la sesión, todas en estado `done`. Las cuatro primeras son del pedido 01;
las cinco últimas, del pedido 02 — **la misma tarea de Bob cubrió las dos entregas**:

| # | Estado | Tarea interna |
|---|---|---|
| 1 | `done` | Crear `src-tauri/src/segmentador.rs` con la función clasificar y reglas deterministas |
| 2 | `done` | Agregar endpoint `POST /api/voz/parcial` en `server.rs` |
| 3 | `done` | Declarar `pub mod segmentador` en `lib.rs` |
| 4 | `done` | Verificar con `cargo test --lib` |
| 5 | `done` | Agregar `clasificarParcial` + `DecisionParcial` en `src/services/vozService.ts` |
| 6 | `done` | Agregar `anteriorRef`, `ultimoCambioRef`, throttle y llamada al backend en `VozPanel.tsx` |
| 7 | `done` | Actualizar el efecto del fantasma en `App.tsx` para usar la decisión del backend |
| 8 | `done` | Crear `src/services/vozService.test.ts` con los tests de `clasificarParcial` y pipeline |
| 9 | `done` | Correr `npx tsc --noEmit`, `npx vitest run`, `npm run build` |

## 4 · Consumo y contexto medidos (de la base de Bob, no estimados)

| Dato | Valor |
|---|---|
| Costo de la tarea (las dos entregas) | **US$ 12,40** |
| Contexto consumido | **117.082 tokens** |
| Modelo · modo | `premium-ide` · modo `agent` (ventana declarada 270.000) |
| Proyecto | `c:\Users\tomas\Desktop\Nodeflow BOB\nodeflow-ibm-bob` |
| Ventana de la tarea | creada 26/09 14:01 · última actividad 15:36 |

El desglose del contexto por turno (columna `costs.contextWindowBreakdown`) muestra de dónde salió cada
token fijo: `toolDefinitions` 6.850, `toolSystemPrompts` 3.340, **`projectRules` 3.364** (el `AGENTS.md`
y los documentos del repo entrando en su contexto), `skills` 839, `baseRules` 197, `environment` 77.
Ese `projectRules` es el tamaño del contexto de reglas del proyecto (`AGENTS.md` y los documentos del repo
entrando a su contexto). **No** prueba por sí solo que un contrato concreto se haya leído: eso lo prueba el propio
pedido —la sesión en `bob_sessions/` y la entrega contra su firma—, no un contador de tokens.

## 5 · El reparto, sin adorno

| Quién | Qué hizo |
|---|---|
| **Humano (Tomas + asistente)** | El contrato de cada pedido (campos, bordes, tests exigidos, criterio de cierre), el orden de las ramas, la verificación contra los árbitros y las correcciones de diseño |
| **Bob** (`premium-ide`, modo agente) | La implementación completa de las dos tareas, en ramas propias, con commits propios y su mensaje |
| **Auditor independiente** (otro modelo, otro contexto) | Revisión del paso 2: 5 hallazgos, de los cuales 2 eran defectos reales |

Lo que este ejercicio dejó claro y quedó escrito en el repo: **un agente de código ejecuta fiel, y el
contrato igual puede tener el agujero.** Los tres defectos del paso 2 son el mismo animal —la
*temporalidad* (cuándo medir una pausa, cuándo consultar) no se escribe en un contrato de campos— y por
eso la verificación humana y la auditoría van después, no antes.

## 6 · Cómo reproducir todo esto

```bash
# 1. Lo que la app de Bob sabe de sí misma (tareas y la tabla de atribución)
python scripts/bob-evidencia.py
#    → bob_sessions/tareas.md  ·  bob_sessions/attribution.md

# 2. El plan de Bob y su consumo, leídos de su base (~/.bob/db/bob.db)
python -c "
import sqlite3, json, shutil, os
shutil.copy(os.path.expanduser('~/.bob/db/bob.db'), 'bob.db')
c = sqlite3.connect('bob.db')
for id_, env, costs in c.execute('SELECT id, env, costs FROM tasks ORDER BY updated_at DESC'):
    e, k = json.loads(env or '{}'), json.loads(costs or '{}')
    if not k.get('cost'): continue
    print(id_[:12], e.get('model', {}).get('id'), k['cost'], k['contextTokens'])
    for t in (e.get('task') or []): print('  ', t.get('state'), t.get('description'))
"

# 3. Las dos entregas, con sus archivos y líneas
git show --stat cff0baa 2f55131

# 4. Los pedidos que las precedieron (el contrato, antes del código)
git log --format='%h %ad %s' --date=format:'%d/%m %H:%M' -- docs/hackathon/PEDIDO-BOB-01.md docs/hackathon/PEDIDO-02-cliente-parcial.md
```
