import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// Check if we are running in PostgreSQL mode
const isPg = !!process.env.DATABASE_URL;

let pgPool: Pool | null = null;
let sqliteDb: sqlite3.Database | null = null;

const dbPath = path.resolve(__dirname, '../../database.sqlite');

if (isPg) {
  console.log('Connecting to Cloud PostgreSQL Database...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
  });
} else {
  console.log('Connecting to Local SQLite Database...');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to SQLite:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
    }
  });
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
      sqliteDb!.all(converted, params, (err, rows) => {
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
    const result = await pgPool.query(converted, params);
    return { lastID: (result as any).insertId || (result.rows[0]?.id) || null, changes: result.rowCount };
  } else if (sqliteDb) {
    return new Promise((resolve, reject) => {
      sqliteDb!.run(converted, params, function (err) {
        if (err) reject(err);
        else resolve(this);
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
      sqliteDb!.get(converted, params, (err, row) => {
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
    
    // For PostgreSQL, we adapt SQLite specifics dynamically
    if (isPg) {
      schema = schema
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        .replace(/CHECK\(type IN \('income', 'expense', 'savings'\)\)/g, '')
        .replace(/CHECK\(status IN \('pending', 'paid'\)\)/g, '')
        .replace(/CHECK\(status IN \('active', 'completed'\)\)/g, '')
        .replace(/CHECK\(type IN \('borrowed', 'lent'\)\)/g, '')
        .replace(/CHECK\(investment_type IN \([\s\S]*?\)\)/g, '')
        .replace(/INSERT OR IGNORE/g, 'INSERT');
      
      const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await pgPool!.query(stmt);
        } catch (err: any) {
          if (!err.message.includes('already exists') && !stmt.includes('INSERT')) {
            console.warn('PostgreSQL Schema execution warning:', err.message);
          }
        }
      }
      console.log('PostgreSQL database schema initialized.');
    } else if (sqliteDb) {
      return new Promise<void>((resolve, reject) => {
        sqliteDb!.exec(schema, (err) => {
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
      sqliteDb!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

export const reopenDatabase = async (): Promise<void> => {
  if (isPg) return; // No-op for Postgres
  return new Promise((resolve) => {
    sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error reopening SQLite database:', err.message);
      }
      resolve();
    });
  });
};
