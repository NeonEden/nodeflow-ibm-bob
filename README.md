# NodeFlow · IBM Bob 2.0 Hackathon

**Hablás y el lienzo se dibuja.** NodeFlow es una app de escritorio *local-first* donde la voz no
dicta texto: opera un grafo de ideas. Mientras hablás, el canvas muestra un **nodo fantasma** que crece
con la frase; cuando cerrás el turno, el plan se **valida en código** contra el grafo real y recién ahí
toca tu estado. El grafo vive en tu bóveda de Obsidian, en archivos que son tuyos.

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

## Evidencia del uso de Bob

`bob_sessions/` guarda los exports de la base de Bob (`~/.bob/db/bob.db` → `tasks` y
`attribution_logs`: archivo, líneas y herramienta). Se generan con `python scripts/bob-evidencia.py`,
nunca a mano. Ver [`bob_sessions/README.md`](bob_sessions/README.md).

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
