import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREE_VENDOR_ENTITLEMENTS,
  VERIFICATION_TIERS,
  computeVerificationExpiry,
  computeVerificationFee,
  getVendorEntitlements,
  getVerificationStepSummary,
  isVendorVerificationActive,
  validateVendorCouponCreation,
  validateVendorProductAgainstEntitlements,
  validateVerificationKycPayload,
} from './vendorVerification.ts';

test('verification tiers cover Starter (3,000/month) up through Plus, Premium, and Pro Max with 1-year 20% annual discount', () => {
  assert.deepEqual(
    VERIFICATION_TIERS.map((t) => t.id),
    ['starter', 'plus', 'premium', 'pro_max']
  );

  const starterMonthly = computeVerificationFee('starter', 'monthly');
  assert.equal(starterMonthly.monthlyRate, 3000);
  assert.equal(starterMonthly.durationDays, 30);
  assert.equal(starterMonthly.discountPercent, 0);
  assert.equal(starterMonthly.totalAmount, 3000);
  assert.equal(starterMonthly.amountKobo, 300000);

  const starterQuarterly = computeVerificationFee('starter', 'quarterly');
  assert.equal(starterQuarterly.monthlyRate, 3000);
  assert.equal(starterQuarterly.months, 3);
  assert.equal(starterQuarterly.durationDays, 90);
  assert.equal(starterQuarterly.totalAmount, 9000);
  assert.equal(starterQuarterly.amountKobo, 900000);

  const starterAnnual = computeVerificationFee('starter', 'annual');
  assert.equal(starterAnnual.months, 12);
  assert.equal(starterAnnual.durationDays, 365);
  assert.equal(starterAnnual.baseAmount, 36000);
  assert.equal(starterAnnual.discountPercent, 20);
  assert.equal(starterAnnual.discountAmount, 7200);
  assert.equal(starterAnnual.totalAmount, 28800);
  assert.equal(starterAnnual.effectiveMonthlyRate, 2400);
  assert.equal(starterAnnual.amountKobo, 2880000);

  const plusAnnual = computeVerificationFee('plus', 'annual');
  assert.equal(plusAnnual.baseAmount, 60000);
  assert.equal(plusAnnual.discountAmount, 12000);
  assert.equal(plusAnnual.totalAmount, 48000);

  const premiumAnnual = computeVerificationFee('premium', 'annual');
  assert.equal(premiumAnnual.baseAmount, 102000);
  assert.equal(premiumAnnual.discountAmount, 20400);
  assert.equal(premiumAnnual.totalAmount, 81600);

  const proMaxQuarterly = computeVerificationFee('pro_max', 'quarterly');
  assert.equal(proMaxQuarterly.tier.name, 'Pro Max');
  assert.equal(proMaxQuarterly.monthlyRate, 15000);
  assert.equal(proMaxQuarterly.totalAmount, 45000);

  const proMaxAnnual = computeVerificationFee('pro_max', 'annual');
  assert.equal(proMaxAnnual.baseAmount, 180000);
  assert.equal(proMaxAnnual.discountAmount, 36000);
  assert.equal(proMaxAnnual.totalAmount, 144000);
});

