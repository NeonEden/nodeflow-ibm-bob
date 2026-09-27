# NodeFlow — Submission package (English)
<!-- IBM Bob 2.0 Hackathon · lablab.ai · deadline 2026-09-27 15:00 UTC -->

> Everything the submission form asks for, ready to copy. Every claim is traceable to the public repository
> (`github.com/NeonEden/nodeflow-ibm-bob`): the commits named are real and their order matters — **the contract
> is always older than the delivery**.

---

## 1 · Project Title

**NodeFlow — speak the request, and IBM Bob 2.0 builds it against a contract**

## 2 · Short Description

NodeFlow turns spoken ideas into a working graph. Each idea becomes a versioned contract that **IBM Bob 2.0**
implements, while a different agent audits the delivery against that same text — the spec-first workflow we
used to build NodeFlow itself, running inside the product.

## 3 · Long Description

**The problem.** An unclear request costs you three times: in implementation (you build too much or too
little), in review (there is nothing to compare against, so review becomes opinion) and in fixes (the defect
surfaces late, when other code already sits on top of it).

**The workflow.** Every request starts as a contract — scope, function signature, enumerated cases — committed
**before any code**, so the request has a fixed date. IBM Bob 2.0 implements against that text. Then an
**independent review by a different agent** audits the delivery against the same contract. One real request: the
contract for the partial-transcript segmenter was committed first (`docs/hackathon/PEDIDO-BOB-01.md`); Bob
implemented the module and its endpoint and delivered `cff0baa`; a later revision fixed its stability
(`e84fb5b`). A second request — creating nodes when the voice turn closes — landed in `8582026`, and the review
caught that nodes were being created once per audio segment instead of once per turn, fixed in `0e059ed`.
**The steps are manual and deliberate: this is not an automatic voice-to-code pipeline.**

**What we built.** A local-first desktop app (Tauri + Rust + React Flow) where you think out loud and the canvas
draws itself: a deterministic segmenter decides whether what you said is an idea, a correction or noise; a draft
node appears while you speak; and when the turn closes, each topic becomes a real node — chained, draggable,
connectable — created without a confirmation step, because the safety net is undo. A public web demo runs the
same interface in the browser, with real dictation powered by a temporary session the server issues, so nobody
has to bring their own key. The interface ships in Spanish and English.

**Why it holds together.** The canvas is where the request becomes the contract: you talk, the nodes appear, and
it is written down while it is still fresh. The contract is what makes review objective, and the review is what
catches the defect before merge.

**The limits, stated up front.** The test counts (324/324 Rust, 141/141 frontend) are recorded results from the
suites on the named commits, not a measured saving. The defect caught in review is one case, not a controlled
experiment. The process was applied to this project: it does not prove general productivity.

---

## 4 · Problem & Solution Statement (≤500 words)

An unclear request costs you three times. In implementation, because you build too much or too little. In
review, because there is nothing to compare against, so review degrades into opinion. And in fixes, because the
NodeFlow attacks the ambiguity at both ends, with the same idea: **write the request down as a contract, before
it becomes code.**

On the input side, it is a canvas that listens. You speak and the graph grows: a deterministic segmenter on the
backend decides whether what you just said is a new idea, a correction to the previous one, or noise — no model
in the hot path, so it keeps working with no network and no key. While you speak, a draft node appears; when the
turn closes, each topic becomes a real node in the graph, chained from the anchor, draggable. There is no
confirmation step, because the safety net is that you can undo it. The result: the request is written down while
it is still fresh — the only moment it is cheap to make precise.

On the output side, that written request *is* the contract. It carries scope, the exact function signature and
an enumerated list of cases, and it is **committed before any code exists**, so the request has a fixed date
that nobody can move later. That is what makes the next step possible: an **independent review by a different
agent**, which audits the delivery against the same text instead of against its own taste. On this project that
is not a promise — it is in the history. The contract for the partial-transcript segmenter
(`docs/hackathon/PEDIDO-BOB-01.md`) was committed first; IBM Bob 2.0 implemented the module and its endpoint and
delivered `cff0baa`; a later revision fixed its stability (`e84fb5b`). A second request — creating nodes when the
voice turn closes — landed in `8582026` and the independent review caught a real defect: nodes were being created
once per audio segment instead of once per turn, which produced a chain of half-dictated nodes. It was fixed in
`0e059ed`, before merge.

We also publish the limits. The test counts (324/324 Rust on `0d05b2f`, 141/141 frontend on `e47537a`) are recorded results from the suites
on those commits — not a measured saving. The defect caught in review is one case, not a controlled experiment.
The workflow was applied to this project, and applying it here does not prove it generalises. And the steps are
manual and deliberate: **this is not an automatic voice-to-code pipeline**.

What we are submitting is therefore two things in one product: a canvas that turns speech into a precise,
undoable graph, and the spec-first workflow — contract, implement, independently audit — that the canvas makes
natural.

---

## 5 · IBM Bob Usage Statement (≤500 words)

**Where Bob worked.** IBM Bob 2.0 was our implementing agent for the voice-to-graph path. Bob implemented the backend **partial-transcript segmenter** in Rust — `src-tauri/src/segmentador.rs`
(312 lines) plus its endpoint in `server.rs`, delivered as `cff0baa` — the module that decides,
for every partial transcript, whether the user is starting an idea, correcting it, or just making noise. It also
implemented the **partial-result client** on the frontend that feeds the live draft node in React Flow:
`src/services/vozService.ts` and a 207-line test suite, delivered as `2f55131`. The files it touched, with branch
and line ranges, are recorded in `bob_sessions/attribution.md`,
generated from Bob's own database by `scripts/bob-evidencia.py`; the two requests it worked on, with their
delivered commits, are `docs/hackathon/PEDIDO-BOB-01.md` and `PEDIDO-02-cliente-parcial.md`.

