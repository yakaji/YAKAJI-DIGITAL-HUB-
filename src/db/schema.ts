import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    canonicalEmail: text('canonical_email').notNull(),
    fullName: text('full_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    role: text('role').notNull().default('customer'),
    passwordHash: text('password_hash'),
    accountStatus: text('account_status').notNull().default('active'),
    lastLoginAt: text('last_login_at'),
    lastPasswordResetAt: text('last_password_reset_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index('users_email_idx').on(t.email),
    index('users_canonical_email_idx').on(t.canonicalEmail),
  ]
);

export const profiles = pgTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().default(''),
    fullName: text('full_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    whatsapp: text('whatsapp').notNull().default(''),
    address: text('address').notNull().default(''),
    city: text('city').notNull().default(''),
    state: text('state').notNull().default(''),
    country: text('country').notNull().default('Nigeria'),
    avatarPath: text('avatar_path').notNull().default(''),
    lastSeenAt: text('last_seen_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull().default(''),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('profiles_email_idx').on(t.email)]
);

export const emailAccounts = pgTable('email_accounts', {
  id: text('id').primaryKey(), // canonical email key (1 account per email enforced by PK)
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
});

export const passwordResets = pgTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

export const vendors = pgTable(
  'vendors',
  {
    id: text('id').primaryKey(),
    shopName: text('shop_name').notNull(),
    ownerName: text('owner_name').notNull().default(''),
    email: text('email').notNull().default(''),
    phone: text('phone').notNull().default(''),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('pending'),
    reviewedAt: text('reviewed_at'),
    createdAt: text('created_at').notNull(),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('vendors_email_idx').on(t.email)]
);

export const affiliates = pgTable(
  'affiliates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().default(''),
    fullName: text('full_name').notNull().default(''),
    email: text('email').notNull().default(''),
    phone: text('phone').notNull().default(''),
    whatsapp: text('whatsapp').notNull().default(''),
    address: text('address').notNull().default(''),
    city: text('city').notNull().default(''),
    state: text('state').notNull().default(''),
    socialHandle: text('social_handle').notNull().default(''),
    promotionMethod: text('promotion_method').notNull().default(''),
    referralCode: text('referral_code').notNull().default(''),
    status: text('status').notNull().default('pending'),
    registrationPaymentStatus: text('registration_payment_status').notNull().default('pending'),
    registrationPaymentMethod: text('registration_payment_method').notNull().default(''),
    registrationFee: doublePrecision('registration_fee').notNull().default(0),
    reviewedAt: text('reviewed_at'),
    reviewedBy: text('reviewed_by'),
    createdAt: text('created_at').notNull(),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index('affiliates_email_idx').on(t.email),
    index('affiliates_referral_idx').on(t.referralCode),
  ]
);

export const walletAccounts = pgTable('wallet_accounts', {
  id: text('id').primaryKey(),
  balance: doublePrecision('balance').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    amount: doublePrecision('amount').notNull(),
    type: text('type').notNull(),
    description: text('description').notNull().default(''),
    reference: text('reference').notNull().default(''),
    actorId: text('actor_id').notNull().default(''),
    createdAt: text('created_at').notNull(),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('wallet_tx_user_idx').on(t.userId)]
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    price: doublePrecision('price').notNull().default(0),
    discountPrice: doublePrecision('discount_price').notNull().default(0),
    discountPercent: doublePrecision('discount_percent').notNull().default(0),
    discountStartAt: text('discount_start_at'),
    discountEndAt: text('discount_end_at'),
    description: text('description').notNull().default(''),
    stock: integer('stock').notNull().default(0),
    tag: text('tag').notNull().default(''),
    affiliateCommissionPercent: doublePrecision('affiliate_commission_percent').notNull().default(0),
    marketplaceCommissionPercent: doublePrecision('marketplace_commission_percent'),
    options: jsonb('options').$type<string[]>().notNull().default([]),
    images: jsonb('images').$type<string[]>().notNull().default([]),
    videos: jsonb('videos').$type<string[]>().notNull().default([]),
    vendorId: text('vendor_id').notNull(),
    vendorName: text('vendor_name').notNull().default(''),
    status: text('status').notNull().default('pending'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at'),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('products_vendor_idx').on(t.vendorId)]
);

export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull(),
    customerUserId: text('customer_user_id'),
    customerName: text('customer_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    email: text('email').notNull().default(''),
    address: text('address').notNull().default(''),
    paymentMethod: text('payment_method').notNull().default(''),
    paymentStatus: text('payment_status').notNull().default('pending'),
    status: text('status').notNull().default('New'),
    subtotal: doublePrecision('subtotal'),
    couponCode: text('coupon_code'),
    couponDiscount: doublePrecision('coupon_discount'),
    transferFee: doublePrecision('transfer_fee'),
    total: doublePrecision('total').notNull().default(0),
    paymentGatewayFee: doublePrecision('payment_gateway_fee'),
    affiliateId: text('affiliate_id'),
    affiliateReferralCode: text('affiliate_referral_code'),
    items: jsonb('items').$type<Array<Record<string, unknown>>>().notNull().default([]),
    trackingNumber: text('tracking_number'),
    courier: text('courier'),
    adminNote: text('admin_note'),
    paystackReference: text('paystack_reference'),
    paymentReference: text('payment_reference'),
    paymentCompletedAt: text('payment_completed_at'),
    paymentNotificationSentAt: text('payment_notification_sent_at'),
    refundStatus: text('refund_status'),
    refundedAt: text('refunded_at'),
    cancelledAt: text('cancelled_at'),
    cancelledBy: text('cancelled_by'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at'),
    extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index('orders_customer_idx').on(t.customerUserId),
    index('orders_email_idx').on(t.email),
    index('orders_number_idx').on(t.orderNumber),
  ]
);

export const marketplaceRecords = pgTable(
  'marketplace_records',
  {
    id: text('id').primaryKey(), // `${tableName}::${recordId}`
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('marketplace_records_table_idx').on(t.tableName)]
);

export const mediaAssets = pgTable('media_assets', {
  path: text('path').primaryKey(),
  contentType: text('content_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const dbBackups = pgTable('db_backups', {
  id: text('id').primaryKey(),
  backupType: text('backup_type').notNull(), // daily_auto | manual | pre_migration
  status: text('status').notNull().default('verified'),
  verified: boolean('verified').notNull().default(true),
  checksumSha256: text('checksum_sha256').notNull(),
  recordCount: integer('record_count').notNull().default(0),
  tableCounts: jsonb('table_counts').$type<Record<string, number>>().notNull().default({}),
  snapshot: jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  retentionDays: integer('retention_days').notNull().default(30),
  createdAt: text('created_at').notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.id],
  }),
  walletAccount: one(walletAccounts, {
    fields: [users.id],
    references: [walletAccounts.id],
  }),
  walletTransactions: many(walletTransactions),
  orders: many(orders),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.id],
    references: [users.id],
  }),
}));

export const walletAccountsRelations = relations(walletAccounts, ({ many }) => ({
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  account: one(walletAccounts, {
    fields: [walletTransactions.userId],
    references: [walletAccounts.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  vendor: one(vendors, {
    fields: [products.vendorId],
    references: [vendors.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(users, {
    fields: [orders.customerUserId],
    references: [users.id],
  }),
}));
