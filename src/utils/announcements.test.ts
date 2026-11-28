import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VENDOR_ANNOUNCEMENT_PRESETS,
  buildAnnouncementViewerContext,
  buildVendorAnnouncementPreview,
  canViewerSeeAnnouncement,
  computeAnnouncementRecipients,
  computeVendorFollowerRecipients,
  filterVisibleAnnouncements,
  formatAnnouncementAudienceLabel,
  normalizeAdminAnnouncementAudience,
  normalizeAnnouncementAudience,
  summarizeVendorAnnouncements,
  validateVendorAnnouncementDraft,
  type MarketplaceAnnouncement,
} from './announcements';

const SAMPLE_ANNOUNCEMENTS: MarketplaceAnnouncement[] = [
  {
    id: 'ann-all',
    title: 'Weekend Marketplace Update',
    message: 'New verified digital bundles are live.',
    audience: 'all',
    status: 'active',
    createdAt: '2026-11-26T10:00:00.000Z',
  },
  {
    id: 'ann-customers',
    title: 'Customer Wallet Promo',
    message: 'Check out faster with zero wallet fee.',
    audience: 'customers',
    status: 'active',
    createdAt: '2026-11-26T11:00:00.000Z',
  },
  {
    id: 'ann-vendors',
    title: 'Vendor Payout Cutoff',
    message: 'Submit payout requests before 5pm.',
    audience: 'vendors',
    status: 'active',
    createdAt: '2026-11-26T12:00:00.000Z',
  },
  {
    id: 'ann-affiliates',
    title: 'Affiliate Bonus Week',
    message: 'Double commission on selected courses.',
    audience: 'affiliates',
    status: 'active',
    createdAt: '2026-11-26T13:00:00.000Z',
  },
  {
    id: 'ann-shop-followers',
    title: 'Flash Drop for Studio Followers',
    message: '20% off our UI Kit until Friday.',
    audience: 'shop_followers',
    vendorId: 'ven-1',
    vendorShopName: 'Studio Yakaji',
    status: 'active',
    createdAt: '2026-11-26T13:30:00.000Z',
  },
  {
    id: 'ann-cancelled',
    title: 'Old Notice',
    message: 'Should never show once cancelled.',
    audience: 'all',
    status: 'cancelled',
    createdAt: '2026-11-26T14:00:00.000Z',
  },
];

test('normalizeAnnouncementAudience accepts all target groups and rejects invalid values', () => {
  assert.equal(normalizeAnnouncementAudience('all'), 'all');
  assert.equal(normalizeAnnouncementAudience('customers'), 'customers');
  assert.equal(normalizeAnnouncementAudience('vendors'), 'vendors');
  assert.equal(normalizeAnnouncementAudience('affiliates'), 'affiliates');
  assert.equal(normalizeAnnouncementAudience('shop_followers'), 'shop_followers');
  assert.equal(normalizeAnnouncementAudience('VENDORS'), 'vendors');
  assert.equal(normalizeAnnouncementAudience('staff'), null);

  assert.equal(normalizeAdminAnnouncementAudience('all'), 'all');
  assert.equal(normalizeAdminAnnouncementAudience('shop_followers'), null);
});

test('guests only see active "all" announcements', () => {
  const guest = buildAnnouncementViewerContext({ userId: null });
  const visible = filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, guest);
  assert.deepEqual(
    visible.map((a) => a.id),
    ['ann-all']
  );
});

test('signed-in customers only see "all", "customers", and followed shop announcements', () => {
  const nonFollower = buildAnnouncementViewerContext({
    userId: 'cust-1',
    vendorRecord: null,
    affiliateRecord: null,
    followedVendorIds: ['other-shop'],
  });
  assert.deepEqual(
    filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, nonFollower).map((a) => a.id),
    ['ann-customers', 'ann-all']
  );

  const follower = buildAnnouncementViewerContext({
    userId: 'cust-2',
    vendorRecord: null,
    affiliateRecord: null,
    followedVendorIds: ['ven-1'],
  });
  assert.deepEqual(
    filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, follower).map((a) => a.id),
    ['ann-shop-followers', 'ann-customers', 'ann-all']
  );
});

test('vendors only see "all" and "vendors" announcements unless they follow another shop', () => {
  const vendor = buildAnnouncementViewerContext({
    userId: 'ven-1',
    vendorRecord: { id: 'ven-1', status: 'approved' },
    affiliateRecord: null,
  });
  const visible = filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, vendor);
  assert.deepEqual(
    visible.map((a) => a.id),
    ['ann-vendors', 'ann-all']
  );
});

test('affiliate marketers only see "all" and "affiliates" announcements', () => {
  const affiliate = buildAnnouncementViewerContext({
    userId: 'aff-1',
    vendorRecord: null,
    affiliateRecord: { id: 'aff-1', userId: 'aff-1', status: 'approved' },
  });
  const visible = filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, affiliate);
  assert.deepEqual(
    visible.map((a) => a.id),
    ['ann-affiliates', 'ann-all']
  );
});

test('rejected or suspended vendors/affiliates revert to customer role eligibility and never receive restricted broadcasts', () => {
  const rejectedVendor = buildAnnouncementViewerContext({
    userId: 'usr-2',
    vendorRecord: { id: 'usr-2', status: 'rejected' },
    affiliateRecord: { id: 'usr-2', status: 'suspended' },
  });
  assert.equal(rejectedVendor.isVendor, false);
  assert.equal(rejectedVendor.isAffiliate, false);
  assert.equal(rejectedVendor.isCustomer, true);
  assert.equal(canViewerSeeAnnouncement(SAMPLE_ANNOUNCEMENTS[2], rejectedVendor), false);
  assert.equal(canViewerSeeAnnouncement(SAMPLE_ANNOUNCEMENTS[3], rejectedVendor), false);
});