test('getVendorEntitlements isolates Free vendors from paid tools and scales features across Starter -> Plus -> Premium -> Pro Max', () => {
  const free = getVendorEntitlements({ status: 'approved', isVerified: false });
  assert.deepEqual(free, FREE_VENDOR_ENTITLEMENTS);
  assert.equal(free.maxProducts, 5);
  assert.equal(free.maxActiveCoupons, 0);
  assert.equal(free.allowCoverBanner, false);
  assert.equal(free.allowProductDiscounts, false);
  assert.equal(free.allowCsvExport, false);
  assert.deepEqual(free.analyticsPeriods, ['day']);

  const future = '2027-12-01T00:00:00.000Z';
  const now = Date.parse('2026-11-26T00:00:00.000Z');

  const starter = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'starter', verifiedUntil: future },
    now
  );
  assert.equal(starter.maxProducts, 20);
  assert.equal(starter.maxProductImages, 5);
  assert.equal(starter.allowCoverBanner, true);
  assert.equal(starter.allowProductDiscounts, true);
  assert.equal(starter.allowProductVideos, false);
  assert.equal(starter.maxActiveCoupons, 3);
  assert.equal(starter.maxAffiliateCommissionPercent, 0);
  assert.equal(starter.allowCsvExport, true);

  const plus = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'plus', verifiedUntil: future },
    now
  );
  assert.equal(plus.maxProducts, 60);
  assert.equal(plus.allowProductVideos, true);
  assert.equal(plus.allowScheduledFlashSales, true);
  assert.equal(plus.maxActiveCoupons, 15);
  assert.equal(plus.maxAffiliateCommissionPercent, 15);
  assert.equal(plus.allowTopProductsAnalytics, false);

  const premium = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'premium', verifiedUntil: future },
    now
  );
  assert.equal(premium.maxProducts, 200);
  assert.equal(premium.maxActiveCoupons, 50);
  assert.equal(premium.maxAffiliateCommissionPercent, 25);
  assert.equal(premium.allowTopProductsAnalytics, true);
  assert.equal(premium.allowVerifiedTrustSummary, true);

  const proMax = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'pro_max', verifiedUntil: future },
    now
  );
  assert.equal(proMax.maxProducts, null);
  assert.equal(proMax.maxActiveCoupons, null);
  assert.equal(proMax.maxProductImages, 20);
  assert.equal(proMax.directoryPriorityRank, 4);

  // Expired verification reverts immediately to Free entitlements
  const expired = getVendorEntitlements(
    {
      status: 'approved',
      isVerified: true,
      verificationTier: 'pro_max',
      verifiedUntil: '2026-10-01T00:00:00.000Z',
    },
    now
  );
  assert.equal(expired.planId, 'free');
  assert.equal(expired.maxProducts, 5);
  assert.equal(expired.maxActiveCoupons, 0);
});

test('validateVendorProductAgainstEntitlements & validateVendorCouponCreation enforce plan gates accurately', () => {
  const future = '2027-12-01T00:00:00.000Z';
  const now = Date.parse('2026-11-26T00:00:00.000Z');
  const free = getVendorEntitlements({ status: 'approved', isVerified: false }, now);
  const starter = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'starter', verifiedUntil: future },
    now
  );
  const plus = getVendorEntitlements(
    { status: 'approved', isVerified: true, verificationTier: 'plus', verifiedUntil: future },
    now
  );

  // Free shop hits 5 product cap and cannot add discount/video/affiliate
  assert.equal(
    validateVendorProductAgainstEntitlements(free, {
      isNew: true,
      currentProductCount: 5,
      imageCount: 1,
      videoCount: 0,
      discountPrice: 0,
      hasFlashSchedule: false,
      affiliateCommissionPercent: 0,
    }).ok,
    false
  );
  assert.equal(
    validateVendorProductAgainstEntitlements(free, {
      isNew: true,
      currentProductCount: 2,
      imageCount: 1,
      videoCount: 0,
      discountPrice: 1500,
      hasFlashSchedule: false,
      affiliateCommissionPercent: 0,
    }).ok,
    false
  );
  assert.equal(validateVendorCouponCreation(free, 0).ok, false);

  // Starter unlocks discounts & 3 coupons, but not video or affiliate > 0%
  assert.equal(
    validateVendorProductAgainstEntitlements(starter, {
      isNew: true,
      currentProductCount: 5,
      imageCount: 5,
      videoCount: 0,
      discountPrice: 2000,
      hasFlashSchedule: false,
      affiliateCommissionPercent: 0,
    }).ok,
    true
  );
  assert.equal(
    validateVendorProductAgainstEntitlements(starter, {
      isNew: true,
      currentProductCount: 5,
      imageCount: 3,
      videoCount: 1,
      discountPrice: 2000,
      hasFlashSchedule: false,
      affiliateCommissionPercent: 0,
    }).ok,
    false
  );
  assert.equal(validateVendorCouponCreation(starter, 2).ok, true);
  assert.equal(validateVendorCouponCreation(starter, 3).ok, false);

  // Plus unlocks videos, flash timer, and up to 15% affiliate commission
  assert.equal(
    validateVendorProductAgainstEntitlements(plus, {
      isNew: true,
      currentProductCount: 10,
      imageCount: 6,
      videoCount: 1,
      discountPrice: 2000,
      hasFlashSchedule: true,
      affiliateCommissionPercent: 15,
    }).ok,
    true
  );
  assert.equal(
    validateVendorProductAgainstEntitlements(plus, {
      isNew: true,
      currentProductCount: 10,
      imageCount: 6,
      videoCount: 1,
      discountPrice: 2000,
      hasFlashSchedule: true,
      affiliateCommissionPercent: 25,
    }).ok,
    false
  );
});

