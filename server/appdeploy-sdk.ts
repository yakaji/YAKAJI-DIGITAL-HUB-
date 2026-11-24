import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';

export type AuthUser = {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  isAdmin?: boolean;
};

export type RouteContext = {
  req: Request;
  res: Response;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  user?: AuthUser;
};

export type RouteResult = {
  statusCode?: number;
  headers?: Record<string, string>;
  body: unknown;
};

export type MiddlewareOrHandler = (
  ctx: RouteContext
) => Promise<RouteResult | void> | RouteResult | void;

export type RouteTable = Record<string, MiddlewareOrHandler[]>;

export function json(body: unknown, statusCode = 200): RouteResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body,
  };
}

export function error(message: string, statusCode = 400): RouteResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: { error: message, message },
  };
}

export function increment(delta: number) {
  return { __increment: delta } as unknown as number;
}

type IncrementSentinel = { __increment: number };
function isIncrement(v: unknown): v is IncrementSentinel {
  return typeof v === 'object' && v !== null && '__increment' in v;
}

type TxOp =
  | { kind: 'add'; table: string; records: Array<Record<string, unknown>> }
  | {
      kind: 'update';
      table: string;
      ops: Array<{ id: string; record: Record<string, unknown>; if?: Record<string, unknown> }>;
      patch: boolean;
    }
  | { kind: 'delete'; table: string; ids: string[] };

const DATA_DIR = path.resolve(process.cwd(), '.yakaji-data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_TEMP_FILE = path.join(DATA_DIR, 'db.json.tmp');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

const tables = new Map<string, Map<string, Record<string, unknown>>>();

function ensureDataDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

function loadTablesFromDisk() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw) as Record<string, Array<[string, Record<string, unknown>]>>;
    if (!parsed || typeof parsed !== 'object') return;
    for (const [tableName, entries] of Object.entries(parsed)) {
      if (!Array.isArray(entries)) continue;
      const map = new Map<string, Record<string, unknown>>();
      for (const pair of entries) {
        if (Array.isArray(pair) && typeof pair[0] === 'string' && pair[1] && typeof pair[1] === 'object') {
          map.set(pair[0], pair[1]);
        }
      }
      tables.set(tableName, map);
    }
  } catch (err) {
    console.warn('Could not load persisted marketplace database:', err);
  }
}

function saveTablesToDisk() {
  try {
    ensureDataDirs();
    const serialized: Record<string, Array<[string, Record<string, unknown>]>> = {};
    for (const [tableName, map] of tables.entries()) {
      serialized[tableName] = Array.from(map.entries());
    }
    fs.writeFileSync(DB_TEMP_FILE, JSON.stringify(serialized), 'utf-8');
    fs.renameSync(DB_TEMP_FILE, DB_FILE);
  } catch (err) {
    console.error('Failed to persist marketplace database:', err);
  }
}

function getTable(name: string): Map<string, Record<string, unknown>> {
  let table = tables.get(name);
  if (!table) {
    table = new Map();
    tables.set(name, table);
  }
  return table;
}

function clone<T>(val: T): T {
  return val === undefined ? val : structuredClone(val);
}

function matchesIf(
  existing: Record<string, unknown> | undefined,
  cond?: Record<string, unknown>
): boolean {
  if (!cond) return true;
  if (!existing) return false;
  return Object.entries(cond).every(([k, v]) => existing[k] === v);
}

function applyRecordUpdate(
  existing: Record<string, unknown>,
  patchRecord: Record<string, unknown>,
  patch: boolean
): Record<string, unknown> {
  const base: Record<string, unknown> = patch ? { ...existing } : { id: existing.id };
  for (const [k, v] of Object.entries(patchRecord)) {
    if (isIncrement(v)) {
      base[k] = Number(existing[k] || 0) + Number(v.__increment || 0);
    } else {
      base[k] = clone(v);
    }
  }
  return base;
}

