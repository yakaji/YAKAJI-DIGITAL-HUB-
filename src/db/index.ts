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
      idleTimeoutMillis: 15000,
      allowExitOnIdle: true,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    global._postgresPool.on('error', (err) => {
      handleIdlePoolError(err);
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
  '08001',
  '08003',
  '08004',
  '08006',
]);

export function formatDbErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || 'Unknown database error';
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message || 'Unknown database error');
  }
  return String(err || 'Unknown database error');
}

export function isTransientDbError(err: unknown, depth = 0): boolean {
  if (!err || typeof err !== 'object' || depth > 4) return false;
  const e = err as { code?: unknown; message?: unknown; cause?: unknown };
  if (e.code && TRANSIENT_PG_CODES.has(String(e.code))) return true;
  const msg = String(e.message || '');
  if (
    /Connection terminated|Connection ended unexpectedly|Client has encountered a connection error|not queryable|terminating connection due to administrator command|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|socket hang up|timeout exceeded/i.test(
      msg
    )
  ) {
    return true;
  }
  if (e.cause && e.cause !== err) {
    return isTransientDbError(e.cause, depth + 1);
  }
  return false;
}

export function handleIdlePoolError(
  err: unknown,
  warnLogger: (message: string) => void = (message) => console.warn(message)
): 'ignored_transient' | 'warned' {
  if (isTransientDbError(err)) {
    // Cloud SQL scale-to-zero or proxy idle timeouts drop idle sockets; pg-pool evicts them automatically.
    return 'ignored_transient';
  }
  warnLogger(`SQL pool idle client warning: ${formatDbErrorMessage(err)}`);
  return 'warned';
}

export async function withPoolClient<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  let clientError: Error | null = null;
  const onClientError = (err: Error) => {
    clientError = err;
  };
  client.on('error', onClientError);
  let opFailed = false;
  try {
    const result = await fn(client);
    if (clientError) {
      opFailed = true;
      throw clientError;
    }
    return result;
  } catch (err) {
    opFailed = true;
    throw err;
  } finally {
    client.removeListener('error', onClientError);
    client.release(opFailed || Boolean(clientError));
  }
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
