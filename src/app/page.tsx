"use client";

import { useState } from "react";

interface Source {
  source: string;
  snippet: string;
  score: number;
}

interface AskResponse {
  answer: string;
  sources: Source[];
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      const { answer: responseAnswer, sources: responseSources } =
        data as AskResponse;
      setAnswer(responseAnswer);
      setSources(responseSources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            RAG Q&amp;A Assistant
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            Ask a question and get an answer grounded in the documents in{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
              /content
            </code>
            , with cited sources.
          </p>
        </header>

        <form onSubmit={handleAsk} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something about the documents..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-lg bg-black px-5 py-3 font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-300"
          >
            {loading ? "Asking..." : "Ask"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        {answer && (
          <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Answer
            </h2>
            <p className="whitespace-pre-wrap text-black dark:text-zinc-50">
              {answer}
            </p>
          </section>
        )}

        {sources.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sources
            </h2>
            <ul className="flex flex-col gap-3">
              {sources.map((s, i) => (
                <li
                  key={`${s.source}-${i}`}
                  className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {s.source}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      score {s.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {s.snippet}
                    {s.snippet.length >= 200 ? "…" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
