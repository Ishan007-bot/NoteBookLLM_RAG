"use client";

import { useState } from "react";
import { UploadView } from "@/components/upload-view";
import { ChatView } from "@/components/chat-view";
import type { UploadResponse } from "@/lib/types";

export default function Home() {
  const [meta, setMeta] = useState<UploadResponse | null>(null);

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-[--color-border] px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold">NotebookRAG</span>
        <span className="ml-2 text-xs text-[--color-muted-foreground]">
          chat with your PDFs
        </span>
      </div>
      {meta ? (
        <ChatView meta={meta} onReset={() => setMeta(null)} />
      ) : (
        <UploadView onUploaded={setMeta} />
      )}
    </main>
  );
}
