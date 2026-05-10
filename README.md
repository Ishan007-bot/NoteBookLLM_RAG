# NotebookRAG — Chat with your PDFs

A NotebookLM-style web app that lets you upload a PDF and ask questions about it. Answers are grounded in the document and cite specific page numbers — when the document doesn't contain an answer, the model says so explicitly instead of hallucinating.

Built with Next.js 16, Groq (Llama-3.3-70B), Google Gemini embeddings, Qdrant vector DB, and the Vercel AI SDK.

---

## Features

- **PDF upload** — drag-drop or click to upload, up to 25 MB
- **Streaming chat** — token-by-token responses via Vercel AI SDK + Groq
- **Page citations** — every answer cites the page numbers it relied on, e.g. `(Page 3)`
- **Inline source viewer** — collapsible panel under each answer showing the retrieved chunks with similarity scores
- **Strict grounding** — refuses to answer questions not covered by the document (returns `"The document does not cover this."` instead of guessing)
- **Per-session isolation** — each upload gets a unique session ID and Qdrant collection so different documents don't cross-contaminate
- **Light + dark mode**

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) on Node runtime |
| LLM | `llama-3.3-70b-versatile` via Groq |
| Embeddings | `gemini-embedding-001` (3072-dim) via Google AI Studio |
| Vector DB | Qdrant (local Docker for dev, Qdrant Cloud for prod) |
| PDF parsing | LangChain `WebPDFLoader` (buffer-based, serverless-safe) |
| Streaming | Vercel AI SDK v6 (`streamText` + `useChat`) |
| Styling | Tailwind CSS v4 |

## How it works

```
                ┌──────────────┐
                │   /api/upload │
                └──────┬───────┘
                       │
   PDF ──► WebPDFLoader ──► RecursiveCharacterTextSplitter
                       │   (1000 char chunks, 200 char overlap,
                       │    page metadata preserved on each chunk)
                       ▼
              filter empty/whitespace chunks
                       │
                       ▼
       Gemini batchEmbedContents (32 chunks/request)
       ─────► fallback to single embedContent on batch failure
              (fetchWithRetry: 5 attempts, exp-backoff up to 30s,
               respects Retry-After headers)
                       │
                       ▼
       Qdrant create-collection + upsert (cosine, dim=3072)
                       │
                       ▼
              return { sessionId, pages, chunkCount }


                ┌──────────────┐
                │   /api/chat   │
                └──────┬───────┘
                       │
        last user message ──► Gemini embedContent
                              (taskType: RETRIEVAL_QUERY)
                       │
                       ▼
        Qdrant similarity search (top-4 with scores)
                       │
                       ▼
        build strict grounded-answer system prompt
        with retrieved chunks tagged "[Source N | Page X]"
                       │
                       ▼
        Groq streamText (llama-3.3-70b-versatile, T=0.2)
                       │
                       ▼
        toUIMessageStreamResponse with sources in metadata
```

### Why this RAG configuration?

- **Chunk size 1000 / overlap 200** — large enough to preserve a paragraph's local context, small enough that retrieval pulls focused snippets. ~20% overlap means a sentence cut by a chunk boundary still appears intact in a neighbour, so retrieval doesn't miss it.
- **`RecursiveCharacterTextSplitter`** — splits hierarchically on paragraph → sentence → word boundaries, so chunks end on natural breaks rather than mid-word.
- **Per-chunk error isolation** — Gemini's batch endpoint fails the entire batch if any single input is malformed. The pipeline catches batch failures and falls back to one-at-a-time calls so a single bad chunk can't kill the whole upload.
- **`RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY` taskTypes** — Gemini documents asymmetric task types for indexing vs querying. Using both gives noticeably better retrieval quality than calling without taskType.
- **Direct `@qdrant/js-client-rest`** — bypasses LangChain's `QdrantVectorStore` so we control collection creation, upsert batching, and per-chunk error handling.

## Local development

### Prerequisites

- Node.js 20+
- Docker Desktop (for local Qdrant)
- A Groq API key — free at https://console.groq.com/keys
- A Google AI Studio API key — free at https://aistudio.google.com/apikey

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Ishan007-bot/NoteBookLLM_RAG.git
cd NoteBookLLM_RAG
npm install --legacy-peer-deps

