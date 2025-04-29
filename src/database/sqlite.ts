import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseConnection, DatabaseConfig, QueryResult } from './types.js';

export class SQLiteConnection implements DatabaseConnection {
  private baseDir: string;

  constructor(config: DatabaseConfig) {
    if (!fs.existsSync(config.path) || !fs.lstatSync(config.path).isDirectory()) {
      throw new Error(`Base database directory not found or invalid: ${config.path}`);
    }
    this.baseDir = config.path;
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  async query(dbFilename: string, sql: string, params: any[] = []): Promise<QueryResult> {
    const dbFilePath = path.join(this.baseDir, dbFilename);
    
    if (!dbFilename.endsWith('.db')) {
        return { success: false, error: `Invalid filename: ${dbFilename}. Must end with .db` };
    }
    if (!fs.existsSync(dbFilePath) || !fs.lstatSync(dbFilePath).isFile()) {
      return { success: false, error: `Database file not found: ${dbFilePath}` };
    }

    const db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening ${dbFilePath}: ${err.message}`);
        }
    });

    return new Promise((resolve) => {
      db.all(sql, params, (err, rows) => {
        db.close((closeErr) => {
          if (closeErr) {
            if (!err) {
              resolve({ success: false, error: `Error closing connection after successful query: ${closeErr.message}` });
              return;
            }
          }
          if (err) {
            resolve({ success: false, error: `Error in query [${dbFilename}]: ${err.message}` });
          } else {
            resolve({ success: true, data: rows });
          }
        });
      });
    });
  }
}

export async function createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  return new SQLiteConnection(config);
} 