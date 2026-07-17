# RAG Q&A Assistant

A Q&A assistant that answers questions grounded in a provided set of documents and cites the source chunks it used (Retrieval-Augmented Generation).

**Live URL:** https://rag-qa-assistant-wheat.vercel.app

## What it does

Ask a question in the UI and the assistant answers using *only* the content in the `/content` folder. It cites which source file(s) it drew from, and if the answer isn't in the content, it says so instead of guessing.

## How RAG works here

1. **Ingest** (`npm run ingest`, run locally) — reads every file in `/content`, splits each into overlapping ~800-character chunks (`chunkText` in `src/lib/rag.ts`).
2. **Embed** — each chunk is sent to OpenAI's `text-embedding-3-small` model to get a vector embedding.
3. The chunks + embeddings are written to `data/embeddings.json`, which is **committed to the repo** and ships with the deployed app (no database required).
4. **Retrieve** — at request time, `src/app/api/ask/route.ts` embeds the user's question with the same OpenAI model, then computes cosine similarity (`cosineSimilarity`/`topK` in `src/lib/rag.ts`) against every chunk in `data/embeddings.json`, entirely in memory, to find the 4 most relevant chunks.
5. **Answer** — the top chunks are passed as context to Claude (`@anthropic-ai/sdk`) with a system prompt instructing it to answer only from that context, say "I don't know" if the answer isn't there, and cite sources by filename.

Because retrieval happens in memory against a JSON file instead of a vector database, the whole app stays a single Next.js deployment on Vercel.

## Adding your own content

1. Replace or add `.md`/`.txt` files in `/content`.
2. Re-run the ingest script to regenerate the embeddings:
   ```bash
   npm run ingest
   ```
3. Commit the updated `data/embeddings.json` and push — Vercel will redeploy with your new content.

## Local setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (copy `.env.local.example`) and fill in real keys:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   ANTHROPIC_MODEL=claude-sonnet-5
   EMBEDDING_MODEL=text-embedding-3-small
   ```
3. Generate embeddings from `/content`:
   ```bash
   npm run ingest
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Model configuration

- **Answering:** `ANTHROPIC_MODEL`, default `claude-sonnet-5`.
- **Embeddings:** `EMBEDDING_MODEL`, default `text-embedding-3-small`.
- **Cheaper answering option:** set `ANTHROPIC_MODEL=claude-haiku-4-5-20251001` for lower cost.

## Tests

Pure retrieval logic (`chunkText`, `cosineSimilarity`, `topK`) is unit tested with Vitest — no network calls involved.

```bash
npm test
```

## Deployment

Deployed via Vercel's GitHub integration: pushes to `master` trigger an automatic build and deploy. Environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and optionally `ANTHROPIC_MODEL`/`EMBEDDING_MODEL`) are configured in the Vercel project settings, not committed to the repo.

## How I built this

Built end-to-end with an AI pair-programming agent (Windsurf/Cascade) following a phased build prompt: scaffold → dependencies/env → sample content → pure retrieval library → ingest script → API route → UI → tests → local verification → GitHub + CI → Vercel deploy → docs. Each phase was run, verified, and committed independently for small, reviewable diffs.

## Scaling upgrade path

The current design keeps all chunk embeddings in a single JSON file loaded into memory on each request — fine for a small `/content` corpus, but it doesn't scale to large document sets or high query volume. A natural upgrade is **Supabase with the `pgvector` extension**: store chunks and embeddings in a Postgres table, create a vector index, and replace the in-memory `cosineSimilarity`/`topK` scan with a SQL `ORDER BY embedding <-> query_embedding LIMIT k` query. This also removes the need to redeploy the app just to update content.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- `@anthropic-ai/sdk` for answering
- `openai` for embeddings (`text-embedding-3-small`)
- Vitest for tests, `tsx` for the ingest script
- GitHub Actions for CI, Vercel for hosting
