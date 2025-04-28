import fs from 'fs/promises';
import path from 'path';
import { DocumentConfig, DocumentContent, DocumentProcessor, SearchResult } from './types';

export class TextDocumentProcessor implements DocumentProcessor {
  private config: DocumentConfig;

  constructor(config: DocumentConfig) {
    this.config = config;
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
      console.error('Erro ao ler todos os documentos:', error);
      return []; // Retorna array vazio em caso de erro
    }
  }

  async search(query: string): Promise<SearchResult> {
    console.warn(`Método search chamado com query: "${query}". Implementação pendente.`);
    // TODO: Implementar lógica de busca real nos documentos
    // Por enquanto, retorna sucesso com dados vazios
    return {
      success: true,
      data: [], 
    };
  }
}

export function createDocumentProcessor(config: DocumentConfig): DocumentProcessor {
  return new TextDocumentProcessor(config);
} 