# Video script — 3 minutes, in English

> Rewritten after the judge audit. Two rules it enforces: **Bob appears before minute 1**, and **every
> number is said with its source** — tests are test results, not savings. Claims that could not be
> accredited were **removed**, not softened with a disclaimer.
>
> **Before recording:** app in **English** (the ES/EN switch is in the top bar), a few nodes already on the
> canvas, Bob IDE open on the task list, notifications off, terminal minimised.

| Time | On screen | What you say |
|---|---|---|
| **0:00–0:18** | You, then the repo README showing the chain. | «We used IBM Bob to build NodeFlow from written specifications. Every request became a contract, Bob implemented it, and a different agent reviewed the code. And here is the problem we went after: an unclear request costs you three times — when you build it, when you review it, and when you fix it.» |
| **0:18–0:50** | The desktop app. `Ctrl+Alt+Space`, then dictate **in Spanish** — and say so out loud. The draft appears as you speak; close the turn; the nodes land chained; drag one; `Ctrl+Z`. | «I'll dictate in Spanish — the segmenter's rules are written for Spanish — and the interface stays in English. A draft node appears as I speak. When I stop, each topic becomes a real node, chained and draggable. Nodes are created without a confirmation step: my safety net is that I can undo them.» |
| **0:50–1:30** | **Bob IDE**: the task list, then `docs/hackathon/PEDIDO-BOB-01.md` open in the editor, the commit date, and the **task usage summary**. | «This is where Bob worked. Before any code, I committed the contract for the voice segmenter — this commit is older than Bob's delivery. Bob implemented the module and its endpoint: that is `cff0baa`. And this is Bob's task usage summary, which the hackathon asks for as evidence. The hand-off from my idea to that contract is manual: I write it and I commit it.» |
| **1:30–2:00** | The git log: `8582026`, then the fix `0e059ed` and its diff. | «Then a different agent reviewed the delivery. On a second request — creating the nodes when the turn closes — the review found that nodes were being created once per audio segment instead of once per turn. We fixed it: `0e059ed`. That is the whole point of reviewing against a written contract.» |
| **2:00–2:35** | The slides: the four recorded figures on screen, readable. Do not read hashes aloud. | «These are recorded test results and the pull-request history: 324 of 324 Rust tests on `0d05b2f`, 135 of 135 frontend tests on `a42be37`, twenty-five merged pull requests across the two days, and one defect caught in review before merging. They are verification results — not a measured time saving.» |
| **2:35–2:55** | The canvas zoomed out with all the nodes visible, then the repo URL. | «The procedure is reusable: write the contract, commit it first, let the agent implement against it, have a different agent audit it, then fix and record it. The product works and the repo is public. What this proves is the process applied to this project — not a general claim about productivity.» |

## Do not say, and why

- **«Before it reached production»** — not accredited. What the commits show is that the fix landed before
  merge. Say «we fixed it before merging».
- **The 80-tool-calls comparison** — the primary record is not in this repository and that piece was
  written by a different agent, not Bob. **Cut it entirely.**
- **«Bob wrote the voice engine»** — Bob implemented the **segmenter and the partial-result client**.
  Transcription (AssemblyAI / Speechmatics) and speech are hired services.
- **«Signed release»** — there is a published Windows installer; Authenticode signing is not accredited.
- **PR counts as output** — 25 merged PRs is activity, and it includes docs and dependencies.

## Rules that make the take easy

- **Dictate slowly and stop cleanly.** The demo lives on the turn closing, so leave a beat before you
  release the shortcut.
- **English for the narration, Spanish for the dictation** — and say why. Promising English segmentation
  because the UI is bilingual would be a claim we cannot back.
- **Burn in English subtitles** (two lines max). Put the commit hashes in the subtitle, not in your voice.

## The other hackathon (AssemblyAI, Wed 30/09)

Same take, different edit: that one wants the **voice experience** in front, so the canvas goes first and
Bob becomes the closing. Its submission is in English too.
