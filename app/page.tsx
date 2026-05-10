"use client";

import { useState } from "react";
import { UploadView } from "@/components/upload-view";
import { ChatView } from "@/components/chat-view";
import { BackgroundDecor } from "@/components/background-decor";
import type { UploadResponse } from "@/lib/types";

export default function Home() {
  const [meta, setMeta] = useState<UploadResponse | null>(null);

  return (
    <>
      {/* Decorative background SVGs and typographic ornaments. Only on the
          upload view — chat view stays focused, no marginalia behind a
          conversation. Rendered as a sibling of the main wrapper so it sits
          on its own stacking layer; content is bumped to z-10 to stay above. */}
      {!meta && <BackgroundDecor />}

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <SiteHeader inChat={!!meta} />
        <main className="relative flex flex-1 flex-col">
          {meta ? (
            <ChatView meta={meta} onReset={() => setMeta(null)} />
          ) : (
            <UploadView onUploaded={setMeta} />
          )}
        </main>
        {!meta && <SiteFooter />}
      </div>
    </>
  );
}

function SiteHeader({ inChat }: { inChat: boolean }) {
  return (
    <header className="relative border-b border-[var(--rule)] bg-[var(--paper)]/80 backdrop-blur-sm">
      {/* A whisper-thin accent gradient bar at the very top of the page —
          gives the design a single signature line it can return to. */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--accent) 30%, var(--accent) 70%, transparent)",
          opacity: 0.55,
        }}
        aria-hidden
      />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <a href="/" className="group flex items-baseline gap-3">
          <Logomark />
          <span className="font-display text-[1.4rem] font-medium tracking-[-0.02em] text-[var(--ink)]">
            Notebook<span className="italic text-[var(--accent)]">RAG</span>
          </span>
          {!inChat && (
            <>
              <span className="ornament hidden sm:inline-block" aria-hidden />
              <span className="smallcaps hidden sm:inline">a document studio</span>
            </>
          )}
        </a>
        <nav className="flex items-center gap-5">
          <a
            href="https://github.com/Ishan007-bot/NoteBookLLM_RAG"
            target="_blank"
            rel="noreferrer"
            className="smallcaps inline-flex items-center gap-1.5 transition-colors hover:text-[var(--ink)]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Source
          </a>
        </nav>
      </div>
    </header>
  );
}

/* Tiny custom logomark — two stacked rectangles with a green dot, echoing
   the document mark in the upload zone. Compact and characterful. */
function Logomark() {
  return (
    <svg width="22" height="24" viewBox="0 0 22 24" fill="none" aria-hidden className="shrink-0">
      <rect x="2" y="1" width="14" height="18" rx="1.5" className="stroke-[var(--ink-faint)]" strokeWidth="1.25" fill="var(--paper)" />
      <rect x="6" y="5" width="14" height="18" rx="1.5" className="stroke-[var(--ink)]" strokeWidth="1.25" fill="var(--paper-card)" />
      <line x1="9" y1="11" x2="17" y2="11" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
      <line x1="9" y1="14" x2="17" y2="14" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
      <circle cx="16.5" cy="20" r="2" fill="var(--accent)" />
    </svg>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--rule)] bg-[var(--paper)]/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-6 py-7 sm:flex-row sm:items-center sm:px-10">
        <div className="flex items-center gap-3">
          <span className="smallcaps">Built with</span>
          <span className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            <span className="font-mono">Next.js</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span className="font-mono">Groq</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span className="font-mono">Gemini</span>
            <span className="text-[var(--ink-faint)]">·</span>
            <span className="font-mono">Qdrant</span>
          </span>
        </div>
        <p className="smallcaps">
          <span className="text-[var(--ink-faint)]">grounded answers · no hallucination</span>
        </p>
      </div>
    </footer>
  );
}
