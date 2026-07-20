# 🔬 How This App Works

> 🤖 See also: [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md) for the reasoning behind *how this was built*, step by step.

This document explains, end to end, how a question typed into the UI turns into an answer that's grounded in — and cites — the actual documents in `/content`, with no vector database involved.

## 🧠 The short answer (explained like you're 5)

Imagine a librarian who, ahead of time, read every page of every book in a small library and wrote a one-sentence summary of each paragraph on its own index card. When you ask a question, the librarian doesn't re-read every book — they compare your question to all the index cards, pull out the four cards that sound most related, hand *only those* to a very well-read assistant, and say: "Answer using only what's on these cards. If it's not here, say you don't know." The assistant never invents an answer from general knowledge; it's boxed in by the cards it was handed.

The "index cards" are **embeddings** (numeric vectors that capture meaning), and "comparing your question to all the cards" is **cosine similarity** — done here in plain memory, not a database.

## ❓ Why retrieval happens in memory, not a vector database

`src/lib/rag.ts` contains **no network calls at all** — `chunkText`, `cosineSimilarity`, and `topK` are pure functions. The actual "index" is a single JSON file, `data/embeddings.json`, produced ahead of time by `scripts/ingest.ts` and **committed to the repo**. At request time, `src/app/api/ask/route.ts` loads that file from disk, embeds only the incoming question (one OpenAI call), and does a linear scan comparing it against every stored chunk with `cosineSimilarity`.

This works because the corpus is small: for a few dozen chunks, an in-memory linear scan is effectively instant, and it means the whole app is a single Next.js deployment with **no external database to provision, pay for, or keep in sync** — the tradeoff explained in the "Scaling upgrade path" section of `README.md`.

## 🔁 Full request flow, end to end

**Offline, run locally whenever `/content` changes:**

```
┌──────────────┐   npm run ingest
│ /content/*.md│──────────────────┐
└──────────────┘                  ▼
                     ┌────────────────────────┐
                     │ scripts/ingest.ts       │
                     │ 1. read every file      │
                     │ 2. chunkText() — 800    │
                     │    char chunks, 150     │
                     │    char overlap         │
                     │ 3. embed each chunk     │
                     │    via OpenAI           │
                     │    (text-embedding-3-   │
                     │    small)               │
                     └────────────────────────┘
                                  │
                                  ▼
                     data/embeddings.json
                     { id, source, text, embedding }[]
                     — committed to the repo —
```

**Online, on every question:**

```
┌─────────────┐   1. type question, click "Ask"
│   Browser   │─────────────────────────────────┐
│ (page.tsx)  │                                  ▼
└─────────────┘                     ┌─────────────────────────┐
      ▲                             │ POST /api/ask            │
      │ 6. answer + sources         │ (route.ts)                │
      │    rendered                 └─────────────────────────┘
      │                                          │ 2. validate `question`
      │                                          │    (400 if empty)
      │                                          ▼
      │                             ┌─────────────────────────┐
      │                             │ OpenAI embeddings.create │
      │                             │ embed the QUESTION only  │
      │                             └─────────────────────────┘
      │                                          │ 3. queryVec
      │                                          ▼
      │                             ┌─────────────────────────┐
      │                             │ topK(queryVec, items, 4) │
      │                             │ (rag.ts) — linear scan   │
      │                             │ cosineSimilarity against │
      │                             │ every chunk in           │
      │                             │ embeddings.json           │
      │                             └─────────────────────────┘
      │                                          │ 4. top 4 chunks
      │                                          ▼
      │                             ┌─────────────────────────┐
      │                             │ Anthropic API (Claude)   │
      │                             │ system: answer ONLY from │
      │                             │ context, cite filenames, │
      │                             │ say "don't know" if      │
      │                             │ absent                    │
      │                             └─────────────────────────┘
      │                                          │ 5. answer text
      └──────────────────────────────────────────┘   + sources[]
```

### 🪜 Step by step:

1. **You type a question and click Ask** — `src/app/page.tsx` calls `POST /api/ask` with `{ question }`.
2. **The route validates input** — `src/app/api/ask/route.ts` trims and checks `question`, returning `400` if empty, and `500` if either `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is missing.
3. **The question is embedded** — a single OpenAI `embeddings.create` call (model from `EMBEDDING_MODEL`, default `text-embedding-3-small`) turns the question into a vector.
4. **The best chunks are retrieved** — `topK(queryVec, items, 4)` (`src/lib/rag.ts`) scores every chunk in `data/embeddings.json` with `cosineSimilarity` and returns the 4 highest-scoring ones, already sorted.
5. **The top chunks become the only context Claude sees** — they're joined into a single context block (`Source: <filename>\n<chunk text>`), and sent to Claude with a system prompt: *"Answer ONLY using the provided context. If the answer isn't in the context, say you don't know. Cite sources by filename."*
6. **The response is returned** — Claude's text response becomes `answer`; the same 4 chunks (filename, a 200-character snippet, and their similarity score) become `sources`, and both are rendered in the UI — the answer in an "Answer" card, the sources in a list showing filename + snippet + score per chunk.

## 💾 Where does the data go?

> 🚫 **No database, but not fully stateless either.** `data/embeddings.json` is a real file, generated offline and committed to git — it's the one piece of persistent state this app has, and it only changes when you re-run `npm run ingest` after editing `/content`. Every *request*, though, is stateless: nothing about a question or answer is stored after the response is sent.

## 🏁 Key takeaway

The "intelligence" here is split cleanly across two different models doing two different jobs: OpenAI's embedding model turns text into comparable vectors (used for *finding* the right chunks), and Claude turns the found chunks into a natural-language answer (used for *explaining* them) — while being explicitly constrained to only use what it was handed. Neither model is trusted to "just know" the answer; the code's job is to retrieve the right raw material and hand it over with a clear boundary.
