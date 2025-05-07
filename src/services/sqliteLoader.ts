import * as fs from 'fs';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const dbDirectory = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../data/sqlite');

export async function getAllDatabases(): Promise<string[]> {
  try {
    const files = fs.readdirSync(dbDirectory);
    return files.filter(file => file.endsWith('.db'));
  } catch (error) {
    console.error("Error loading database files:", error);
    return [];
  }
}

export async function getTableInfo(dbName: string): Promise<{tableName: string, columns: string[]}[]> {
  const db = await openDatabase(dbName);
  if (!db) {
    return [];
  }
  
  try {
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    
    const tableInfo = [];
    for (const table of tables) {
      const columns = await db.all(`PRAGMA table_info(${table.name})`);
      tableInfo.push({
        tableName: table.name,
        columns: columns.map(col => col.name)
      });
    }
    
    return tableInfo;
  } catch (error) {
    console.error(`Error getting table info for ${dbName}:`, error);
    return [];
  } finally {
    await db.close();
  }
}

export async function buildDatabaseSchemas(): Promise<{[dbName: string]: {tableName: string, columns: string[]}[]}> {
  const databases = await getAllDatabases();
  const schemas: {[dbName: string]: {tableName: string, columns: string[]}[]} = {};
  
  for (const dbName of databases) {
    schemas[dbName] = await getTableInfo(dbName);
  }
  
  return schemas;
}

export async function openDatabase(dbName: string): Promise<Database | null> {
  try {
    const dbPath = path.join(dbDirectory, dbName);
    if (!fs.existsSync(dbPath)) {
      console.error(`Database file not found: ${dbPath}`);
      return null;
    }
    
    return await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error(`Error opening database ${dbName}:`, error);
    return null;
  }
}

export async function executeQuery(dbName: string, query: string): Promise<any> {
  const db = await openDatabase(dbName);
  if (!db) {
    throw new Error(`Could not open database: ${dbName}`);
  }
  
  try {
    if (!query.trim().toLowerCase().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed for security reasons');
    }
    
    return await db.all(query);
  } catch (error) {
    throw new Error(`Error executing query: ${error}`);
  } finally {
    await db.close();
  }
}