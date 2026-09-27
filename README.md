# NodeFlow · IBM Bob 2.0 Hackathon

**You speak, and the canvas draws itself.** NodeFlow is a *local-first* desktop app where voice does
not dictate text: it operates a graph of ideas. As you speak, the canvas shows a **draft node** that grows
with the sentence; when the turn closes, the plan is **validated in code** against the real graph before it
touches your state. The graph lives in your Obsidian vault, in files you own.

**How this repo was built (the workflow we submit).** Every request was written as a **contract committed
before any code** (`docs/hackathon/PEDIDO-0*.md`), **IBM Bob 2.0** implemented it, and an **independent
review by a different agent** audited the delivery against that same text:

**request → contract → Bob implements → delivery commit → independent review → fix**

Two real requests with their commits: the contract for the partial-transcript segmenter was committed
first, Bob delivered `cff0baa`, and a later revision fixed its stability (`e84fb5b`); the node-creation
integration landed in `8582026`, the review found nodes were created once per audio segment instead of
once per turn, and that was fixed in `0e059ed`. Details and the evidence: `docs/hackathon/`.

- **Stack**: Tauri v2 · Rust (axum, API propia en `127.0.0.1:37371`) · React 19 + React Flow · TypeScript
- **Voz**: AssemblyAI **Universal-Streaming v3** (WebSocket, token temporal que emite el backend) + TTS
  local Kokoro (paquete descargable, 2,3× tiempo real)
- **Reglas de la casa**: el modelo propone y el código valida (ADR `0003`); sin LLM en el camino
  caliente (ADR `0005`); ruteo híbrido, primero local (ADR `0004`); todo lo que se mide queda escrito.
- **Contexto del evento**: este repo es el **oficial** para el hackathon IBM Bob 2.0 (clon del template
  oficial). El repo de trabajo anterior queda como laboratorio; acá se construye.

Este repositorio se migró desde el repo de trabajo el **26/09/2026**: qué entró, qué quedó afuera y por
qué está en [`docs/hackathon/MIGRACION.md`](docs/hackathon/MIGRACION.md). Estado y plan vigente:
[`docs/PLAN-LIENZO-EN-VIVO.md`](docs/PLAN-LIENZO-EN-VIVO.md).

## Probarlo en 10 segundos

**[▶ Abrir el demo web](https://nodeflow-ibm-bob.vercel.app)** — se abre en el navegador, sin instalar nada y
sin pedir login. Muestra la interfaz real con un flujo de voz **simulado** (datos de ejemplo).

Para la app de verdad —la que escucha tu voz— o para correr el demo en tu máquina:
[`docs/COMO-PROBAR.md`](docs/COMO-PROBAR.md).

## Cómo se corre y cómo se verifica

| Para qué | Comando |
|---|---|
| App completa en desarrollo | `npx tauri dev` (el watcher recompila Rust solo) |
| Tipos del frontend | `npx tsc --noEmit` |
| Tests del frontend | `npx vitest run` |
| Tests de Rust | `cargo test --manifest-path src-tauri/Cargo.toml --lib` |
| Compilar el frontend | `npm run build` |

Los tres árbitros de cualquier cambio: **`npx tsc --noEmit`, `npm run build` y `cargo test --lib`**.
Un cambio sin los tres en verde no está terminado.

## How IBM Bob 2.0 was used

The workflow we improved is **specifying, implementing and reviewing a change to software**. Bob is the
implementer, and every request followed the same verifiable chain:

**committed contract → Bob's session → delivery commit → independent review → fix**

What Bob implemented here: the backend **partial-transcript segmenter** (Rust) and its endpoint, and the
**partial-result client** on the frontend. The evidence that the hackathon asks for — the **task session
summaries** — lives in [`bob_sessions/`](bob_sessions/README.md), and which files Bob touched (and which it
did not) is in `docs/hackathon/EVIDENCIA-BOB.md`. Note the limits we state on purpose: no parallelism and
no subagents are attributed to Bob, and no credit is claimed for the transcription or speech engines —
those are hired services.

**La evidencia obligatoria de la submission** son las capturas del *task session consumption summary* de
cada tarea de Bob: están en [`bob_sessions/`](bob_sessions/README.md), con el detalle de cómo se
capturan. Además, y como complemento (no como requisito), `python scripts/bob-evidencia.py` exporta
desde `~/.bob/db/bob.db` la tabla de tareas y el detalle por archivo.

Qué escribió Bob y qué no: `docs/hackathon/EVIDENCIA-BOB.md`.

---

# (Contenido del template oficial de IBM, conservado)

# IBM Hackathon GitHub Project Template

This GitHub project template is for IBM Hackathon projects. It includes pre-configured security files to help prevent accidental credential commits and potential account suspension during the hackathon.

## 🚀 Quick Start

1. **Use this template to create your project:**
   - Click "Use this template" button above and select "Create a new repository"
   - Name your repository
   - Click "Create repository"

2. **Clone your new repository:**

   ```bash
   git clone https://github.com/HACKATHON-ORG/your-repo-name.git
   cd your-repo-name
   ```

3. **Set up environment variables:**

   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit .env with your actual credentials
   # Use your preferred editor (nano, vim, code, etc.)
   nano .env
   ```

4. **Verify .gitignore is working:**

   ```bash
   # This should NOT show .env file
   git status

   # This should confirm .env is ignored
   git check-ignore -v .env
   ```

5. **Start developing!**

## 🔒 Security Features

This template includes:

- **`.gitignore`** - Prevents committing credentials and live session files
- **`.bobignore`** - Prevents AI assistants from logging credentials
- **`.env.example`** - Template for your environment variables

## 📋 Before Every Commit

Always run this checklist:

- [ ] Reviewed `git diff` for sensitive data
- [ ] No hardcoded API keys or passwords
- [ ] `.env` file is NOT in staged changes
- [ ] No files with "credential" or "secret" in name
- [ ] Used environment variables for all credentials

## 🆘 Need Help?

- Read [SECURITY.md](SECURITY.MD) for detailed guidelines
- Contact hackathon support through mentor channel
- Ask in the hackathon Slack workspace

---

**Remember:** Security is everyone's responsibility. When in doubt, ask for help!
