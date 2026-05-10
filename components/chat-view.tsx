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
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-scroll to bottom on new messages / streaming.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  // Auto-resize textarea up to a max height.
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + "px";
  }, [input]);

  const isBusy = status === "submitted" || status === "streaming";
  const lastAssistantId = messages.findLast?.((m) => m.role === "assistant")?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Document strip — sits beneath the site header. The filename is set
          large in serif; metadata is small caps; "new document" is a quiet
          ghost button on the right. */}
      <div className="relative border-b border-[var(--rule)] bg-[var(--paper)]">
        {/* Thin accent gradient line at the top of the strip */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(to right, transparent, var(--accent), transparent)",
            opacity: 0.5,
          }}
          aria-hidden
        />
        <div className="mx-auto flex w-full max-w-4xl items-end justify-between gap-6 px-6 py-6 sm:px-10">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
              <p className="smallcaps">currently reading</p>
            </div>
            <h2
              className="font-display truncate text-2xl font-medium tracking-[-0.015em] text-[var(--ink)] sm:text-[1.75rem]"
              title={meta.filename}
            >
              {meta.filename}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ink-faint)] tabular-nums">
              <span>{meta.pages} {meta.pages === 1 ? "page" : "pages"}</span>
              <span aria-hidden>·</span>
              <span>{meta.chunkCount} chunks indexed</span>
              <span aria-hidden>·</span>
              <span className="font-mono">{shortId(meta.sessionId)}</span>
            </p>
          </div>
          <button type="button" onClick={onReset} className="btn-ghost shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            New document
          </button>
        </div>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
          {messages.length === 0 && <EmptyState />}

          {messages.map((m) => (
            <MessageBlock
              key={m.id}
              message={m}
              streaming={isBusy && m.id === lastAssistantId && m.role === "assistant"}
            />
          ))}

          {status === "submitted" && (
            <div className="rise-soft flex items-center gap-3 text-sm text-[var(--ink-faint)]">
              <span className="thinking-dots inline-flex"><span /><span /><span /></span>
              <span>Retrieving the relevant passages …</span>
            </div>
          )}

          {error && (
            <div className="rise-soft rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              <div className="smallcaps mb-1 text-[var(--danger)]">error</div>
              {error.message}
            </div>
          )}
        </div>
      </div>

      {/* Composer — minimal, generously padded, with a thin top rule */}
      <form
        onSubmit={handleSubmit}
        className="relative border-t border-[var(--rule)] bg-[var(--paper)]"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(to right, transparent, var(--accent), transparent)",
            opacity: 0.4,
          }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-3xl px-6 py-5 sm:px-10">
          <div className="card-paper flex items-end gap-3 px-4 py-3 transition-colors focus-within:!border-[var(--accent)]">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={`Ask something about ${truncate(meta.filename, 40)} …`}
              rows={1}
              className="min-h-[24px] flex-1 resize-none bg-transparent text-[0.95rem] leading-snug text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:outline-none"
              disabled={isBusy}
            />
            {isBusy ? (
              <button type="button" onClick={() => stop()} className="btn-ghost shrink-0">
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="btn-primary shrink-0"
                aria-label="Send"
              >
                Ask
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6h8m0 0L6 2m4 4L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-[0.7rem] text-[var(--ink-faint)]">
            <kbd className="rounded border border-[var(--rule)] bg-[var(--paper)] px-1 py-0.5 font-mono text-[0.65rem]">Enter</kbd>
            <span className="mx-1">to send</span>
            <kbd className="rounded border border-[var(--rule)] bg-[var(--paper)] px-1 py-0.5 font-mono text-[0.65rem]">Shift</kbd>
            <span className="mx-1">+</span>
            <kbd className="rounded border border-[var(--rule)] bg-[var(--paper)] px-1 py-0.5 font-mono text-[0.65rem]">Enter</kbd>
            <span className="mx-1">for newline</span>
          </p>
        </div>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Message rendering — editorial, not chat-bubble
 * User: right-aligned, in a soft-tinted card with a small "you" label.
 * Assistant: left, no card — leading "NotebookRAG" tag and a thin accent rule
 * along the left margin to mark the answer column. Sources sit below in a
 * small caps section, numbered like academic references.
 * ------------------------------------------------------------------------- */

function MessageBlock({
  message,
  streaming,
}: {
  message: ChatUIMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  const sources = message.metadata?.sources ?? [];

  if (isUser) {
    return (
      <div className="rise-soft flex justify-end">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[var(--accent-soft)] px-4 py-3">
          <div className="smallcaps mb-1 text-right">you asked</div>
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--ink)]">
            {text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className="rise-soft flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <span className="smallcaps text-[var(--accent)]">NotebookRAG · answer</span>
      </header>
      <div className="border-l-2 border-[var(--accent)] pl-5">
        <p className="whitespace-pre-wrap text-[1rem] leading-[1.7] text-[var(--ink)]">
          {text || (streaming ? "" : <span className="text-[var(--ink-faint)] italic">no response</span>)}
          {streaming && <span className="caret" aria-hidden />}
        </p>
      </div>
      {sources.length > 0 && <SourcesPanel sources={sources} />}
    </article>
  );
}

function SourcesPanel({ sources }: { sources: RetrievedChunk[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-left transition-colors hover:text-[var(--ink)]"
        aria-expanded={open}
      >
        <span className="smallcaps">
          {sources.length} source{sources.length === 1 ? "" : "s"} cited
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
          className={`text-[var(--ink-faint)] transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        >
          <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ol className="rise-soft mt-3 grid gap-2 sm:grid-cols-2">
          {sources.map((s, i) => (
            <li
              key={i}
              className="card-paper group p-4 transition-all hover:!border-[var(--accent)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] font-mono text-[0.65rem] font-medium text-[var(--accent)]">
                    {i + 1}
                  </span>
                  <span className="smallcaps">Page {s.page}</span>
                </span>
                <span className="font-mono text-[0.7rem] text-[var(--ink-faint)] tabular-nums">
                  {s.score.toFixed(3)}
                </span>
              </div>
              <p className="line-clamp-3 text-xs leading-relaxed text-[var(--ink-soft)]">
                {s.content}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EmptyState() {
  const examples = [
    "What is this document about?",
    "Summarise the main arguments.",
    "What does it say about [a specific term]?",
  ];
  return (
    <div className="card-paper fade-in relative overflow-hidden p-8">
      {/* Decorative serif quote behind */}
      <span
        className="deco-glyph select-none"
        aria-hidden
        style={{ top: "-3rem", right: "-1rem", fontSize: "12rem", opacity: 0.05 }}
      >
        &ldquo;
      </span>
      <div className="relative">
        <p className="smallcaps mb-4">try asking</p>
        <ul className="flex flex-col gap-2.5">
          {examples.map((q) => (
            <li
              key={q}
              className="font-display text-lg italic leading-snug text-[var(--ink-soft)]"
            >
              <span className="text-[var(--accent)]">&ldquo;</span>
              {q}
              <span className="text-[var(--accent)]">&rdquo;</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-md text-xs leading-relaxed text-[var(--ink-faint)]">
          Answers cite the page they came from. If the document doesn&rsquo;t cover something, NotebookRAG will say so explicitly instead of inventing.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function shortId(id: string): string {
  // Strip the "doc-" prefix and show first 8 chars of the UUID for a compact
  // "session" badge. Stable but unobtrusive.
  const stripped = id.replace(/^doc-/, "");
  return stripped.slice(0, 8);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
