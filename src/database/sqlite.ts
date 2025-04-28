import sqlite3 from 'sqlite3';
import { DatabaseConnection, DatabaseConfig, QueryResult } from './types';

export class SQLiteConnection implements DatabaseConnection {
  private db: sqlite3.Database;

  constructor(config: DatabaseConfig) {
    this.db = new sqlite3.Database(config.path);
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          resolve({
            success: false,
            error: err.message,
          });
        } else {
          resolve({
            success: true,
            data: rows,
          });
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing connection:', err);
        }
        resolve();
      });
    });
  }
}

export async function createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  return new SQLiteConnection(config);
} 