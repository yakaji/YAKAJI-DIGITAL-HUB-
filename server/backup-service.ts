import crypto from 'node:crypto';
import { pool, withDbRetry, withPoolClient } from '../src/db/index.ts';

export type BackupType = 'daily_auto' | 'manual' | 'pre_migration';

export type BackupMetadata = {
  id: string;
  backupType: BackupType;
  status: string;
  verified: boolean;
  checksumSha256: string;
  recordCount: number;
  tableCounts: Record<string, number>;
  retentionDays: number;
  createdAt: string;
};

type TableSnapshotMap = {
  users: Array<Record<string, unknown>>;
  profiles: Array<Record<string, unknown>>;
  email_accounts: Array<Record<string, unknown>>;
  password_resets: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  affiliates: Array<Record<string, unknown>>;
  wallet_accounts: Array<Record<string, unknown>>;
  wallet_transactions: Array<Record<string, unknown>>;
  products: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  marketplace_records: Array<Record<string, unknown>>;
};

const SNAPSHOT_TABLES: Array<keyof TableSnapshotMap> = [
  'users',
  'profiles',
  'email_accounts',
  'password_resets',
  'vendors',
  'affiliates',
  'wallet_accounts',
  'wallet_transactions',
  'products',
  'orders',
  'marketplace_records',
];

function canonicalSort(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalSort);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        out[key] = canonicalSort(v);
      }
    }
    return out;
  }
  return value;
}

function computeChecksum(snapshot: TableSnapshotMap): string {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalSort(snapshot))).digest('hex');
}

function redactSnapshot(snapshot: TableSnapshotMap): TableSnapshotMap {
  return {
    ...snapshot,
    users: (snapshot.users || []).map((u) => {
      const copy = { ...u };
      if ('password_hash' in copy) copy.password_hash = copy.password_hash ? '[REDACTED]' : null;
      if ('passwordHash' in copy) copy.passwordHash = copy.passwordHash ? '[REDACTED]' : null;
      return copy;
    }),
    password_resets: (snapshot.password_resets || []).map((r) => {
      const copy = { ...r };
      if ('code_hash' in copy) copy.code_hash = '[REDACTED]';
      if ('codeHash' in copy) copy.codeHash = '[REDACTED]';
      return copy;
    }),
  };
}

export async function enforceBackupRetention(): Promise<{ deletedCount: number }> {
  return withDbRetry(async () => {
    // Only delete expired daily_auto backups older than 30 days when at least 30 daily backups exist.
    // Never touch user/vendor/affiliate/order tables, and retain manual/pre_migration snapshots for 90 days.
    const dailyRes = await pool.query<{ id: string; created_at: string; retention_days: number }>(
      `SELECT id, created_at, retention_days FROM db_backups
       WHERE backup_type = 'daily_auto'
       ORDER BY created_at DESC`
    );
    const toDelete: string[] = [];
    const now = Date.now();
    if (dailyRes.rows.length > 30) {
      for (let i = 30; i < dailyRes.rows.length; i++) {
        const row = dailyRes.rows[i];
        const ageMs = now - Date.parse(row.created_at || '');
        const maxAgeMs = Math.max(30, Number(row.retention_days || 30)) * 24 * 60 * 60 * 1000;
        if (Number.isFinite(ageMs) && ageMs > maxAgeMs) {
          toDelete.push(row.id);
        }
      }
    }

    if (toDelete.length > 0) {
      await pool.query(`DELETE FROM db_backups WHERE id = ANY($1::text[])`, [toDelete]);
    }
    return { deletedCount: toDelete.length };
  });
}

export async function runDatabaseBackup(backupType: BackupType = 'manual'): Promise<BackupMetadata> {
  return withDbRetry(async () => {
    const snapshot = {} as TableSnapshotMap;
    const tableCounts: Record<string, number> = {};
    let recordCount = 0;

    await withPoolClient(async (client) => {
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        for (const table of SNAPSHOT_TABLES) {
          const res = await client.query<Record<string, unknown>>(
            `SELECT * FROM ${table} ORDER BY id ASC`
          );
          snapshot[table] = res.rows;
          tableCounts[table] = res.rows.length;
          recordCount += res.rows.length;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      }
    });

    const checksumSha256 = computeChecksum(snapshot);
    const createdAt = new Date().toISOString();
    const id = `bkp-${backupType}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const retentionDays = backupType === 'daily_auto' ? 30 : 90;

    await pool.query(
      `INSERT INTO db_backups (id, backup_type, status, verified, checksum_sha256, record_count, table_counts, snapshot, retention_days, created_at)
       VALUES ($1, $2, 'pending_verify', false, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
      [
        id,
        backupType,
        checksumSha256,
        recordCount,
        JSON.stringify(tableCounts),
        JSON.stringify(snapshot),
        retentionDays,
        createdAt,
      ]
    );

    const verifiedMeta = await verifyBackupIntegrity(id);
    await enforceBackupRetention().catch((err) => {
      console.warn('Backup retention cleanup skipped:', err);
    });
    return verifiedMeta;
  });
}

