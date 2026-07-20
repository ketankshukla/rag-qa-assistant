# 📖 User Guide — RAG Q&A Assistant

🔗 **Live app:** https://rag-qa-assistant-wheat.vercel.app

This guide shows you how to use the app and what kinds of questions it can (and can't) answer.

## 🧭 How to use it

1. Open the live URL.
2. Type a question into the input box.
3. Click **Ask** (or press Enter).
4. Read the **Answer** section, then check the **Sources** section below it to see which document(s) and text snippets the answer was based on, along with a similarity score for each.

The assistant only answers from the documents in `/content`. It will not use outside knowledge, and it will tell you when it doesn't know rather than guessing.

## 📂 What's in the sample content

The demo ships with 4 sample documents about a fictional robotics company, **Acme Robotics**:
- `company-overview.md` — company history, offices, leadership.
- `product-armline.md` — the ArmLine 100 and ArmLine 500 robotic arms.
- `product-scoutbot.md` — the ScoutBot autonomous mobile robot.
- `support-faq.md` — repairs, returns, maintenance, third-party grippers.

## ✅ Example questions that should work (grounded answers)

Try asking any of these — the answer should cite the matching source file:

- "What payload capacity does the ArmLine 500 support?"
  → Should answer **25 kg**, citing `product-armline.md`.
- "How long does ScoutBot's battery last?"
  → Should answer **~10 hours**, with an **80% fast-charge in 45 minutes**, citing `product-scoutbot.md`.
- "Who is Acme Robotics' CEO?"
  → Should answer **Priya Nandakumar**, citing `company-overview.md`.
- "What is Acme Robotics' return policy?"
  → Should mention the **30-day return window**, citing `support-faq.md`.
- "Can I use a third-party gripper on an ArmLine arm?"
  → Should mention the **ISO 9409-1-50-4-M6 mounting flange** requirement, citing `support-faq.md`.
- "How many ScoutBot units can operate in one facility?"
  → Should answer **up to 40 units**, citing `product-scoutbot.md`.

## ⚠️ Example question that should NOT work (out-of-scope)

- "What is the capital of France?"
- "What's the weather like today?"
- "Who won the last World Cup?"

For these, the assistant should respond with something like *"I don't know. The provided context doesn't contain information about..."* — it will not make up an answer, even though the underlying model "knows" the real answer from its training data.

## 💡 Tips for best results

- Ask specific, factual questions about the content — the retrieval step works by matching meaning, so specific questions with concrete nouns (product names, topics) retrieve better than vague ones.
- If an answer seems off or incomplete, check the **Sources** panel — low similarity scores (well under ~0.3) usually mean the question wasn't well covered by the documents.
- To ask about your own material instead of the Acme Robotics demo content, see the **"Adding your own content"** section in `README.md` — you'll need to replace the files in `/content` and re-run `npm run ingest` locally, then push.

## 🛠️ Troubleshooting

- **Empty or strange answers:** the deployed `data/embeddings.json` may be out of date with `/content`. Re-run `npm run ingest` locally and push the updated file.
- **Error message shown in the UI:** usually means the request failed — check the error text; it will say if the question was empty or if there was a server-side issue.
