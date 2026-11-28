export type VerificationTierId = 'starter' | 'plus' | 'premium' | 'pro_max';
export type VendorPlanId = 'free' | VerificationTierId;
export type VerificationBillingCycle = 'monthly' | 'quarterly' | 'annual';
export type VerificationPaymentMethod = 'Paystack' | 'Wallet' | 'Bank transfer';
export type VendorAnalyticsPeriod = 'day' | 'week' | 'month' | 'year';
export type VendorBadgeScope = 'none' | 'shop' | 'shop_and_products' | 'directory_priority' | 'top_spotlight';

export type VendorVerificationWorkflowStatus =
  | 'unverified'
  | 'awaiting_payment'
  | 'paid_awaiting_details'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'revoked';

export interface VendorEntitlements {
  planId: VendorPlanId;
  planName: string;
  monthlyPrice: number;
  isPaidTier: boolean;
  rank: number;
  maxProducts: number | null;
  maxProductImages: number;
  allowProductVideos: boolean;
  allowCoverBanner: boolean;
  allowProductDiscounts: boolean;
  allowScheduledFlashSales: boolean;
  maxActiveCoupons: number | null;
  maxAffiliateCommissionPercent: number;
  analyticsPeriods: ReadonlyArray<VendorAnalyticsPeriod>;
  allowCsvExport: boolean;
  allowTopProductsAnalytics: boolean;
  allowVerifiedTrustSummary: boolean;
  badgeScope: VendorBadgeScope;
  directoryPriorityRank: number;
  supportPriority: string;
}

export interface VerificationTierConfig {
  id: VerificationTierId;
  name: string;
  monthlyPrice: number;
  audience: string;
  summary: string;
  features: string[];
  entitlements: VendorEntitlements;
}

export interface VerificationCycleConfig {
  id: VerificationBillingCycle;
  label: string;
  shortLabel: string;
  months: number;
  durationDays: number;
  discountPercent: number;
  badgeText?: string;
}

export const FREE_VENDOR_ENTITLEMENTS: VendorEntitlements = {
  planId: 'free',
  planName: 'Free Shop',
  monthlyPrice: 0,
  isPaidTier: false,
  rank: 0,
  maxProducts: 5,
  maxProductImages: 2,
  allowProductVideos: false,
  allowCoverBanner: false,
  allowProductDiscounts: false,
  allowScheduledFlashSales: false,
  maxActiveCoupons: 0,
  maxAffiliateCommissionPercent: 0,
  analyticsPeriods: ['day'],
  allowCsvExport: false,
  allowTopProductsAnalytics: false,
  allowVerifiedTrustSummary: false,
  badgeScope: 'none',
  directoryPriorityRank: 0,
  supportPriority: 'Standard queue',
};