function executeOp(op: TxOp, persist = true): boolean[] {
  const table = getTable(op.table);
  let results: boolean[];
  if (op.kind === 'add') {
    results = op.records.map((rec) => {
      const id = String(rec.id || '');
      if (!id || table.has(id)) return false;
      table.set(id, clone({ ...rec, id }));
      return true;
    });
  } else if (op.kind === 'update') {
    results = op.ops.map((item) => {
      const existing = table.get(item.id);
      if (!existing || !matchesIf(existing, item.if)) return false;
      table.set(item.id, applyRecordUpdate(existing, item.record, op.patch));
      return true;
    });
  } else {
    results = op.ids.map((id) => table.delete(id));
  }
  if (persist && results.some(Boolean)) {
    saveTablesToDisk();
  }
  return results;
}

type LazyTxPromise<T> = Promise<T> & { __txOp: TxOp };

function makeTxPromise(op: TxOp): LazyTxPromise<boolean[]> {
  let cached: Promise<boolean[]> | null = null;
  const run = () => {
    if (!cached) {
      cached = Promise.resolve().then(() => executeOp(op));
    }
    return cached;
  };
  const wrapper: Partial<LazyTxPromise<boolean[]>> = {
    __txOp: op,
    then(onFulfilled, onRejected) {
      return run().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return run().catch(onRejected);
    },
    finally(onFinally) {
      return run().finally(onFinally);
    },
  };
  return wrapper as LazyTxPromise<boolean[]>;
}

export const db = {
  async get<T extends Record<string, unknown>>(
    tableName: string,
    ids: string[],
    _opts?: { consistent?: boolean }
  ): Promise<Array<(T & { id: string }) | undefined>> {
    const table = getTable(tableName);
    return ids.map((id) => {
      const row = table.get(String(id));
      return row ? (clone(row) as T & { id: string }) : undefined;
    });
  },
  async list<T extends Record<string, unknown>>(
    tableName: string,
    opts?: { limit?: number; nextToken?: string }
  ): Promise<{ items: Array<T & { id: string }>; nextToken?: string }> {
    const table = getTable(tableName);
    const all = Array.from(table.values()).map((r) => clone(r) as T & { id: string });
    const limit = Math.max(1, Number(opts?.limit || 100));
    const offset = Math.max(0, Number(opts?.nextToken || 0));
    const items = all.slice(offset, offset + limit);
    const nextToken = offset + limit < all.length ? String(offset + limit) : undefined;
    return { items, ...(nextToken ? { nextToken } : {}) };
  },
  async delete(tableName: string, ids: string[]): Promise<boolean[]> {
    return executeOp({ kind: 'delete', table: tableName, ids });
  },
  tx: {
    add(tableName: string, records: Array<Record<string, unknown>>) {
      return makeTxPromise({ kind: 'add', table: tableName, records });
    },
    update(
      tableName: string,
      ops: Array<{ id: string; record: Record<string, unknown>; if?: Record<string, unknown> }>,
      opts?: { patch?: boolean }
    ) {
      return makeTxPromise({
        kind: 'update',
        table: tableName,
        ops,
        patch: opts?.patch !== false,
      });
    },
  },
  async transact(writes: Array<LazyTxPromise<boolean[]> | Promise<boolean[]>>): Promise<void> {
    const ops: TxOp[] = [];
    for (const w of writes) {
      if (w && typeof w === 'object' && '__txOp' in w) {
        ops.push(w.__txOp);
      } else {
        await w;
      }
    }
    // Validate all conditional updates and duplicate adds before mutating
    for (const op of ops) {
      const table = getTable(op.table);
      if (op.kind === 'add') {
        for (const rec of op.records) {
          const id = String(rec.id || '');
          if (!id || table.has(id)) {
            throw new Error(`Transaction conflict adding ${op.table}:${id}`);
          }
        }
      } else if (op.kind === 'update') {
        for (const item of op.ops) {
          const existing = table.get(item.id);
          if (!existing || !matchesIf(existing, item.if)) {
            throw new Error(`Transaction conflict updating ${op.table}:${item.id}`);
          }
        }
      }
    }
    let changed = false;
    for (const op of ops) {
      const results = executeOp(op, false);
      if (results.some(Boolean)) changed = true;
    }
    if (changed) saveTablesToDisk();
  },
};

// Disk-backed media storage served under /_storage/*
const mediaStore = new Map<string, { buffer: Buffer; contentType: string }>();

