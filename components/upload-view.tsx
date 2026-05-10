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
    <section className="relative flex flex-1 flex-col overflow-hidden">
      {/* Decorative serif glyph — softly behind the hero, contained and faint */}
      <span
        className="deco-glyph hidden select-none sm:block"
        aria-hidden
        style={{
          fontSize: "clamp(8rem, 14vw, 12rem)",
          top: "3rem",
          right: "1rem",
          color: "var(--accent)",
          opacity: 0.07,
          fontStyle: "italic",
          fontVariationSettings: '"opsz" 144',
        }}
      >
        &ldquo;
      </span>

      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12 sm:px-10 sm:py-16">
        <div className="stagger flex flex-col gap-8">
          {/* Eyebrow with status pill */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--paper-card)] px-3 py-1 shadow-[var(--shadow-sm)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-50" style={{ animation: "glow-pulse 2.4s ease-in-out infinite" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              <span className="smallcaps text-[var(--ink)]">v1.0 — beta</span>
            </span>
            <span className="smallcaps">grounded · cited · honest</span>
          </div>

          {/* Headline — big serif statement with italic accent */}
          <h1 className="display-headline relative text-[clamp(2.75rem,7vw,5rem)] text-[var(--ink)]">
            Read with{" "}
            <span className="italic text-gradient">precision.</span>
            <br />
            <span className="text-[var(--ink-soft)]">Ask</span>{" "}
            <span className="italic">anything.</span>
          </h1>

          {/* Lead paragraph with drop cap */}
          <p className="dropcap max-w-2xl text-[1.0625rem] leading-[1.75] text-[var(--ink-soft)]">
            Upload a document and NotebookRAG indexes it page by page. Every answer is pulled directly from your text, with the relevant page numbers cited beneath it. When the document doesn&rsquo;t cover something, the model will say so plainly — instead of inventing.
          </p>

          {/* Drop zone — the focal interactive element, card-paper styled */}
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

          <div aria-live="polite" className="min-h-[1.5rem]">
            {progressMsg && (
              <p className="fade-in flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                <span className="thinking-dots inline-flex"><span /><span /><span /></span>
                {progressMsg}
              </p>
            )}
            {error && (
              <p className="rise-soft rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>

          {/* Asterism divider */}
          <div className="asterism">
            <span aria-hidden>※&nbsp;&nbsp;§&nbsp;&nbsp;※</span>
          </div>

          {/* Three principles — roman numerals + ornaments */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Principle
              numeral="I"
              title="Grounded"
              body="Answers come from your document, not the model's training data."
              icon={<IconGrounded />}
            />
            <Principle
              numeral="II"
              title="Cited"
              body="Every answer references the page or row it relied on."
              icon={<IconCited />}
            />
            <Principle
              numeral="III"
              title="Honest"
              body="If the document doesn't cover it, the model says so. Plainly."
              icon={<IconHonest />}
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
      className={`group card-paper card-paper-lift relative flex w-full flex-col items-center justify-center gap-5 overflow-hidden px-8 py-16 text-center transition-all duration-300 ${
        dragOver
          ? "!border-[var(--accent)] !bg-[var(--accent-soft)]"
          : "hover:!border-[var(--accent)]"
      } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
    >
      {/* Border-dashed inner outline that pulses on dragover */}
      <span
        className={`pointer-events-none absolute inset-3 rounded-[10px] border border-dashed transition-colors duration-300 ${
          dragOver ? "border-[var(--accent)]" : "border-[var(--rule)]"
        }`}
        aria-hidden
      />

      <CornerTicks active={dragOver} />

      {/* Document glyph */}
      <DocumentMark active={dragOver || uploading} />

      <div className="flex flex-col items-center gap-1.5">
        <span className="font-display text-2xl text-[var(--ink)]">
          {uploading
            ? "Working …"
            : dragOver
              ? "Drop to upload"
              : "Drop a document"}
        </span>
        <span className="text-sm text-[var(--ink-faint)]">
          or{" "}
          <span className="underline decoration-[var(--ink-faint)] decoration-dotted underline-offset-4 transition-colors group-hover:text-[var(--accent)] group-hover:decoration-[var(--accent)]">
            click to browse files
          </span>
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
        <span className="ml-1">· max 25 MB</span>
      </div>
    </button>
  );
}

function CornerTicks({ active }: { active: boolean }) {
  const cls = `absolute h-3 w-3 transition-colors duration-300 ${
    active ? "border-[var(--accent)]" : "border-[var(--ink-faint)]"
  }`;
  return (
    <>
      <span className={`${cls} left-3 top-3 border-l border-t`} />
      <span className={`${cls} right-3 top-3 border-r border-t`} />
      <span className={`${cls} bottom-3 left-3 border-b border-l`} />
      <span className={`${cls} bottom-3 right-3 border-b border-r`} />
    </>
  );
}

function DocumentMark({ active }: { active: boolean }) {
  return (
    <svg
      width="56"
      height="64"
      viewBox="0 0 56 64"
      fill="none"
      className={`transition-transform duration-500 ${active ? "scale-110 -rotate-3" : ""}`}
      aria-hidden
    >
      {/* Back document */}
      <rect
        x="6"
        y="2"
        width="36"
        height="46"
        rx="2.5"
        fill="var(--paper-card)"
        className="stroke-[var(--ink-faint)] transition-colors"
        strokeWidth="1.25"
      />
      {/* Front document */}
      <g className="transition-transform duration-500" style={{ transform: active ? "translate(2px, 2px)" : undefined }}>
        <rect
          x="14"
          y="14"
          width="36"
          height="48"
          rx="2.5"
          fill="var(--paper-card)"
          className="stroke-[var(--ink)]"
          strokeWidth="1.25"
        />
        {/* Folded corner detail */}
        <path
          d="M44 14 L50 20 L44 20 Z"
          fill="var(--paper-deep)"
          className="stroke-[var(--ink)]"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        {/* Lines */}
        <line x1="20" y1="28" x2="44" y2="28" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
        <line x1="20" y1="35" x2="44" y2="35" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
        <line x1="20" y1="42" x2="36" y2="42" className="stroke-[var(--ink-faint)]" strokeWidth="1" />
        {/* Accent dot */}
        <circle cx="42" cy="54" r="3.5" fill="var(--accent)" />
      </g>
    </svg>
  );
}

function Principle({
  numeral,
  title,
  body,
  icon,
}: {
  numeral: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-paper card-paper-lift flex flex-col gap-3 p-6">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          {icon}
        </div>
        <span className="font-display text-sm italic text-[var(--ink-faint)]">{numeral}</span>
      </div>
      <h3 className="font-display text-lg text-[var(--ink)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{body}</p>
    </div>
  );
}

function IconGrounded() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5l5 2.25v4.5c0 3-2.25 5.25-5 6.25-2.75-1-5-3.25-5-6.25v-4.5L8 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCited() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 3h7l3 3v7H3V3z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M10 3v3h3" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M5.5 9h5M5.5 11h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconHonest() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 4.5v4M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