export const VERIFICATION_TIERS: ReadonlyArray<VerificationTierConfig> = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 3000,
    audience: 'For new & independent shops',
    summary: 'Essential verification badge, custom cover banner, discounts, and up to 20 listings.',
    features: [
      'Blue verified tick on shop profile & Vendor Shops directory',
      'Up to 20 product listings & 5 photos per product',
      'Shop cover banner upload + product sale discounts',
      'Up to 3 active checkout coupons + Orders CSV export',
      'Today, Week & Month sales analytics',
    ],
    entitlements: {
      planId: 'starter',
      planName: 'Starter',
      monthlyPrice: 3000,
      isPaidTier: true,
      rank: 1,
      maxProducts: 20,
      maxProductImages: 5,
      allowProductVideos: false,
      allowCoverBanner: true,
      allowProductDiscounts: true,
      allowScheduledFlashSales: false,
      maxActiveCoupons: 3,
      maxAffiliateCommissionPercent: 0,
      analyticsPeriods: ['day', 'week', 'month'],
      allowCsvExport: true,
      allowTopProductsAnalytics: false,
      allowVerifiedTrustSummary: false,
      badgeScope: 'shop',
      directoryPriorityRank: 1,
      supportPriority: 'Standard verified',
    },
  },
  {
    id: 'plus',
    name: 'Plus',
    monthlyPrice: 5000,
    audience: 'For growing retail brands',
    summary: 'Product card blue tick, promo videos, timed flash sales, and 15% affiliate partner tools.',
    features: [
      'Everything in Starter + Blue tick beside shop name on product cards',
      'Up to 60 product listings, 8 photos & promo video uploads',
      'Timed flash-sale discount scheduler + up to 15 active coupons',
      'Recruit affiliate partners at 5%–15% commission',
      'Full Today / Week / Month / Year sales analytics + Priority review',
    ],
    entitlements: {
      planId: 'plus',
      planName: 'Plus',
      monthlyPrice: 5000,
      isPaidTier: true,
      rank: 2,
      maxProducts: 60,
      maxProductImages: 8,
      allowProductVideos: true,
      allowCoverBanner: true,
      allowProductDiscounts: true,
      allowScheduledFlashSales: true,
      maxActiveCoupons: 15,
      maxAffiliateCommissionPercent: 15,
      analyticsPeriods: ['day', 'week', 'month', 'year'],
      allowCsvExport: true,
      allowTopProductsAnalytics: false,
      allowVerifiedTrustSummary: false,
      badgeScope: 'shop_and_products',
      directoryPriorityRank: 2,
      supportPriority: 'Priority KYC review',
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 8500,
    audience: 'For high-volume marketplace sellers',
    summary: 'Priority directory placement, top product revenue analytics, and up to 25% affiliate campaigns.',
    features: [
      'Everything in Plus + Priority placement in Vendor Shops directory',
      'Up to 200 product listings, 12 photos & promo videos per item',
      'Up to 50 active checkout coupons + full 5%–25% affiliate caps',
      'Top-selling product revenue breakdown in analytics',
      'Verified business trust summary card on public storefront',
    ],
    entitlements: {
      planId: 'premium',
      planName: 'Premium',
      monthlyPrice: 8500,
      isPaidTier: true,
      rank: 3,
      maxProducts: 200,
      maxProductImages: 12,
      allowProductVideos: true,
      allowCoverBanner: true,
      allowProductDiscounts: true,
      allowScheduledFlashSales: true,
      maxActiveCoupons: 50,
      maxAffiliateCommissionPercent: 25,
      analyticsPeriods: ['day', 'week', 'month', 'year'],
      allowCsvExport: true,
      allowTopProductsAnalytics: true,
      allowVerifiedTrustSummary: true,
      badgeScope: 'directory_priority',
      directoryPriorityRank: 3,
      supportPriority: 'Priority merchant support',
    },
  },
  {
    id: 'pro_max',
    name: 'Pro Max',
    monthlyPrice: 15000,
    audience: 'For flagship & enterprise merchants',
    summary: 'Unlimited listings & coupons, 20 photos per item, top showcase spotlight, and concierge care.',
    features: [
      'Everything in Premium + Top spotlight across Home & Vendor Shops',
      'Unlimited product listings & up to 20 photos + videos per listing',
      'Unlimited active checkout coupons + full 25% affiliate recruitment',
      'Full revenue analytics, Top Products intelligence & CSV export',
      'Dedicated concierge onboarding & account support channel',
    ],
    entitlements: {
      planId: 'pro_max',
      planName: 'Pro Max',
      monthlyPrice: 15000,
      isPaidTier: true,
      rank: 4,
      maxProducts: null,
      maxProductImages: 20,
      allowProductVideos: true,
      allowCoverBanner: true,
      allowProductDiscounts: true,
      allowScheduledFlashSales: true,
      maxActiveCoupons: null,
      maxAffiliateCommissionPercent: 25,
      analyticsPeriods: ['day', 'week', 'month', 'year'],
      allowCsvExport: true,
      allowTopProductsAnalytics: true,
      allowVerifiedTrustSummary: true,
      badgeScope: 'top_spotlight',
      directoryPriorityRank: 4,
      supportPriority: 'Dedicated concierge',
    },
  },
] as const;

export const VERIFICATION_CYCLES: ReadonlyArray<VerificationCycleConfig> = [
  {
    id: 'monthly',
    label: 'Monthly (30 days)',
    shortLabel: '30 days',
    months: 1,
    durationDays: 30,
    discountPercent: 0,
  },
  {
    id: 'quarterly',
    label: 'Quarterly (90 days)',
    shortLabel: '90 days',
    months: 3,
    durationDays: 90,
    discountPercent: 0,
  },
  {
    id: 'annual',
    label: '1 Year · Save 20%',
    shortLabel: '1 year (365 days)',
    months: 12,
    durationDays: 365,
    discountPercent: 20,
    badgeText: 'Save 20%',
  },
] as const;

export interface VerificationFeeBreakdown {
  tier: VerificationTierConfig;
  cycle: VerificationCycleConfig;
  monthlyRate: number;
  months: number;
  durationDays: number;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  effectiveMonthlyRate: number;
  amountKobo: number;
}

