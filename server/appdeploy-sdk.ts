import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { pool, withDbRetry, withPoolClient } from '../src/db/index.ts';
import { ensureDailyBackupFresh, runDatabaseBackup } from './backup-service.ts';

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
const MEDIA_DIR = path.join(DATA_DIR, 'media');

const DEDICATED_TABLES = new Set([
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
]);

function clone<T>(val: T): T {
  return val === undefined ? val : structuredClone(val);
}

function canonicalEmailKey(email: string): string {
  const normalized = String(email || '').trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const plusIdx = local.indexOf('+');
    const baseLocal = (plusIdx >= 0 ? local.slice(0, plusIdx) : local).replace(/\./g, '');
    return `${baseLocal}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function pickExtra(
  rec: Record<string, unknown>,
  knownKeys: Set<string>
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (!knownKeys.has(k) && v !== undefined) {
      extra[k] = v;
    }
  }
  return extra;
}

function cleanHydratedRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

const KNOWN_KEYS: Record<string, Set<string>> = {
  users: new Set([
    'id',
    'email',
    'canonicalEmail',
    'fullName',
    'phone',
    'role',
    'passwordHash',
    'accountStatus',
    'lastLoginAt',
    'lastPasswordResetAt',
    'createdAt',
    'updatedAt',
  ]),
  profiles: new Set([
    'id',
    'email',
    'fullName',
    'phone',
    'whatsapp',
    'address',
    'city',
    'state',
    'country',
    'avatarPath',
    'lastSeenAt',
    'createdAt',
    'updatedAt',
  ]),
  email_accounts: new Set(['id', 'userId', 'email', 'createdAt']),
  password_resets: new Set([
    'id',
    'userId',
    'email',
    'codeHash',
    'expiresAt',
    'attempts',
    'usedAt',
    'createdAt',
  ]),
  vendors: new Set([
    'id',
    'shopName',
    'ownerName',
    'email',
    'phone',
    'description',
    'status',
    'reviewedAt',
    'createdAt',
  ]),
  affiliates: new Set([
    'id',
    'userId',
    'fullName',
    'email',
    'phone',
    'whatsapp',
    'address',
    'city',
    'state',
    'socialHandle',
    'promotionMethod',
    'referralCode',
    'status',
    'registrationPaymentStatus',
    'registrationPaymentMethod',
    'registrationFee',
    'reviewedAt',
    'reviewedBy',
    'createdAt',
  ]),
  wallet_accounts: new Set(['id', 'balance', 'updatedAt']),
  wallet_transactions: new Set([
    'id',
    'userId',
    'amount',
    'type',
    'description',
    'reference',
    'actorId',
    'createdAt',
  ]),
  products: new Set([
    'id',
    'name',
    'category',
    'price',
    'discountPrice',
    'discountPercent',
    'discountStartAt',
    'discountEndAt',
    'description',
    'stock',
    'tag',
    'affiliateCommissionPercent',
    'marketplaceCommissionPercent',
    'options',
    'images',
    'videos',
    'vendorId',
    'vendorName',
    'status',
    'createdAt',
    'updatedAt',
  ]),
  orders: new Set([
    'id',
    'orderNumber',
    'customerUserId',
    'customerName',
    'phone',
    'email',
    'address',
    'paymentMethod',
    'paymentStatus',
    'status',
    'subtotal',
    'couponCode',
    'couponDiscount',
    'transferFee',
    'total',
    'paymentGatewayFee',
    'affiliateId',
    'affiliateReferralCode',
    'items',
    'trackingNumber',
    'courier',
    'adminNote',
    'paystackReference',
    'paymentReference',
    'paymentCompletedAt',
    'paymentNotificationSentAt',
    'refundStatus',
    'refundedAt',
    'cancelledAt',
    'cancelledBy',
    'createdAt',
    'updatedAt',
  ]),
};

function rowToRecord(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const extra = (row.extra && typeof row.extra === 'object' ? row.extra : {}) as Record<string, unknown>;
  switch (table) {
    case 'users':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        email: row.email,
        canonicalEmail: row.canonical_email,
        fullName: row.full_name,
        phone: row.phone,
        role: row.role,
        passwordHash: row.password_hash ?? undefined,
        accountStatus: row.account_status,
        lastLoginAt: row.last_login_at ?? undefined,
        lastPasswordResetAt: row.last_password_reset_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    case 'profiles':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        whatsapp: row.whatsapp,
        address: row.address,
        city: row.city,
        state: row.state,
        country: row.country,
        avatarPath: row.avatar_path,
        lastSeenAt: row.last_seen_at ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    case 'email_accounts':
      return cleanHydratedRecord({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        createdAt: row.created_at,
      });
    case 'password_resets':
      return cleanHydratedRecord({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        codeHash: row.code_hash,
        expiresAt: row.expires_at,
        attempts: Number(row.attempts || 0),
        usedAt: row.used_at ?? undefined,
        createdAt: row.created_at,
      });
    case 'vendors':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        shopName: row.shop_name,
        ownerName: row.owner_name,
        email: row.email,
        phone: row.phone,
        description: row.description,
        status: row.status,
        reviewedAt: row.reviewed_at ?? undefined,
        createdAt: row.created_at,
      });
    case 'affiliates':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp,
        address: row.address,
        city: row.city,
        state: row.state,
        socialHandle: row.social_handle,
        promotionMethod: row.promotion_method,
        referralCode: row.referral_code,
        status: row.status,
        registrationPaymentStatus: row.registration_payment_status,
        registrationPaymentMethod: row.registration_payment_method,
        registrationFee: Number(row.registration_fee || 0),
        reviewedAt: row.reviewed_at ?? undefined,
        reviewedBy: row.reviewed_by ?? undefined,
        createdAt: row.created_at,
      });
    case 'wallet_accounts':
      return cleanHydratedRecord({
        id: row.id,
        balance: Number(row.balance || 0),
        updatedAt: row.updated_at,
      });
    case 'wallet_transactions':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        userId: row.user_id,
        amount: Number(row.amount || 0),
        type: row.type,
        description: row.description,
        reference: row.reference,
        actorId: row.actor_id,
        createdAt: row.created_at,
      });
    case 'products':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price || 0),
        discountPrice: Number(row.discount_price || 0),
        discountPercent: Number(row.discount_percent || 0),
        discountStartAt: row.discount_start_at ?? undefined,
        discountEndAt: row.discount_end_at ?? undefined,
        description: row.description,
        stock: Number(row.stock || 0),
        tag: row.tag,
        affiliateCommissionPercent: Number(row.affiliate_commission_percent || 0),
        marketplaceCommissionPercent:
          row.marketplace_commission_percent === null || row.marketplace_commission_percent === undefined
            ? undefined
            : Number(row.marketplace_commission_percent),
        options: Array.isArray(row.options) ? row.options : [],
        images: Array.isArray(row.images) ? row.images : [],
        videos: Array.isArray(row.videos) ? row.videos : [],
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? undefined,
      });
    case 'orders':
      return cleanHydratedRecord({
        ...extra,
        id: row.id,
        orderNumber: row.order_number,
        customerUserId: row.customer_user_id ?? undefined,
        customerName: row.customer_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        status: row.status,
        subtotal: row.subtotal === null || row.subtotal === undefined ? undefined : Number(row.subtotal),
        couponCode: row.coupon_code ?? undefined,
        couponDiscount:
          row.coupon_discount === null || row.coupon_discount === undefined
            ? undefined
            : Number(row.coupon_discount),
        transferFee:
          row.transfer_fee === null || row.transfer_fee === undefined ? undefined : Number(row.transfer_fee),
        total: Number(row.total || 0),
        paymentGatewayFee:
          row.payment_gateway_fee === null || row.payment_gateway_fee === undefined
            ? undefined
            : Number(row.payment_gateway_fee),
        affiliateId: row.affiliate_id ?? undefined,
        affiliateReferralCode: row.affiliate_referral_code ?? undefined,
        items: Array.isArray(row.items) ? row.items : [],
        trackingNumber: row.tracking_number ?? undefined,
        courier: row.courier ?? undefined,
        adminNote: row.admin_note ?? undefined,
        paystackReference: row.paystack_reference ?? undefined,
        paymentReference: row.payment_reference ?? undefined,
        paymentCompletedAt: row.payment_completed_at ?? undefined,
        paymentNotificationSentAt: row.payment_notification_sent_at ?? undefined,
        refundStatus: row.refund_status ?? undefined,
        refundedAt: row.refunded_at ?? undefined,
        cancelledAt: row.cancelled_at ?? undefined,
        cancelledBy: row.cancelled_by ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? undefined,
      });
    default: {
      const data = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>;
      return { ...data, id: String(data.id || row.record_id || '') };
    }
  }
}

function buildInsertStatement(table: string, rec: Record<string, unknown>): { sql: string; values: unknown[] } {
  const now = new Date().toISOString();
  const id = String(rec.id || '');
  switch (table) {
    case 'users': {
      const email = String(rec.email || '').trim().toLowerCase();
      const canonical = String(rec.canonicalEmail || canonicalEmailKey(email));
      const extra = pickExtra(rec, KNOWN_KEYS.users);
      return {
        sql: `INSERT INTO users (id, email, canonical_email, full_name, phone, role, password_hash, account_status, last_login_at, last_password_reset_at, created_at, updated_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          email,
          canonical,
          String(rec.fullName || ''),
          String(rec.phone || ''),
          String(rec.role || 'customer'),
          rec.passwordHash ? String(rec.passwordHash) : null,
          String(rec.accountStatus || 'active'),
          rec.lastLoginAt ? String(rec.lastLoginAt) : null,
          rec.lastPasswordResetAt ? String(rec.lastPasswordResetAt) : null,
          String(rec.createdAt || now),
          String(rec.updatedAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'profiles': {
      const extra = pickExtra(rec, KNOWN_KEYS.profiles);
      return {
        sql: `INSERT INTO profiles (id, email, full_name, phone, whatsapp, address, city, state, country, avatar_path, last_seen_at, created_at, updated_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.email || ''),
          String(rec.fullName || ''),
          String(rec.phone || ''),
          String(rec.whatsapp || ''),
          String(rec.address || ''),
          String(rec.city || ''),
          String(rec.state || ''),
          String(rec.country || 'Nigeria'),
          String(rec.avatarPath || ''),
          rec.lastSeenAt ? String(rec.lastSeenAt) : null,
          String(rec.createdAt || now),
          String(rec.updatedAt || ''),
          JSON.stringify(extra),
        ],
      };
    }
    case 'email_accounts':
      return {
        sql: `INSERT INTO email_accounts (id, user_id, email, created_at)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [id, String(rec.userId || ''), String(rec.email || ''), String(rec.createdAt || now)],
      };
    case 'password_resets':
      return {
        sql: `INSERT INTO password_resets (id, user_id, email, code_hash, expires_at, attempts, used_at, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.userId || ''),
          String(rec.email || ''),
          String(rec.codeHash || ''),
          String(rec.expiresAt || now),
          Number(rec.attempts || 0),
          rec.usedAt ? String(rec.usedAt) : null,
          String(rec.createdAt || now),
        ],
      };
    case 'vendors': {
      const extra = pickExtra(rec, KNOWN_KEYS.vendors);
      return {
        sql: `INSERT INTO vendors (id, shop_name, owner_name, email, phone, description, status, reviewed_at, created_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.shopName || ''),
          String(rec.ownerName || ''),
          String(rec.email || ''),
          String(rec.phone || ''),
          String(rec.description || ''),
          String(rec.status || 'pending'),
          rec.reviewedAt ? String(rec.reviewedAt) : null,
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'affiliates': {
      const extra = pickExtra(rec, KNOWN_KEYS.affiliates);
      return {
        sql: `INSERT INTO affiliates (id, user_id, full_name, email, phone, whatsapp, address, city, state, social_handle, promotion_method, referral_code, status, registration_payment_status, registration_payment_method, registration_fee, reviewed_at, reviewed_by, created_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.userId || id),
          String(rec.fullName || rec.name || ''),
          String(rec.email || ''),
          String(rec.phone || ''),
          String(rec.whatsapp || ''),
          String(rec.address || ''),
          String(rec.city || ''),
          String(rec.state || ''),
          String(rec.socialHandle || ''),
          String(rec.promotionMethod || ''),
          String(rec.referralCode || ''),
          String(rec.status || 'pending'),
          String(rec.registrationPaymentStatus || 'pending'),
          String(rec.registrationPaymentMethod || ''),
          Number(rec.registrationFee || 0),
          rec.reviewedAt ? String(rec.reviewedAt) : null,
          rec.reviewedBy ? String(rec.reviewedBy) : null,
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'wallet_accounts':
      return {
        sql: `INSERT INTO wallet_accounts (id, balance, updated_at)
              VALUES ($1, $2, $3)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [id, Number(rec.balance || 0), String(rec.updatedAt || now)],
      };
    case 'wallet_transactions': {
      const extra = pickExtra(rec, KNOWN_KEYS.wallet_transactions);
      return {
        sql: `INSERT INTO wallet_transactions (id, user_id, amount, type, description, reference, actor_id, created_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.userId || ''),
          Number(rec.amount || 0),
          String(rec.type || 'credit'),
          String(rec.description || ''),
          String(rec.reference || ''),
          String(rec.actorId || ''),
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'products': {
      const extra = pickExtra(rec, KNOWN_KEYS.products);
      return {
        sql: `INSERT INTO products (id, name, category, price, discount_price, discount_percent, discount_start_at, discount_end_at, description, stock, tag, affiliate_commission_percent, marketplace_commission_percent, options, images, videos, vendor_id, vendor_name, status, created_at, updated_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, $19, $20, $21, $22::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.name || ''),
          String(rec.category || 'Other'),
          Number(rec.price || 0),
          Number(rec.discountPrice || 0),
          Number(rec.discountPercent || 0),
          rec.discountStartAt ? String(rec.discountStartAt) : null,
          rec.discountEndAt ? String(rec.discountEndAt) : null,
          String(rec.description || ''),
          Math.floor(Number(rec.stock || 0)),
          String(rec.tag || ''),
          Number(rec.affiliateCommissionPercent || 0),
          rec.marketplaceCommissionPercent !== undefined && rec.marketplaceCommissionPercent !== null
            ? Number(rec.marketplaceCommissionPercent)
            : null,
          JSON.stringify(Array.isArray(rec.options) ? rec.options : []),
          JSON.stringify(Array.isArray(rec.images) ? rec.images : []),
          JSON.stringify(Array.isArray(rec.videos) ? rec.videos : []),
          String(rec.vendorId || ''),
          String(rec.vendorName || ''),
          String(rec.status || 'pending'),
          String(rec.createdAt || now),
          rec.updatedAt ? String(rec.updatedAt) : null,
          JSON.stringify(extra),
        ],
      };
    }
    case 'orders': {
      const extra = pickExtra(rec, KNOWN_KEYS.orders);
      return {
        sql: `INSERT INTO orders (id, order_number, customer_user_id, customer_name, phone, email, address, payment_method, payment_status, status, subtotal, coupon_code, coupon_discount, transfer_fee, total, payment_gateway_fee, affiliate_id, affiliate_referral_code, items, tracking_number, courier, admin_note, paystack_reference, payment_reference, payment_completed_at, payment_notification_sent_at, refund_status, refunded_at, cancelled_at, cancelled_by, created_at, updated_at, extra)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33::jsonb)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          id,
          String(rec.orderNumber || ''),
          rec.customerUserId ? String(rec.customerUserId) : null,
          String(rec.customerName || ''),
          String(rec.phone || ''),
          String(rec.email || ''),
          String(rec.address || ''),
          String(rec.paymentMethod || ''),
          String(rec.paymentStatus || 'pending'),
          String(rec.status || 'New'),
          rec.subtotal !== undefined && rec.subtotal !== null ? Number(rec.subtotal) : null,
          rec.couponCode !== undefined && rec.couponCode !== null ? String(rec.couponCode) : null,
          rec.couponDiscount !== undefined && rec.couponDiscount !== null ? Number(rec.couponDiscount) : null,
          rec.transferFee !== undefined && rec.transferFee !== null ? Number(rec.transferFee) : null,
          Number(rec.total || 0),
          rec.paymentGatewayFee !== undefined && rec.paymentGatewayFee !== null
            ? Number(rec.paymentGatewayFee)
            : null,
          rec.affiliateId ? String(rec.affiliateId) : null,
          rec.affiliateReferralCode ? String(rec.affiliateReferralCode) : null,
          JSON.stringify(Array.isArray(rec.items) ? rec.items : []),
          rec.trackingNumber ? String(rec.trackingNumber) : null,
          rec.courier ? String(rec.courier) : null,
          rec.adminNote ? String(rec.adminNote) : null,
          rec.paystackReference ? String(rec.paystackReference) : null,
          rec.paymentReference ? String(rec.paymentReference) : null,
          rec.paymentCompletedAt ? String(rec.paymentCompletedAt) : null,
          rec.paymentNotificationSentAt ? String(rec.paymentNotificationSentAt) : null,
          rec.refundStatus ? String(rec.refundStatus) : null,
          rec.refundedAt ? String(rec.refundedAt) : null,
          rec.cancelledAt ? String(rec.cancelledAt) : null,
          rec.cancelledBy ? String(rec.cancelledBy) : null,
          String(rec.createdAt || now),
          rec.updatedAt ? String(rec.updatedAt) : null,
          JSON.stringify(extra),
        ],
      };
    }
    default: {
      const compositeId = `${table}::${id}`;
      const payload = { ...rec, id };
      return {
        sql: `INSERT INTO marketplace_records (id, table_name, record_id, data, created_at, updated_at)
              VALUES ($1, $2, $3, $4::jsonb, $5, $6)
              ON CONFLICT (id) DO NOTHING RETURNING id`,
        values: [
          compositeId,
          table,
          id,
          JSON.stringify(payload),
          String(rec.createdAt || now),
          String(rec.updatedAt || now),
        ],
      };
    }
  }
}

function buildUpdateStatement(table: string, id: string, rec: Record<string, unknown>): { sql: string; values: unknown[] } {
  const now = new Date().toISOString();
  switch (table) {
    case 'users': {
      const email = String(rec.email || '').trim().toLowerCase();
      const canonical = String(rec.canonicalEmail || canonicalEmailKey(email));
      const extra = pickExtra(rec, KNOWN_KEYS.users);
      return {
        sql: `UPDATE users
              SET email = $2, canonical_email = $3, full_name = $4, phone = $5, role = $6, password_hash = $7, account_status = $8, last_login_at = $9, last_password_reset_at = $10, created_at = $11, updated_at = $12, extra = $13::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          email,
          canonical,
          String(rec.fullName || ''),
          String(rec.phone || ''),
          String(rec.role || 'customer'),
          rec.passwordHash ? String(rec.passwordHash) : null,
          String(rec.accountStatus || 'active'),
          rec.lastLoginAt ? String(rec.lastLoginAt) : null,
          rec.lastPasswordResetAt ? String(rec.lastPasswordResetAt) : null,
          String(rec.createdAt || now),
          String(rec.updatedAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'profiles': {
      const extra = pickExtra(rec, KNOWN_KEYS.profiles);
      return {
        sql: `UPDATE profiles
              SET email = $2, full_name = $3, phone = $4, whatsapp = $5, address = $6, city = $7, state = $8, country = $9, avatar_path = $10, last_seen_at = $11, created_at = $12, updated_at = $13, extra = $14::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.email || ''),
          String(rec.fullName || ''),
          String(rec.phone || ''),
          String(rec.whatsapp || ''),
          String(rec.address || ''),
          String(rec.city || ''),
          String(rec.state || ''),
          String(rec.country || 'Nigeria'),
          String(rec.avatarPath || ''),
          rec.lastSeenAt ? String(rec.lastSeenAt) : null,
          String(rec.createdAt || now),
          String(rec.updatedAt || ''),
          JSON.stringify(extra),
        ],
      };
    }
    case 'email_accounts':
      return {
        sql: `UPDATE email_accounts SET user_id = $2, email = $3, created_at = $4 WHERE id = $1 RETURNING id`,
        values: [id, String(rec.userId || ''), String(rec.email || ''), String(rec.createdAt || now)],
      };
    case 'password_resets':
      return {
        sql: `UPDATE password_resets
              SET user_id = $2, email = $3, code_hash = $4, expires_at = $5, attempts = $6, used_at = $7, created_at = $8
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.userId || ''),
          String(rec.email || ''),
          String(rec.codeHash || ''),
          String(rec.expiresAt || now),
          Number(rec.attempts || 0),
          rec.usedAt ? String(rec.usedAt) : null,
          String(rec.createdAt || now),
        ],
      };
    case 'vendors': {
      const extra = pickExtra(rec, KNOWN_KEYS.vendors);
      return {
        sql: `UPDATE vendors
              SET shop_name = $2, owner_name = $3, email = $4, phone = $5, description = $6, status = $7, reviewed_at = $8, created_at = $9, extra = $10::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.shopName || ''),
          String(rec.ownerName || ''),
          String(rec.email || ''),
          String(rec.phone || ''),
          String(rec.description || ''),
          String(rec.status || 'pending'),
          rec.reviewedAt ? String(rec.reviewedAt) : null,
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'affiliates': {
      const extra = pickExtra(rec, KNOWN_KEYS.affiliates);
      return {
        sql: `UPDATE affiliates
              SET user_id = $2, full_name = $3, email = $4, phone = $5, whatsapp = $6, address = $7, city = $8, state = $9, social_handle = $10, promotion_method = $11, referral_code = $12, status = $13, registration_payment_status = $14, registration_payment_method = $15, registration_fee = $16, reviewed_at = $17, reviewed_by = $18, created_at = $19, extra = $20::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.userId || id),
          String(rec.fullName || rec.name || ''),
          String(rec.email || ''),
          String(rec.phone || ''),
          String(rec.whatsapp || ''),
          String(rec.address || ''),
          String(rec.city || ''),
          String(rec.state || ''),
          String(rec.socialHandle || ''),
          String(rec.promotionMethod || ''),
          String(rec.referralCode || ''),
          String(rec.status || 'pending'),
          String(rec.registrationPaymentStatus || 'pending'),
          String(rec.registrationPaymentMethod || ''),
          Number(rec.registrationFee || 0),
          rec.reviewedAt ? String(rec.reviewedAt) : null,
          rec.reviewedBy ? String(rec.reviewedBy) : null,
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'wallet_accounts':
      return {
        sql: `UPDATE wallet_accounts SET balance = $2, updated_at = $3 WHERE id = $1 RETURNING id`,
        values: [id, Number(rec.balance || 0), String(rec.updatedAt || now)],
      };
    case 'wallet_transactions': {
      const extra = pickExtra(rec, KNOWN_KEYS.wallet_transactions);
      return {
        sql: `UPDATE wallet_transactions
              SET user_id = $2, amount = $3, type = $4, description = $5, reference = $6, actor_id = $7, created_at = $8, extra = $9::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.userId || ''),
          Number(rec.amount || 0),
          String(rec.type || 'credit'),
          String(rec.description || ''),
          String(rec.reference || ''),
          String(rec.actorId || ''),
          String(rec.createdAt || now),
          JSON.stringify(extra),
        ],
      };
    }
    case 'products': {
      const extra = pickExtra(rec, KNOWN_KEYS.products);
      return {
        sql: `UPDATE products
              SET name = $2, category = $3, price = $4, discount_price = $5, discount_percent = $6, discount_start_at = $7, discount_end_at = $8, description = $9, stock = $10, tag = $11, affiliate_commission_percent = $12, marketplace_commission_percent = $13, options = $14::jsonb, images = $15::jsonb, videos = $16::jsonb, vendor_id = $17, vendor_name = $18, status = $19, created_at = $20, updated_at = $21, extra = $22::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.name || ''),
          String(rec.category || 'Other'),
          Number(rec.price || 0),
          Number(rec.discountPrice || 0),
          Number(rec.discountPercent || 0),
          rec.discountStartAt ? String(rec.discountStartAt) : null,
          rec.discountEndAt ? String(rec.discountEndAt) : null,
          String(rec.description || ''),
          Math.floor(Number(rec.stock || 0)),
          String(rec.tag || ''),
          Number(rec.affiliateCommissionPercent || 0),
          rec.marketplaceCommissionPercent !== undefined && rec.marketplaceCommissionPercent !== null
            ? Number(rec.marketplaceCommissionPercent)
            : null,
          JSON.stringify(Array.isArray(rec.options) ? rec.options : []),
          JSON.stringify(Array.isArray(rec.images) ? rec.images : []),
          JSON.stringify(Array.isArray(rec.videos) ? rec.videos : []),
          String(rec.vendorId || ''),
          String(rec.vendorName || ''),
          String(rec.status || 'pending'),
          String(rec.createdAt || now),
          rec.updatedAt ? String(rec.updatedAt) : null,
          JSON.stringify(extra),
        ],
      };
    }
    case 'orders': {
      const extra = pickExtra(rec, KNOWN_KEYS.orders);
      return {
        sql: `UPDATE orders
              SET order_number = $2, customer_user_id = $3, customer_name = $4, phone = $5, email = $6, address = $7, payment_method = $8, payment_status = $9, status = $10, subtotal = $11, coupon_code = $12, coupon_discount = $13, transfer_fee = $14, total = $15, payment_gateway_fee = $16, affiliate_id = $17, affiliate_referral_code = $18, items = $19::jsonb, tracking_number = $20, courier = $21, admin_note = $22, paystack_reference = $23, payment_reference = $24, payment_completed_at = $25, payment_notification_sent_at = $26, refund_status = $27, refunded_at = $28, cancelled_at = $29, cancelled_by = $30, created_at = $31, updated_at = $32, extra = $33::jsonb
              WHERE id = $1 RETURNING id`,
        values: [
          id,
          String(rec.orderNumber || ''),
          rec.customerUserId ? String(rec.customerUserId) : null,
          String(rec.customerName || ''),
          String(rec.phone || ''),
          String(rec.email || ''),
          String(rec.address || ''),
          String(rec.paymentMethod || ''),
          String(rec.paymentStatus || 'pending'),
          String(rec.status || 'New'),
          rec.subtotal !== undefined && rec.subtotal !== null ? Number(rec.subtotal) : null,
          rec.couponCode !== undefined && rec.couponCode !== null ? String(rec.couponCode) : null,
          rec.couponDiscount !== undefined && rec.couponDiscount !== null ? Number(rec.couponDiscount) : null,
          rec.transferFee !== undefined && rec.transferFee !== null ? Number(rec.transferFee) : null,
          Number(rec.total || 0),
          rec.paymentGatewayFee !== undefined && rec.paymentGatewayFee !== null
            ? Number(rec.paymentGatewayFee)
            : null,
          rec.affiliateId ? String(rec.affiliateId) : null,
          rec.affiliateReferralCode ? String(rec.affiliateReferralCode) : null,
          JSON.stringify(Array.isArray(rec.items) ? rec.items : []),
          rec.trackingNumber ? String(rec.trackingNumber) : null,
          rec.courier ? String(rec.courier) : null,
          rec.adminNote ? String(rec.adminNote) : null,
          rec.paystackReference ? String(rec.paystackReference) : null,
          rec.paymentReference ? String(rec.paymentReference) : null,
          rec.paymentCompletedAt ? String(rec.paymentCompletedAt) : null,
          rec.paymentNotificationSentAt ? String(rec.paymentNotificationSentAt) : null,
          rec.refundStatus ? String(rec.refundStatus) : null,
          rec.refundedAt ? String(rec.refundedAt) : null,
          rec.cancelledAt ? String(rec.cancelledAt) : null,
          rec.cancelledBy ? String(rec.cancelledBy) : null,
          String(rec.createdAt || now),
          rec.updatedAt ? String(rec.updatedAt) : null,
          JSON.stringify(extra),
        ],
      };
    }
    default: {
      const compositeId = `${table}::${id}`;
      const payload = { ...rec, id };
      return {
        sql: `UPDATE marketplace_records SET data = $2::jsonb, updated_at = $3 WHERE id = $1 RETURNING id`,
        values: [compositeId, JSON.stringify(payload), String(rec.updatedAt || now)],
      };
    }
  }
}

function matchesIf(
  existing: Record<string, unknown> | undefined,
  cond?: Record<string, unknown>
): boolean {
  if (!cond) return true;
  if (!existing) return false;
  return Object.entries(cond).every(([k, v]) => {
    if (typeof v === 'number' && typeof existing[k] === 'number') {
      return Number(existing[k]) === Number(v);
    }
    return existing[k] === v;
  });
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
    } else if (v === undefined) {
      delete base[k];
    } else {
      base[k] = clone(v);
    }
  }
  return base;
}

async function fetchOneForUpdate(
  client: PoolClient,
  table: string,
  id: string
): Promise<Record<string, unknown> | undefined> {
  if (DEDICATED_TABLES.has(table)) {
    const res = await client.query<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return res.rows[0] ? rowToRecord(table, res.rows[0]) : undefined;
  }
  const compositeId = `${table}::${id}`;
  const res = await client.query<Record<string, unknown>>(
    `SELECT * FROM marketplace_records WHERE id = $1 FOR UPDATE`,
    [compositeId]
  );
  return res.rows[0] ? rowToRecord(table, res.rows[0]) : undefined;
}

async function executeOpOnClient(
  client: PoolClient,
  op: TxOp,
  strictConflictThrow = false
): Promise<boolean[]> {
  if (op.kind === 'add') {
    const results: boolean[] = [];
    for (const rawRec of op.records) {
      const id = String(rawRec.id || '');
      if (!id) {
        if (strictConflictThrow) throw new Error(`Transaction conflict adding ${op.table}: missing id`);
        results.push(false);
        continue;
      }
      const stmt = buildInsertStatement(op.table, { ...rawRec, id });
      const res = await client.query(stmt.sql, stmt.values);
      const inserted = (res.rowCount || 0) > 0;
      if (strictConflictThrow && !inserted) {
        throw new Error(`Transaction conflict adding ${op.table}:${id}`);
      }
      results.push(inserted);
    }
    return results;
  }

  if (op.kind === 'update') {
    const results: boolean[] = [];
    for (const item of op.ops) {
      const existing = await fetchOneForUpdate(client, op.table, item.id);
      if (!existing || !matchesIf(existing, item.if)) {
        if (strictConflictThrow) {
          throw new Error(`Transaction conflict updating ${op.table}:${item.id}`);
        }
        results.push(false);
        continue;
      }
      const nextRec = applyRecordUpdate(existing, item.record, op.patch);
      const stmt = buildUpdateStatement(op.table, item.id, nextRec);
      const res = await client.query(stmt.sql, stmt.values);
      const updated = (res.rowCount || 0) > 0;
      if (strictConflictThrow && !updated) {
        throw new Error(`Transaction conflict updating ${op.table}:${item.id}`);
      }
      results.push(updated);
    }
    return results;
  }

  const results: boolean[] = [];
  for (const id of op.ids) {
    if (DEDICATED_TABLES.has(op.table)) {
      const res = await client.query(`DELETE FROM ${op.table} WHERE id = $1 RETURNING id`, [String(id)]);
      results.push((res.rowCount || 0) > 0);
    } else {
      const compositeId = `${op.table}::${String(id)}`;
      const res = await client.query(`DELETE FROM marketplace_records WHERE id = $1 RETURNING id`, [compositeId]);
      results.push((res.rowCount || 0) > 0);
    }
  }
  return results;
}

async function runSingleOp(op: TxOp): Promise<boolean[]> {
  await ensureInitialized();
  return withDbRetry(() =>
    withPoolClient(async (client) => {
      try {
        await client.query('BEGIN');
        const results = await executeOpOnClient(client, op, false);
        await client.query('COMMIT');
        return results;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      }
    })
  );
}

type LazyTxPromise<T> = Promise<T> & { __txOp: TxOp };

function makeTxPromise(op: TxOp): LazyTxPromise<boolean[]> {
  let cached: Promise<boolean[]> | null = null;
  const run = () => {
    if (!cached) {
      cached = runSingleOp(op);
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

// Lazy, idempotent initialization + non-destructive migration from legacy .yakaji-data files
let initPromise: Promise<void> | null = null;
let dailyBackupTimer: ReturnType<typeof setInterval> | null = null;

function walkMediaFiles(dir: string, prefix = ''): Array<{ relPath: string; fullPath: string }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: Array<{ relPath: string; fullPath: string }> = [];
  for (const entry of entries) {
    const nextRel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const nextFull = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMediaFiles(nextFull, nextRel));
    } else if (!entry.name.endsWith('.meta.json')) {
      files.push({ relPath: nextRel, fullPath: nextFull });
    }
  }
  return files;
}

async function runLazyInitialization(): Promise<void> {
  await withDbRetry(() =>
    withPoolClient(async (client) => {
      try {
        await client.query('BEGIN');

      // 1. Safe, non-destructive migration of any existing records in .yakaji-data/db.json
      let migratedLegacyCount = 0;
      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          if (raw.trim()) {
            const parsed = JSON.parse(raw) as Record<string, Array<[string, Record<string, unknown>]>>;
            if (parsed && typeof parsed === 'object') {
              for (const [tableName, entries] of Object.entries(parsed)) {
                if (!Array.isArray(entries)) continue;
                for (const pair of entries) {
                  if (!Array.isArray(pair) || typeof pair[0] !== 'string' || !pair[1] || typeof pair[1] !== 'object') {
                    continue;
                  }
                  const rec = { ...pair[1], id: pair[1].id || pair[0] };
                  const stmt = buildInsertStatement(tableName, rec);
                  const res = await client.query(stmt.sql, stmt.values);
                  if ((res.rowCount || 0) > 0) migratedLegacyCount += 1;
                }
              }
            }
          }
        } catch (err) {
          console.warn('Legacy db.json inspection skipped:', err);
        }
      }

      // 2. Non-destructive migration of any existing media files in .yakaji-data/media
      for (const item of walkMediaFiles(MEDIA_DIR)) {
        try {
          const buf = fs.readFileSync(item.fullPath);
          let contentType = 'application/octet-stream';
          const metaPath = item.fullPath + '.meta.json';
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { contentType?: string };
            if (meta?.contentType) contentType = meta.contentType;
          }
          await client.query(
            `INSERT INTO media_assets (path, content_type, data_base64, size_bytes, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (path) DO NOTHING`,
            [item.relPath, contentType, buf.toString('base64'), buf.byteLength, new Date().toISOString()]
          );
        } catch {
          // ignore unreadable legacy media file
        }
      }

      // 3. Seed baseline settings & starter catalog ONLY when missing (ON CONFLICT DO NOTHING)
      const now = new Date().toISOString();
      const settingsStmt = buildInsertStatement('settings', {
        id: 'marketplace',
        customerTransferFee: 100,
        withdrawalFee: 100,
        walletFundingFee: 100,
        commissionPercent: 8,
        cashbackPercent: 1,
        commissionMigratedTo8: true,
      });
      await client.query(settingsStmt.sql, settingsStmt.values);

      const supportStmt = buildInsertStatement('support_settings', {
        id: 'marketplace',
        online: true,
        maxConcurrent: 1,
        offlineMessage:
          'Live support is currently offline. Leave a message and our team will reply, or use WhatsApp or email.',
      });
      await client.query(supportStmt.sql, supportStmt.values);

      const existingCounts = await client.query<{ v_count: string; p_count: string }>(
        `SELECT
           (SELECT COUNT(*)::text FROM vendors) AS v_count,
           (SELECT COUNT(*)::text FROM products) AS p_count`
      );
      const vendorCount = Number(existingCounts.rows[0]?.v_count || 0);
      const productCount = Number(existingCounts.rows[0]?.p_count || 0);

      const demoVendorId = 'vendor-yakaji-studio';
      if (vendorCount === 0 && productCount === 0) {
        const vStmt = buildInsertStatement('vendors', {
          id: demoVendorId,
          shopName: 'Yakaji Creator Studio',
          ownerName: 'Yakaji Creators',
          email: 'creators@yakajihub.example',
          phone: '+2348000000001',
          description: 'Curated digital courses, templates, and creator essentials.',
          status: 'approved',
          createdAt: now,
        });
        await client.query(vStmt.sql, vStmt.values);
      }

      if (productCount === 0) {
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
        for (const prod of seedProducts) {
          const pStmt = buildInsertStatement('products', prod);
          await client.query(pStmt.sql, pStmt.values);
        }
      }

      await client.query('COMMIT');

      if (migratedLegacyCount > 0) {
        void runDatabaseBackup('pre_migration').catch((err) => {
          console.warn('Post-migration verification backup deferred:', err);
        });
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
    })
  );

  // Schedule daily backup check non-blockingly after lazy database initialization
  void ensureDailyBackupFresh();
  if (!dailyBackupTimer) {
    dailyBackupTimer = setInterval(() => {
      void ensureDailyBackupFresh();
    }, 6 * 60 * 60 * 1000);
    dailyBackupTimer.unref();
  }
}

export async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = runLazyInitialization().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export const db = {
  async get<T extends Record<string, unknown>>(
    tableName: string,
    ids: string[],
    _opts?: { consistent?: boolean }
  ): Promise<Array<(T & { id: string }) | undefined>> {
    if (!ids.length) return [];
    await ensureInitialized();
    const stringIds = ids.map((id) => String(id));
    return withDbRetry(async () => {
      if (DEDICATED_TABLES.has(tableName)) {
        const res = await pool.query<Record<string, unknown>>(
          `SELECT * FROM ${tableName} WHERE id = ANY($1::text[])`,
          [stringIds]
        );
        const byId = new Map(res.rows.map((r) => [String(r.id), rowToRecord(tableName, r)]));
        return stringIds.map((id) => {
          const rec = byId.get(id);
          return rec ? (rec as T & { id: string }) : undefined;
        });
      }
      const compositeIds = stringIds.map((id) => `${tableName}::${id}`);
      const res = await pool.query<Record<string, unknown>>(
        `SELECT * FROM marketplace_records WHERE id = ANY($1::text[])`,
        [compositeIds]
      );
      const byId = new Map(res.rows.map((r) => [String(r.record_id), rowToRecord(tableName, r)]));
      return stringIds.map((id) => {
        const rec = byId.get(id);
        return rec ? (rec as T & { id: string }) : undefined;
      });
    });
  },
  async list<T extends Record<string, unknown>>(
    tableName: string,
    opts?: { limit?: number; nextToken?: string }
  ): Promise<{ items: Array<T & { id: string }>; nextToken?: string }> {
    await ensureInitialized();
    const limit = Math.max(1, Number(opts?.limit || 100));
    const offset = Math.max(0, Number(opts?.nextToken || 0));
    return withDbRetry(async () => {
      if (DEDICATED_TABLES.has(tableName)) {
        const orderExpr = tableName === 'wallet_accounts' ? 'updated_at ASC, id ASC' : 'created_at ASC, id ASC';
        const res = await pool.query<Record<string, unknown>>(
          `SELECT * FROM ${tableName} ORDER BY ${orderExpr} LIMIT $1 OFFSET $2`,
          [limit + 1, offset]
        );
        const hasMore = res.rows.length > limit;
        const rows = hasMore ? res.rows.slice(0, limit) : res.rows;
        const items = rows.map((r) => rowToRecord(tableName, r) as T & { id: string });
        const nextToken = hasMore ? String(offset + limit) : undefined;
        return { items, ...(nextToken ? { nextToken } : {}) };
      }
      const res = await pool.query<Record<string, unknown>>(
        `SELECT * FROM marketplace_records WHERE table_name = $1 ORDER BY created_at ASC, record_id ASC LIMIT $2 OFFSET $3`,
        [tableName, limit + 1, offset]
      );
      const hasMore = res.rows.length > limit;
      const rows = hasMore ? res.rows.slice(0, limit) : res.rows;
      const items = rows.map((r) => rowToRecord(tableName, r) as T & { id: string });
      const nextToken = hasMore ? String(offset + limit) : undefined;
      return { items, ...(nextToken ? { nextToken } : {}) };
    });
  },
  async delete(tableName: string, ids: string[]): Promise<boolean[]> {
    return runSingleOp({ kind: 'delete', table: tableName, ids });
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
    await ensureInitialized();
    const ops: TxOp[] = [];
    for (const w of writes) {
      if (w && typeof w === 'object' && '__txOp' in w) {
        ops.push(w.__txOp);
      } else {
        await w;
      }
    }
    if (!ops.length) return;
    await withDbRetry(() =>
      withPoolClient(async (client) => {
        try {
          await client.query('BEGIN');
          for (const op of ops) {
            await executeOpOnClient(client, op, true);
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          throw err;
        }
      })
    );
  },
};

// PostgreSQL-backed media storage served under /_storage/*
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
    await ensureInitialized();
    const results: boolean[] = [];
    for (const item of items) {
      try {
        const cleanBase64 = item.content.includes(',')
          ? item.content.split(',')[1] || ''
          : item.content;
        const buffer = Buffer.from(cleanBase64, 'base64');
        await withDbRetry(async () => {
          await pool.query(
            `INSERT INTO media_assets (path, content_type, data_base64, size_bytes, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (path) DO UPDATE
             SET content_type = EXCLUDED.content_type, data_base64 = EXCLUDED.data_base64, size_bytes = EXCLUDED.size_bytes`,
            [item.path, item.contentType, cleanBase64, buffer.byteLength, new Date().toISOString()]
          );
        });
        mediaStore.set(item.path, { buffer, contentType: item.contentType });
        results.push(true);
      } catch (err) {
        console.error('Persistent media write failed:', err);
        results.push(false);
      }
    }
    return results;
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

export async function getStoredMedia(relPath: string) {
  const cached = mediaStore.get(relPath);
  if (cached) return cached;
  try {
    await ensureInitialized();
    const res = await withDbRetry(async () =>
      pool.query<{ content_type: string; data_base64: string }>(
        `SELECT content_type, data_base64 FROM media_assets WHERE path = $1`,
        [relPath]
      )
    );
    const row = res.rows[0];
    if (row) {
      const entry = {
        buffer: Buffer.from(row.data_base64, 'base64'),
        contentType: row.content_type || 'application/octet-stream',
      };
      mediaStore.set(relPath, entry);
      return entry;
    }
  } catch (err) {
    console.warn('Database media lookup fallback:', err);
  }

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
