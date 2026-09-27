# Bob Sessions · evidencia de trabajo (requisito de la submission)

El `.gitignore` del template oficial dice, textual:

> `bob_sessions/` folder is REQUIRED for project submission. Live session files are excluded, but
> exported reports must be included.

O sea: **la carpeta tiene que existir y tener los reportes exportados**; lo que no se versiona son los
archivos de sesión en vivo (esos los excluye el `.gitignore` del template).

## Qué va acá

| Archivo | Qué es |
|---|---|
| `attribution.md` | Export de `~/.bob/db/bob.db` → tabla `attribution_logs` (archivo, líneas, herramienta) |
| `tareas.md` | Export de `tasks`: qué se le pidió a Bob, en qué rama y con qué estado |
| `reporte-*.md` | Reportes que exporte Bob desde su interfaz |
| `nodeflow_taskNN_*_summary.png` | **Capturas del resumen de consumo** (ver abajo) |

## Cómo se genera (no se escribe a mano)

```bash
python scripts/bob-evidencia.py          # escribe los dos exports desde la base real
```

Regla: si un número de estos archivos no se puede volver a producir desde `bob.db`, no va. La rúbrica
pide mostrar **cómo y dónde se usó Bob**; un relato sin la tabla al lado no es evidencia.

## Capturas del resumen de consumo (lo que pide el guide, textual)

> *«Select the task header. A task session consumption summary will be displayed.»*
>
> *«Take a screenshot of the task session consumption summary. Save screenshots in PNG format where
> possible for better text clarity. Use a clear file name that includes your team name, task number, and
> short task description.»* · Ejemplo del guide: `teamalpha_task01_login_flow_summary.png`

**Receta, en el Bob IDE** (instancia `ibm-coding-challenge-*`, region us-east):

1. Chat → **Tasks** → elegir la tarea del proyecto (si hay varias, `All`).
2. **Click en la cabecera de la tarea** → aparece el **task session consumption summary**.
3. Capturar en PNG y guardarla acá como `nodeflow_taskNN_<descripcion-corta>_summary.png`.

| Archivo | Qué muestra | Tarea de Bob |
|---|---|---|
| `nodeflow_task01_segmentador_consumption-summary.png` | **el *task session consumption summary***: `67% Full · ~179.8k / 270.0k Tokens`, con el desglose (system prompt 4.0k · tool definitions 6.8k · rules 3.7k · skills 839 · messages 164.4k · reservado para la respuesta 64.0k) | pedido 01 — el segmentador de voz (Rust) |
| `nodeflow_task01-02_todo-list-completed.png` | el todo list de la sesión **14/14 completado**: crear el segmentador, el endpoint `POST /api/voz/parcial`, declararlo en `lib.rs`, el cliente en `vozService.ts`, los 4 fixes (toggle, dedup de cierres, fantasma, 409) y los árbitros | pedidos 01 y 02 (**comparten sesión**) |
| `nodeflow_all-tasks_summary.png` | la tabla de los tres pedidos con los archivos tocados y los tests de cada uno: **48 tests nuevos (14 Rust + 34 TS)**, todos en verde en sus ramas | 01, 02 y 03 |
| `nodeflow_task03_files-changed.png` | los archivos del pedido 03 con su diff: `VozPanel.tsx +163 −12`, `App.tsx +63 −4`, `vozService.test.ts +295`, `pulido.test.ts +194`, `9 files changed` | pedido 03 — pulido del dictado |
| `nodeflow_task03_ide-session.png` | la sesión vista en el IDE: `All tasks completed 14/14`, `179.8k / 270.0k`, `29.99` Bobcoins | la sesión de trabajo completa |

**Estado: las 5 están en el repositorio.** La del *consumption summary* (el panel de tokens) es la que el
guide pide textualmente: *«Select the task header. A task session consumption summary will be displayed.»*

Los `.png` **no** están bloqueados por el `.gitignore` (verificado con `git check-ignore -v`).
