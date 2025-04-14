import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path'

dotenv.config();

// Ferramenta que permite ao agente fazer queries no banco de dados SQLite

const DATABASE_PATH = path.resolve(process.env.DATABASE_PATH);

// Protegendo contra sql injection
const isSafeQuery = (query) => {
  const forbidden = ["drop", "delete", "update", "insert", "alter"];
  const lowered = query.toLowerCase();

  return !forbidden.some(cmd => lowered.includes(cmd));
};

export async function querySQLite(query) {
  if (!isSafeQuery(query)) {
    return "Query blocked for security. Only SELECT queries are allowed.";
  }

  try {
    const db = await open({
      filename: DATABASE_PATH,
      driver: sqlite3.Database,
    });

    const result = await db.all(query);
    await db.close();
    return JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('error querying database:', error.message);
    throw error;
  }
}
