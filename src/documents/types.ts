export interface DocumentConfig {
  path: string;
}

export interface DocumentContent {
  filename: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  success: boolean;
  data: DocumentContent[];
  error?: string;
}

export interface DocumentProcessor {
  readDocument: (filename: string) => Promise<DocumentContent>;
  readAllDocuments: () => Promise<DocumentContent[]>;
  search: (query: string) => Promise<SearchResult>;
  getDocumentsPath: () => string;
} 