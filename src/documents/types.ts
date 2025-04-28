export interface DocumentConfig {
  path: string;
}

export interface DocumentContent {
  filename: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface DocumentProcessor {
  readDocument: (filename: string) => Promise<DocumentContent>;
  readAllDocuments: () => Promise<DocumentContent[]>;
} 