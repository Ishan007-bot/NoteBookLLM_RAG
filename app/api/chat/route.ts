import type { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { groq } from "@ai-sdk/groq";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  sessionId: string;
  messages: UIMessage[];
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { sessionId, messages } = (await req.json()) as ChatRequestBody;

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
    const system = buildSystemPrompt(sources);

    const modelMessages = await convertToModelMessages(messages);
    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system,
      messages: modelMessages,
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: () => ({ sources }),
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[chat] stream error:", msg);
        return msg;
      },
    });
  } catch (e) {
    console.error("[chat] error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
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
