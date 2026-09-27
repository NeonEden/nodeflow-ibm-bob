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

| Archivo | Tarea de Bob | Estado |
|---|---|---|
| `nodeflow_task01_segmentador_summary.png` | pedido 01 — el segmentador de voz del backend | ⬜ falta |
| `nodeflow_task02_cliente-parcial_summary.png` | pedido 02 — el cliente del parcial en el front | ⬜ falta |
| `nodeflow_task03_pulido-dictado_summary.png` | pedido 03 — pulido del dictado | ⬜ falta |
| `nodeflow_task03_ide-tarea-completada.png` | la sesión vista en el IDE: `All tasks completed 14/14`, `179.8k / 270.0k`, `29.99` Bobcoins | ✅ está |

Los `.png` **no** están bloqueados por el `.gitignore` (verificado con `git check-ignore -v`).