# 2. Start Qdrant locally
docker run -d --name qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and paste your Groq + Google keys.
# Leave QDRANT_URL=http://127.0.0.1:6333 and QDRANT_API_KEY blank for local dev.

# 4. Run
npm run dev
```

Open http://localhost:3000.

> **Windows note**: use `127.0.0.1` not `localhost` in `QDRANT_URL` — Node's fetch on Windows often resolves `localhost` to IPv6, which Docker Qdrant doesn't bind to.

### Environment variables

```env
GROQ_API_KEY=        # https://console.groq.com/keys
GROQ_API_KEY_2=      # optional backup, auto-rotated on 429 / quota errors
GROQ_API_KEY_3=      # optional backup
GOOGLE_API_KEY=      # https://aistudio.google.com/apikey
GOOGLE_API_KEY_2=    # optional backup
GOOGLE_API_KEY_3=    # optional backup
QDRANT_URL=          # http://127.0.0.1:6333 for local, your cluster URL for cloud
QDRANT_API_KEY=      # blank for local Docker, required for Qdrant Cloud
```

**Key rotation**: when a Groq or Gemini key returns a 429 / quota / 401 error, the app rotates to the next configured backup key. State is per-process (in-memory) — on serverless platforms each instance maintains its own pointer. Add up to 5 keys per provider (`*_API_KEY`, `*_API_KEY_2`, ..., `*_API_KEY_5`).

## Deployment

The app is designed for serverless (Vercel) — `pdf-parse` is declared in `serverExternalPackages`, the upload route uses the Node runtime with `maxDuration = 60`, and chunking happens entirely in memory (no disk writes).

### Deploy to Vercel + Qdrant Cloud

1. Sign up at https://cloud.qdrant.io and create a free-tier cluster (1 GB RAM, ~1M vectors). Pick a region close to Vercel's default (e.g. `us-east`).
2. Copy the cluster URL and create an API key.
3. Push to GitHub, then import the repo at https://vercel.com/new.
4. Set the four environment variables in Vercel project settings:
   - `GROQ_API_KEY`
   - `GOOGLE_API_KEY`
   - `QDRANT_URL` (your Qdrant Cloud URL)
   - `QDRANT_API_KEY` (your Qdrant Cloud API key)
5. Deploy.

## Project layout

```
notebook-rag/
├─ app/
│  ├─ api/
│  │  ├─ upload/route.ts   # POST: parse PDF, chunk, embed, index in Qdrant
│  │  └─ chat/route.ts     # POST: retrieve context, stream grounded answer
│  ├─ layout.tsx           # Root layout, fonts, metadata
│  ├─ page.tsx             # State machine: upload view ↔ chat view
│  └─ globals.css          # Tailwind + theme tokens
├─ components/
│  ├─ upload-view.tsx      # Drag-drop upload zone with progress + errors
│  └─ chat-view.tsx        # Streaming chat UI with collapsible sources
├─ lib/
│  ├─ rag.ts               # Chunking, embedding, indexing, retrieval, prompts
│  └─ types.ts             # Shared types (UploadResponse, RetrievedChunk, ...)
├─ next.config.ts          # serverExternalPackages: ['pdf-parse']
└─ .env.example            # Required env vars (committed; .env.local is gitignored)
```

## Limitations & notes

- **Free-tier rate limits** — Gemini's free tier allows 100 RPM and 1500 RPD on `gemini-embedding-001`. Large PDFs (~500+ chunks) or rapid re-uploads can hit this. The pipeline pacing (1.5s between batches) keeps a single normal upload comfortably under the limit. For higher throughput, enable Gemini billing or swap to a different embedder.
- **Image-only / scanned PDFs** — `WebPDFLoader` extracts text only; scanned-image PDFs without OCR will produce zero chunks and fail at upload with a clear error.
- **Per-session collections** — each upload creates a new Qdrant collection (`doc-{uuid}`). Old collections accumulate in Qdrant; in production, add a TTL/cleanup job or expire by collection age.
- **No auth** — anyone with the URL can upload and query. Add NextAuth or similar before exposing publicly.

## License

MIT
