import type { NextRequest } from "next/server";
import { v4 as uuid } from "uuid";
import { loadAndChunkPdf, indexChunks } from "@/lib/rag";
import type { UploadResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    const sessionId = `doc-${uuid()}`;
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: "application/pdf" });

    const { chunks, pages } = await loadAndChunkPdf(blob);
    if (chunks.length === 0) {
      return Response.json(
        { error: "PDF has no extractable text (possibly a scanned image PDF)" },
        { status: 400 }
      );
    }

    await indexChunks(chunks, sessionId);

    const body: UploadResponse = {
      sessionId,
      filename: file.name,
      pages,
      chunkCount: chunks.length,
    };
    return Response.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
