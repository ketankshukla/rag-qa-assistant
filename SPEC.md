# SPEC - rag-qa-assistant

> What this repo is for, what it deliberately does not do, and what must stay
> true for a change to be correct.

**Live:** https://rag-qa-assistant-wheat.vercel.app

## 1. Purpose

Answer questions strictly from a supplied document set, citing the chunks used -
with the retrieval mathematics written out rather than imported, so the behaviour
is inspectable.

## 2. Scope

**In scope** - offline ingestion that chunks, embeds and commits vectors as a
single JSON file; pure-TypeScript chunking, cosine similarity and top-N ranking;
an answer route that cites its sources with scores.

**Explicitly out of scope**

- **A database.** Embeddings are built ahead of time and committed, so the
  deployed app needs no store and no runtime indexing step. That is the design,
  not a shortcut - it is what keeps the retrieval layer inspectable.
- **Multi-user anything.** One corpus, no auth. `ai-knowledge-base` is the
  multi-tenant successor.
- **Answering from the model's own knowledge.**

## 3. Architecture

```
scripts/ingest.ts   documents --> chunkText(800, overlap 150) --> embed --> data/embeddings.json
/api/ask            question --> embed --> topK(4) --> context --> model --> answer + sources
```

## 4. Invariants

1. **No similarity threshold.** `topK` scores everything, sorts, and returns the
   best four. A fixed cutoff is **not scale-invariant** - what counts as a high
   cosine depends on question length, vocabulary overlap and corpus homogeneity,
   so any constant is too strict for some queries and too loose for others.
   Too strict fails **silently**; too loose fails visibly.
2. **The prompt does the rejecting**, which is what makes top-N safe: answer only
   from context, say you don't know when the answer is absent, cite by filename.
   Abstention must remain a legal output.
3. **Retrieval is pure and dependency-free**, and unit tested without a network
   call. When retrieval is a function you own that takes vectors and returns a
   sorted list, you can put a breakpoint in it.
4. **Chunking overlaps.** ~800 characters with 150 of overlap keeps a sentence
   straddling a boundary retrievable from either side.
5. **Sources are returned with their scores**, so a wrong answer can be
   attributed to retrieval or to reading.

## 5. Verification

Unit tests cover cosine similarity (identical, orthogonal, zero-vector, length
mismatch), chunking and top-N. Behaviour is checked with deliberately
out-of-scope questions: if any receives a confident answer, the abstention
constraint has stopped working.

## 6. Known limitations

- **Embeddings are committed to the repo**, so changing the corpus means
  re-running ingestion and committing again.
- **Linear scan** over all vectors - fine at this corpus size, wrong past a few
  thousand chunks.
- **`k` is fixed at 4.**
- **Single embedding model**, chosen at ingest time; changing it invalidates the
  committed file.

## 7. Related

- Post: [Deleting the similarity threshold is what made retrieval work](https://ketanshukla.dev/blog/deleting-the-similarity-threshold)
- Successor: [`ai-knowledge-base`](https://github.com/ketankshukla/ai-knowledge-base)
- Harness: [`rag-reranker-lab`](https://github.com/ketankshukla/rag-reranker-lab)
