import type { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";
import { getGroqKey, rotateGroqKey } from "@/lib/api-keys";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  sessionId: string;
  messages: UIMessage[];
  // Citation unit label, derived from the document type on the client (e.g.
  // "Page" for PDFs, "Row" for CSVs, "Section" for plain text). Optional —
  // defaults to "Page" if missing for backwards compat with older clients.
  unit?: string;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { sessionId, messages, unit } = (await req.json()) as ChatRequestBody;

    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Missing sessionId or messages" },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }
    const userQuery = extractText(lastUserMessage);
    if (!userQuery.trim()) {
      return Response.json({ error: "Empty query" }, { status: 400 });
    }

    const sources = await retrieveContext(userQuery, sessionId, 4);
    const system = buildSystemPrompt(sources, unit ?? "Page");
    const modelMessages = await convertToModelMessages(messages);

    // Build a Groq client bound to the currently-active key. If a stream error
    // surfaces a quota / 429, rotate to the next configured key so the user's
    // next request uses a fresh one.
    const groqClient = createGroq({ apiKey: getGroqKey() });

    const result = streamText({
      model: groqClient(GROQ_MODEL),
      system,
      messages: modelMessages,
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: () => ({ sources }),
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[chat] stream error:", msg);
        // Detect quota / rate-limit / auth failures and rotate the Groq key
        // so subsequent requests get a fresh one. The current request still
        // fails — the user retries.
        if (/(429|rate.?limit|quota|401|invalid.?api.?key)/i.test(msg)) {
          rotateGroqKey();
        }
        return msg;
      },
    });
  } catch (e) {
    console.error("[chat] error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    if (/(429|rate.?limit|quota|401|invalid.?api.?key)/i.test(message)) {
      rotateGroqKey();
    }
    return Response.json({ error: message }, { status: 500 });
  }
}

function extractText(message: UIMessage): string {
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string"
    )
    .map((p) => p.text)
    .join("\n");
}
