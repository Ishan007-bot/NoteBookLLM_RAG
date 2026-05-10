import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantClient } from "@qdrant/js-client-rest";
import type { Document } from "@langchain/core/documents";
import type { RetrievedChunk } from "@/lib/types";
import { getGoogleKey, rotateGoogleKey, googleKeyCount } from "@/lib/api-keys";

// Chunking strategy: RecursiveCharacterTextSplitter
//   - chunkSize 1000 chars: large enough to preserve local context (a paragraph or two),
//     small enough that retrieval pulls focused, relevant text rather than long irrelevant runs.
//   - chunkOverlap 200: ~20% overlap means a sentence cut in two by a chunk boundary
//     still appears intact in one of the neighbouring chunks, so retrieval doesn't miss it.
//   - Splits hierarchically on paragraph -> sentence -> word boundaries, so chunks
//     end on natural breaks instead of mid-word.
//   - Page metadata from PDFLoader is preserved on every child chunk so we can cite pages.
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const TOP_K = 4;
const EMBEDDING_MODEL = "gemini-embedding-001";
const UPSERT_BATCH_SIZE = 64;

interface ChunkMetadata {
  loc?: { pageNumber?: number };
  [k: string]: unknown;
}

interface QdrantPayload {
  content: string;
  page: number;
}

function getQdrantClient(): QdrantClient {
  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL is not set");
  }
  const apiKey = process.env.QDRANT_API_KEY || undefined;
  return new QdrantClient({ url, apiKey, checkCompatibility: false });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Build the Gemini API URL for a given model + endpoint, injecting the current key.
