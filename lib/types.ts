export interface UploadResponse {
  sessionId: string;
  filename: string;
  pages: number;
  chunkCount: number;
}

export interface RetrievedChunk {
  content: string;
  page: number;
  score: number;
}

export interface MessageMetadata {
  sources?: RetrievedChunk[];
}
