import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Check if we are running in PostgreSQL mode
const isPg = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: any = null;

const dbPath = path.resolve(__dirname, '../../database.sqlite');

if (isPg) {
  console.log('Connecting to Cloud PostgreSQL Database...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
} else {
  // Only load sqlite3 when actually needed (prevents crash on cloud where native build fails)
  try {
    const sqlite3 = require('sqlite3').verbose();
    console.log('Connecting to Local SQLite Database...');
    sqliteDb = new sqlite3.Database(dbPath, (err: any) => {
      if (err) {
        console.error('Error connecting to SQLite:', err.message);
      } else {
        console.log('Connected to the SQLite database.');
      }
    });
  } catch (err) {
    console.error('[DB] sqlite3 module not available. Set DATABASE_URL for PostgreSQL.');
    process.exit(1);
  }
}

// Convert SQLite '?' parameters to Postgres '$1, $2' parameters
const convertSql = (sql: string): string => {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

export const query = async (sql: string, params: any[] = []): Promise<any[]> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    const result = await pgPool.query(converted, params);
    return result.rows;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.all(converted, params, (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  return [];
};

export const execute = async (sql: string, params: any[] = []): Promise<any> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    // For INSERT statements, add RETURNING id to get the inserted row's ID
    let pgSql = converted;
    if (/^\s*INSERT/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }
    const result = await pgPool.query(pgSql, params);
    return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.run(converted, params, function (this: any, err: any) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  const converted = convertSql(sql);
  if (isPg && pgPool) {
    const result = await pgPool.query(converted, params);
    return result.rows[0] || null;
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.get(converted, params, (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
  return null;
};

// Initialize schema (works for both SQLite & PostgreSQL)
export const initializeDatabase = async () => {
  try {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../src/schema.sql');
    }
    let schema = fs.readFileSync(schemaPath, 'utf-8');
    
    if (isPg && pgPool) {
      // Adapt SQLite syntax to PostgreSQL
      schema = schema
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/DATETIME/g, 'TIMESTAMP')
        .replace(/CHECK\(type IN \('income', 'expense', 'savings'\)\)/g, '')
        .replace(/CHECK\(status IN \('pending', 'paid'\)\)/g, '')
        .replace(/CHECK\(status IN \('active', 'completed'\)\)/g, '')
        .replace(/CHECK\(type IN \('borrowed', 'lent'\)\)/g, '')
        .replace(/CHECK\(frequency IN \('daily', 'weekly', 'monthly', 'yearly'\)\)/g, '')
        .replace(/CHECK\(investment_type IN \([\s\S]*?\)\)/g, '')
        .replace(/INSERT OR IGNORE/g, 'INSERT');
      
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await pgPool.query(stmt);
        } catch (err: any) {
          // Ignore "already exists" and duplicate key errors (idempotent schema init)
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.warn('[PG Schema]', err.message.slice(0, 120));
          }
        }
      }
      console.log('PostgreSQL database schema initialized.');
    } else if (sqliteDb) {
      return new Promise<void>((resolve, reject) => {
        sqliteDb.exec(schema, (err: any) => {
          if (err) reject(err);
          else {
            console.log('SQLite database schema initialized.');
            resolve();
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to initialize database schema', error);
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (isPg && pgPool) {
    await pgPool.end();
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb.close((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export const reopenDatabase = async (): Promise<void> => {
  if (isPg) return;
  try {
    const sqlite3 = require('sqlite3').verbose();
    return new Promise((resolve) => {
      sqliteDb = new sqlite3.Database(dbPath, (err: any) => {
        if (err) console.error('Error reopening SQLite:', err.message);
        resolve();
      });
    });
  } catch (_) {}
};