function safeMediaFilePath(relPath: string): string | null {
  const normalized = String(relPath || '').replace(/^\/+/, '').trim();
  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) return null;
  const resolved = path.resolve(MEDIA_DIR, normalized);
  if (!resolved.startsWith(MEDIA_DIR + path.sep)) return null;
  return resolved;
}

export const storage = {
  async write(
    items: Array<{ path: string; content: string; contentType: string }>
  ): Promise<boolean[]> {
    return items.map((item) => {
      try {
        const cleanBase64 = item.content.includes(',')
          ? item.content.split(',')[1] || ''
          : item.content;
        const buffer = Buffer.from(cleanBase64, 'base64');
        mediaStore.set(item.path, { buffer, contentType: item.contentType });
        const diskPath = safeMediaFilePath(item.path);
        if (diskPath) {
          fs.mkdirSync(path.dirname(diskPath), { recursive: true });
          fs.writeFileSync(diskPath, buffer);
          fs.writeFileSync(
            diskPath + '.meta.json',
            JSON.stringify({ contentType: item.contentType }),
            'utf-8'
          );
        }
        return true;
      } catch {
        return false;
      }
    });
  },
  async url(paths: string[]): Promise<Array<{ path: string; url: string }>> {
    return paths.map((p) => {
      if (/^https?:\/\//i.test(p)) {
        return { path: p, url: p };
      }
      return {
        path: p,
        url: '/_storage/' + p.split('/').map(encodeURIComponent).join('/'),
      };
    });
  },
};

export function getStoredMedia(relPath: string) {
  const cached = mediaStore.get(relPath);
  if (cached) return cached;
  const diskPath = safeMediaFilePath(relPath);
  if (!diskPath || !fs.existsSync(diskPath)) return undefined;
  try {
    const buffer = fs.readFileSync(diskPath);
    let contentType = 'application/octet-stream';
    const metaPath = diskPath + '.meta.json';
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { contentType?: string };
      if (meta?.contentType) contentType = meta.contentType;
    }
    const entry = { buffer, contentType };
    mediaStore.set(relPath, entry);
    return entry;
  } catch {
    return undefined;
  }
}

const KNOWN_SECRET_ENV_VARS = [
  'PAYSTACK_SECRET_KEY',
  'SENDGRID_API_KEY',
  'EMAIL_FROM',
  'GEMINI_API_KEY',
  'ADMIN_PASSWORD',
  'SESSION_SECRET',
];

export const secrets = {
  async listSecretNames(): Promise<string[]> {
    return KNOWN_SECRET_ENV_VARS.filter((k) => Boolean(process.env[k]?.trim()));
  },
  async readSecret(name: string): Promise<string> {
    return process.env[name]?.trim() || '';
  },
};

// WebSocket hub managed by server.ts
type WsBroadcaster = (connectionIds: string[], message: unknown) => void;
type UserBroadcaster = (userIds: string[], message: unknown) => number;
let wsBroadcaster: WsBroadcaster = () => {};
let userBroadcaster: UserBroadcaster = () => 0;

export function registerWsBroadcaster(
  sendToConnections: WsBroadcaster,
  sendToUsers: UserBroadcaster
) {
  wsBroadcaster = sendToConnections;
  userBroadcaster = sendToUsers;
}

export const ws = {
  async send(connectionIds: string[], payload: unknown): Promise<void> {
    wsBroadcaster(connectionIds, payload);
  },
};

export const notifications = {
  async send(opts: {
    userIds: string[];
    notification: { title: string; body: string; url?: string };
    data?: Record<string, unknown>;
  }): Promise<{ sent: number; failed: number }> {
    const sent = userBroadcaster(opts.userIds, {
      v: 1,
      type: 'notification',
      payload: { ...opts.notification, data: opts.data || {} },
    });
    return { sent, failed: 0 };
  },
};

