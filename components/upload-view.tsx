"use client";

import { useRef, useState } from "react";
import type { UploadResponse } from "@/lib/types";

interface UploadViewProps {
  onUploaded: (meta: UploadResponse) => void;
}

export function UploadView({ onUploaded }: UploadViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");

  const ACCEPTED_EXTENSIONS = ["pdf", "txt", "md", "csv", "docx"];

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`))) {
      setError(`Unsupported file type. Use: ${ACCEPTED_EXTENSIONS.join(", ")}.`);
      return;
    }
    setUploading(true);
    setProgressMsg("Uploading & indexing — this can take 10-60 seconds for large documents…");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
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
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Chat with your document
        </h1>
        <p className="mt-3 text-sm text-[--color-muted-foreground] sm:text-base">
          Upload a PDF, Word doc, text file, or CSV and ask questions about it. Answers are grounded in the document with page citations — no hallucinations.
        </p>

        <label
          htmlFor="pdf-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file && !uploading) handleFile(file);
          }}
          className={`mt-8 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
            dragOver
              ? "border-[--color-accent] bg-[--color-muted]"
              : "border-[--color-border] hover:bg-[--color-muted]"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          <svg
            className="h-10 w-10 text-[--color-muted-foreground]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 13.5V21M9 21l-3-3m3 3l3-3M3 16.5V7.125c0-1.036.84-1.875 1.875-1.875h6.198c.46 0 .904.171 1.247.476l3.527 3.135c.357.317.86.514 1.39.514h2.888c1.035 0 1.875.84 1.875 1.875V16.5"
            />
          </svg>
          <span className="mt-3 text-sm font-medium">
            {uploading ? "Processing…" : "Drop a file here, or click to choose"}
          </span>
          <span className="mt-1 text-xs text-[--color-muted-foreground]">
            PDF, DOCX, TXT, MD, CSV · max 25 MB
          </span>
          <input
            ref={inputRef}
            id="pdf-input"
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
        </label>

        {progressMsg && (
          <p className="mt-4 text-sm text-[--color-muted-foreground]">{progressMsg}</p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