export interface VendorMatrixRow {
  group: 'Catalog & Media' | 'Promotions & Growth' | 'Analytics & Storefront';
  feature: string;
  free: string;
  starter: string;
  plus: string;
  premium: string;
  pro_max: string;
}

export const VENDOR_FEATURE_MATRIX: ReadonlyArray<VendorMatrixRow> = [
  {
    group: 'Catalog & Media',
    feature: 'Product catalog limit',
    free: 'Up to 5 products',
    starter: 'Up to 20 products',
    plus: 'Up to 60 products',
    premium: 'Up to 200 products',
    pro_max: 'Unlimited',
  },
  {
    group: 'Catalog & Media',
    feature: 'Photos per product',
    free: 'Up to 2 photos',
    starter: 'Up to 5 photos',
    plus: 'Up to 8 photos',
    premium: 'Up to 12 photos',
    pro_max: 'Up to 20 photos',
  },
  {
    group: 'Catalog & Media',
    feature: 'Product promo videos',
    free: 'Not included',
    starter: 'Not included',
    plus: 'Included',
    premium: 'Included',
    pro_max: 'Included',
  },
  {
    group: 'Catalog & Media',
    feature: 'Shop icon & cover banner',
    free: 'Icon only',
    starter: 'Icon + Cover banner',
    plus: 'Icon + Cover banner',
    premium: 'Icon + Cover banner',
    pro_max: 'Icon + Cover banner',
  },
  {
    group: 'Promotions & Growth',
    feature: 'Product sale discounts',
    free: 'Not included',
    starter: 'Included',
    plus: 'Included + Flash timer',
    premium: 'Included + Flash timer',
    pro_max: 'Included + Flash timer',
  },
  {
    group: 'Promotions & Growth',
    feature: 'Active checkout coupons',
    free: 'Locked (0)',
    starter: 'Up to 3 active',
    plus: 'Up to 15 active',
    premium: 'Up to 50 active',
    pro_max: 'Unlimited',
  },
  {
    group: 'Promotions & Growth',
    feature: 'Affiliate partner commission',
    free: 'Not included',
    starter: 'Not included',
    plus: 'Up to 15%',
    premium: 'Full 5%–25%',
    pro_max: 'Full 5%–25%',
  },
  {
    group: 'Analytics & Storefront',
    feature: 'Sales analytics periods',
    free: 'Today only',
    starter: 'Today, Week, Month',
    plus: 'Full Year + All periods',
    premium: 'All + Top Products',
    pro_max: 'All + Top Products',
  },
  {
    group: 'Analytics & Storefront',
    feature: 'Orders CSV export',
    free: 'Not included',
    starter: 'Included',
    plus: 'Included',
    premium: 'Included',
    pro_max: 'Included',
  },
  {
    group: 'Analytics & Storefront',
    feature: 'Blue verified tick & rank',
    free: 'Unverified',
    starter: 'Shop & Directory',
    plus: 'Shop + Product Cards',
    premium: 'Priority + Trust Card',
    pro_max: 'Top Home Spotlight',
  },
] as const;

export function getVerificationTier(tierId?: string | null): VerificationTierConfig {
  const normalized = String(tierId || '').trim().toLowerCase();
  return VERIFICATION_TIERS.find((t) => t.id === normalized) || VERIFICATION_TIERS[0];
}

export function getVerificationCycle(cycleId?: string | null): VerificationCycleConfig {
  const normalized = String(cycleId || '').trim().toLowerCase();
  return VERIFICATION_CYCLES.find((c) => c.id === normalized) || VERIFICATION_CYCLES[0];
}

export function getEntitlementsForPlan(planId?: string | null): VendorEntitlements {
  const normalized = String(planId || '').trim().toLowerCase();
  if (!normalized || normalized === 'free') return FREE_VENDOR_ENTITLEMENTS;
  const tier = VERIFICATION_TIERS.find((t) => t.id === normalized);
  return tier ? tier.entitlements : FREE_VENDOR_ENTITLEMENTS;
}

export function getVendorEntitlements(
  vendor?: {
    status?: string;
    isVerified?: boolean;
    verificationTier?: string;
    verifiedUntil?: string;
  } | null,
  nowMs = Date.now()
): VendorEntitlements {
  if (!isVendorVerificationActive(vendor, nowMs)) {
    return FREE_VENDOR_ENTITLEMENTS;
  }
  const tier = getVerificationTier(vendor?.verificationTier || 'starter');
  return tier.entitlements;
}

