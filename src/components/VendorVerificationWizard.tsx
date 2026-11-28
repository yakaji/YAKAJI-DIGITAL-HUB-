import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react';
import { fetchProtectedBlobUrl } from '../lib/appdeploy-client';
import { VerifiedShopBadge } from './VerifiedShopBadge';
import {
  VENDOR_FEATURE_MATRIX,
  VERIFICATION_CYCLES,
  VERIFICATION_TIERS,
  computeVerificationFee,
  getVendorEntitlements,
  getVerificationStepSummary,
  isVendorVerificationActive,
  type VendorVerificationKycPayload,
  type VendorVerificationRecord,
  type VerificationBillingCycle,
  type VerificationPaymentMethod,
  type VerificationTierId,
} from '../utils/vendorVerification';

export function ProtectedDocPreviewModal({
  doc,
  onClose,
}: {
  doc: { title: string; url: string; fileName?: string } | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ objectUrl: string; contentType: string } | null>(null);

  useEffect(() => {
    if (!doc) {
      setPreview(null);
      setError('');
      return;
    }
    let active = true;
    let createdUrl = '';
    setLoading(true);
    setError('');
    setPreview(null);

    fetchProtectedBlobUrl(doc.url)
      .then((res) => {
        createdUrl = res.objectUrl;
        if (!active) {
          URL.revokeObjectURL(res.objectUrl);
          return;
        }
        setPreview(res);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load document.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [doc]);

  if (!doc) return null;
  const isPdf = Boolean(preview?.contentType?.includes('pdf'));

  return (
    <div className="overlay kyc-doc-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={doc.title}>
      <section className="kyc-doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkout-head">
          <div>
            <span className="eyebrow">PRIVATE KYC DOCUMENT</span>
            <h2>{doc.title}</h2>
            {doc.fileName && <p className="admin-order-detail-sub">{doc.fileName}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close document preview" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="kyc-doc-preview-body">
          {loading && (
            <div className="chart-empty compact">
              <FileText size={28} />
              <b>Loading encrypted document...</b>
              <small>Only the shop owner and marketplace admin can access KYC attachments.</small>
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {!loading && !error && preview && (
            isPdf ? (
              <iframe
                title={doc.title}
                src={preview.objectUrl}
                className="kyc-doc-pdf-frame"
              />
            ) : (
              <div className="kyc-doc-image-wrap">
                <img src={preview.objectUrl} alt={doc.title} />
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

export function VendorVerificationWizard({
  vendor,
  verification,
  paystackConfigured,
  walletBalance,
  money,
  onStartPayment,
  onVerifyPaystack,
  onUploadDocument,
  onSubmitKyc,
  onRefresh,
  busy,
  docUploadBusy,
}: {
  vendor: {
    id: string;
    shopName: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    description?: string;
    city?: string;
    state?: string;
    location?: string;
    status?: string;
    isVerified?: boolean;
    verificationTier?: string;
    verifiedAt?: string;
    verifiedUntil?: string;
  };
  verification: VendorVerificationRecord | null;
  paystackConfigured: boolean;
  walletBalance: number;
  money: (n: number) => string;
  onStartPayment: (payload: {
    tierId: VerificationTierId;
    billingCycle: VerificationBillingCycle;
    paymentMethod: VerificationPaymentMethod;
  }) => Promise<{
    authorizationUrl?: string;
    bankTransfer?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      amount: number;
      reference: string;
    } | null;
  } | void>;
  onVerifyPaystack: (reference: string) => Promise<void>;
  onUploadDocument: (kind: 'cac' | 'national_id', file: File) => Promise<void>;
  onSubmitKyc: (payload: VendorVerificationKycPayload) => Promise<void>;
  onRefresh: () => Promise<void>;
  busy: boolean;
  docUploadBusy: '' | 'cac' | 'national_id';
}) {
  const [selectedTier, setSelectedTier] = useState<VerificationTierId>(verification?.tierId || 'starter');
  const [selectedCycle, setSelectedCycle] = useState<VerificationBillingCycle>(verification?.billingCycle || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState<VerificationPaymentMethod>(
    paystackConfigured ? 'Paystack' : 'Wallet'
  );
  const [bankTransferInfo, setBankTransferInfo] = useState<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    amount: number;
    reference: string;
  } | null>(null);
  const [showRenewalPlans, setShowRenewalPlans] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; fileName?: string } | null>(null);

  const [kycForm, setKycForm] = useState<VendorVerificationKycPayload>({
    legalBusinessName: verification?.legalBusinessName || vendor.shopName || '',
    businessType: verification?.businessType || 'Registered Business Name (BN)',
    cacNumber: verification?.cacNumber || '',
    tinNumber: verification?.tinNumber || '',
    ownerFullName: verification?.ownerFullName || vendor.ownerName || '',
    ownerRole: verification?.ownerRole || 'Founder / Sole Owner',
    nationalIdType: verification?.nationalIdType || 'National ID Card (NIN)',
    nationalIdNumber: verification?.nationalIdNumber || '',
    ownerPhone: verification?.ownerPhone || vendor.phone || '',
    ownerEmail: verification?.ownerEmail || vendor.email || '',
    ownerAddress: verification?.ownerAddress || '',
    businessAddress: verification?.businessAddress || vendor.location || '',
    city: verification?.city || vendor.city || '',
    state: verification?.state || vendor.state || '',
    yearsInOperation: verification?.yearsInOperation || '1-2 years',
    businessDescription: verification?.businessDescription || vendor.description || '',
    websiteOrSocial: verification?.websiteOrSocial || '',
  });

  useEffect(() => {
    if (verification?.tierId) setSelectedTier(verification.tierId);
    if (verification?.billingCycle) setSelectedCycle(verification.billingCycle);
    if (verification) {
      setKycForm((curr) => ({
        legalBusinessName: verification.legalBusinessName || curr.legalBusinessName || vendor.shopName || '',
        businessType: verification.businessType || curr.businessType || 'Registered Business Name (BN)',
        cacNumber: verification.cacNumber || curr.cacNumber || '',
        tinNumber: verification.tinNumber || curr.tinNumber || '',
        ownerFullName: verification.ownerFullName || curr.ownerFullName || vendor.ownerName || '',
        ownerRole: verification.ownerRole || curr.ownerRole || 'Founder / Sole Owner',
        nationalIdType: verification.nationalIdType || curr.nationalIdType || 'National ID Card (NIN)',
        nationalIdNumber: verification.nationalIdNumber || curr.nationalIdNumber || '',
        ownerPhone: verification.ownerPhone || curr.ownerPhone || vendor.phone || '',
        ownerEmail: verification.ownerEmail || curr.ownerEmail || vendor.email || '',
        ownerAddress: verification.ownerAddress || curr.ownerAddress || '',
        businessAddress: verification.businessAddress || curr.businessAddress || vendor.location || '',
        city: verification.city || curr.city || vendor.city || '',
        state: verification.state || curr.state || vendor.state || '',
        yearsInOperation: verification.yearsInOperation || curr.yearsInOperation || '1-2 years',
        businessDescription: verification.businessDescription || curr.businessDescription || vendor.description || '',
        websiteOrSocial: verification.websiteOrSocial || curr.websiteOrSocial || '',
      }));
    }
  }, [verification, vendor]);

  const summary = getVerificationStepSummary(verification);
  const activeVerified = isVendorVerificationActive(vendor) || summary.isVerified;
  const currentEntitlements = getVendorEntitlements(vendor);
  const feeBreakdown = computeVerificationFee(selectedTier, selectedCycle);
  const canEditKyc = summary.paymentPaid && verification?.status !== 'pending_review';
  const showStep1Plans =
    !summary.paymentPaid &&
    verification?.status !== 'pending_review' &&
    (!activeVerified || showRenewalPlans);

  async function handleStartPayment(e: FormEvent) {
    e.preventDefault();
    const res = await onStartPayment({
      tierId: selectedTier,
      billingCycle: selectedCycle,
      paymentMethod,
    });
    if (res?.bankTransfer) {
      setBankTransferInfo(res.bankTransfer);
    }
  }

  async function handleSubmitKyc(e: FormEvent) {
    e.preventDefault();
    await onSubmitKyc(kycForm);
  }

  const steps = [
    { num: 1, title: 'Select Tier & Pay', desc: 'Starter ₦3,000/mo up to Pro Max' },
    { num: 2, title: 'Attach CAC & ID', desc: 'CAC certificate, National ID & owner info' },
    { num: 3, title: 'Admin Review', desc: 'Compliance check of payment & documents' },
    { num: 4, title: 'Blue Verified Tick', desc: 'Live verified badge on shop & profile' },
  ] as const;

  return (
    <div className="verify-workspace" id="vendor-verification-centre">
      <section className="panel verify-hero-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">SHOP VERIFICATION &amp; BLUE VERIFIED BADGE</span>
            <h2 className="verify-title-with-badge">
              <span>{vendor.shopName} Verification Centre</span>
              <VerifiedShopBadge
                verified={activeVerified}
                tierId={verification?.tierId || vendor.verificationTier}
                size="md"
                showLabel
              />
            </h2>
            <p>
              Verify your shop step by step: choose a verification plan starting at ₦3,000/month (₦9,000 for 90 days, or ₦28,800 for 1 full year with 20% off),
              confirm payment, then attach your Business CAC certificate, National ID card, and full owner details for admin approval.
            </p>
          </div>
          <button type="button" className="secondary-btn" onClick={() => void onRefresh()} disabled={busy}>
            <RefreshCw size={15} /> Refresh status
          </button>
        </div>

        <ol className="verify-stepper" aria-label="Verification workflow steps">
          {steps.map((s) => {
            const done = activeVerified ? true : summary.step > s.num;
            const current = !activeVerified && summary.step === s.num;
            return (
              <li
                key={s.num}
                className={
                  'verify-step-item' +
                  (done ? ' is-done' : '') +
                  (current ? ' is-current' : '')
                }
              >
                <span className="verify-step-num" aria-hidden="true">
                  {done ? <CheckCircle2 size={16} /> : s.num}
                </span>
                <div>
                  <b>{s.title}</b>
                  <small>{s.desc}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {activeVerified && (
        <section className="panel verify-status-banner is-verified">
          <div className="verify-status-banner-main">
            <div className="verify-status-icon-wrap is-blue">
              <VerifiedShopBadge
                verified
                tierId={verification?.tierId || vendor.verificationTier}
                size="lg"
              />
            </div>
            <div>
              <span className="eyebrow">BLUE VERIFIED TICK ACTIVE</span>
              <h3>Your shop is verified on the {verification?.tierName || 'Verified'} plan</h3>
              <p className="tabular-nums">
                Active since{' '}
                <b>
                  {verification?.verifiedAt || vendor.verifiedAt
                    ? new Date(String(verification?.verifiedAt || vendor.verifiedAt)).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Today'}
                </b>
                {(verification?.verifiedUntil || vendor.verifiedUntil) && (
                  <>
                    {' · '}Valid until{' '}
                    <b>
                      {new Date(String(verification?.verifiedUntil || vendor.verifiedUntil)).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </b>
                  </>
                )}
                {verification?.legalBusinessName && ` · CAC ${verification.cacNumber}`}
              </p>
            </div>
          </div>
          <div className="verify-status-actions">
            {verification?.cacDocumentPath && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setPreviewDoc({
                    title: 'Business CAC Certificate',
                    url: '/api/vendor/verification/document/cac',
                    fileName: verification.cacDocumentName,
                  })
                }
              >
                <Eye size={14} /> View CAC
              </button>
            )}
            {verification?.nationalIdDocumentPath && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setPreviewDoc({
                    title: 'Owner National ID Card',
                    url: '/api/vendor/verification/document/national_id',
                    fileName: verification.nationalIdDocumentName,
                  })
                }
              >
                <Eye size={14} /> View National ID
              </button>
            )}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowRenewalPlans((v) => !v)}
            >
              {showRenewalPlans ? 'Hide upgrade / renewal' : 'Upgrade or renew plan'}
            </button>
          </div>
        </section>
      )}

      {verification?.status === 'pending_review' && (
        <section className="panel verify-status-banner is-pending">
          <div className="verify-status-banner-main">
            <div className="verify-status-icon-wrap">
              <Clock3 size={24} />
            </div>
            <div>
              <span className="eyebrow">STEP 3 · AWAITING ADMIN APPROVAL</span>
              <h3>Your payment &amp; KYC documents are under admin review</h3>
              <p className="tabular-nums">
                Plan: <b>{verification.tierName}</b> ({verification.durationDays} days · {money(verification.feeAmount)} paid via{' '}
                {verification.paymentMethod}) · Legal Business: <b>{verification.legalBusinessName}</b> (CAC{' '}
                <b>{verification.cacNumber}</b>). Once approved by admin, your blue verified tick goes live immediately.
              </p>
            </div>
          </div>
          <div className="verify-status-actions">
            {verification.cacDocumentPath && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setPreviewDoc({
                    title: 'Business CAC Certificate',
                    url: '/api/vendor/verification/document/cac',
                    fileName: verification.cacDocumentName,
                  })
                }
              >
                <Eye size={14} /> View submitted CAC
              </button>
            )}
            {verification.nationalIdDocumentPath && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  setPreviewDoc({
                    title: 'Owner National ID Card',
                    url: '/api/vendor/verification/document/national_id',
                    fileName: verification.nationalIdDocumentName,
                  })
                }
              >
                <Eye size={14} /> View submitted ID
              </button>
            )}
          </div>
        </section>
      )}

      {verification?.status === 'rejected' && (
        <section className="panel verify-status-banner is-rejected" role="alert">
          <div className="verify-status-banner-main">
            <div className="verify-status-icon-wrap is-danger">
              <AlertTriangle size={22} />
            </div>
            <div>
              <span className="eyebrow">VERIFICATION NEEDS UPDATES</span>
              <h3>Admin requested corrections before issuing your blue tick</h3>
              <p>
                <b>Reason:</b> {verification.rejectionReason || 'Please review your CAC document, National ID, and business details and resubmit.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {verification?.status === 'revoked' && (
        <section className="panel verify-status-banner is-rejected" role="alert">
          <div className="verify-status-banner-main">
            <div className="verify-status-icon-wrap is-danger">
              <AlertTriangle size={22} />
            </div>
            <div>
              <span className="eyebrow">VERIFICATION REVOKED</span>
              <h3>Your shop verification badge was revoked</h3>
              <p>
                {verification.rejectionReason || 'Select a verification tier below to re-verify your shop.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {showStep1Plans && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">STEP 1 · VERIFICATION TIER &amp; PAYMENT</span>
              <h2>Choose your verification tier (Starter ₦3,000/month · Save 20% on 1 Year)</h2>
              <p>
                Free shops are limited to 5 products with no coupons, discounts, or cover banner. Upgrade to Starter (₦3,000/mo), Plus, Premium, or Pro Max — and save 20% when paying for 1 full year (365 days).
              </p>
            </div>

            <div className="profit-cal-tabs verify-cycle-toggle" role="tablist" aria-label="Verification billing cadence">
              {VERIFICATION_CYCLES.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCycle === cycle.id}
                  className={selectedCycle === cycle.id ? 'active' : ''}
                  onClick={() => setSelectedCycle(cycle.id)}
                >
                  {cycle.label}
                </button>
              ))}
            </div>
          </div>

          <div className="verify-tier-grid">
            {VERIFICATION_TIERS.map((tier) => {
              const tierFee = computeVerificationFee(tier.id, selectedCycle);
              const isSelected = selectedTier === tier.id;
              const isCurrentPlan = activeVerified && currentEntitlements.planId === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  className={'verify-tier-card' + (isSelected ? ' is-selected' : '')}
                  onClick={() => setSelectedTier(tier.id)}
                  aria-pressed={isSelected}
                >
                  <div className="verify-tier-head">
                    <div>
                      <span className="verify-tier-kicker">
                        {isCurrentPlan ? 'Current Active Plan' : tier.audience}
                      </span>
                      <h3>
                        {tier.name}
                        <VerifiedShopBadge verified tierId={tier.id} size="xs" />
                      </h3>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="verify-tier-check" />}
                  </div>

                  <div className="verify-tier-price tabular-nums">
                    {tierFee.discountPercent > 0 && (
                      <div className="verify-tier-discount-row">
                        <del>{money(tierFee.baseAmount)}</del>
                        <span className="verify-discount-tag">-{tierFee.discountPercent}% 1-Year</span>
                      </div>
                    )}
                    <strong>{money(tierFee.totalAmount)}</strong>
                    <span>
                      / {tierFee.cycle.shortLabel}
                      {selectedCycle === 'quarterly' && ` (${money(tier.monthlyPrice)}/mo × 3)`}
                      {selectedCycle === 'annual' && ` (${money(tierFee.effectiveMonthlyRate)}/mo · Save ${money(tierFee.discountAmount)})`}
                    </span>
                  </div>

                  <p className="verify-tier-summary">{tier.summary}</p>
                  <ul className="verify-tier-features">
                    {tier.features.map((feat) => (
                      <li key={feat}>
                        <CheckCircle2 size={14} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <form className="verify-payment-box" onSubmit={handleStartPayment}>
            <div className="verify-payment-summary tabular-nums">
              <div>
                <small>Selected plan</small>
                <b>
                  {feeBreakdown.tier.name} · {feeBreakdown.cycle.shortLabel}
                </b>
              </div>
              <div>
                <small>{feeBreakdown.discountAmount > 0 ? '1-Year discount (20% off)' : 'Monthly rate'}</small>
                <b>
                  {feeBreakdown.discountAmount > 0
                    ? `Save ${money(feeBreakdown.discountAmount)} (was ${money(feeBreakdown.baseAmount)})`
                    : `${money(feeBreakdown.monthlyRate)} / month`}
                </b>
              </div>
              <div>
                <small>Total payable now</small>
                <strong>{money(feeBreakdown.totalAmount)}</strong>
              </div>
            </div>

            <div className="verify-payment-methods" role="radiogroup" aria-label="Select verification payment method">
              <button
                type="button"
                className={'verify-pay-method' + (paymentMethod === 'Paystack' ? ' is-active' : '')}
                onClick={() => setPaymentMethod('Paystack')}
              >
                <CreditCard size={18} />
                <div>
                  <b>Paystack Checkout</b>
                  <small>
                    {paystackConfigured
                      ? 'Card, bank transfer or USSD · instant Paystack server verification'
                      : 'Requires PAYSTACK_SECRET_KEY in environment'}
                  </small>
                </div>
              </button>

              <button
                type="button"
                className={'verify-pay-method' + (paymentMethod === 'Wallet' ? ' is-active' : '')}
                onClick={() => setPaymentMethod('Wallet')}
              >
                <Wallet size={18} />
                <div>
                  <b>Marketplace Wallet</b>
                  <small className="tabular-nums">Spendable balance: {money(walletBalance)}</small>
                </div>
              </button>

              <button
                type="button"
                className={'verify-pay-method' + (paymentMethod === 'Bank transfer' ? ' is-active' : '')}
                onClick={() => setPaymentMethod('Bank transfer')}
              >
                <Landmark size={18} />
                <div>
                  <b>Manual Bank Transfer</b>
                  <small>Moniepoint MFB · unlocks Step 2 after admin confirms transfer</small>
                </div>
              </button>
            </div>

            {verification?.paymentStatus === 'pending_confirmation' && (
              <div className="checkout-note verify-transfer-box tabular-nums">
                <div>
                  <b>Manual bank transfer awaiting confirmation</b>
                  <p>
                    Transfer <b>{money(verification.feeAmount)}</b> to <b>{bankTransferInfo?.bankName || 'Moniepoint MFB'}</b> · Account{' '}
                    <b>{bankTransferInfo?.accountNumber || '3005758913'}</b> ({bankTransferInfo?.accountName || 'Yakaji Digital Hub'}) with reference{' '}
                    <b>{verification.paymentReference}</b>.
                  </p>
                </div>
                <button type="button" className="secondary-btn" onClick={() => void onRefresh()} disabled={busy}>
                  <RefreshCw size={14} /> I&apos;ve paid — check status
                </button>
              </div>
            )}

            {verification?.paymentMethod === 'Paystack' && verification?.paymentStatus === 'pending' && verification?.paymentReference && (
              <div className="checkout-note verify-transfer-box tabular-nums">
                <div>
                  <b>Paystack payment started ({verification.paymentReference})</b>
                  <p>Already completed your Paystack checkout? Verify your transaction immediately to unlock Step 2.</p>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy}
                  onClick={() => void onVerifyPaystack(verification.paymentReference)}
                >
                  <ShieldCheck size={14} /> Verify Paystack payment
                </button>
              </div>
            )}

            <div className="verify-pay-submit-row">
              <button
                type="submit"
                className="primary-btn"
                disabled={busy || (paymentMethod === 'Wallet' && walletBalance < feeBreakdown.totalAmount)}
              >
                {busy
                  ? 'Processing verification payment...'
                  : `Pay ${money(feeBreakdown.totalAmount)} (${feeBreakdown.tier.name} · ${feeBreakdown.cycle.shortLabel})`}
              </button>
              {paymentMethod === 'Wallet' && walletBalance < feeBreakdown.totalAmount && (
                <small className="verify-inline-warn">
                  Wallet balance ({money(walletBalance)}) is lower than {money(feeBreakdown.totalAmount)}. Switch to Paystack or fund your wallet first.
                </small>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="panel verify-matrix-panel" aria-label="Vendor tool comparison matrix">
        <div className="panel-title">
          <div>
            <span className="eyebrow">TIER FEATURE COMPARISON</span>
            <h2>Free Shop vs. Starter, Plus, Premium &amp; Pro Max tools</h2>
            <p>
              Every paid tier unlocks real seller capabilities inside your dashboard and storefront. Pay annually for 1 full year (365 days) to save 20%.
            </p>
          </div>
          <span className="verify-paid-callout tabular-nums">
            Your plan: {currentEntitlements.planName}
          </span>
        </div>

        <div className="vendor-matrix-scroll">
          <table className="vendor-matrix-table tabular-nums">
            <thead>
              <tr>
                <th>Vendor Tool / Capability</th>
                <th className={currentEntitlements.planId === 'free' ? 'is-current-col' : ''}>
                  <span>Free Shop</span>
                  <small>₦0 / mo</small>
                </th>
                <th className={currentEntitlements.planId === 'starter' ? 'is-current-col' : ''}>
                  <span>Starter</span>
                  <small>₦3,000/mo · ₦28,800/yr</small>
                </th>
                <th className={currentEntitlements.planId === 'plus' ? 'is-current-col' : ''}>
                  <span>Plus</span>
                  <small>₦5,000/mo · ₦48,000/yr</small>
                </th>
                <th className={currentEntitlements.planId === 'premium' ? 'is-current-col' : ''}>
                  <span>Premium</span>
                  <small>₦8,500/mo · ₦81,600/yr</small>
                </th>
                <th className={currentEntitlements.planId === 'pro_max' ? 'is-current-col' : ''}>
                  <span>Pro Max</span>
                  <small>₦15,000/mo · ₦144,000/yr</small>
                </th>
              </tr>
            </thead>
            <tbody>
              {VENDOR_FEATURE_MATRIX.map((row) => (
                <tr key={row.feature}>
                  <td>
                    <span className="matrix-feat-group">{row.group}</span>
                    <b>{row.feature}</b>
                  </td>
                  <td className={currentEntitlements.planId === 'free' ? 'is-current-col' : ''}>{row.free}</td>
                  <td className={currentEntitlements.planId === 'starter' ? 'is-current-col' : ''}>{row.starter}</td>
                  <td className={currentEntitlements.planId === 'plus' ? 'is-current-col' : ''}>{row.plus}</td>
                  <td className={currentEntitlements.planId === 'premium' ? 'is-current-col' : ''}>{row.premium}</td>
                  <td className={currentEntitlements.planId === 'pro_max' ? 'is-current-col' : ''}>{row.pro_max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={'panel verify-kyc-panel' + (!summary.paymentPaid ? ' is-locked' : '')}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">STEP 2 · BUSINESS KYC, CAC CERTIFICATE &amp; NATIONAL ID</span>
            <h2>Attach CAC, National ID card &amp; complete business details</h2>
            <p>
              {summary.paymentPaid
                ? 'Payment confirmed. Attach clear copies of your CAC certificate and National ID card, fill in your full business and owner records, and submit for admin approval.'
                : 'Step 2 unlocks automatically as soon as your Step 1 verification tier payment is confirmed.'}
            </p>
          </div>
          {summary.paymentPaid && verification && (
            <span className="verify-paid-callout tabular-nums">
              <CheckCircle2 size={15} /> Paid {money(verification.feeAmount)} ({verification.tierName} · {verification.durationDays}d)
            </span>
          )}
        </div>

        {!summary.paymentPaid ? (
          <div className="verify-locked-box">
            <Lock size={28} />
            <b>Complete Step 1 payment to unlock document attachment</b>
            <small>
              Choose Starter (₦3,000/month, ₦9,000/90 days, or ₦28,800/year), Plus, Premium, or Pro Max above and complete payment via Paystack, Wallet, or confirmed Bank Transfer.
            </small>
          </div>
        ) : (
          <>
            <div className="verify-doc-grid">
              <article className="verify-doc-card">
                <div className="verify-doc-card-head">
                  <Building2 size={18} />
                  <div>
                    <b>1. Business CAC Certificate / Registration *</b>
                    <small>Upload CAC Certificate, Status Report, or Business Name Registration (PNG, JPG, WebP or PDF · max 8MB)</small>
                  </div>
                </div>
                <div className="verify-doc-status">
                  {verification?.cacDocumentPath ? (
                    <span className="verify-file-ready">
                      <FileCheck2 size={15} /> Attached: {verification.cacDocumentName || 'CAC Document'}
                    </span>
                  ) : (
                    <span className="verify-file-missing">No CAC document attached yet</span>
                  )}
                </div>
                <div className="verify-doc-actions">
                  <label className={'secondary-btn shop-upload-btn' + (!canEditKyc ? ' is-disabled' : '')}>
                    <UploadCloud size={15} />
                    <span>
                      {docUploadBusy === 'cac'
                        ? 'Uploading CAC...'
                        : verification?.cacDocumentPath
                          ? 'Replace CAC file'
                          : 'Attach CAC document'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={!canEditKyc || Boolean(docUploadBusy)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void onUploadDocument('cac', file);
                      }}
                    />
                  </label>
                  {verification?.cacDocumentPath && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        setPreviewDoc({
                          title: 'Business CAC Certificate',
                          url: '/api/vendor/verification/document/cac',
                          fileName: verification.cacDocumentName,
                        })
                      }
                    >
                      <Eye size={14} /> Preview
                    </button>
                  )}
                </div>
              </article>

              <article className="verify-doc-card">
                <div className="verify-doc-card-head">
                  <ShieldCheck size={18} />
                  <div>
                    <b>2. Owner National ID Card / NIN Slip *</b>
                    <small>Upload front copy of NIN Slip, National ID card, International Passport, or Driver&apos;s Licence (PNG, JPG, WebP or PDF · max 8MB)</small>
                  </div>
                </div>
                <div className="verify-doc-status">
                  {verification?.nationalIdDocumentPath ? (
                    <span className="verify-file-ready">
                      <FileCheck2 size={15} /> Attached: {verification.nationalIdDocumentName || 'National ID'}
                    </span>
                  ) : (
                    <span className="verify-file-missing">No National ID attached yet</span>
                  )}
                </div>
                <div className="verify-doc-actions">
                  <label className={'secondary-btn shop-upload-btn' + (!canEditKyc ? ' is-disabled' : '')}>
                    <UploadCloud size={15} />
                    <span>
                      {docUploadBusy === 'national_id'
                        ? 'Uploading National ID...'
                        : verification?.nationalIdDocumentPath
                          ? 'Replace National ID'
                          : 'Attach National ID'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={!canEditKyc || Boolean(docUploadBusy)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void onUploadDocument('national_id', file);
                      }}
                    />
                  </label>
                  {verification?.nationalIdDocumentPath && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        setPreviewDoc({
                          title: 'Owner National ID Card',
                          url: '/api/vendor/verification/document/national_id',
                          fileName: verification.nationalIdDocumentName,
                        })
                      }
                    >
                      <Eye size={14} /> Preview
                    </button>
                  )}
                </div>
              </article>
            </div>

            <form className="product-form verify-kyc-form" onSubmit={handleSubmitKyc}>
              <label>
                Legal registered business name *
                <input
                  required
                  minLength={2}
                  maxLength={140}
                  disabled={!canEditKyc}
                  value={kycForm.legalBusinessName}
                  onChange={(e) => setKycForm((f) => ({ ...f, legalBusinessName: e.target.value }))}
                  placeholder="Exact name on your CAC certificate"
                />
              </label>

              <label>
                Business structure *
                <select
                  required
                  disabled={!canEditKyc}
                  value={kycForm.businessType}
                  onChange={(e) => setKycForm((f) => ({ ...f, businessType: e.target.value }))}
                >
                  <option value="Registered Business Name (BN)">Registered Business Name (BN)</option>
                  <option value="Limited Liability Company (RC / LTD)">Limited Liability Company (RC / LTD)</option>
                  <option value="Sole Proprietorship + CAC">Sole Proprietorship + CAC</option>
                  <option value="Incorporated Trustees (IT)">Incorporated Trustees (IT)</option>
                </select>
              </label>

              <label>
                CAC registration number *
                <input
                  required
                  minLength={4}
                  maxLength={40}
                  disabled={!canEditKyc}
                  value={kycForm.cacNumber}
                  onChange={(e) => setKycForm((f) => ({ ...f, cacNumber: e.target.value.toUpperCase() }))}
                  placeholder="e.g. RC-1948201 or BN-3829104"
                />
              </label>

              <label>
                Tax ID / TIN (optional)
                <input
                  maxLength={40}
                  disabled={!canEditKyc}
                  value={kycForm.tinNumber || ''}
                  onChange={(e) => setKycForm((f) => ({ ...f, tinNumber: e.target.value }))}
                  placeholder="FIRS TIN if available"
                />
              </label>

              <label>
                Shop owner full legal name *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  disabled={!canEditKyc}
                  value={kycForm.ownerFullName}
                  onChange={(e) => setKycForm((f) => ({ ...f, ownerFullName: e.target.value }))}
                  placeholder="Full name matching National ID"
                />
              </label>

              <label>
                Owner role in shop *
                <select
                  required
                  disabled={!canEditKyc}
                  value={kycForm.ownerRole}
                  onChange={(e) => setKycForm((f) => ({ ...f, ownerRole: e.target.value }))}
                >
                  <option value="Founder / Sole Owner">Founder / Sole Owner</option>
                  <option value="Managing Director / CEO">Managing Director / CEO</option>
                  <option value="Co-Founder / Partner">Co-Founder / Partner</option>
                  <option value="Authorized Store Manager">Authorized Store Manager</option>
                </select>
              </label>

              <label>
                National ID document type *
                <select
                  required
                  disabled={!canEditKyc}
                  value={kycForm.nationalIdType}
                  onChange={(e) => setKycForm((f) => ({ ...f, nationalIdType: e.target.value }))}
                >
                  <option value="National ID Card (NIN)">National ID Card (NIN)</option>
                  <option value="NIMC NIN Slip">NIMC NIN Slip</option>
                  <option value="International Passport">International Passport</option>
                  <option value="Driver's Licence">Driver&apos;s Licence</option>
                  <option value="Voter's Card (PVC)">Voter&apos;s Card (PVC)</option>
                </select>
              </label>

              <label>
                National ID / NIN number *
                <input
                  required
                  minLength={6}
                  maxLength={40}
                  disabled={!canEditKyc}
                  value={kycForm.nationalIdNumber}
                  onChange={(e) => setKycForm((f) => ({ ...f, nationalIdNumber: e.target.value }))}
                  placeholder="Enter 11-digit NIN or ID number"
                />
              </label>

              <label>
                Owner phone number *
                <input
                  required
                  type="tel"
                  minLength={5}
                  maxLength={30}
                  disabled={!canEditKyc}
                  value={kycForm.ownerPhone}
                  onChange={(e) => setKycForm((f) => ({ ...f, ownerPhone: e.target.value }))}
                  placeholder="+234..."
                />
              </label>

              <label>
                Business / owner email *
                <input
                  required
                  type="email"
                  maxLength={120}
                  disabled={!canEditKyc}
                  value={kycForm.ownerEmail}
                  onChange={(e) => setKycForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  placeholder="owner@business.com"
                />
              </label>

              <label>
                Years in operation *
                <select
                  required
                  disabled={!canEditKyc}
                  value={kycForm.yearsInOperation}
                  onChange={(e) => setKycForm((f) => ({ ...f, yearsInOperation: e.target.value }))}
                >
                  <option value="Under 1 year">Under 1 year</option>
                  <option value="1-2 years">1–2 years</option>
                  <option value="3-5 years">3–5 years</option>
                  <option value="5+ years">5+ years</option>
                </select>
              </label>

              <label>
                Website or social link (optional)
                <input
                  maxLength={160}
                  disabled={!canEditKyc}
                  value={kycForm.websiteOrSocial || ''}
                  onChange={(e) => setKycForm((f) => ({ ...f, websiteOrSocial: e.target.value }))}
                  placeholder="https://... or @shop_handle"
                />
              </label>

              <label>
                Business city *
                <input
                  required
                  maxLength={80}
                  disabled={!canEditKyc}
                  value={kycForm.city}
                  onChange={(e) => setKycForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Ikeja, Abuja, Kano"
                />
              </label>

              <label>
                Business state *
                <input
                  required
                  maxLength={80}
                  disabled={!canEditKyc}
                  value={kycForm.state}
                  onChange={(e) => setKycForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="e.g. Lagos State, FCT"
                />
              </label>

              <label className="full-field">
                Shop owner residential address *
                <input
                  required
                  minLength={5}
                  maxLength={240}
                  disabled={!canEditKyc}
                  value={kycForm.ownerAddress}
                  onChange={(e) => setKycForm((f) => ({ ...f, ownerAddress: e.target.value }))}
                  placeholder="House number, street, district, city"
                />
              </label>

              <label className="full-field">
                Business / shop physical operating address *
                <input
                  required
                  minLength={5}
                  maxLength={240}
                  disabled={!canEditKyc}
                  value={kycForm.businessAddress}
                  onChange={(e) => setKycForm((f) => ({ ...f, businessAddress: e.target.value }))}
                  placeholder="Full physical office or store address"
                />
              </label>

              <label className="full-field">
                Full business &amp; shop overview *
                <textarea
                  required
                  minLength={10}
                  maxLength={1200}
                  rows={3}
                  disabled={!canEditKyc}
                  value={kycForm.businessDescription}
                  onChange={(e) => setKycForm((f) => ({ ...f, businessDescription: e.target.value }))}
                  placeholder="Describe your business operations, products/services sold, and fulfilment standards..."
                />
              </label>

              <div className="full-field verify-submit-bar">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    !canEditKyc ||
                    busy ||
                    !verification?.cacDocumentPath ||
                    !verification?.nationalIdDocumentPath
                  }
                >
                  {busy
                    ? 'Submitting verification...'
                    : verification?.status === 'pending_review'
                      ? 'Submitted · Awaiting admin approval'
                      : 'Submit CAC, National ID & Business Details'}
                </button>
                {(!verification?.cacDocumentPath || !verification?.nationalIdDocumentPath) && (
                  <small className="verify-inline-warn">
                    Attach both your Business CAC certificate and Owner National ID card above before submitting.
                  </small>
                )}
              </div>
            </form>
          </>
        )}
      </section>

      <ProtectedDocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
