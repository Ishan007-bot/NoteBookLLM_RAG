"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UploadResponse, MessageMetadata, RetrievedChunk } from "@/lib/types";

type ChatUIMessage = UIMessage<MessageMetadata>;

interface ChatViewProps {
  meta: UploadResponse;
  onReset: () => void;
}

export function ChatView({ meta, onReset }: ChatViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId: meta.sessionId },
      }),
    [meta.sessionId]
  );

  const { messages, sendMessage, status, error, stop } = useChat<ChatUIMessage>({
    transport,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[--color-border] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold sm:text-base" title={meta.filename}>
            {meta.filename}
          </h2>
          <p className="text-xs text-[--color-muted-foreground]">
            {meta.pages} {meta.pages === 1 ? "page" : "pages"} · {meta.chunkCount} chunks
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-[--color-border] px-3 py-1.5 text-xs font-medium hover:bg-[--color-muted]"
        >
          New document
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && (
            <EmptyState filename={meta.filename} />
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-[--color-muted-foreground]">
              <Spinner /> Retrieving context & thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[--color-border] px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={`Ask something about ${meta.filename}…`}
            rows={1}
            className="min-h-[44px] flex-1 resize-none rounded-md border border-[--color-border] bg-[--color-background] px-3 py-2.5 text-sm focus:border-[--color-accent] focus:outline-none focus:ring-1 focus:ring-[--color-accent]"
            disabled={isBusy}
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-md border border-[--color-border] px-4 py-2.5 text-sm font-medium hover:bg-[--color-muted]"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-md bg-[--color-accent] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatUIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  const sources = message.metadata?.sources ?? [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[--color-accent] text-white"
            : "bg-[--color-muted] text-[--color-foreground]"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{text}</div>
        {!isUser && sources.length > 0 && <SourcesBlock sources={sources} />}
      </div>
    </div>
  );
}

function SourcesBlock({ sources }: { sources: RetrievedChunk[] }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="mt-3 border-t border-[--color-border] pt-2"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-xs font-medium text-[--color-muted-foreground] hover:text-[--color-foreground]">
        {sources.length} source{sources.length === 1 ? "" : "s"} used · click to view
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {sources.map((s, i) => (
          <div
            key={i}
            className="rounded border border-[--color-border] bg-[--color-background] p-2 text-xs"
          >
            <div className="mb-1 font-medium">
              Source {i + 1} · Page {s.page} · score {s.score.toFixed(3)}
            </div>
            <div className="text-[--color-muted-foreground] line-clamp-3">
              {s.content}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function EmptyState({ filename }: { filename: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[--color-border] p-6 text-center">
      <p className="text-sm font-medium">Ready to chat with {filename}</p>
      <p className="mt-1 text-xs text-[--color-muted-foreground]">
        Try asking: &ldquo;What is this document about?&rdquo; or &ldquo;Summarise the main points.&rdquo;
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[--color-muted-foreground] border-t-transparent"
      aria-hidden
    />
  );
}