test('dismissed announcements are excluded from board visibility and sorted newest first', () => {
  const affiliate = buildAnnouncementViewerContext({
    userId: 'aff-1',
    affiliateRecord: { id: 'aff-1', status: 'active' },
  });
  const visible = filterVisibleAnnouncements(SAMPLE_ANNOUNCEMENTS, affiliate, ['ann-affiliates']);
  assert.deepEqual(
    visible.map((a) => a.id),
    ['ann-all']
  );
});

test('computeAnnouncementRecipients isolates customers, vendors, affiliates, and all cleanly', () => {
  const profiles = [
    { id: 'u-cust' },
    { id: 'u-ven' },
    { id: 'u-aff' },
    { id: 'u-rej-ven' },
  ];
  const vendors = [
    { id: 'u-ven', status: 'approved' },
    { id: 'u-rej-ven', status: 'rejected' },
  ];
  const affiliates = [
    { id: 'u-aff', userId: 'u-aff', status: 'approved' },
  ];

  assert.deepEqual(
    computeAnnouncementRecipients({ audience: 'vendors', profiles, vendors, affiliates }),
    ['u-ven']
  );
  assert.deepEqual(
    computeAnnouncementRecipients({ audience: 'affiliates', profiles, vendors, affiliates }),
    ['u-aff']
  );
  assert.deepEqual(
    computeAnnouncementRecipients({ audience: 'customers', profiles, vendors, affiliates }),
    ['u-cust', 'u-rej-ven']
  );
  assert.deepEqual(
    computeAnnouncementRecipients({ audience: 'all', profiles, vendors, affiliates }).sort(),
    ['u-aff', 'u-cust', 'u-rej-ven', 'u-ven']
  );
});

test('computeVendorFollowerRecipients targets only followers of the shop and deduplicates', () => {
  const follows = [
    { userId: 'cust-1', vendorId: 'ven-1' },
    { userId: 'cust-2', vendorId: 'ven-1' },
    { userId: 'cust-1', vendorId: 'ven-1' },
    { userId: 'ven-1', vendorId: 'ven-1' },
    { userId: 'cust-3', vendorId: 'ven-2' },
  ];
  assert.deepEqual(computeVendorFollowerRecipients(follows, 'ven-1'), ['cust-1', 'cust-2']);
});

test('formatAnnouncementAudienceLabel returns clear labels for every audience', () => {
  assert.equal(formatAnnouncementAudienceLabel('all'), 'Marketplace Notice · All Users');
  assert.equal(formatAnnouncementAudienceLabel('customers'), 'Customers Only');
  assert.equal(formatAnnouncementAudienceLabel('vendors'), 'Vendors Only');
  assert.equal(formatAnnouncementAudienceLabel('affiliates'), 'Affiliate Marketers Only');
  assert.equal(formatAnnouncementAudienceLabel('shop_followers', 'Studio Yakaji'), 'Studio Yakaji · Shop Followers');
});

test('validateVendorAnnouncementDraft enforces character limits and computes remaining counts', () => {
  const empty = validateVendorAnnouncementDraft({ title: 'A', message: 'Hi' });
  assert.equal(empty.valid, false);
  assert.match(empty.error, /title/i);

  const missingBody = validateVendorAnnouncementDraft({ title: 'Restock Alert', message: ' ' });
  assert.equal(missingBody.valid, false);
  assert.match(missingBody.error, /message/i);

  const ok = validateVendorAnnouncementDraft({
    title: 'Weekend Restock',
    message: 'Fresh batches are now live in our store.',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.error, '');
  assert.equal(ok.titleRemaining, 120 - 'Weekend Restock'.length);
});

test('vendor announcement presets, preview builder, and summary work cleanly', () => {
  assert.deepEqual(
    VENDOR_ANNOUNCEMENT_PRESETS.map((p) => p.label),
    ['New Product Arrival', 'Seasonal Sale', 'Shop Update', 'Stock Replenished']
  );

  for (const preset of VENDOR_ANNOUNCEMENT_PRESETS) {
    const built = preset.build('Kano Crafts');
    assert.equal(validateVendorAnnouncementDraft(built).valid, true);
    assert.match(built.title + ' ' + built.message, /Kano Crafts/);
  }

  const presetCopy = VENDOR_ANNOUNCEMENT_PRESETS[0].build('Kano Crafts');
  const preview = buildVendorAnnouncementPreview({
    shopName: 'Kano Crafts',
    vendorId: 'ven-9',
    title: presetCopy.title,
    message: presetCopy.message,
  });
  assert.equal(preview.audience, 'shop_followers');
  assert.equal(preview.vendorShopName, 'Kano Crafts');

  const summary = summarizeVendorAnnouncements([
    { id: '1', status: 'active', deliveredCount: 14 },
    { id: '2', status: 'cancelled', deliveredCount: 9 },
    { id: '3', status: 'active', sentCount: 5 },
  ]);
  assert.deepEqual(summary, {
    total: 3,
    activeCount: 2,
    cancelledCount: 1,
    totalDelivered: 28,
  });
});
