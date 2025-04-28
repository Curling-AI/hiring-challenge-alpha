import { DatabaseConnection } from '../database/types.js';
import { DocumentProcessor } from '../documents/types.js';
import { CommandExecutor } from '../external/types.js';
import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';

export interface AgentConfig {
  apiKey?: string;
  modelName?: string;
  temperature?: number;
}

export interface AgentContext {
  database: DatabaseConnection;
  documents: DocumentProcessor;
  commands: CommandExecutor;
}

export interface AgentResponse {
  success: boolean;
  answer: string;
  sources: string[];
  error?: string;
}

export class DatabaseTool extends DynamicTool {
  constructor(private db: DatabaseConnection) {
    super({
      name: 'query_database',
      description: 'Executa uma consulta SQL no banco de dados SQLite',
      func: async (input: string) => {
        const result = await this.db.query(input);
        if (!result.success) {
          return `Erro na consulta: ${result.error}`;
        }
        return JSON.stringify(result.data);
      },
    });
  }
}

export class DocumentTool extends DynamicTool {
  constructor(private processor: DocumentProcessor) {
    super({
      name: 'search_documents',
      description: 'Busca informações em documentos de texto',
      func: async (input: string) => {
        const result = await this.processor.search(input);
        if (!result.success) {
          return `Erro na busca: ${result.error}`;
        }
        return JSON.stringify(result.data);
      },
    });
  }
}

export class CommandTool extends DynamicTool {
  constructor(private executor: CommandExecutor) {
    super({
      name: 'execute_command',
      description: 'Executa um comando bash permitido',
      func: async (input: string) => {
        const result = await this.executor.execute(input);
        if (!result.success) {
          return `Erro na execução: ${result.error}`;
        }
        return result.output || '';
      },
    });
  }
} 