# BUILD PROMPT — Project 2: RAG Q&A Assistant

You are a senior full-stack engineer pair-building with a developer new to agentic workflows. Build the project below end to end, from an empty folder to a live Vercel URL. The developer has a separate setup checklist; pause at the marked points and ask them to complete the numbered Setup Action.

## RULES (follow for the whole build)
- One phase at a time, in order. After each: run it, confirm, git commit. Explain each step in plain language first.
- Never print or commit secrets. Keys in `.env.local` (git-ignored) and Vercel env vars.
- Read all config from environment variables.
- Small, reviewable diffs. Announce destructive actions.
- On failure: stop, show the error, explain, propose a fix. No silent retries.
- At every **⏸ PAUSE**, stop, name the Setup Action, and wait. Never enter secrets or log in yourself.

## DEFINITION OF DONE
`npm run dev` works · `npm test` passes · `npm run build` succeeds · pushed to public repo `rag-qa-assistant` · CI green · deployed to Vercel with a live URL where grounded Q&A works · complete README.

## PROJECT OVERVIEW
A Q&A assistant that answers questions grounded in a provided set of documents and cites the source chunks it used (Retrieval-Augmented Generation).

**How it works:** (1) an ingest script run locally reads `/content`, chunks it, embeds each chunk with OpenAI, and writes `data/embeddings.json`; (2) the app embeds the user's question, finds the most similar chunks in memory by cosine similarity (no database), and asks Claude to answer using only those chunks. The committed `embeddings.json` ships with the app, so it stays all-Next.js and Vercel-friendly.

## TECH STACK (use exactly this)
- Next.js (latest, App Router) + TypeScript + Tailwind CSS
- Anthropic SDK (`@anthropic-ai/sdk`) for answering
- OpenAI SDK (`openai`) for embeddings — model **`text-embedding-3-small`**
- `tsx` to run the ingest script; Vitest; Vercel; GitHub Actions

### Model configuration (exact values)
- Answering: `process.env.ANTHROPIC_MODEL` default **`claude-sonnet-5`**.
- Embeddings: `process.env.EMBEDDING_MODEL` default **`text-embedding-3-small`**.
- Cheaper answering option for README: **`claude-haiku-4-5-20251001`** (date suffix required).

---

## PHASE 0 — Prerequisite check
Report node (v20+), npm, git, gh, vercel; check `gh auth status`, `vercel whoami`. Missing → **⏸ PAUSE (Setup Action 1)**.

## PHASE 1 — Scaffold
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --use-npm --no-import-alias
```
Confirm dev server, stop it. **Commit:** `chore: scaffold Next.js app`.

## PHASE 2 — Dependencies and environment
- `npm install @anthropic-ai/sdk openai` and `npm install -D vitest tsx @vitejs/plugin-react`.
- Create `.env.local.example`:
  ```
  ANTHROPIC_API_KEY=your_key_here
  OPENAI_API_KEY=your_key_here
  ANTHROPIC_MODEL=claude-sonnet-5
  EMBEDDING_MODEL=text-embedding-3-small
  ```
- Ensure `.gitignore` covers `.env*` and `.vercel`.
- **⏸ PAUSE (Setup Action 2):** developer creates `.env.local` with both real keys. Wait.
- **Commit:** `chore: add deps and env template`.

## PHASE 3 — Seed content
Create `/content` with 3–5 sample `.md` files of placeholder text. Tell the developer they can replace these with their own material (**⏸ PAUSE (Setup Action 3)** is optional — only if they want to swap content now). **Commit:** `chore: add sample content`.

## PHASE 4 — Retrieval library (pure, testable)
Create `src/lib/rag.ts`:
- `chunkText(text, size=800, overlap=150): string[]` — overlapping chunks.
- `cosineSimilarity(a: number[], b: number[]): number`.
- `topK(queryVec, items, k=4)` — k most similar chunks with score + source filename.
Keep network calls out of this file. **Commit:** `feat: chunking + similarity utilities`.

## PHASE 5 — Ingest script
Create `scripts/ingest.ts` (add npm script `"ingest": "tsx scripts/ingest.ts"`):
- Read every file in `/content`, chunk each, embed with OpenAI `text-embedding-3-small`, write `data/embeddings.json` as `{ id, source, text, embedding }[]`.
- **⏸ PAUSE (Setup Action 4):** developer runs `npm run ingest` (needs their OpenAI key). Confirm `data/embeddings.json` exists, then continue.
- **Commit:** `feat: ingest script + generated embeddings`.

## PHASE 6 — Answer API route
Create `src/app/api/ask/route.ts` (POST `{ question }`):
- Validate (400 on empty). Embed the question (OpenAI); load `data/embeddings.json`; `topK` for best chunks.
- Call Claude with system prompt: "Answer ONLY using the provided context. If the answer isn't in the context, say you don't know. Cite sources by filename." Pass top chunks as context.
  ```ts
  import Anthropic from "@anthropic-ai/sdk";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  ```
- Return `{ answer, sources }`. try/catch → 500 readable. **Commit:** `feat: /api/ask RAG route`.

## PHASE 7 — UI
`src/app/page.tsx`: question input, "Ask" button (loading state), the answer, and a "Sources" section (filename + snippet per chunk used). Errors handled. Clean Tailwind, title + description. **Commit:** `feat: RAG chat UI`.

## PHASE 8 — Tests
- `vitest.config.ts` + `"test": "vitest run"`.
- `src/lib/rag.test.ts`: identical vectors cosine ≈ 1, orthogonal ≈ 0; `chunkText` respects size/overlap and covers input; `topK` returns k sorted results.
- `npm test` green. **Commit:** `test: rag utilities`.

## PHASE 9 — Local verification
`npm run dev`: ask something answerable from `/content` → grounded answer + sources; ask something not in content → "don't know". `npm run build` succeeds.

## PHASE 10 — GitHub repo + push
```bash
gh repo create rag-qa-assistant --public --source=. --remote=origin --push
```
Not authenticated → **⏸ PAUSE (Setup Action 5)**. Confirm repo. Ensure `data/embeddings.json` is committed and `.env.local` is not.

## PHASE 11 — CI
`.github/workflows/ci.yml`: Node 20, `npm ci`, `npm run lint`, `npm test`, `npm run build` on push/PR. Confirm green. **Commit:** `ci: workflow`.

## PHASE 12 — Deploy to Vercel
```bash
vercel link
vercel
```
- **⏸ PAUSE (Setup Action 6):** developer adds `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (and optionally model vars) to Vercel. Wait.
```bash
vercel --prod
```
Open the live URL, ask a question in production, confirm grounded answers with sources.

## PHASE 13 — README and finish
`README.md`: what it does, live URL, how RAG works here (ingest → embed → retrieve → answer), how to add your own content and re-run `npm run ingest`, local setup, tests, "How I built this." Mention Supabase pgvector as a scaling upgrade. Add MIT `LICENSE`. Commit, push, report Definition-of-done checklist.

---

## TROUBLESHOOTING
- **Empty/odd answers:** confirm `data/embeddings.json` exists and is committed; re-run `npm run ingest` after content changes.
- **OpenAI 401:** `OPENAI_API_KEY` missing in `.env.local` (local) or Vercel (prod).
- **Anthropic invalid model:** use a current ID (`claude-sonnet-5`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`).
- **Vercel function too large:** reduce sample content or note the Supabase upgrade path.