export const ai = {
  async generate(opts: {
    system?: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
    thinkingMode?: string;
  }): Promise<{ text: string }> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      try {
        const contents = opts.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
              contents,
              generationConfig: {
                maxOutputTokens: opts.maxTokens ?? 420,
                temperature: opts.temperature ?? 0.25,
              },
            }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return { text };
        }
      } catch (err) {
        console.warn('Gemini REST fallback triggered:', err);
      }
    }

    const lastUser =
      [...opts.messages].reverse().find((m) => m.role === 'user')?.content.toLowerCase() || '';

    if (/refund|return|cancel/.test(lastUser)) {
      return {
        text: 'For unpaid New orders, you can cancel directly from My Orders and stock is restored automatically. For paid orders, refund or return requests are reviewed by our support team — please share your order number and details here or request a human agent.',
      };
    }
    if (/paystack|transfer|bank|payment|pay/.test(lastUser)) {
      return {
        text: 'You can pay using your Yakaji Wallet, Paystack (Card / Bank / USSD when connected), or Manual Bank Transfer (Moniepoint MFB · 3005758913 · Yakaji Digital Hub). Manual bank transfers stay pending until the marketplace owner confirms receipt.',
      };
    }
    if (/wallet|topup|top-up|withdraw|fund/.test(lastUser)) {
      return {
        text: 'Signed-in customers can fund their wallet in My Wallet via Paystack or manual bank transfer (₦100 funding fee), spend wallet balance at checkout, or request a bank withdrawal (minimum ₦1,000 plus withdrawal fee).',
      };
    }
    if (/vendor|sell|shop/.test(lastUser)) {
      return {
        text: 'You can apply through Become a Vendor after signing in. Once the marketplace owner approves your shop, you can publish products, create vendor coupons, track your orders, and request sales withdrawals.',
      };
    }
    if (/affiliate|referral|commission/.test(lastUser)) {
      return {
        text: 'Any signed-in customer can apply for the Affiliate Program without needing a vendor shop. Once approved and your registration fee is confirmed, you can share product referral links and earn commissions on verified completed sales.',
      };
    }
    if (/order|track|delivery|ship/.test(lastUser)) {
      return {
        text: 'You can view your order progress and payment status separately in My Orders when signed in. If you checked out as a guest or need help with a specific order, share your order number or tap "Talk to a human agent".',
      };
    }
    return {
      text: 'Welcome to Yakaji Digital Hub support! I can help with browsing products, checkout (Wallet, Paystack, or bank transfer), tracking My Orders, wallet funding/withdrawals, becoming a vendor, or joining the affiliate program. Ask a question or say "talk to a human agent" anytime.',
    };
  },
};

export function requireAuth(): MiddlewareOrHandler {
  return (ctx) => {
    if (!ctx.user?.userId) {
      return error('Please sign in to continue.', 401);
    }
  };
}

export function requireAdminEmailAllowlist(emails: string[]): MiddlewareOrHandler {
  const allowed = new Set(emails.map((e) => e.trim().toLowerCase()));
  return (ctx) => {
    const email = String(ctx.user?.email || '')
      .trim()
      .toLowerCase();
    if (!email || !allowed.has(email)) {
      return error('Access denied.', 403);
    }
  };
}

export function router(routes: RouteTable) {
  return routes;
}