function geminiUrl(endpoint: "embedContent" | "batchEmbedContents", apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:${endpoint}?key=${apiKey}`;
}

// Call Gemini with key rotation + exponential backoff.
//   1. Try current key with up to 3 attempts (backoff 2s/4s/8s, capped 30s).
//   2. On persistent 429/503, rotate to the next configured key and try again.
//   3. After all keys cycle through, return the last response (caller decides).
async function fetchGeminiWithRotation(
  endpoint: "embedContent" | "batchEmbedContents",
  init: RequestInit
): Promise<Response> {
  const totalKeys = Math.max(1, googleKeyCount());
  let lastResponse: Response | null = null;

  for (let keyAttempt = 0; keyAttempt < totalKeys; keyAttempt++) {
    const apiKey = getGoogleKey();
    const url = geminiUrl(endpoint, apiKey);

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, init);
      lastResponse = res;
      if (res.status === 200) return res;
      // Non-quota errors (4xx other than 429, or 5xx other than 503) — return now,
      // rotation won't help for these.
      if (res.status !== 429 && res.status !== 503) return res;

      if (attempt < 2) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30000)
          : Math.min(2000 * 2 ** attempt, 30000);
        await sleep(backoffMs);
      }
    }

    // Current key exhausted after retries — rotate if we have another.
    if (rotateGoogleKey() === null) break;
  }

  return lastResponse!;
}

// Embed a single chunk via Gemini's embedContent endpoint.
// Used for queries (single text in, single vector out) and as a fallback
// when batch embedding fails for a particular batch.
async function embedSingle(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
  const res = await fetchGeminiWithRotation("embedContent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini embed ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("empty embedding");
  }
  return values;
}

// Embed multiple chunks in a single batchEmbedContents call.
// Returns null for any chunk whose embedding failed (so caller can fall back).
// Note: Gemini fails the entire batch if any input is bad, so we filter empty
// chunks upstream and fall back to individual calls if a batch returns empty.
async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  const res = await fetchGeminiWithRotation("batchEmbedContents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
      })),
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini batch embed ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embeddings?: { values?: number[] }[] };
  const embeddings = data.embeddings ?? [];
  // If batch failed silently (returned empty array despite 200), return all nulls
  if (embeddings.length !== texts.length) {
    return new Array(texts.length).fill(null);
  }
  return embeddings.map((e) => (e.values && e.values.length > 0 ? e.values : null));
}

function getPageNumber(metadata: ChunkMetadata): number {
  return metadata.loc?.pageNumber ?? 0;
}

export async function loadAndChunkPdf(
  blob: Blob
): Promise<{ chunks: Document[]; pages: number }> {
  const loader = new WebPDFLoader(blob, { splitPages: true });
  const pageDocs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });
  const rawChunks = await splitter.splitDocuments(pageDocs);

  // Drop chunks that are empty/whitespace-only (cover pages, separator pages,
  // OCR artifacts) — Gemini rejects empty content.
  const chunks = rawChunks.filter((c) => c.pageContent.trim().length > 0);

  return { chunks, pages: pageDocs.length };
}

export async function indexChunks(chunks: Document[], collectionName: string): Promise<void> {
  // Embed in batches (one HTTP request per ~32 chunks) and pace them to stay
  // under Gemini free-tier limits (100 RPM, 1500 RPD on gemini-embedding-001).
  // If a batch fails, fall back to single calls (also paced). fetchWithRetry
  // handles 429/503 with backoff up to 30s per attempt.
  const EMBED_BATCH_SIZE = 32;
  const INTER_BATCH_DELAY_MS = 1500;
  const INTER_SINGLE_DELAY_MS = 700;
  const records: { content: string; page: number; vector: number[] }[] = [];
  let dim = 0;
  let skipped = 0;

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    if (i > 0) await sleep(INTER_BATCH_DELAY_MS);

    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    let vectors: (number[] | null)[];
    try {
      vectors = await embedBatch(batch.map((c) => c.pageContent));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[indexChunks] batch ${i}-${i + batch.length} failed (${msg}); falling back to single calls`);
      vectors = new Array(batch.length).fill(null);
    }

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      let vector = vectors[j];
      if (!vector) {
        // Pace the fallback single calls — they're firing right after the
        // batch already failed, so the API window is tight.
        await sleep(INTER_SINGLE_DELAY_MS);
        try {
          vector = await embedSingle(chunk.pageContent, "RETRIEVAL_DOCUMENT");
        } catch (e) {
          skipped += 1;
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[indexChunks] skipped chunk (page ${getPageNumber(chunk.metadata as ChunkMetadata)}): ${msg}`);
          continue;
        }
      }
      if (dim === 0) dim = vector.length;
      records.push({
        content: chunk.pageContent,
        page: getPageNumber(chunk.metadata as ChunkMetadata),
        vector,
      });
    }
  }

  if (records.length === 0) {
    throw new Error("All chunks failed to embed");
  }
  if (skipped > 0) {
    console.warn(`[indexChunks] skipped ${skipped}/${chunks.length} chunks; indexing ${records.length}`);
  }

  const client = getQdrantClient();
  await client.createCollection(collectionName, {
    vectors: { size: dim, distance: "Cosine" },
  });

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + UPSERT_BATCH_SIZE).map((r, idx) => ({
      id: i + idx,
      vector: r.vector,
      payload: { content: r.content, page: r.page } satisfies QdrantPayload,
    }));
    await client.upsert(collectionName, { points: batch, wait: true });
  }
}

export async function retrieveContext(
  query: string,
  collectionName: string,
  k: number = TOP_K
): Promise<RetrievedChunk[]> {
  const vector = await embedSingle(query, "RETRIEVAL_QUERY");
  const client = getQdrantClient();
  const results = await client.search(collectionName, {
    vector,
    limit: k,
    with_payload: true,
  });
  return results.map((r) => {
    const payload = (r.payload ?? {}) as Partial<QdrantPayload>;
    return {
      content: payload.content ?? "",
      page: payload.page ?? 0,
      score: r.score ?? 0,
    };
  });
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return `You are a precise document Q&A assistant. The user has uploaded a document, but no relevant context was retrieved for this query. Reply exactly: "The document does not cover this."`;
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1} | Page ${c.page}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are a precise document Q&A assistant.

STRICT RULES:
- Answer ONLY using the CONTEXT below. Do not use outside knowledge.
- If the answer is not contained in the context, reply exactly: "The document does not cover this."
- Cite the page number(s) you used inline, e.g. "(Page 3)".
- Be concise and direct.
- Do not speculate, infer, or extrapolate beyond what the context states.

CONTEXT:
${context}`;
}
