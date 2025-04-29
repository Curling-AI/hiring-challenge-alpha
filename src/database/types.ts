export interface DatabaseConfig {
  path: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface DatabaseConnection {
  query: (dbFilename: string, sql: string, params?: any[]) => Promise<QueryResult>; 
  getBaseDir: () => string;
} 