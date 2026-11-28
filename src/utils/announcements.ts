export type AnnouncementAudience = 'all' | 'customers' | 'vendors' | 'affiliates' | 'shop_followers';

export type AdminAnnouncementAudience = 'all' | 'customers' | 'vendors' | 'affiliates';

export type AnnouncementStatus = 'active' | 'cancelled';

export interface MarketplaceAnnouncement {
  id: string;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  vendorId?: string;
  vendorShopName?: string;
  status?: AnnouncementStatus | string;
  sentCount?: number;
  deliveredCount?: number;
  sentBy?: string;
  createdAt: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface AnnouncementViewerContext {
  userId?: string | null;
  isVendor?: boolean;
  isAffiliate?: boolean;
  isCustomer?: boolean;
  followedVendorIds?: string[];
}

export interface AnnouncementAudienceOption {
  value: AdminAnnouncementAudience;
  label: string;
  shortLabel: string;
  description: string;
}

export const ANNOUNCEMENT_AUDIENCE_OPTIONS: AnnouncementAudienceOption[] = [
  {
    value: 'all',
    label: 'All marketplace users (everyone)',
    shortLabel: 'Everyone on Marketplace',
    description: 'Appears on the board for all visitors, customers, vendors, and affiliate marketers.',
  },
  {
    value: 'customers',
    label: 'Customers only',
    shortLabel: 'Customers Only',
    description: 'Visible only to signed-in customer accounts and delivered to their alerts.',
  },
  {
    value: 'vendors',
    label: 'Vendors only',
    shortLabel: 'Vendors Only',
    description: 'Visible only to marketplace vendors on the board and in their alerts.',
  },
  {
    value: 'affiliates',
    label: 'Affiliate marketers only',
    shortLabel: 'Affiliate Marketers Only',
    description: 'Visible only to affiliate marketers on the board and in their alerts.',
  },
];

const VALID_AUDIENCES = new Set<AnnouncementAudience>([
  'all',
  'customers',
  'vendors',
  'affiliates',
  'shop_followers',
]);

const VALID_ADMIN_AUDIENCES = new Set<AdminAnnouncementAudience>([
  'all',
  'customers',
  'vendors',
  'affiliates',
]);

export function normalizeAnnouncementAudience(value: unknown): AnnouncementAudience | null {
  const normalized = String(value || '').trim().toLowerCase() as AnnouncementAudience;
  return VALID_AUDIENCES.has(normalized) ? normalized : null;
}

export function normalizeAdminAnnouncementAudience(value: unknown): AdminAnnouncementAudience | null {
  const normalized = String(value || '').trim().toLowerCase() as AdminAnnouncementAudience;
  return VALID_ADMIN_AUDIENCES.has(normalized) ? normalized : null;
}

export function isAnnouncementActive(item: Partial<MarketplaceAnnouncement> | null | undefined): boolean {
  if (!item || !item.id) return false;
  return String(item.status || 'active').trim().toLowerCase() !== 'cancelled';
}

export function formatAnnouncementAudienceLabel(
  audience: unknown,
  vendorShopName?: string
): string {
  const normalized = normalizeAnnouncementAudience(audience) || 'all';
  if (normalized === 'shop_followers') {
    const shop = String(vendorShopName || '').trim();
    return shop ? `${shop} · Shop Followers` : 'Shop Followers Notice';
  }
  if (normalized === 'vendors') return 'Vendors Only';
  if (normalized === 'customers') return 'Customers Only';
  if (normalized === 'affiliates') return 'Affiliate Marketers Only';
  return 'Marketplace Notice · All Users';
}

export function buildAnnouncementViewerContext(opts: {
  userId?: string | null;
  vendorRecord?: Record<string, unknown> | null;
  affiliateRecord?: Record<string, unknown> | null;
  followedVendorIds?: Iterable<string>;
}): AnnouncementViewerContext {
  const userId = String(opts.userId || '').trim() || null;
  if (!userId) {
    return {
      userId: null,
      isVendor: false,
      isAffiliate: false,
      isCustomer: false,
      followedVendorIds: [],
    };
  }
  const vendorStatus = String(opts.vendorRecord?.status || '').trim().toLowerCase();
  const affiliateStatus = String(opts.affiliateRecord?.status || '').trim().toLowerCase();
  const isVendor = Boolean(
    opts.vendorRecord &&
      vendorStatus !== 'rejected' &&
      vendorStatus !== 'suspended'
  );
  const isAffiliate = Boolean(
    opts.affiliateRecord &&
      affiliateStatus !== 'rejected' &&
      affiliateStatus !== 'suspended'
  );
  const isCustomer = !isVendor && !isAffiliate;
  const followedVendorIds = opts.followedVendorIds
    ? [...new Set(Array.from(opts.followedVendorIds, (id) => String(id || '').trim()).filter(Boolean))]
    : [];

  return {
    userId,
    isVendor,
    isAffiliate,
    isCustomer,
    followedVendorIds,
  };
}

export function canViewerSeeAnnouncement(
  item: Partial<MarketplaceAnnouncement> | null | undefined,
  viewer: AnnouncementViewerContext | null | undefined
): boolean {
  if (!isAnnouncementActive(item)) return false;
  const audience = normalizeAnnouncementAudience(item?.audience) || 'all';
  if (audience === 'all') return true;
  if (!viewer?.userId) return false;

  if (audience === 'shop_followers') {
    const targetVendorId = String(item?.vendorId || '').trim();
    if (!targetVendorId) return false;
    const followed = Array.isArray(viewer.followedVendorIds) ? viewer.followedVendorIds : [];
    return followed.includes(targetVendorId);
  }
  if (audience === 'vendors') return Boolean(viewer.isVendor);
  if (audience === 'affiliates') return Boolean(viewer.isAffiliate);
  if (audience === 'customers') {
    if (typeof viewer.isCustomer === 'boolean') return viewer.isCustomer;
    return !viewer.isVendor && !viewer.isAffiliate;
  }
  return false;
}

export function filterVisibleAnnouncements(
  items: MarketplaceAnnouncement[],
  viewer: AnnouncementViewerContext | null | undefined,
  dismissedIds: Iterable<string> = []
): MarketplaceAnnouncement[] {
  const dismissed = new Set(Array.from(dismissedIds, (id) => String(id)));
  return [...items]
    .filter((item) => !dismissed.has(String(item.id)) && canViewerSeeAnnouncement(item, viewer))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function computeAnnouncementRecipients(opts: {
  audience: AdminAnnouncementAudience;
  profiles: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  affiliates: Array<Record<string, unknown>>;
}): string[] {
  const activeVendorIds = new Set(
    opts.vendors
      .filter((row) => {
        const status = String(row.status || '').trim().toLowerCase();
        return Boolean(row.id) && status !== 'rejected' && status !== 'suspended';
      })
      .map((row) => String(row.id))
  );

  const activeAffiliateIds = new Set(
    opts.affiliates
      .filter((row) => {
        const status = String(row.status || '').trim().toLowerCase();
        return Boolean(row.id || row.userId) && status !== 'rejected' && status !== 'suspended';
      })
      .map((row) => String(row.userId || row.id))
  );

  const profileIds = opts.profiles
    .map((row) => String(row.id || ''))
    .filter(Boolean);

  if (opts.audience === 'vendors') {
    return [...activeVendorIds];
  }
  if (opts.audience === 'affiliates') {
    return [...activeAffiliateIds];
  }
  if (opts.audience === 'customers') {
    return [...new Set(profileIds.filter((id) => !activeVendorIds.has(id) && !activeAffiliateIds.has(id)))];
  }
  return [...new Set([...profileIds, ...activeVendorIds, ...activeAffiliateIds].filter(Boolean))];
}

export function computeVendorFollowerRecipients(
  follows: Array<Record<string, unknown>>,
  vendorId: string
): string[] {
  const cleanVendorId = String(vendorId || '').trim();
  if (!cleanVendorId || !Array.isArray(follows)) return [];
  const recipientIds = follows
    .filter(
      (row) =>
        String(row?.vendorId || '').trim() === cleanVendorId &&
        String(row?.userId || '').trim() !== '' &&
        String(row?.userId || '').trim() !== cleanVendorId
    )
    .map((row) => String(row.userId).trim());
  return [...new Set(recipientIds)];
}

export const VENDOR_ANNOUNCEMENT_TITLE_MIN = 2;
export const VENDOR_ANNOUNCEMENT_TITLE_MAX = 120;
export const VENDOR_ANNOUNCEMENT_MESSAGE_MIN = 2;
export const VENDOR_ANNOUNCEMENT_MESSAGE_MAX = 1000;

export interface VendorAnnouncementPreset {
  id: string;
  label: string;
  build: (shopName: string) => { title: string; message: string };
}

export const VENDOR_ANNOUNCEMENT_PRESETS: VendorAnnouncementPreset[] = [
  {
    id: 'new-arrival',
    label: 'New Product Arrival',
    build: (shopName) => ({
      title: `New arrival at ${shopName || 'our shop'}`,
      message: `We just published a fresh release in ${shopName || 'our shop'}. Check our storefront early while launch stock lasts.`,
    }),
  },
  {
    id: 'seasonal-sale',
    label: 'Seasonal Sale',
    build: (shopName) => ({
      title: `Seasonal sale now live at ${shopName || 'our shop'}`,
      message: `As a follower of ${shopName || 'our shop'}, enjoy seasonal savings and featured follower deals across our catalog this week.`,
    }),
  },
  {
    id: 'shop-update',
    label: 'Shop Update',
    build: (shopName) => ({
      title: `Important storefront update from ${shopName || 'our shop'}`,
      message: `We have updated our catalog, delivery schedule, and customer support hours at ${shopName || 'our shop'}. Visit our storefront for full details.`,
    }),
  },
  {
    id: 'restock',
    label: 'Stock Replenished',
    build: (shopName) => ({
      title: `Popular items restocked at ${shopName || 'our shop'}`,
      message: `Our best-selling items are back in stock today. Followers get first look before inventory runs out.`,
    }),
  },
];

export interface VendorAnnouncementValidation {
  valid: boolean;
  titleLength: number;
  messageLength: number;
  titleRemaining: number;
  messageRemaining: number;
  error: string;
}

export function validateVendorAnnouncementDraft(draft: {
  title?: string;
  message?: string;
}): VendorAnnouncementValidation {
  const title = String(draft?.title || '').trim();
  const message = String(draft?.message || '').trim();
  const titleLength = title.length;
  const messageLength = message.length;
  const titleRemaining = VENDOR_ANNOUNCEMENT_TITLE_MAX - String(draft?.title || '').length;
  const messageRemaining = VENDOR_ANNOUNCEMENT_MESSAGE_MAX - String(draft?.message || '').length;

  let error = '';
  if (titleLength < VENDOR_ANNOUNCEMENT_TITLE_MIN) {
    error = `Enter an announcement title (${VENDOR_ANNOUNCEMENT_TITLE_MIN}–${VENDOR_ANNOUNCEMENT_TITLE_MAX} characters).`;
  } else if (titleLength > VENDOR_ANNOUNCEMENT_TITLE_MAX) {
    error = `Announcement title cannot exceed ${VENDOR_ANNOUNCEMENT_TITLE_MAX} characters.`;
  } else if (messageLength < VENDOR_ANNOUNCEMENT_MESSAGE_MIN) {
    error = `Enter a message for your followers (${VENDOR_ANNOUNCEMENT_MESSAGE_MIN}–${VENDOR_ANNOUNCEMENT_MESSAGE_MAX} characters).`;
  } else if (messageLength > VENDOR_ANNOUNCEMENT_MESSAGE_MAX) {
    error = `Announcement message cannot exceed ${VENDOR_ANNOUNCEMENT_MESSAGE_MAX} characters.`;
  }

  return {
    valid: error === '',
    titleLength,
    messageLength,
    titleRemaining,
    messageRemaining,
    error,
  };
}

export function buildVendorAnnouncementPreview(opts: {
  shopName?: string;
  vendorId?: string;
  title?: string;
  message?: string;
}): MarketplaceAnnouncement {
  const shopName = String(opts.shopName || '').trim() || 'Your Shop';
  const title = String(opts.title || '').trim() || `Weekend update from ${shopName}`;
  const message =
    String(opts.message || '').trim() ||
    'Type your title and message on the left to preview exactly how this notice appears on the Announcement Board for customers following your shop.';

  return {
    id: 'preview-shop-follower',
    title,
    message,
    audience: 'shop_followers',
    vendorId: String(opts.vendorId || 'preview-vendor'),
    vendorShopName: shopName,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export function summarizeVendorAnnouncements(items: Array<Partial<MarketplaceAnnouncement>>): {
  total: number;
  activeCount: number;
  cancelledCount: number;
  totalDelivered: number;
} {
  let activeCount = 0;
  let cancelledCount = 0;
  let totalDelivered = 0;
  for (const item of items) {
    if (isAnnouncementActive(item)) activeCount += 1;
    else cancelledCount += 1;
    totalDelivered += Math.max(0, Number(item?.deliveredCount ?? item?.sentCount ?? 0) || 0);
  }
  return {
    total: items.length,
    activeCount,
    cancelledCount,
    totalDelivered,
  };
}