test('validateVerificationKycPayload requires CAC document, National ID card, and complete owner/business details', () => {
  const validInput = {
    legalBusinessName: 'Yakaji Studio Enterprises',
    businessType: 'Limited Liability Company (LLC)',
    cacNumber: 'RC-1928374',
    tinNumber: 'TIN-889120',
    ownerFullName: 'Amina Bello',
    ownerRole: 'Managing Director',
    nationalIdType: 'National ID / NIN',
    nationalIdNumber: '12345678901',
    ownerPhone: '+2348012345678',
    ownerEmail: 'amina@yakajistudio.com',
    ownerAddress: '12 Wuse II Street, Abuja',
    businessAddress: 'Plot 44 Aminu Kano Crescent, Wuse II',
    city: 'Abuja',
    state: 'FCT',
    yearsInOperation: '3 years',
    businessDescription: 'Selling verified digital production tools, studio gear, and creator kits.',
  };

  const missingCac = validateVerificationKycPayload(validInput, {
    hasCacDocument: false,
    hasNationalIdDocument: true,
  });
  assert.equal(missingCac.ok, false);

  const missingNationalId = validateVerificationKycPayload(validInput, {
    hasCacDocument: true,
    hasNationalIdDocument: false,
  });
  assert.equal(missingNationalId.ok, false);

  const valid = validateVerificationKycPayload(validInput, {
    hasCacDocument: true,
    hasNationalIdDocument: true,
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.clean.cacNumber, 'RC-1928374');
  }
});

test('getVerificationStepSummary tracks payment -> KYC attachment -> pending review -> verified progression', () => {
  assert.equal(getVerificationStepSummary(null).step, 1);
  assert.equal(
    getVerificationStepSummary({
      paymentStatus: 'paid',
      status: 'paid_awaiting_details',
    }).step,
    2
  );
  assert.equal(
    getVerificationStepSummary({
      paymentStatus: 'paid',
      status: 'pending_review',
      documentsSubmittedAt: '2026-11-26T10:00:00.000Z',
      cacDocumentPath: 'vendor-kyc/v1/cac.png',
      nationalIdDocumentPath: 'vendor-kyc/v1/id.png',
      cacNumber: 'RC-1001',
      nationalIdNumber: '12345678901',
    }).step,
    3
  );
  assert.equal(
    getVerificationStepSummary({
      paymentStatus: 'paid',
      status: 'verified',
    }).isVerified,
    true
  );
});

test('isVendorVerificationActive respects approved shop status and expiry window', () => {
  const approvedAt = '2026-11-01T00:00:00.000Z';
  const until = computeVerificationExpiry(approvedAt, 90);

  assert.equal(
    isVendorVerificationActive(
      { status: 'approved', isVerified: true, verifiedUntil: until },
      Date.parse('2026-11-26T00:00:00.000Z')
    ),
    true
  );
  assert.equal(
    isVendorVerificationActive(
      { status: 'approved', isVerified: true, verifiedUntil: until },
      Date.parse('2027-03-15T00:00:00.000Z')
    ),
    false
  );
  assert.equal(
    isVendorVerificationActive(
      { status: 'suspended', isVerified: true, verifiedUntil: until },
      Date.parse('2026-11-26T00:00:00.000Z')
    ),
    false
  );
});
