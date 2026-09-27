# Video script — 3 minutes, in English

> The jury reads English. This script is the **English** version of the montage that came out of the
> gpt-6-astra session (`docs/hackathon/PLAN-ASTRA-bob-hackathon.md`, §4), and it follows the reframing:
> **open with the developer workflow, not with the canvas.** Bob must appear early — not in the last 20
> seconds — and every number must be said with its source.
>
> **Setup before recording:** app in **English** (the ES/EN switch is in the top bar), vault with some
> nodes already there, Bob IDE open on the task list, terminal closed or minimised, notifications off.

| Time | What is on screen | What you say |
|---|---|---|
| **0:00–0:20** | You, then the repo/README showing the chain: *contract → Bob implements → commit → independent review → fix* | «Hi, I'm Tomás. This is NodeFlow, and it's the real case of a development workflow: turning an idea into a **versioned contract**, letting **IBM Bob 2.0** implement it, and auditing the delivery with tests and an independent review. The problem we attacked is the ambiguous request that never produces a verifiable deliverable.» |
| **0:20–0:55** | The desktop app. You press `Ctrl+Alt+Space` and **dictate a concrete software change** in English, e.g. *"Add a rate limiter to the voice endpoint"*. The draft appears and grows; when you close the turn, **two real nodes** land on the canvas, chained. You drag one, then hit `Ctrl+Z`. | «While I speak, the canvas sketches what it is understanding. When I close the idea, every topic becomes a real node — chained, draggable, connectable. And if it got it wrong, `Ctrl+Z`. Frictionless doesn't mean approving first: it means being able to undo afterwards.» |
| **0:55–1:40** | **Bob IDE**, already open. Scroll the task list, open the contract file `docs/hackathon/PEDIDO-BOB-01.md` in the editor, show the **task session consumption summary**, and point at the commit. | «This is where Bob worked. Before any code, I committed the contract for the voice segmenter — you can see the commit is older than Bob's delivery. Bob implemented the module and its endpoint: that's `cff0baa`. And this is its session summary — the consumption the hackathon asks for.» |
| **1:40–2:15** | The terminal or GitHub showing the commit `cff0baa`, then the review finding and the fix `0e059ed` (the diff of the timing defect). | «Then an independent review audited the delivery against the contract and found a real defect: the node creation was firing per audio segment instead of once per turn. That got fixed before it reached production. That is the whole point of writing the contract first.» |
| **2:15–2:45** | The slides: the four numbers (324/324 · 135/135 · 23 PRs · 48 h) and the task-vs-piece case. | «The numbers are test-suite results, not a saving we measured: 324 of 324 Rust tests, 135 of 135 frontend tests, 23 merged pull requests in 48 hours. And one case we did measure: a whole task handed to a coding agent produced zero files in eighty tool calls — the same work as a single pure function with an enumerated contract was delivered in one attempt.» |
| **2:45–3:00** | The canvas again, zoomed out with all your nodes visible; then the repo URL on screen. | «The process is reusable; the product works. The repo is public, and the app runs on Windows today. What this proves is the process applied to this project — not a general claim about productivity.» |

## Traps to avoid (from the audit)

- **Do not** present *voice → contract → Bob* as an automatic integration. The steps are manual: say it.
- **Bob appears before minute 1.** If he shows up at the end, the theme («showcase Bob as a core
  component») fails on camera.
- **Say the numbers with their source** ("test-suite results", "one case we measured"). Never say "we
  saved X %".
- **Don't claim** parallelism or Bob subagents: there is no record of that.
- The **web demo simulates voice** (no microphone without the Rust backend). If you show it, say so; the
  recording shows the desktop app.
- Keep it under **3:00**. Judges watch many.

## Spanish version (for the AssemblyAI submission, Wed 30/09)

The same take works: that hackathon wants the **voice experience** in front. Its description starts from
the canvas and the flow being frictionless; the Bob part becomes the closing instead of the opening.
