import { describe, expect, it } from "vitest";
import { chunkText, cosineSimilarity, topK, type EmbeddedChunk } from "./rag";

describe("cosineSimilarity", () => {
  it("returns ~1 for identical vectors", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("returns ~0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns 0 when either vector is all zeros", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("throws for mismatched vector lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("chunkText", () => {
  it("respects the requested chunk size", () => {
    const text = "a".repeat(2000);
    const chunks = chunkText(text, 800, 150);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });

  it("overlaps consecutive chunks by the requested amount", () => {
    const text = "0123456789".repeat(50); // 500 chars
    const size = 100;
    const overlap = 20;
    const chunks = chunkText(text, size, overlap);

    expect(chunks.length).toBeGreaterThan(1);
    const firstChunkEnd = chunks[0].slice(-overlap);
    const secondChunkStart = chunks[1].slice(0, overlap);
    expect(firstChunkEnd).toBe(secondChunkStart);
  });

  it("covers the entire input text", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(30);
    const chunks = chunkText(text, 100, 20);
    const rebuilt = chunks.join("");
    expect(rebuilt.length).toBeGreaterThanOrEqual(text.trim().length);
    expect(chunks[chunks.length - 1].endsWith(text.trim().slice(-10))).toBe(
      true
    );
  });

  it("returns an empty array for empty input", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk when text is shorter than size", () => {
    const chunks = chunkText("short text", 800, 150);
    expect(chunks).toEqual(["short text"]);
  });
});

describe("topK", () => {
  const items: EmbeddedChunk[] = [
    { id: "1", source: "a.md", text: "a", embedding: [1, 0] },
    { id: "2", source: "b.md", text: "b", embedding: [0, 1] },
    { id: "3", source: "c.md", text: "c", embedding: [0.9, 0.1] },
    { id: "4", source: "d.md", text: "d", embedding: [-1, 0] },
  ];

  it("returns k results sorted by descending score", () => {
    const results = topK([1, 0], items, 2);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("1");
    expect(results[1].id).toBe("3");
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it("defaults to k=4 when not specified", () => {
    const results = topK([1, 0], items);
    expect(results).toHaveLength(4);
  });

  it("caps results at the number of available items", () => {
    const results = topK([1, 0], items, 10);
    expect(results).toHaveLength(items.length);
  });
});
