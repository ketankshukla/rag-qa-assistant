# 🧠 The Thinking Process Behind This Build

> **⚠️ Rendering note:** GitHub sanitizes custom CSS out of markdown (no forced black backgrounds or custom font sizes on github.com, for security reasons). This doc uses everything GitHub *does* support to stay legible and visually distinct: big headers, emoji, blockquote callouts, tables, and horizontal rules.

> **What this document is:** A reconstruction of the reasoning behind this build, grounded in the actual commit history and the design decisions visible in the code — not a dramatized replay of every keystroke. Where a real, verifiable fix shows up in the commit history, it's called out explicitly. If you're starting a similar project from scratch, read the 🎯 section at the bottom for the generalizable checklist.

---

## 🗺️ Part 1 — How the build actually unfolded

The commit history (`git log`) shows 11 phase commits landing between **22:44 and 23:08** the same evening — scaffold to a green CI-ready app in under 25 minutes — followed by docs a bit later. That pace only works if each phase is small, verified, and committed before moving on, which is exactly what `PROMPT.md`'s rules require.

### 🔍 Step 0 — Read the spec before writing code

`PROMPT.md` (the *what/how*: phases, rules, exact model names) and `SETUP.md` (the *human's side*: which pause maps to which real-world action) were both meant to be read in full first — the phase-by-phase, single-commit-per-phase structure of the actual history (`chore: scaffold` → `chore: add deps and env template` → `chore: add sample content` → ...) matches that spec precisely, with no skipped or reordered phases.

### 🧱 Step 1 — Phase 1: Scaffold

`d281575 Initial commit from Create Next App` contains *only* the standard `create-next-app` output — no `PROMPT.md`/`SETUP.md` in that commit. Those were added in the very next commit, `chore: scaffold Next.js app`. That ordering means the scaffold command ran against an empty directory with no file-conflict to work around — unlike some later projects in this series where the build spec files needed to be moved out and back in first.

### 🔐 Step 2 — Phase 2: Dependencies and environment — the `.gitignore` conflict, verified

**A real, verifiable fix:** the diff for `chore: add deps and env template` shows exactly one line added to `.gitignore`: `!.env.local.example`. This is the standard fix for a genuine rule conflict — `.env*` as a blanket ignore pattern also blocks the *template* file (`.env.local.example`) that's supposed to be committed. Adding a single negation line is the minimal change that keeps real secrets ignored while letting the template through.

### 🧪 Step 3 — Phase 4: Retrieval library, kept deliberately pure

**Design decision visible in the code:** `src/lib/rag.ts` (`chunkText`, `cosineSimilarity`, `topK`) makes **zero network calls**. All the OpenAI/Anthropic API calls live in `scripts/ingest.ts` and `src/app/api/ask/route.ts` instead. This separation is what makes `src/lib/rag.test.ts` possible without mocking any network client — the pure math (chunk boundaries, similarity scores, top-k sorting) is tested directly with plain numbers and strings.

### 🔌 Step 4 — Phase 5: The ingest script — why it's a separate, manual step

**Design decision:** Embedding generation (`scripts/ingest.ts`, run via `npm run ingest`) is deliberately *not* part of the request-serving path. It reads `/content`, chunks and embeds everything, and writes `data/embeddings.json` to disk — a file that then gets **committed to the repo**. This means the deployed app never calls the embeddings-generation path at runtime; it only ever *reads* a static JSON file. The tradeoff (documented in `README.md`'s "Scaling upgrade path") is that updating content requires a local re-run and a new commit, not a live re-index.

### 🎯 Step 5 — Phase 6: The answer route — the constraint is in the prompt, not the code

**Design decision:** `src/app/api/ask/route.ts` doesn't do anything special to prevent Claude from answering off-topic questions — there's no keyword filter or post-hoc fact-check. The entire "don't make things up" guarantee comes from one system prompt string: *"Answer ONLY using the provided context. If the answer isn't in the context, say you don't know. Cite sources by filename."* The code's actual job is narrower and more mechanical: embed the question, retrieve the top 4 chunks, and hand them over as the only context in the message.

### ✅ Step 6 — Phase 8: Tests — matching the brief exactly

`src/lib/rag.test.ts` (added in `test: rag utilities`) covers precisely what `PROMPT.md` Phase 8 specifies: identical vectors scoring cosine similarity ≈ 1, orthogonal vectors ≈ 0, `chunkText` respecting size/overlap and covering the full input, and `topK` returning `k` results in sorted order. No extra scope, no missing cases from the brief.

### 🚀 Step 7 — Phases 10–12: GitHub, CI, Vercel

The repo was created and pushed (`gh repo create rag-qa-assistant --public --source=. --remote=origin --push`), the CI workflow was added as its own commit (`ci: workflow`) rather than bundled with the app code, and deployment followed the GitHub-integration path — each of these stayed a single, separately reviewable commit, consistent with the "small, reviewable diffs" rule.

### 📝 Step 8 — Docs, added after the fact

**A real, verifiable detail:** `PROMPT.md`'s Phase 13 spec asks for a `README.md` and a `LICENSE` — it does not mention a `USER_GUIDE.md`. The commit history confirms this: `docs: README and MIT license` landed first, and `docs: add user guide` is a **separate, later commit**. In other words, the user guide wasn't part of the original build spec at all; it was added afterward, on request — the same pattern later repeated across this project series (`HOW_IT_WORKS.md` and `THOUGHT_PROCESS.md`, the two documents you're reading logic about right now, were added to this project the same way, after the original 13-phase build was already complete).

---

## 🎯 Part 2 — How to think about a project like this from scratch

If you were starting this yourself, here's the transferable process, stripped of this-project-specific details:

| # | Principle | Why it matters |
|---|---|---|
| 1️⃣ | **Read the entire spec before writing code.** Find the non-negotiables (secrets handling, exact versions, definition of done) first. | You can't follow a rule you haven't seen yet. |
| 2️⃣ | **One phase, one commit, in order.** | Makes the entire build reconstructable later from `git log` alone — as this document proves. |
| 3️⃣ | **Keep pure logic (`rag.ts`) separate from I/O ("glue") code (`ingest.ts`, `route.ts`).** | Pure logic is cheap to unit test; glue code needs real integration checks and mocking. |
| 4️⃣ | **Put your safety guarantees in the smallest possible place.** Here, "don't hallucinate" lives in one system-prompt string, not scattered validation logic. | Easier to audit and change one sentence than logic spread across files. |
| 5️⃣ | **Separate the expensive, infrequent step (embedding a whole corpus) from the cheap, frequent one (embedding one question).** | Keeps per-request latency and cost low; the offline step only reruns when content actually changes. |
| 6️⃣ | **Treat secrets as radioactive.** Keep templates (`.env.local.example`) and real files (`.env.local`) on opposite sides of `.gitignore`, and fix conflicts with the smallest possible negation rule. | One accidental committed key is one too many. |
| 7️⃣ | **Design for a future scaling need without building it prematurely.** The in-memory JSON approach is explicitly documented as a stopgap, with the exact upgrade path (`pgvector`) named — not silently ignored. | Cheap now, honest about the ceiling, not a surprise later. |
| 8️⃣ | **Docs can — and often should — grow after the original build.** A user guide, a technical deep-dive, or a build retrospective aren't failures of the original spec; they're natural follow-ups once the app is real and in front of real users. | Rigid adherence to "the spec said README only" would leave real user needs unmet. |

---

## 🔁 The one-sentence version

> **Keep the pure math separate from the network calls, put your safety guarantee in the smallest possible place, commit one verified phase at a time, and let the docs grow once real people start asking real questions.**
