# ResearchMate AI — Multi-Agent Literature Review Assistant

## Prerequisites
Node.js 18.18+ and a Groq API key. Create one at https://console.groq.com/keys.

## Run locally
```bash
npm install
copy .env.example .env.local  # then set GROQ_API_KEY
npm run dev                  # http://localhost:3000
```
Env vars: `GROQ_API_KEY`, optional `GROQ_MODEL`, `MAX_FILE_MB`, and `MAX_PAPERS`. Keys are read only in server code. The default model is `qwen/qwen3.8-27b`.

## The five agents (`/agents`)
| Agent | Input -> Output |
|---|---|
| Document Analyst | extracted pages -> metadata (AI JSON), local chunks |
| Research Summarizer | page-tagged text -> validated structured summary per paper |
| Comparative Analysis | summaries only -> similarities, differences, conflicts, matrix |
| Research Gap | comparison + limitations -> gaps labelled as hypotheses with evidence |
| Citation & Report | metadata -> IEEE/APA (deterministic formatter) + executive summary + Markdown report |

`orchestrator.ts` runs one agent per request, enforces order, records real status, and re-running a failed step is the retry. Independent per-paper model calls run in small concurrent batches; the browser calls dependent analysis steps in sequence, so progress shown is real. State lives in an in-memory per-session store (`lib/store.ts`); restarting the server clears it.

## RAG pipeline
PDF pages -> ~1200-character overlapping chunks (with page numbers) -> local BM25 keyword ranking -> answer from the top six excerpts only, citing `[n]` mapped to paper title + page. Retrieval does not require an embedding API.

## Safety
PDF text is wrapped in `<document>` tags and the system instruction marks it untrusted. Model JSON is Zod-validated and retried once if the response is malformed.

## Troubleshooting
- "Groq API key is not configured": create a key at https://console.groq.com/keys, set `GROQ_API_KEY` in `.env.local`, and restart.
- Scanned PDF rejected: OCR it first (no OCR built in).
- Groq rate-limit/quota errors (429): check usage and billing in the Groq console and retry later. Temporary 503/504 errors are retried automatically.
- Model-name 404: confirm `GROQ_MODEL` is currently available to your API key. The default model is `qwen/qwen3.8-27b`.

## Deploy
Needs a long-running Node server (in-memory sessions, long requests): Render/Railway/Docker. On Vercel, swap `lib/store.ts` for Redis/DB first.
