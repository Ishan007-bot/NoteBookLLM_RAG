"use client";

import { useState } from "react";
import { UploadView } from "@/components/upload-view";
import { ChatView } from "@/components/chat-view";
import type { UploadResponse } from "@/lib/types";

export default function Home() {
  const [meta, setMeta] = useState<UploadResponse | null>(null);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader inChat={!!meta} />
      <main className="flex flex-1 flex-col">
        {meta ? (
          <ChatView meta={meta} onReset={() => setMeta(null)} />
        ) : (
          <UploadView onUploaded={setMeta} />
        )}
      </main>
      {!meta && <SiteFooter />}
    </div>
  );
}

function SiteHeader({ inChat }: { inChat: boolean }) {
  return (
    <header className="border-b border-[var(--rule)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <a href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-[1.35rem] font-medium tracking-[-0.02em] text-[var(--ink)]">
            Notebook<span className="italic text-[var(--accent)]">RAG</span>
          </span>
          {!inChat && (
            <>
              <span className="ornament hidden sm:inline-block" aria-hidden />
              <span className="smallcaps hidden sm:inline">a document studio</span>
            </>
          )}
        </a>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/Ishan007-bot/NoteBookLLM_RAG"
            target="_blank"
            rel="noreferrer"
            className="smallcaps transition-colors hover:text-[var(--ink)]"
          >
            Source <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--rule)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 sm:flex-row sm:items-center sm:px-10">
        <p className="smallcaps">
          Built with Next.js · Groq · Gemini · Qdrant
        </p>
        <p className="smallcaps">
          <span className="text-[var(--ink-faint)]">grounded answers, no hallucination</span>
        </p>
      </div>
    </footer>
  );
}
