# NodeFlow · IBM Bob 2.0 Hackathon

**You speak, and the canvas draws itself.** NodeFlow is a *local-first* desktop app where voice does
not dictate text: it operates a graph of ideas. As you speak, the canvas shows a **draft node** that grows
with the sentence; when the turn closes, the plan is **validated in code** against the real graph before it
touches your state. The graph lives in your Obsidian vault, in files you own.

**How this repo was built (the workflow we submit).** Every request was written as a **contract committed
before any code** (`docs/hackathon/PEDIDO-0*.md`), **IBM Bob 2.0** implemented the two requests of the voice path,
and an **independent review by a different agent** audited each delivery against that same text:

**request → contract → Bob implements → delivery commit → independent review → fix**

Two real requests with their commits: the contract for the partial-transcript segmenter was committed
first, Bob delivered `cff0baa`, and a later revision fixed its stability (`e84fb5b`); the node-creation
integration landed in `8582026`, the review found nodes were created once per audio segment instead of
once per turn, and that was fixed in `0e059ed`. Details and the evidence: `docs/hackathon/`.

The orchestration system behind that flow —the request lifecycle, isolation by `git worktree`, the **five levels
of verification** (repo → content → the contract's own cases → the integrated tree → the deployed product) and
what is **not** automated— is documented in [`docs/SISTEMA-ORQUESTACION.md`](docs/SISTEMA-ORQUESTACION.md).

- **Stack**: Tauri v2 · Rust (axum, its own API on `127.0.0.1:37371`) · React 19 + React Flow · TypeScript
- **Voice**: AssemblyAI **Universal-Streaming v3** (WebSocket, temporary token issued by the backend) + local
  Kokoro TTS (downloadable package, 2.3× real time)
- **House rules**: the model proposes and the code validates (ADR `0003`); no LLM in the hot path (ADR `0005`);
  hybrid routing, local first (ADR `0004`); everything that is measured gets written down.
- **Event context**: this repository is the **official** one for the IBM Bob 2.0 hackathon (clone of the official
  template). The earlier working repository stays as the lab; the work happens here.

This repository was migrated from the working repo on **2026-09-26**: what came in, what stayed out and why is in
[`docs/hackathon/MIGRACION.md`](docs/hackathon/MIGRACION.md). Current state and plan:
[`docs/PLAN-LIENZO-EN-VIVO.md`](docs/PLAN-LIENZO-EN-VIVO.md).

## Try it in 10 seconds

**[▶ Open the web demo](https://nodeflowsss.netlify.app)** — it runs in the browser, nothing to install and no
account: one click gets you into **Demo Mode** (no credentials).

There you can **dictate for real**. The demo issues its own temporary speech session (the key lives on the server
and never travels into the bundle, which you can inspect) with a cap of **30 seconds per session and 3 sessions
per day** per visitor; when it runs out, the panel offers you to bring your own key. While you speak the canvas
draws a draft node, and when the turn closes it creates the real nodes. The interface ships in **ES / EN** (the
switch in the top bar also translates the content of the map).

For the real thing —the desktop app, running your own speech engine— or to run the demo on your machine:
[`docs/COMO-PROBAR.md`](docs/COMO-PROBAR.md).

## How it runs and how it is verified

| What for | Command |
|---|---|
| Full app in development | `npx tauri dev` (the watcher rebuilds Rust on its own) |
| Frontend types | `npx tsc --noEmit` |
| Frontend tests | `npx vitest run` |
| Rust tests | `cargo test --manifest-path src-tauri/Cargo.toml --lib` |
| Build the frontend | `npm run build` |

The three arbiters of any change: **`npx tsc --noEmit`, `npm run build` and `cargo test --lib`**. A change
without all three green is not finished.

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

**The submission's mandatory evidence** is the screenshots of Bob's *task session summary* for each task: they
live in [`bob_sessions/`](bob_sessions/README.md), with the detail of how they are captured. As a complement
(not a requirement), `python scripts/bob-evidencia.py` exports the task table and the per-file detail from
`~/.bob/db/bob.db`.

What Bob wrote and what it did not: `docs/hackathon/EVIDENCIA-BOB.md`.

---

# (Official IBM template content, kept as-is)

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
