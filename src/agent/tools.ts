import { DatabaseConnection } from '../database/types.js';
import { DocumentProcessor } from '../documents/types.js';
import { CommandExecutor } from '../external/types.js';
import { StructuredTool, DynamicTool } from "@langchain/core/tools";
import { z } from 'zod';
import fs from "fs/promises";
import path from "path";


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

const databaseSchema = z.object({
  action: z.enum(["list_tables", "sql_query"]).describe("Action: 'list_tables' ou 'sql_query'."),
  fileName: z.string().describe("Nome do arquivo .db (ex: music.db)."),
  query: z.string().optional().describe("Query SQL (necessária para action='sql_query')."),
});

export class DatabaseTool extends StructuredTool<typeof databaseSchema> {
  name = "query_database";
  description = "Lista tabelas ou executa queries SQL em bancos SQLite. Use 'list_tables' para ver tabelas, 'sql_query' para executar SELECT.";
  schema = databaseSchema;

  constructor(private executor: DatabaseConnection) {
    super();
  }

  protected async _call({ action, fileName, query }: z.infer<typeof databaseSchema>): Promise<string> {
    try {
      if (!fileName) {
        return `Error: Database filename is required. Please specify the .db file to query.`;
      }
      
      if (action === "list_tables") {
          let listResult: any;
          if (typeof (this.executor as any).listTables === 'function') {
              listResult = await (this.executor as any).listTables(fileName);
          } else {
              const listSql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
              listResult = await this.executor.query(fileName, listSql);
              
              if (listResult.success && Array.isArray(listResult.data)) {
                  listResult.tables = listResult.data.map((row: any) => row.name);
                  listResult.success = true;
              } else if (listResult.success) {
                  listResult.success = false;
                  listResult.error = "Unexpected format for table list query result (expected array in .data).";
              }
          }

          if (!listResult.success) {
              return `Error listing tables in ${fileName}: ${listResult.error || 'Unknown error'}`;
          }
          
          const tablesArray = listResult.tables || listResult.data;
          
          if (!Array.isArray(tablesArray)) {
              console.error("[DatabaseTool] list_tables result missing or not an array:", listResult);
              return `Error listing tables in ${fileName}: Could not retrieve table list format.`;
          }
          
          if (tablesArray.length === 0) {
              return `No tables found in ${fileName}.`;
          }

          return `Tables in ${fileName}: ${tablesArray.join(", ")}`;

      } else if (action === "sql_query") {
          if (!query) return "Error: SQL query required for 'sql_query' action.";
          
          const tableMatch = query.match(/FROM\s+["'`]?([a-zA-Z0-9_]+)["'`]?/i);
          
          if (tableMatch && tableMatch[1]) {
              const requestedTable = tableMatch[1].toLowerCase();
              
              const listSql = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;";
              const listResult = await this.executor.query(fileName, listSql);
              
              if (listResult.success && Array.isArray(listResult.data)) {
                  const tables = listResult.data.map((row: any) => row.name.toLowerCase());
                  
                  if (!tables.includes(requestedTable)) {
                      const similarTables = tables.filter(table => {
                          if (requestedTable.endsWith('s') && table === requestedTable.slice(0, -1)) {
                              return true;
                          }
                          if (!requestedTable.endsWith('s') && table === requestedTable + 's') {
                              return true;
                          }
                          
                          const distance = this.levenshteinDistance(requestedTable, table);
                          return distance <= 2;
                      });
                      
                      if (similarTables.length > 0) {
                          const closestTable = similarTables[0];
                          const correctedQuery = query.replace(
                              new RegExp(`FROM\\s+["'\`]?${tableMatch[1]}["'\`]?`, 'i'),
                              `FROM ${closestTable}`
                          );
                          
                          const queryResult: any = await this.executor.query(fileName, correctedQuery);
                          
                          if (!queryResult.success) {
                              return `Error running query with suggested table "${closestTable}": ${queryResult.error || 'Unknown error'}`;
                          }
                          
                          const resultData = queryResult.result ?? queryResult.data;
                          const resultString = resultData !== undefined ? JSON.stringify(resultData) : "[No data returned]";
                          const maxLength = 2000;
                          const truncatedResult = resultString.length > maxLength ? resultString.substring(0, maxLength) + "... (truncated)" : resultString;
                          
                          return `Nota: Tabela "${tableMatch[1]}" não encontrada, mas encontrei resultados em "${closestTable}".\n\nQuery Result: ${truncatedResult}`;
                      }
                  }
              }
          }
          
          const queryResult: any = await this.executor.query(fileName, query);
          if (!queryResult.success) return `Error running query: ${queryResult.error || 'Unknown error'}`;
          
          const resultData = queryResult.result ?? queryResult.data;
          const resultString = resultData !== undefined ? JSON.stringify(resultData) : "[No data returned]";
          const maxLength = 2000;
          const truncatedResult = resultString.length > maxLength ? resultString.substring(0, maxLength) + "... (truncated)" : resultString;
          
          return `Query Result: ${truncatedResult}`;
      } else {
          return "Error: Invalid action specified for DatabaseTool.";
      }
    } catch (e: any) {
        console.error(`[DatabaseTool Error] ${e.message}`);
        return `Internal error in DatabaseTool: ${e.message}`;
    }
  }
  
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, 
            matrix[i][j - 1] + 1,    
            matrix[i - 1][j] + 1   
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }
}

const searchContentSchema = z.object({
    input: z.string().describe("Termo ou frase para buscar nos documentos."),
});

export class SearchContentTool extends StructuredTool<typeof searchContentSchema> {
    name = "search_content";
    description = "Busca por texto dentro de todos os documentos disponíveis.";
    schema = searchContentSchema;

