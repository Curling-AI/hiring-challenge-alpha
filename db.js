import sqlite3 from 'sqlite3';
import { config } from 'dotenv';
import { readdirSync } from 'fs';

config();


export const fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  };
  
export const fetchFirst = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
        if (err) reject(err);
        resolve(row);
        });
    });
};

export async function getSqliteFilesWithTables() {
    const sqliteFiles = readdirSync(process.env.DATA_DIR+'/sqlite').filter(file => file.endsWith('.sqlite') || file.endsWith('.db'));
    const sqliteFilesWithTables = await Promise.all(sqliteFiles.map(async file => {
        const db = new sqlite3.Database(`${process.env.DATA_DIR}/sqlite/${file}`, sqlite3.OPEN_READONLY);
        const tables = await fetchAll(db, "SELECT name FROM sqlite_master WHERE type='table'").then(async rows => {
            return await Promise.all(rows.map(async row => {
                const tableName = row.name;
                const columns = await fetchAll(db, `PRAGMA table_info(${tableName})`).then(rows => {
                    return rows.map(row => row.name);
                }
                );
                return { tableName, columns };
            }));
        });
        db.close();

        return { file, tables };
    }));
    return sqliteFilesWithTables;
};
