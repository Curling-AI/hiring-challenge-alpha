import fs from 'fs/promises';
import path from 'path';
import { DocumentConfig, DocumentContent, DocumentProcessor, SearchResult } from './types.js';

export class TextDocumentProcessor implements DocumentProcessor {
  private config: DocumentConfig;

  constructor(config: DocumentConfig) {
    this.config = config;
  }

  public getDocumentsPath(): string {
    return this.config.path;
  }

  async readDocument(filename: string): Promise<DocumentContent> {
    try {
      const filePath = path.join(this.config.path, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        filename,
        content,
        metadata: {
          lastModified: (await fs.stat(filePath)).mtime,
          size: (await fs.stat(filePath)).size,
        },
      };
    } catch (error) {
      throw new Error(`Error reading document ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async readAllDocuments(): Promise<DocumentContent[]> {
    try {
      const files = await fs.readdir(this.config.path);
      const txtFiles = files.filter(file => file.endsWith('.txt'));
      
      const results = await Promise.all(
        txtFiles.map(filename => this.readDocument(filename))
      );

      return results;
    } catch (error) {
      console.error('Error reading all documents:', error);
      return [];
    }
  }

  async search(query: string): Promise<SearchResult> {
    try {
      const allDocuments = await this.readAllDocuments();
      const lowerCaseQuery = query.toLowerCase();
      
      const matchingDocuments = allDocuments.filter(doc => 
        doc.content.toLowerCase().includes(lowerCaseQuery)
      );

      if (matchingDocuments.length > 0) {
        return {
          success: true,
          data: matchingDocuments, 
        };
      } else {
        return {
          success: true,
          data: [],
        };
      }
    } catch (error: any) {
      console.error('Error during content search in documents:', error);
      return {
        success: false,
        data: [],
        error: `Error searching content in documents: ${error.message}`,
      };
    }
  }
}

export function createDocumentProcessor(config: DocumentConfig): DocumentProcessor {
  return new TextDocumentProcessor(config);
} 