    constructor(private processor: DocumentProcessor) {
        super();
    }

    protected async _call({ input }: z.infer<typeof searchContentSchema>): Promise<string> {
        try {
            const allDocuments = await this.processor.readAllDocuments();
            if (!allDocuments || allDocuments.length === 0) {
                return `No documents found in the documents directory. Please check if there are any .txt files available.`;
            }
            
            const searchResult = await this.processor.search(input);
                
            if (!searchResult.success) {
                console.error(`[SearchContentTool] Erro na busca:`, searchResult.error);
                return `Error searching for "${input}": ${searchResult.error || 'Unknown error'}`;
            }
            
            if (!searchResult.data || searchResult.data.length === 0) {
                const keywords = input.toLowerCase().split(/\s+/).filter(word => word.length > 3);
                
                const potentialMatches = allDocuments.filter(doc => {
                    const content = doc.content.toLowerCase();
                    const filename = doc.filename.toLowerCase();
                    
                    return keywords.some(keyword => 
                        filename.includes(keyword) || 
                        content.includes(keyword)
                    );
                });
                
                if (potentialMatches.length > 0) {
                    let response = `No exact matches found for "${input}", but found ${potentialMatches.length} potentially relevant documents:\n`;
                    
                    potentialMatches.forEach(doc => {
                        response += `\n- ${doc.filename}`;
                        
                        const preview = doc.content.split('\n').slice(0, 3).join('\n');
                        response += `\n  Preview: ${preview.substring(0, 150)}...\n`;
                    });
                    
                    return response;
                }
                
                return `No matches found for "${input}". Available documents: ${allDocuments.map(doc => doc.filename).join(', ')}`;
            }
            
            let response = `Found matches for "${input}" in the following documents:\n`;
            
            searchResult.data.forEach(doc => {
                const fileName = doc.filename;
                response += `\n- ${fileName}`;
                
                const content = doc.content;
                const lowerCaseInput = input.toLowerCase();
                const lowerCaseContent = content.toLowerCase();
                
                const matchPosition = lowerCaseContent.indexOf(lowerCaseInput);
                
                if (matchPosition !== -1) {
                    const contextStart = Math.max(0, matchPosition - 100);
                    const contextEnd = Math.min(content.length, matchPosition + input.length + 100);
                    const matchContext = content.substring(contextStart, contextEnd);
                    
                    const prefix = contextStart > 0 ? '...' : '';
                    const suffix = contextEnd < content.length ? '...' : '';
                    
                    response += `\n  Context: ${prefix}${matchContext}${suffix}\n`;
                }
            });
            
            return response;
        } catch(e: any) {
            return `Internal error in SearchContentTool: ${e.message}`;
        }
    }
}

const readDocumentSchema = z.object({
    input: z.string().describe("Nome exato do arquivo .txt para ler."),
});

export class ReadDocumentTool extends StructuredTool<typeof readDocumentSchema> {
    name = "read_document";
    description = "Lê o conteúdo completo de um arquivo de documento específico.";
    schema = readDocumentSchema;

    constructor(private processor: DocumentProcessor) {
        super();
    }