// Seed initial marketplace state only when baseline tables/entries are missing
function seedInitialMarketplaceData() {
  const now = new Date().toISOString();
  let mutated = false;

  const settingsTable = getTable('settings');
  if (!settingsTable.has('marketplace')) {
    settingsTable.set('marketplace', {
      id: 'marketplace',
      customerTransferFee: 100,
      withdrawalFee: 100,
      walletFundingFee: 100,
      commissionPercent: 8,
      cashbackPercent: 1,
      commissionMigratedTo8: true,
    });
    mutated = true;
  }

  const supportSettingsTable = getTable('support_settings');
  if (!supportSettingsTable.has('marketplace')) {
    supportSettingsTable.set('marketplace', {
      id: 'marketplace',
      online: true,
      maxConcurrent: 1,
      offlineMessage:
        'Live support is currently offline. Leave a message and our team will reply, or use WhatsApp or email.',
    });
    mutated = true;
  }

  const demoVendorId = 'vendor-yakaji-studio';
  const vendorsTable = getTable('vendors');
  const productTable = getTable('products');
  if (vendorsTable.size === 0 && productTable.size === 0) {
    vendorsTable.set(demoVendorId, {
      id: demoVendorId,
      shopName: 'Yakaji Creator Studio',
      ownerName: 'Yakaji Creators',
      email: 'creators@yakajihub.example',
      phone: '+2348000000001',
      description: 'Curated digital courses, templates, and creator essentials.',
      status: 'approved',
      createdAt: now,
    });
    mutated = true;
  }

  const seedProducts = [
    {
      id: 'prod-ai-masterclass',
      name: 'Practical AI & Productivity Masterclass',
      category: 'Digital Courses',
      price: 15000,
      discountPrice: 12000,
      discountPercent: 20,
      description:
        'Step-by-step video course covering modern AI workflows, automation prompts, and business productivity systems with lifetime access.',
      stock: 45,
      tag: 'Popular',
      affiliateCommissionPercent: 10,
      options: ['Standard Access', 'Pro + Templates'],
      images: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85',
      ],
      videos: [],
      vendorId: demoVendorId,
      vendorName: 'Yakaji Creator Studio',
      status: 'approved',
      createdAt: now,
    },
    {
      id: 'prod-creator-toolkit',
      name: 'Complete Digital Business Notion & Canva Kit',
      category: 'Digital Products',
      price: 8500,
      discountPrice: 0,
      discountPercent: 0,
      description:
        'Ready-to-use brand kit, content calendar, client tracker, and invoice templates tailored for independent creators and SMEs.',
      stock: 100,
      tag: 'Bestseller',
      affiliateCommissionPercent: 15,
      options: ['Single License', 'Team License'],
      images: [
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85',
      ],
      videos: [],
      vendorId: demoVendorId,
      vendorName: 'Yakaji Creator Studio',
      status: 'approved',
      createdAt: now,
    },
    {
      id: 'prod-social-growth',
      name: 'Social Media Brand Audit & Content Strategy',
      category: 'Digital Services',
      price: 25000,
      discountPrice: 22000,
      discountPercent: 12,
      description:
        'Personalized 30-day content roadmap, profile optimization, and conversion playbook delivered within 48 hours.',
      stock: 18,
      tag: 'Service',
      affiliateCommissionPercent: 10,
      options: ['Instagram & TikTok', 'Full Multi-Channel'],
      images: [
        'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=900&q=85',
      ],
      videos: [],
      vendorId: demoVendorId,
      vendorName: 'Yakaji Creator Studio',
      status: 'approved',
      createdAt: now,
    },
    {
      id: 'prod-wireless-mic',
      name: 'Studio Wireless Lavalier Creator Microphone',
      category: 'Electronics',
      price: 32000,
      discountPrice: 0,
      discountPercent: 0,
      description:
        'Plug-and-play noise-cancelling dual wireless microphone compatible with USB-C and Lightning smartphones for crisp recordings.',
      stock: 14,
      tag: 'New',
      affiliateCommissionPercent: 5,
      options: ['USB-C', 'Lightning'],
      images: [
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=85',
      ],
      videos: [],
      vendorId: demoVendorId,
      vendorName: 'Yakaji Creator Studio',
      status: 'approved',
      createdAt: now,
    },
    {
      id: 'prod-minimal-tote',
      name: 'Everyday Canvas Tech & Laptop Tote Bag',
      category: 'Fashion',
      price: 18500,
      discountPrice: 16000,
      discountPercent: 14,
      description:
        'Durable water-resistant canvas carryall with padded 15-inch laptop sleeve and organized pockets for work and travel.',
      stock: 22,
      tag: 'Sale',
      affiliateCommissionPercent: 8,
      options: ['Forest Green', 'Charcoal Black'],
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
      ],
      videos: [],
      vendorId: demoVendorId,
      vendorName: 'Yakaji Creator Studio',
      status: 'approved',
      createdAt: now,
    },
  ];

  if (productTable.size === 0) {
    for (const prod of seedProducts) {
      productTable.set(prod.id, prod);
    }
    mutated = true;
  }

  if (mutated) {
    saveTablesToDisk();
  }
}

loadTablesFromDisk();
seedInitialMarketplaceData();