export function computeVerificationFee(
  tierId?: string | null,
  cycleId?: string | null
): VerificationFeeBreakdown {
  const tier = getVerificationTier(tierId);
  const cycle = getVerificationCycle(cycleId);
  const baseAmount = tier.monthlyPrice * cycle.months;
  const discountAmount = Math.round((baseAmount * cycle.discountPercent) / 100);
  const totalAmount = Math.max(0, baseAmount - discountAmount);
  const effectiveMonthlyRate = Math.round(totalAmount / Math.max(1, cycle.months));
  return {
    tier,
    cycle,
    monthlyRate: tier.monthlyPrice,
    months: cycle.months,
    durationDays: cycle.durationDays,
    baseAmount,
    discountPercent: cycle.discountPercent,
    discountAmount,
    totalAmount,
    effectiveMonthlyRate,
    amountKobo: Math.round(totalAmount * 100),
  };
}

export function computeVerificationExpiry(approvedAtIso: string, durationDays: number): string {
  const baseMs = Date.parse(approvedAtIso);
  const startMs = Number.isFinite(baseMs) ? baseMs : Date.now();
  const safeDays = Math.max(1, Math.floor(Number(durationDays) || 30));
  return new Date(startMs + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

export function isVendorVerificationActive(
  vendor?: {
    status?: string;
    isVerified?: boolean;
    verifiedUntil?: string;
  } | null,
  nowMs = Date.now()
): boolean {
  if (!vendor || !vendor.isVerified) return false;
  if (vendor.status && vendor.status !== 'approved') return false;
  if (vendor.verifiedUntil) {
    const expiryMs = Date.parse(vendor.verifiedUntil);
    if (Number.isFinite(expiryMs) && expiryMs <= nowMs) {
      return false;
    }
  }
  return true;
}

export function validateVendorProductAgainstEntitlements(
  entitlements: VendorEntitlements,
  input: {
    isNew: boolean;
    currentProductCount: number;
    imageCount: number;
    videoCount: number;
    discountPrice: number;
    hasFlashSchedule: boolean;
    affiliateCommissionPercent: number;
    previousImageCount?: number;
    previousVideoCount?: number;
    previousDiscountPrice?: number;
    previousHasFlashSchedule?: boolean;
    previousAffiliateCommissionPercent?: number;
  }
): { ok: true } | { ok: false; error: string } {
  if (
    input.isNew &&
    entitlements.maxProducts !== null &&
    input.currentProductCount >= entitlements.maxProducts
  ) {
    return {
      ok: false,
      error: `Your ${entitlements.planName} allows up to ${entitlements.maxProducts} product listings. Upgrade your verification tier in Seller Centre -> Verify Shop to publish more.`,
    };
  }

  const allowedExistingImages = Math.max(
    entitlements.maxProductImages,
    input.isNew ? 0 : Number(input.previousImageCount || 0)
  );
  if (input.imageCount > allowedExistingImages) {
    return {
      ok: false,
      error: `${entitlements.planName} supports up to ${entitlements.maxProductImages} photos per product. Remove extra photos or upgrade your plan.`,
    };
  }

  const prevVideos = input.isNew ? 0 : Number(input.previousVideoCount || 0);
  if (!entitlements.allowProductVideos && input.videoCount > prevVideos) {
    return {
      ok: false,
      error: `Product video uploads unlock on Plus (₦5,000/mo), Premium, and Pro Max. Upgrade your shop plan to attach videos.`,
    };
  }

  const prevDiscount = input.isNew ? 0 : Number(input.previousDiscountPrice || 0);
  if (!entitlements.allowProductDiscounts && input.discountPrice > 0 && input.discountPrice !== prevDiscount) {
    return {
      ok: false,
      error: `Product sale discounts unlock on Starter (₦3,000/mo) and above. Verify your shop to run product discounts.`,
    };
  }

  const prevSchedule = input.isNew ? false : Boolean(input.previousHasFlashSchedule);
  if (!entitlements.allowScheduledFlashSales && input.hasFlashSchedule && !prevSchedule) {
    return {
      ok: false,
      error: `Timed flash-sale start & end schedules unlock on Plus (₦5,000/mo) and above.`,
    };
  }

  const prevAff = input.isNew ? 0 : Number(input.previousAffiliateCommissionPercent || 0);
  if (
    input.affiliateCommissionPercent > entitlements.maxAffiliateCommissionPercent &&
    input.affiliateCommissionPercent > prevAff
  ) {
    if (entitlements.maxAffiliateCommissionPercent === 0) {
      return {
        ok: false,
        error: `Affiliate partner recruitment unlocks on Plus (up to 15%) and Premium / Pro Max (up to 25%). Set affiliate commission to 0% on ${entitlements.planName} or upgrade.`,
      };
    }
    return {
      ok: false,
      error: `${entitlements.planName} allows affiliate commissions up to ${entitlements.maxAffiliateCommissionPercent}%. Upgrade to Premium or Pro Max for up to 25%.`,
    };
  }

  return { ok: true };
}

export function validateVendorCouponCreation(
  entitlements: VendorEntitlements,
  activeCouponCount: number
): { ok: true } | { ok: false; error: string } {
  if (entitlements.maxActiveCoupons === 0) {
    return {
      ok: false,
      error: `Checkout promo coupons are unavailable on Free Shop. Upgrade to Starter (₦3,000/month or ₦28,800/year) or higher to create coupons.`,
    };
  }
  if (
    entitlements.maxActiveCoupons !== null &&
    activeCouponCount >= entitlements.maxActiveCoupons
  ) {
    return {
      ok: false,
      error: `Your ${entitlements.planName} plan supports up to ${entitlements.maxActiveCoupons} active coupons. Deactivate an expired/unused coupon or upgrade your plan.`,
    };
  }
  return { ok: true };
}

export interface VendorVerificationKycPayload {
  legalBusinessName: string;
  businessType: string;
  cacNumber: string;
  tinNumber?: string;
  ownerFullName: string;
  ownerRole: string;
  nationalIdType: string;
  nationalIdNumber: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerAddress: string;
  businessAddress: string;
  city: string;
  state: string;
  yearsInOperation: string;
  businessDescription: string;
  websiteOrSocial?: string;
}

export interface VendorVerificationRecord extends Partial<VendorVerificationKycPayload> {
  id: string;
  vendorId: string;
  shopName?: string;
  tierId: VerificationTierId;
  tierName: string;
  billingCycle: VerificationBillingCycle;
  durationDays: number;
  monthlyRate: number;
  baseAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  feeAmount: number;
  paymentMethod: VerificationPaymentMethod;
  paymentStatus: 'pending' | 'pending_confirmation' | 'paid';
  paymentReference: string;
  paidAt?: string;
  cacDocumentPath?: string;
  cacDocumentName?: string;
  cacDocumentContentType?: string;
  nationalIdDocumentPath?: string;
  nationalIdDocumentName?: string;
  nationalIdDocumentContentType?: string;
  documentsSubmittedAt?: string;
  status: VendorVerificationWorkflowStatus;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  verifiedAt?: string;
  verifiedUntil?: string;
  createdAt: string;
  updatedAt?: string;
}

export function validateVerificationKycPayload(
  raw: Partial<VendorVerificationKycPayload>,
  docs: { hasCacDocument: boolean; hasNationalIdDocument: boolean }
): { ok: true; clean: VendorVerificationKycPayload } | { ok: false; error: string } {
  const clean: VendorVerificationKycPayload = {
    legalBusinessName: String(raw.legalBusinessName || '').trim().slice(0, 140),
    businessType: String(raw.businessType || '').trim().slice(0, 80),
    cacNumber: String(raw.cacNumber || '').trim().toUpperCase().slice(0, 40),
    tinNumber: String(raw.tinNumber || '').trim().slice(0, 40),
    ownerFullName: String(raw.ownerFullName || '').trim().slice(0, 120),
    ownerRole: String(raw.ownerRole || '').trim().slice(0, 60),
    nationalIdType: String(raw.nationalIdType || 'National ID / NIN').trim().slice(0, 60),
    nationalIdNumber: String(raw.nationalIdNumber || '').trim().slice(0, 40),
    ownerPhone: String(raw.ownerPhone || '').trim().slice(0, 30),
    ownerEmail: String(raw.ownerEmail || '').trim().slice(0, 120),
    ownerAddress: String(raw.ownerAddress || '').trim().slice(0, 240),
    businessAddress: String(raw.businessAddress || '').trim().slice(0, 240),
    city: String(raw.city || '').trim().slice(0, 80),
    state: String(raw.state || '').trim().slice(0, 80),
    yearsInOperation: String(raw.yearsInOperation || '').trim().slice(0, 40),
    businessDescription: String(raw.businessDescription || '').trim().slice(0, 1200),
    websiteOrSocial: String(raw.websiteOrSocial || '').trim().slice(0, 160),
  };

  if (clean.legalBusinessName.length < 2) {
    return { ok: false, error: 'Enter your registered legal business name.' };
  }
  if (!clean.businessType) {
    return { ok: false, error: 'Select your business registration type.' };
  }
  if (clean.cacNumber.length < 4) {
    return { ok: false, error: 'Enter your valid CAC registration number (e.g. RC or BN number).' };
  }
  if (clean.ownerFullName.length < 2) {
    return { ok: false, error: 'Enter the shop owner full legal name.' };
  }
  if (!clean.ownerRole) {
    return { ok: false, error: 'Enter the owner role in the business.' };
  }
  if (clean.nationalIdNumber.length < 6) {
    return { ok: false, error: 'Enter a valid National ID / NIN number.' };
  }
  if (clean.ownerPhone.length < 5) {
    return { ok: false, error: 'Enter the shop owner contact phone number.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.ownerEmail)) {
    return { ok: false, error: 'Enter a valid business / owner email address.' };
  }
  if (clean.ownerAddress.length < 5) {
    return { ok: false, error: 'Enter the shop owner residential address.' };
  }
  if (clean.businessAddress.length < 5) {
    return { ok: false, error: 'Enter the business / shop physical street address.' };
  }
  if (!clean.city || !clean.state) {
    return { ok: false, error: 'Enter the business city and state.' };
  }
  if (!clean.yearsInOperation) {
    return { ok: false, error: 'Specify how long your business has been operating.' };
  }
  if (clean.businessDescription.length < 10) {
    return { ok: false, error: 'Provide a clear description of your business and what your shop sells.' };
  }
  if (!docs.hasCacDocument) {
    return { ok: false, error: 'Attach your Business CAC certificate or registration document.' };
  }
  if (!docs.hasNationalIdDocument) {
    return { ok: false, error: 'Attach your National ID card / NIN slip.' };
  }

  return { ok: true, clean };
}

export function getVerificationStepSummary(
  record?: Partial<VendorVerificationRecord> | null
): {
  step: 1 | 2 | 3 | 4;
  paymentPaid: boolean;
  paymentPendingConfirmation: boolean;
  docsSubmitted: boolean;
  isVerified: boolean;
  isRejected: boolean;
  statusLabel: string;
} {
  if (!record || record.status === 'unverified') {
    return {
      step: 1,
      paymentPaid: false,
      paymentPendingConfirmation: false,
      docsSubmitted: false,
      isVerified: false,
      isRejected: false,
      statusLabel: 'Not verified',
    };
  }

  const paymentPaid = record.paymentStatus === 'paid';
  const paymentPendingConfirmation = record.paymentStatus === 'pending_confirmation';
  const docsSubmitted = Boolean(
    record.documentsSubmittedAt &&
      record.cacDocumentPath &&
      record.nationalIdDocumentPath &&
      record.cacNumber &&
      record.nationalIdNumber
  );

  if (record.status === 'verified') {
    return {
      step: 4,
      paymentPaid,
      paymentPendingConfirmation,
      docsSubmitted,
      isVerified: true,
      isRejected: false,
      statusLabel: 'Verified Shop',
    };
  }
  if (record.status === 'rejected') {
    return {
      step: paymentPaid ? 2 : 1,
      paymentPaid,
      paymentPendingConfirmation,
      docsSubmitted,
      isVerified: false,
      isRejected: true,
      statusLabel: 'Needs updates / Rejected',
    };
  }
  if (record.status === 'revoked') {
    return {
      step: 1,
      paymentPaid: false,
      paymentPendingConfirmation: false,
      docsSubmitted,
      isVerified: false,
      isRejected: false,
      statusLabel: 'Verification revoked',
    };
  }
  if (record.status === 'pending_review') {
    return {
      step: 3,
      paymentPaid,
      paymentPendingConfirmation,
      docsSubmitted: true,
      isVerified: false,
      isRejected: false,
      statusLabel: 'Awaiting Admin Approval',
    };
  }
  if (paymentPaid) {
    return {
      step: 2,
      paymentPaid: true,
      paymentPendingConfirmation: false,
      docsSubmitted,
      isVerified: false,
      isRejected: false,
      statusLabel: 'Paid — Attach CAC, ID & Business Info',
    };
  }

  return {
    step: 1,
    paymentPaid: false,
    paymentPendingConfirmation,
    docsSubmitted,
    isVerified: false,
    isRejected: false,
    statusLabel: paymentPendingConfirmation ? 'Awaiting Payment Confirmation' : 'Payment Pending',
  };
}
