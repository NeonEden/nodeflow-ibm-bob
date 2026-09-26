# Migración al repo del hackathon IBM Bob 2.0 — 26/09/2026

Este repositorio es el **oficial del evento**: clon del template `watsonxhackathon/ibm-hackathon-template`
con el código de NodeFlow migrado adentro. El repo de trabajo anterior queda como laboratorio
(historial, worktrees, experimentos) y no recibe más features.

## Qué entró

Se copió **lo que git versionaba** en el repo de trabajo (`git ls-files`, 273 archivos → **262 migrados**),
así que `node_modules/`, `src-tauri/target/`, `dist/` y los `.bak` quedaron afuera por construcción, sin
depender de una lista negra que alguien tenga que mantener.

| Directorio | Archivos | Qué es |
|---|---|---|
| `src/` | 81 | Frontend React + React Flow (`App.tsx` es grande: los paneles viven en `src/components/`) |
| `src-tauri/` | 58 | Backend Rust: axum (`server.rs`), grafo, voz, bóveda, cerebro residente |
| `docs/` | 46 | ADRs, planes (incluido `PLAN-LIENZO-EN-VIVO.md`), informes, notas de versión |
| `demo/` | 40 | Demo web pública (deploy a Vercel, proyecto aparte) |
| `scripts/` | 20 | Operativo: instalar, instalador, verificar, release, i18n… (+ `bob-evidencia.py`) |
| `tools/` | 3 | Servidor TTS local (Kokoro) |
| `.github/` | 2 | CI (`tsc` + `vitest` + `build` + `cargo test --lib`) y dependabot |

Raíz migrada: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
`index.html`, `AGENTS.md`, `LICENSE`, `README.es.md`, `ROADMAP.md`, `.vercelignore`.

## Qué quedó afuera (y por qué)

| Afuera | Motivo |
|---|---|
| `control_point.md`, `generate_control_pdf.py` | Informes sueltos de auditoría: el plan lo prohíbe explícitamente en la raíz |
| `metadata.json` | Metadata suelta en la raíz, sin uso en el build |
| `server.ts` | Express viejo: ya estaba excluido del `tsconfig` y rompía el CI por error de tipos |
| `CLAUDE.md` | Contrato de otro agente; el de este repo es `AGENTS.md` |
| `bun.lock` | El proyecto usa npm (`package-lock.json`) |
| `SECURITY.md` | Choca en NTFS (insensible a mayúsculas) con el `SECURITY.MD` del template |
| `cerebro/graph_config.json` | Estado local del cerebro residente: vive en la bóveda del usuario, no en el repo |
| `node_modules/`, `src-tauri/target/`, `dist/` | Artefactos de build (`.gitignore`) |
| worktrees `nf-*` y ramas `agente/*` | Laboratorio del repo anterior |

## Qué del template se conservó tal cual

- **`.bobignore`** — impide que Bob registre credenciales en su historial. **No se toca.**
- **`.gitignore`** — patrones de seguridad del evento; se le **agregó al final** (donde el propio archivo
  lo pide) la sección de NodeFlow: `src-tauri/target/`, `dist/`, `node_modules/`, `.vite/`, `*.bak`.
- **`.env.example`** — se le agregaron los nombres de las variables de NodeFlow (AssemblyAI, Tavily, motor
  de la demo) **sin valores**, después de las de IBM.
- **`SECURITY.MD`** — instrucciones de seguridad del hackathon.
- **`README.md`** — se conserva el contenido del template debajo de la presentación del proyecto.

## Ramas

| Rama | Para qué |
|---|---|
| `main` | Inviolable: sólo código que pasa los tres árbitros |
| `feat/intra-turn-canvas` | Bob: captura de parciales + nodo borrador en React Flow + AssemblyAI |
| `feat/deep-architecture` | Deep: contratos de datos, esquemas JSON, ruteo de modelos |

## Estado verificado tras la migración

- **262 archivos** copiados, raíz sin archivos sueltos.
- `npx tsc --noEmit`, `npx vitest run` (50/50) y `npm run build` en verde **antes** de migrar (último
  commit del repo de trabajo que entra acá: `6fdfd42`, el nodo fantasma del turno de voz).
- `python scripts/bob-evidencia.py` funciona y exporta a `bob_sessions/` (hoy: 2 tareas, **0 registros de
  atribución** — Bob todavía no editó código en este repo).
- **Pendiente de verificar acá**: `cargo test --lib` (compila desde cero en este clon: minutos y varios GB
  de `target/`). Se corre la primera vez que se toque Rust, no antes.

## Pendientes de la migración

1. **Remote**: el clon venía apuntando al template de IBM; se le quitó el `origin` para que ningún `push`
   termine en el repo del evento. Falta crear el repo propio y apuntarlo.
2. `bob_sessions/` existe con su README y sus exports; falta que Bob **trabaje acá** para que
   `attribution_logs` deje de estar en 0.
3. El `AGENTS.md` quedó adaptado a las reglas del evento (ramas `feat/*`, cero basura en la raíz,
   evidencia de Bob obligatoria).
