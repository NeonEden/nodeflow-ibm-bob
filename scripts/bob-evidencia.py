#!/usr/bin/env python3
"""Exporta la evidencia del uso de Bob desde su propia base — para la submission del hackathon.

Por qué existe: la rúbrica de IBM Bob 2.0 pide explicar **en ≤500 palabras cómo y dónde se usó Bob**.
Un relato sin datos al lado no es evidencia; esto saca los números de la fuente, `~/.bob/db/bob.db`:

  tasks             qué se le pidió (título, directorio, rama, estado, fechas)
  attribution_logs  dónde lo hizo (archivo, rama, herramienta, líneas)

Uso:  python scripts/bob-evidencia.py
Salida: bob_sessions/tareas.md · bob_sessions/attribution.md

Solo lee (la base se abre en modo read-only) y no imprime credenciales: la tabla no las tiene.
Si una tabla está vacía, lo dice con esas palabras: no rellena con ceros ni con texto inventado.
"""
from __future__ import annotations

import datetime as dt
import os
import sqlite3
import sys
from pathlib import Path

DB = Path(os.path.expandvars(r"%USERPROFILE%\.bob\db\bob.db"))
DEST = Path(__file__).resolve().parent.parent / "bob_sessions"


def fecha(ms: object) -> str:
    """Bob guarda epoch en milisegundos (medido 26/09/2026: tasks.created_at = 1790377507231)."""
    try:
        v = int(ms)
    except (TypeError, ValueError):
        return "—"
    if v > 10_000_000_000:  # milisegundos
        v //= 1000
    return dt.datetime.fromtimestamp(v).strftime("%Y-%m-%d %H:%M")


def celda(v: object) -> str:
    """Una celda de tabla markdown: sin saltos de línea y sin romper la tabla con un pipe."""
    s = "" if v is None else str(v)
    s = s.replace("\n", " ").replace("|", "\\|").strip()
    return s[:160] if len(s) > 160 else (s or "—")


def tabla(cur: sqlite3.Cursor, sql: str, cols: list[str], encabezados: list[str],
          como_fecha: frozenset[int] = frozenset()) -> list[str]:
    filas = cur.execute(sql).fetchall()
    if not filas:
        return ["*Todavía no hay filas en esta tabla.*"]
    out = ["| " + " | ".join(encabezados) + " |", "|" + "---|" * len(encabezados)]
    for f in filas:
        out.append("| " + " | ".join(
            fecha(f[i]) if i in como_fecha else celda(f[i]) for i in range(len(cols))) + " |")
    return out


def main() -> int:
    if not DB.exists():
        print(f"No encuentro la base de Bob en {DB} (¿Bob nunca corrió en esta máquina?)", file=sys.stderr)
        return 1

    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    cur = con.cursor()
    DEST.mkdir(parents=True, exist_ok=True)

    def hay(t: str) -> bool:
        return bool(cur.execute(
            "select 1 from sqlite_master where type='table' and name=?", (t,)).fetchone())

    generado = dt.datetime.now().strftime("%Y-%m-%d %H:%M")

    # --- tareas -----------------------------------------------------------------
    cuerpo = [
        "---",
        "tipo: evidencia-bob",
        f"generado: {generado}",
        "fuente: ~/.bob/db/bob.db → tasks",
        "---",
        "",
        "# Tareas de Bob",
        "",
        f"Generado por `scripts/bob-evidencia.py` el {generado}. No se edita a mano.",
        "",
    ]
    if hay("tasks"):
        n = cur.execute("select count(*) from tasks").fetchone()[0]
        cuerpo += [f"**{n} tarea(s)** registradas.", ""]
        # `title` puede venir vacío (medido 26/09: las dos tareas lo tienen vacío y sí traen
        # `first_message`): el título con respaldo evita una tabla de guiones.
        # `costs` es un JSON con el gasto y los tokens de Bob: se extraen los números, no el blob.
        cuerpo += tabla(cur,
                        "select coalesce(nullif(title,''), first_message, id) as t, status, "
                        "coalesce(nullif(git_branch,''), '(rama sin registrar)'), "
                        "coalesce(substr(git_sha,1,8), '—'), "
                        "coalesce(json_extract(costs,'$.cost'), 0), "
                        "coalesce(json_extract(costs,'$.contextTokens'), 0), "
                        "created_at, updated_at "
                        "from tasks order by created_at desc",
                        ["t", "status", "git_branch", "git_sha", "cost", "contextTokens",
                         "created_at", "updated_at"],
                        ["Tarea", "Estado", "Rama", "Commit", "USD", "Tokens ctx", "Creada", "Actualizada"],
                        como_fecha=frozenset({6, 7}))
    else:
        cuerpo.append("*La tabla `tasks` no existe en esta base.*")

    # --- atribución (la que pide la rúbrica) ------------------------------------
    cuerpo = "\n".join(cuerpo)
    (DEST / "tareas.md").write_text(cuerpo + "\n", encoding="utf-8")

    atrib = [
        "---",
        "tipo: evidencia-bob",
        f"generado: {generado}",
        "fuente: ~/.bob/db/bob.db → attribution_logs",
        "---",
        "",
        "# Atribución de Bob (archivo y líneas)",
        "",
        f"Generado por `scripts/bob-evidencia.py` el {generado}. No se edita a mano.",
        "",
        "Esta tabla es la respuesta literal a «dónde usaste Bob»: cada fila dice el archivo, la rama, la",
        "herramienta y el rango de líneas que Bob tocó.",
        "",
    ]
    if hay("attribution_logs"):
        n = cur.execute("select count(*) from attribution_logs").fetchone()[0]
        cuerpo_por_archivo = ""
        if n:
            filas = cur.execute(
                "select coalesce(file_uri,''), count(*), sum(coalesce(end_line,0) - coalesce(start_line,0) + 1) "
                "from attribution_logs group by 1 order by 2 desc").fetchall()
            cuerpo_por_archivo = "\n".join(
                ["", "## Por archivo", "", "| Archivo | Registros | Líneas |", "|---|---|---|"]
                + [f"| {celda(f[0])} | {f[1]} | {f[2] or '—'} |" for f in filas])
        atrib += [f"**{n} registro(s)** de atribución.", ""]
        atrib += tabla(cur,
                       "select file_uri, repo_name, branch_name, tool_name, start_line, end_line, created_at "
                       "from attribution_logs order by created_at desc",
                       ["file_uri", "repo_name", "branch_name", "tool_name", "start_line", "end_line", "created_at"],
                       ["Archivo", "Repo", "Rama", "Herramienta", "Desde", "Hasta", "Cuándo"],
                       como_fecha=frozenset({6}))
        if cuerpo_por_archivo:
            atrib.append(cuerpo_por_archivo)
    else:
        atrib.append("*La tabla `attribution_logs` no existe en esta base.*")

    (DEST / "attribution.md").write_text("\n".join(atrib) + "\n", encoding="utf-8")
    con.close()

    print(f"escrito: {DEST / 'tareas.md'}")
    print(f"escrito: {DEST / 'attribution.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
