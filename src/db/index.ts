import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });

const TRANSIENT_PG_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '40001',
  '08000',
  '08003',
  '08006',
]);

function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code && TRANSIENT_PG_CODES.has(String(e.code))) return true;
  const msg = String(e.message || '');
  return /Connection terminated|ECONNRESET|ETIMEDOUT|timeout exceeded/i.test(msg);
}

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts || !isTransientDbError(err)) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 150);
      const delay = 500 * attempt + jitter;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