**How we used it, and what made it work.** Every request reached Bob as a committed contract, never as a
sentence in a chat. Each contract fixed the scope, the exact signature and an enumerated list of expected cases,
and it was committed **before** the code, so there is always a dated text to review the delivery against. That
one decision is what turned Bob from a fast writer into a reliable partner: when the delivery and the contract
disagree, the disagreement is visible without arguing about taste. On the segmenter, that discipline is what
produced `cff0baa` and then the stability fix in `e84fb5b`. On the node-creation request, Bob delivered
`8582026`, our independent review (run by a *different* agent, against the same contract) found that nodes were
created once per audio segment instead of once per turn, and the fix landed as `0e059ed` — before merge. Bob did
not review its own work, and we do not claim any credit for the transcription and speech engines: those are hired
services.

**How the workflow became part of the product.** This is the part we are most interested in. The method we
needed to work with Bob — *the contract is written down before the code, the implementer is not the auditor, and
nobody declares victory until a command in the machine confirms it* — is the same method NodeFlow applies to
ideas. In the app, the canvas already carries an orchestrator panel and a system of experts that run against a
node: the request is written as a node, and the node is the unit of work. We wrote the workflow down as a system
document in the public repo (`docs/SISTEMA-ORQUESTACION.md`), with the five levels of verification we ended up
needing, and the rules that each exist because something broke that way.

**The honest part.** Bob implemented; it did not architect, and it did not audit itself. The requests were
manual, one at a time, reviewed by a person and by a second agent. What Bob changed is concrete: with a committed
contract, its output stopped being a draft we had to reinterpret.

---

## 6 · Technology & Category Tags

Tauri · Rust · React · TypeScript · React Flow · AssemblyAI Universal-Streaming v3 · IBM Bob 2.0 · agentic coding
workflow · spec-first development · independent code review · voice interface · local-first · idea-to-graph

## 7 · Improvements made during the event

Before the hackathon NodeFlow already had dictation and voice actions. During the event we added the full path
from voice to graph — the deterministic segmenter, the live draft node, one node per topic, the frictionless flow
with undo — and we made the demo public and keyless: a web build where the server issues a temporary
speech session so anyone can dictate without an account. And, more importantly, we adopted the workflow we are
now submitting: contract committed before the code, an implementing agent, and a separate reviewing agent.

---

## 8 · Materials checklist

| Material | Status | Where |
|---|---|---|
**Cover image** | ✅ ready | `docs/hackathon/submission/cover-en.png` (1280×640) |
**Slide presentation** | ✅ ready | `docs/hackathon/submission/slides-en.pdf` (8 slides, 16:9) |
**Video demonstration** | ⬜ to upload (owner) | script: `docs/hackathon/VIDEO-SCRIPT-EN.md` — under 3 min, ≥90 s of the solution working |
**Public GitHub repository** | ✅ public | `github.com/NeonEden/nodeflow-ibm-bob` |
**Application URL** | ✅ live | `https://nodeflowsss.netlify.app` — **real dictation**, 30 s per session, 3 per day |
**Bob evidence: code/files** | ✅ | `bob_sessions/attribution.md` + `docs/hackathon/EVIDENCIA-BOB.md` |
**Bob evidence: task session summaries** | ⚠️ **owner must capture** | `bob_sessions/` — Tasks → select task → click the task header → screenshot (the two PNGs already there are from earlier tasks) |

## 9 · What we do NOT say (removed on purpose)

- No «before it reached production»: the review found the defect and we fixed it **before merge** — that is what
  the commits show, and that is all we claim.
- No «Bob wrote the voice engine»: Bob implemented the **segmenter and the partial-result client**. Transcription
  and speech are hired services.
- No «signed Windows release»: there is a published installer; Authenticode signing is not accredited.
- No PR counter presented as savings: merged PRs include docs and dependencies. That is activity, not savings.
- No claim that the workflow is automatic: the steps are manual, deliberate, and reviewed by a human.

---

## 10 · Final index — everything a judge needs, in one place

| What | Where |
|---|---|
**Problem & Solution Statement** (445 words) | §4 of this file |
**IBM Bob Usage Statement** (469 words) | §5 of this file |
**Contracts, committed before the code** | `docs/hackathon/PEDIDO-BOB-01.md` · `PEDIDO-02-cliente-parcial.md` · `PEDIDO-03`–`PEDIDO-06` |
**Bob's two deliveries** | `cff0baa` — segmenter, `src-tauri/src/segmentador.rs` (312 lines) + `server.rs` · `2f55131` — client, `src/services/vozService.ts` + 207-line test suite |
**The correction that review triggered** | `e84fb5b` — the draft is judged by time, not by text difference |
**Defect caught in independent review** | `0e059ed` — `VozPanel.tsx`: nodes were created once per audio segment instead of once per turn |
**Bob evidence** | `bob_sessions/attribution.md` (per file and line) · `bob_sessions/*.png` ⚠️ *consumption summaries still pending* |
**Tests** | Rust 324/324 on `0d05b2f` · frontend 141/141 on `e47537a` |
**Video** | owner uploads — script in `docs/hackathon/VIDEO-SCRIPT-EN.md` (≤3 min, ≥90 s of the solution) |
**Slides** | `docs/hackathon/submission/slides-en.pdf` (8, 16:9) |
**Cover** | `docs/hackathon/submission/cover-en.png` (1280×640) |
**Repository** | `github.com/NeonEden/nodeflow-ibm-bob` (public) |
**Application** | `https://nodeflowsss.netlify.app` — real dictation, no key needed |
