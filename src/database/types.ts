export interface DatabaseConfig {
  path: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  close: () => Promise<void>;
} 