export async function verifyBackupIntegrity(backupId: string): Promise<BackupMetadata> {
  return withDbRetry(async () => {
    const res = await pool.query<{
      id: string;
      backup_type: BackupType;
      checksum_sha256: string;
      record_count: number;
      table_counts: Record<string, number>;
      snapshot: TableSnapshotMap;
      retention_days: number;
      created_at: string;
    }>(`SELECT * FROM db_backups WHERE id = $1`, [backupId]);

    const row = res.rows[0];
    if (!row) {
      throw new Error('Backup record not found.');
    }

    const recomputed = computeChecksum(row.snapshot);
    const valid = recomputed === row.checksum_sha256;
    const status = valid ? 'verified' : 'checksum_mismatch';

    await pool.query(
      `UPDATE db_backups SET verified = $1, status = $2 WHERE id = $3`,
      [valid, status, backupId]
    );

    return {
      id: row.id,
      backupType: row.backup_type,
      status,
      verified: valid,
      checksumSha256: row.checksum_sha256,
      recordCount: Number(row.record_count || 0),
      tableCounts: row.table_counts || {},
      retentionDays: Number(row.retention_days || 30),
      createdAt: row.created_at,
    };
  });
}

export async function listBackups(limit = 40): Promise<BackupMetadata[]> {
  return withDbRetry(async () => {
    const res = await pool.query<{
      id: string;
      backup_type: BackupType;
      status: string;
      verified: boolean;
      checksum_sha256: string;
      record_count: number;
      table_counts: Record<string, number>;
      retention_days: number;
      created_at: string;
    }>(
      `SELECT id, backup_type, status, verified, checksum_sha256, record_count, table_counts, retention_days, created_at
       FROM db_backups
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(100, limit))]
    );

    return res.rows.map((r) => ({
      id: r.id,
      backupType: r.backup_type,
      status: r.status,
      verified: Boolean(r.verified),
      checksumSha256: r.checksum_sha256,
      recordCount: Number(r.record_count || 0),
      tableCounts: r.table_counts || {},
      retentionDays: Number(r.retention_days || 30),
      createdAt: r.created_at,
    }));
  });
}

export async function getRedactedBackupDownload(backupId: string) {
  return withDbRetry(async () => {
    const res = await pool.query<{
      id: string;
      backup_type: BackupType;
      status: string;
      verified: boolean;
      checksum_sha256: string;
      record_count: number;
      table_counts: Record<string, number>;
      snapshot: TableSnapshotMap;
      retention_days: number;
      created_at: string;
    }>(`SELECT * FROM db_backups WHERE id = $1`, [backupId]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      backupType: row.backup_type,
      status: row.status,
      verified: Boolean(row.verified),
      checksumSha256: row.checksum_sha256,
      recordCount: Number(row.record_count || 0),
      tableCounts: row.table_counts || {},
      retentionDays: Number(row.retention_days || 30),
      createdAt: row.created_at,
      snapshot: redactSnapshot(row.snapshot),
    };
  });
}

// Non-destructive safe recovery: inserts missing rows from a verified backup using ON CONFLICT DO NOTHING,
// protecting existing live user, vendor, affiliate, wallet, and order records from accidental overwrite.
export async function restoreFromBackupSafe(backupId: string): Promise<{
  restoredCounts: Record<string, number>;
  totalRestored: number;
}> {
  const verified = await verifyBackupIntegrity(backupId);
  if (!verified.verified) {
    throw new Error('Backup integrity check failed. Restore aborted to protect database consistency.');
  }

  return withDbRetry(async () => {
    const res = await pool.query<{ snapshot: TableSnapshotMap }>(
      `SELECT snapshot FROM db_backups WHERE id = $1`,
      [backupId]
    );
    const snapshot = res.rows[0]?.snapshot;
    if (!snapshot) throw new Error('Backup snapshot not found.');

    const restoredCounts: Record<string, number> = {};
    let totalRestored = 0;

    await withPoolClient(async (client) => {
      try {
        await client.query('BEGIN');

        for (const table of SNAPSHOT_TABLES) {
          const rows = Array.isArray(snapshot[table]) ? snapshot[table] : [];
          let inserted = 0;
          for (const row of rows) {
            const cols = Object.keys(row);
            if (cols.length === 0) continue;
            const colSql = cols.map((c) => `"${c.replace(/"/g, '')}"`).join(', ');
            const valPlaceholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
            const values = cols.map((c) => {
              const val = row[c];
              if (val !== null && typeof val === 'object') {
                return JSON.stringify(val);
              }
              return val;
            });
            const r = await client.query(
              `INSERT INTO ${table} (${colSql}) VALUES (${valPlaceholders}) ON CONFLICT DO NOTHING`,
              values
            );
            if ((r.rowCount || 0) > 0) inserted += 1;
          }
          restoredCounts[table] = inserted;
          totalRestored += inserted;
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      }
    });

    return { restoredCounts, totalRestored };
  });
}

let backupCheckInFlight: Promise<void> | null = null;

export async function ensureDailyBackupFresh(): Promise<void> {
  if (backupCheckInFlight) return backupCheckInFlight;
  backupCheckInFlight = (async () => {
    try {
      const latest = await pool.query<{ created_at: string }>(
        `SELECT created_at FROM db_backups WHERE verified = true ORDER BY created_at DESC LIMIT 1`
      );
      const lastIso = latest.rows[0]?.created_at;
      const lastMs = lastIso ? Date.parse(lastIso) : 0;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      if (!lastMs || Date.now() - lastMs >= twentyFourHoursMs) {
        await runDatabaseBackup('daily_auto');
      }
    } catch (err) {
      console.warn('Daily automatic backup check deferred:', err);
    } finally {
      backupCheckInFlight = null;
    }
  })();
  return backupCheckInFlight;
}
