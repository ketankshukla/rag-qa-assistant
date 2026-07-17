# SETUP — Project 2: RAG Q&A Assistant

Your checklist. Build Project 1 first. The companion file you hand to Windsurf is `PROMPT_2_rag-qa-assistant.md`.

This project needs **two** API keys: Anthropic (for answers) and OpenAI (for embeddings).

---

## 1. Before you start (one-time)

**Accounts & keys:**
- [ ] GitHub, Vercel, and Anthropic API key — same as Project 1 (reuse them)
- [ ] **OpenAI API key** with a few dollars of credit — platform.openai.com  (used only to create embeddings)

**Tools:** same as Project 1 (node v20+, git, gh, vercel). If you set them up already, you're good.

**Logins** (if not still valid): `gh auth login` and `vercel login`.

---

## 2. Start the build

1. Create an empty folder `rag-qa-assistant`.
2. Put `PROMPT_2_rag-qa-assistant.md` in it, renamed to `PROMPT.md`.
3. Open the folder in Windsurf; pick **Claude Opus 4.8** or **Sonnet 5**; allow command execution.
4. Type:
   > Read `PROMPT.md` and complete every phase in order. Explain each step in plain language. Stop at every **⏸ PAUSE** and wait for me.

---

## 3. When the agent pauses — do the matching Action

### Action 1 — prerequisites/logins
Same as Project 1. Fix anything the Phase 0 check flags, then continue.

### Action 2 — Add BOTH API keys locally
Create a file named `.env.local` in the project folder with your real keys:
```
ANTHROPIC_API_KEY=sk-ant-...your key...
OPENAI_API_KEY=sk-...your key...
ANTHROPIC_MODEL=claude-sonnet-5
EMBEDDING_MODEL=text-embedding-3-small
```
Save, then tell the agent "done, continue."
> Never commit this file. It's git-ignored on purpose.

### Action 3 — (optional) Replace the sample content with your own
The agent creates a `/content` folder with sample files. You can drop in your own text (e.g., your book blurbs) as `.md` or `.txt` files. If you do, tell the agent so it re-runs the ingest step.

### Action 4 — Run the ingest step
The agent will ask you to confirm running `npm run ingest` (it reads `/content`, calls OpenAI, and writes `data/embeddings.json`). Make sure your OpenAI key is in `.env.local` first. When the file appears, tell the agent to continue.

### Action 5 — (only if it asks) GitHub login
If the push fails, run `gh auth login`, then tell the agent to retry.

### Action 6 — Add BOTH keys to Vercel
For the live site, add environment variables in Vercel:
- `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` (and optionally `ANTHROPIC_MODEL`, `EMBEDDING_MODEL`).
- Either via `vercel env add <NAME>` (choose Production, Preview, Development) or the Vercel dashboard → Settings → Environment Variables.
Then tell the agent "done" so it can deploy to production.

---

## 4. You're done when
- The agent gives you a **live Vercel URL** where asking a question returns a grounded answer **with sources**, and an out-of-scope question returns "I don't know."
- The repo `rag-qa-assistant` exists with a **green Actions tab** (and `data/embeddings.json` is committed, but `.env.local` is not).
- There's a `README.md`.

Send me the live URL + repo link for your resume.
