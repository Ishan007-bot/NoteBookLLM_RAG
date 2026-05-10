"use client";

import { useRef, useState } from "react";
import type { UploadResponse } from "@/lib/types";

interface UploadViewProps {
  onUploaded: (meta: UploadResponse) => void;
}

const ACCEPTED_EXTENSIONS = ["pdf", "txt", "md", "csv", "docx"];

export function UploadView({ onUploaded }: UploadViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))) {
      setError(`Unsupported file type. Use: ${ACCEPTED_EXTENSIONS.join(", ")}.`);
      return;
    }
    setUploading(true);
    setProgressMsg("Reading & chunking the document …");

    try {
      // Show evolving progress copy so a multi-second wait doesn't feel dead.
      const t1 = setTimeout(() => setProgressMsg("Embedding chunks with Gemini …"), 2500);
      const t2 = setTimeout(() => setProgressMsg("Indexing in Qdrant …"), 8000);
      const t3 = setTimeout(() => setProgressMsg("Almost there — finalising …"), 15000);

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      const data: UploadResponse | { error: string } = await res.json();
      if (!res.ok || "error" in data) {
        const msg = "error" in data ? data.error : `Upload failed (${res.status})`;
        throw new Error(msg);
      }
      onUploaded(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgressMsg("");
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:px-10 sm:py-24">
        <div className="stagger flex flex-col gap-10">
          {/* Eyebrow */}
          <p className="smallcaps">
            <span className="text-[var(--accent)]">●</span>&nbsp;&nbsp;Document Q&amp;A · grounded · cited
          </p>

          {/* Headline */}
          <h1 className="display-headline text-[clamp(2.5rem,6vw,4.25rem)] text-[var(--ink)]">
            Read with{" "}
            <span className="italic text-[var(--accent)]">precision.</span>
            <br />
            Ask anything.
          </h1>

          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-[var(--ink-soft)]">
            Upload a PDF, Word doc, text file, or spreadsheet. NotebookRAG indexes it page by page and answers your questions using only what&rsquo;s actually written — every claim cites the page it came from. If the document doesn&rsquo;t cover something, it says so plainly.
          </p>

          {/* Drop zone */}
          <DropZone
            uploading={uploading}
            dragOver={dragOver}
            onDragOver={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(file) => {
              setDragOver(false);
              if (!uploading) handleFile(file);
            }}
            onPick={() => inputRef.current?.click()}
          />

          {/* Hidden input */}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          {/* Status / errors */}
          <div aria-live="polite" className="min-h-[1.5rem]">
            {progressMsg && (
              <p className="fade-in flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                <span className="thinking-dots inline-flex">
                  <span /><span /><span />
                </span>
                {progressMsg}
              </p>
            )}
            {error && (
              <p className="rise-soft rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>

          {/* Three principles — tasteful trust signals */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
            <Principle
              tag="01"
              title="Grounded"
              body="Answers are pulled from your document. No outside knowledge bleeds in."
            />
            <Principle
              tag="02"
              title="Cited"
              body="Every answer references the exact page or row it relied on."
            />
            <Principle
              tag="03"
              title="Honest"
              body="If the document doesn&rsquo;t cover it, the model says so — never guesses."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DropZone({
  uploading,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
}: {
  uploading: boolean;
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={uploading}
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onDrop(file);
      }}
      className={`group relative flex w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-dashed px-8 py-14 text-center transition-all duration-300 ${
        dragOver
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--rule)] bg-[var(--paper-deep)] hover:border-[var(--ink-faint)]"
      } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
    >
      {/* Decorative corner ticks — Swiss design tic */}
      <CornerTicks />

      {/* Document glyph — custom, not a generic upload arrow */}
      <DocumentMark active={dragOver || uploading} />

      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-xl text-[var(--ink)]">
          {uploading
            ? "Working …"
            : dragOver
              ? "Drop to upload"
              : "Drop a document here"}
        </span>
        <span className="text-sm text-[var(--ink-faint)]">
          or <span className="underline decoration-[var(--ink-faint)] decoration-dotted underline-offset-4 group-hover:text-[var(--accent)] group-hover:decoration-[var(--accent)]">click to browse</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        {ACCEPTED_EXTENSIONS.map((ext, i) => (
          <span key={ext} className="flex items-center gap-3">
            <span className="font-mono">.{ext}</span>
            {i < ACCEPTED_EXTENSIONS.length - 1 && (
              <span className="h-1 w-1 rounded-full bg-[var(--rule)]" aria-hidden />
            )}
          </span>
        ))}
        <span className="ml-1 text-[var(--ink-faint)]">· max 25 MB</span>
      </div>
    </button>
  );
}

function CornerTicks() {
  return (
    <>
      <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-[var(--ink-faint)]" />
      <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-[var(--ink-faint)]" />
      <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-[var(--ink-faint)]" />
      <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-[var(--ink-faint)]" />
    </>
  );
}

function DocumentMark({ active }: { active: boolean }) {
  return (
    <svg
      width="44"
      height="52"
      viewBox="0 0 44 52"
      fill="none"
      className={`transition-transform duration-500 ${active ? "scale-110" : ""}`}
      aria-hidden
    >
      {/* Back doc */}
      <rect
        x="6"
        y="2"
        width="28"
        height="36"
        rx="2"
        className="stroke-[var(--ink-faint)]"
        strokeWidth="1.25"
      />
      {/* Front doc */}
      <rect
        x="11"
        y="11"
        width="28"
        height="38"
        rx="2"
        fill="var(--paper)"
        className="stroke-[var(--ink)]"
        strokeWidth="1.25"
      />
      {/* Lines */}
      <line x1="17" y1="22" x2="33" y2="22" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
      <line x1="17" y1="28" x2="33" y2="28" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
      <line x1="17" y1="34" x2="27" y2="34" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
      {/* Accent dot */}
      <circle cx="33" cy="42" r="3" fill="var(--accent)" />
    </svg>
  );
}

function Principle({ tag, title, body }: { tag: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 bg-[var(--paper)] p-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[0.7rem] text-[var(--ink-faint)]">{tag}</span>
        <span className="font-display text-base text-[var(--ink)]">{title}</span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{body}</p>
    </div>
  );
}
