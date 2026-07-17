export interface EmbeddedChunk {
  id: string;
  source: string;
  text: string;
  embedding: number[];
}

export interface ScoredChunk extends EmbeddedChunk {
  score: number;
}

/**
 * Splits text into overlapping chunks of roughly `size` characters, with
 * `overlap` characters shared between consecutive chunks. Pure function,
 * no network calls.
 */
export function chunkText(
  text: string,
  size = 800,
  overlap = 150
): string[] {
  if (size <= 0) {
    throw new Error("size must be greater than 0");
  }
  if (overlap < 0 || overlap >= size) {
    throw new Error("overlap must be >= 0 and less than size");
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  const step = size - overlap;
  let start = 0;

  while (start < trimmed.length) {
    const end = Math.min(start + size, trimmed.length);
    chunks.push(trimmed.slice(start, end));

    if (end >= trimmed.length) {
      break;
    }
    start += step;
  }

  return chunks;
}

/**
 * Computes cosine similarity between two equal-length vectors.
 * Returns a value in [-1, 1] (0 if either vector is all zeros).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("vectors must be the same length");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns the k items with highest cosine similarity to `queryVec`,
 * sorted by descending score.
 */
export function topK(
  queryVec: number[],
  items: EmbeddedChunk[],
  k = 4
): ScoredChunk[] {
  const scored: ScoredChunk[] = items.map((item) => ({
    ...item,
    score: cosineSimilarity(queryVec, item.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}
