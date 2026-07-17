import { promises as fs } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import OpenAI from "openai";
import { chunkText } from "../src/lib/rag";

loadEnvConfig(process.cwd());

const CONTENT_DIR = path.join(process.cwd(), "content");
const OUTPUT_FILE = path.join(process.cwd(), "data", "embeddings.json");
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";

interface EmbeddedChunk {
  id: string;
  source: string;
  text: string;
  embedding: number[];
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local before running the ingest script."
    );
  }

  const client = new OpenAI({ apiKey });

  const filenames = await fs.readdir(CONTENT_DIR);
  const textFiles = filenames.filter(
    (name) => name.endsWith(".md") || name.endsWith(".txt")
  );

  if (textFiles.length === 0) {
    throw new Error(`No .md or .txt files found in ${CONTENT_DIR}`);
  }

  const results: EmbeddedChunk[] = [];

  for (const filename of textFiles) {
    const filePath = path.join(CONTENT_DIR, filename);
    const raw = await fs.readFile(filePath, "utf-8");
    const chunks = chunkText(raw);

    console.log(`Chunked ${filename} into ${chunks.length} chunk(s).`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: chunk,
      });
      const embedding = response.data[0].embedding;

      results.push({
        id: `${filename}-${i}`,
        source: filename,
        text: chunk,
        embedding,
      });
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");

  console.log(
    `Wrote ${results.length} embedded chunk(s) from ${textFiles.length} file(s) to ${OUTPUT_FILE}`
  );
}

main().catch((error) => {
  console.error("Ingest failed:", error);
  process.exitCode = 1;
});
