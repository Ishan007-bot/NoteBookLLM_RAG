import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import type { Document } from "@langchain/core/documents";
import type { RetrievedChunk } from "@/lib/types";

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
const EMBEDDING_MODEL = "text-embedding-004";

function getEmbeddings() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: EMBEDDING_MODEL,
  });
}

function getQdrantConfig() {
  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error("QDRANT_URL is not set");
  }
  const apiKey = process.env.QDRANT_API_KEY || undefined;
  return { url, apiKey };
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
  const chunks = await splitter.splitDocuments(pageDocs);

  return { chunks, pages: pageDocs.length };
}

export async function indexChunks(chunks: Document[], collectionName: string): Promise<void> {
  const embeddings = getEmbeddings();
  const config = getQdrantConfig();
  await QdrantVectorStore.fromDocuments(chunks, embeddings, {
    ...config,
    collectionName,
  });
}

export async function retrieveContext(
  query: string,
  collectionName: string,
  k: number = TOP_K
): Promise<RetrievedChunk[]> {
  const embeddings = getEmbeddings();
  const config = getQdrantConfig();
  const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
    ...config,
    collectionName,
  });
  const results = await store.similaritySearchWithScore(query, k);
  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    page: extractPageNumber(doc),
    score,
  }));
}

function extractPageNumber(doc: Document): number {
  const meta = doc.metadata as { loc?: { pageNumber?: number } };
  return meta.loc?.pageNumber ?? 0;
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
