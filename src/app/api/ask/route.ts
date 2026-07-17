import { promises as fs } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { topK, type EmbeddedChunk } from "@/lib/rag";

const EMBEDDINGS_FILE = path.join(process.cwd(), "data", "embeddings.json");

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SYSTEM_PROMPT =
  "Answer ONLY using the provided context. If the answer isn't in the context, say you don't know. Cite sources by filename.";

interface AskRequestBody {
  question?: unknown;
}

interface Source {
  source: string;
  snippet: string;
  score: number;
}

export async function POST(request: Request) {
  let body: AskRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return Response.json(
      { error: "`question` is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiApiKey || !anthropicApiKey) {
    return Response.json(
      { error: "Server is missing OPENAI_API_KEY or ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const embeddingsRaw = await fs.readFile(EMBEDDINGS_FILE, "utf-8");
    const items: EmbeddedChunk[] = JSON.parse(embeddingsRaw);

    const openai = new OpenAI({ apiKey: openaiApiKey });
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: question,
    });
    const queryVec = embeddingResponse.data[0].embedding;

    const bestChunks = topK(queryVec, items, 4);

    const contextBlock = bestChunks
      .map((chunk) => `Source: ${chunk.source}\n${chunk.text}`)
      .join("\n\n---\n\n");

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Context:\n\n${contextBlock}\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    const sources: Source[] = bestChunks.map((chunk) => ({
      source: chunk.source,
      snippet: chunk.text.slice(0, 200),
      score: chunk.score,
    }));

    return Response.json({ answer, sources });
  } catch (error) {
    console.error("Error in /api/ask:", error);
    const message = error instanceof Error ? error.message : "Unknown error.";
    return Response.json(
      { error: `Failed to answer question: ${message}` },
      { status: 500 }
    );
  }
}
