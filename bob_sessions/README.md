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

## Cómo se genera (no se escribe a mano)

```bash
python scripts/bob-evidencia.py          # escribe los dos exports desde la base real
```

Regla: si un número de estos archivos no se puede volver a producir desde `bob.db`, no va. La rúbrica
pide mostrar **cómo y dónde se usó Bob**; un relato sin la tabla al lado no es evidencia.