    protected async _call({ input }: z.infer<typeof readDocumentSchema>): Promise<string> {
      try {
         const readResult: any = await this.processor.readDocument(input.trim()); 
         if (!readResult.success || typeof readResult.content !== 'string') { 
              return `Error reading ${input}: ${readResult.error || 'Could not read file or content invalid'}`;
         }
         const maxLength = 2000; 
         const truncatedContent = readResult.content.length > maxLength ? readResult.content.substring(0, maxLength) + "... (truncated)" : readResult.content;
         return `Content of ${input}:
${truncatedContent}`;
      } catch (e: any) {
          console.error(`[ReadDocumentTool Error] ${e.message}`);
          return `Internal error in ReadDocumentTool: ${e.message}`;
      }
    }
}

const commandSchema = z.object({
    command: z.string().describe('O comando bash para executar. Exemplo: curl -sL \"URL\" | cat'),
});

export class CommandTool extends StructuredTool<typeof commandSchema> {
  name = "execute_command";
  description = "Executa comandos bash permitidos. Pode ser usado para interagir com o sistema ou buscar dados externos específicos via 'curl' (requer aprovação do usuário). Processa a saída para retornar informações relevantes.";
  schema = commandSchema;

  constructor(private executor: CommandExecutor) {
    super();
  }

  protected async _call({ command }: z.infer<typeof commandSchema>): Promise<string> {
    try {
     if (command.includes('`') || command.includes('$(')) {
          return "Error: Command contains potentially unsafe characters.";
      }
      const result: any = await this.executor.execute(command);
      if (!result.success) {
          return `Command execution failed: ${result.error || 'Unknown error'}`;
      }
      const maxLength = 2000; 
      const output = result.output || "Command executed successfully (no output).";
      const truncatedOutput = output.length > maxLength ? output.substring(0, maxLength) + "... (truncated)" : output;
      return truncatedOutput;
    } catch (e: any) {
        console.error(`[CommandTool Error] ${e.message}`);
        return `Internal error in CommandTool: ${e.message}`;
    }
  }
}

export class ListFilesTool extends DynamicTool {
    private sqliteDir: string;
    private documentsDir: string;

    constructor(sqliteDirPath: string, documentsDirPath: string) {
        super({
            name: "list_files",
            description: "Lista os arquivos de banco de dados (.db) e documentos (.txt) disponíveis.",
            func: async () => {
                let response = '';
                try {
                    if (this.sqliteDir) {
                        const dbFiles = (await fs.readdir(this.sqliteDir)).filter(f => f.endsWith('.db'));
                        if (dbFiles.length > 0) {
                            response += `Available database (.db) files: ${dbFiles.join(', ')}\n`;
                            
                            for (const dbFile of dbFiles) {
                                try {
                                    const connection = (this.sqliteDir as any).connection || { query: () => ({ success: false, error: 'Connection not available' }) };
                                    const tables = await connection.query(dbFile, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
                                    if (tables.success && tables.data && tables.data.length > 0) {
                                        const tableNames = tables.data.map((row: any) => row.name).join(', ');
                                        response += `  - ${dbFile} contains tables: ${tableNames}\n`;
                                    }
                                } catch (err) {
                                    // Silenciosamente ignora erros ao tentar obter mais informações
                                }
                            }
                        } else {
                            response += 'No database (.db) files found.\n';
                        }
                    }
                } catch (e: any) {
                    console.error('Error listing SQLite files:', e);
                    response += 'Error listing database files.\n';
                }

                try {
                    if (this.documentsDir) {
                        const txtFiles = (await fs.readdir(this.documentsDir)).filter(f => f.endsWith('.txt'));
                        if (txtFiles.length > 0) {
                            response += `Available document (.txt) files: ${txtFiles.join(', ')}\n`;
                            
                            for (const txtFile of txtFiles) {
                                try {
                                    const filePath = path.join(this.documentsDir, txtFile);
                                    const stats = await fs.stat(filePath);
                                    const sizeKb = Math.round(stats.size / 1024);
                                    
                                    const content = await fs.readFile(filePath, 'utf8');
                                    const firstLine = content.split('\n')[0].trim();
                                    
                                    response += `  - ${txtFile} (${sizeKb} KB): "${firstLine.substring(0, 60)}${firstLine.length > 60 ? '...' : ''}"\n`;
                                } catch (err) {
                                    // Silenciosamente ignora erros ao tentar obter mais informações
                                }
                            }
                        } else {
                            response += 'No document (.txt) files found.\n';
                        }
                    }
                } catch (e: any) {
                    console.error('Error listing document files:', e);
                    response += 'Error listing document files.\n';
                }
                
                return response.trim() || 'No .db or .txt files found.';
            },
        });
        this.sqliteDir = sqliteDirPath;
        this.documentsDir = documentsDirPath;
         if (!this.sqliteDir || !this.documentsDir) {
             console.warn("ListFilesTool: One or both directory paths were not provided during instantiation.");
        }
    }
} 