# Form texts — English (copy & paste into lablab)

> Audited against the official guide. Every claim here is traceable to the repository: the commits named
> are real and their order matters (the contract is always older than the delivery).
>
> **Deadline: Sep 27, 2026, 15:00 UTC.** Upload with time to spare — do not submit at the close.

## Basic information

**Project Title**

> NodeFlow — from a spoken request to reviewed code, built with IBM Bob 2.0

**Short Description**

> NodeFlow is a voice canvas: you speak, nodes appear, and the request is written down while it is still
> fresh. Each request can become a versioned contract — that is the workflow we submit — and on this project
> **IBM Bob 2.0** implemented the two requests of the voice path while a different agent audited each delivery
> against that same text.

**Long Description**

> **The problem.** An unclear request creates extra work three times: in implementation (you build too much
> or too little), in review (there is nothing to compare against, so review becomes opinion) and in fixes
> (the defect shows up late, when other code already sits on top of it).
>
> **The workflow.** Every request starts as a contract — scope, function signature, enumerated cases —
> committed **before any code**, so the request has a fixed date. IBM Bob 2.0 implements against that text.
> Then an **independent review, by a different agent**, audits the delivery against the same contract.
> One real request, with its commits: the contract for the partial-transcript segmenter was committed first
> (`docs/hackathon/PEDIDO-BOB-01.md`); Bob implemented the module and its endpoint and delivered `cff0baa`;
> a later revision fixed its stability (`e84fb5b`). A second request — creating the nodes when the voice
> turn closes — landed in `8582026`, and the review found that nodes were being created once per audio
> segment instead of once per turn, fixed in `0e059ed`. **The steps are manual and deliberate: this is not
> an automatic voice-to-code pipeline.**
>
> **What we built.** A desktop app (Tauri + Rust + React Flow) where you think out loud and the canvas
> draws itself: a deterministic segmenter on the backend decides whether what you said is an idea, a
> correction or noise; a draft appears as you speak; and when the turn closes, each topic becomes a real
> node — chained, draggable, connectable — created without a confirmation step, because the safety net is
> that you can undo it. The interface ships in Spanish and English.
>
> **Why it fit together.** The canvas is where the request becomes the contract — **manually**: you talk, the nodes
> appear, and you decide when an idea is ready to be written down as one, while it is still fresh. The contract is what makes the review objective,
> and the review is what catches the defect before merge.
>
> **The limits, stated up front.** The test counts (324/324 Rust, 135/135 frontend) are recorded results
> from the suites on the named commits, not a measured saving. The defect caught in review is one case,
> not a controlled experiment. The process was applied to this project: it does not prove general
> productivity.

**Technology & Category Tags**

> Tauri · Rust · React · TypeScript · React Flow · AssemblyAI · IBM Bob 2.0 · agentic coding workflow ·
> spec-first development · independent code review · voice interface · idea-to-graph

**Improvements made during the event**

> Before the hackathon NodeFlow already had dictation and voice actions. During the event we added the
> full path from voice to graph (the deterministic segmenter, the live draft, one node per topic, the
> frictionless flow with undo) — and, more importantly, we adopted the workflow we are now submitting:
> contract committed before the code, an implementing agent, and a separate reviewing agent. The
> per-request detail is in the commits and contracts.

---

## Materials checklist

| Material | Where |
|---|---|
| **Cover image** | `docs/hackathon/submission/cover-en.png` (1280×640) |
| **Slide presentation** | `docs/hackathon/submission/slides-en.pdf` (8 slides, 16:9) |
| **Video presentation** | owner uploads — script in `VIDEO-SCRIPT-EN.md`, under 3 min, **in English**, with at least 90 s of the solution working |
| **Public GitHub repository** | `github.com/NeonEden/nodeflow-ibm-bob` |
| **Application URL** | `https://nodeflowsss.netlify.app` — public web demo with **real dictation**: the server issues a temporary speech session (30 s per session, 3 per day), no key needed |
| **Bob evidence (mandatory)** | `bob_sessions/` — ⚠️ still missing: **the two PNGs there are NOT the summaries** (one is a context breakdown, one is a chat with counters). Capture the *task session consumption summary* of the sessions that did the work: **Tasks → select the task → click the task header → screenshot**. Tasks 01 and 02 share one session (`EVIDENCIA-BOB.md` L74–75) — do not invent one per request |

## What we do NOT say (removed on purpose after the audit)

- No "before it reached production": the review found the defect and we fixed it before merge — that is
  what the commits show, and that is all we say.
- No 80-tool-calls vs. piece comparison: the primary record is not in this repo and that piece was written
  by a different agent, not by Bob. The claim is out.
- No "Bob wrote the voice engine": Bob implemented the **segmenter and the partial-result client**.
  Transcription and speech are hired services.
- No "signed Windows release": there is a published installer; Authenticode signing is not accredited.
- No PR counter presented as Bob's output: 25 PRs were merged in the window, including docs and
  dependencies. It is activity, not savings.
