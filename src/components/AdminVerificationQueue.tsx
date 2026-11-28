import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  FileText,
  Landmark,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { ProtectedDocPreviewModal } from './VendorVerificationWizard';
import { VerifiedShopBadge } from './VerifiedShopBadge';
import type { VendorVerificationRecord } from '../utils/vendorVerification';

export interface AdminVerificationRow extends VendorVerificationRecord {
  vendorShopName?: string;
  vendorOwnerName?: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorStatus?: string;
  isCurrentlyVerified?: boolean;
}

export function AdminVerificationQueue({
  verifications,
  money,
  busy,
  onConfirmTransfer,
  onReviewVerification,
  onRefresh,
}: {
  verifications: AdminVerificationRow[];
  money: (n: number) => string;
  busy: boolean;
  onConfirmTransfer: (vendorId: string) => Promise<void>;
  onReviewVerification: (
    vendorId: string,
    decision: 'approved' | 'rejected' | 'revoked',
    reason?: string
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'awaiting_payment' | 'verified' | 'rejected'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; fileName?: string } | null>(null);

  const counts = useMemo(() => ({
    all: verifications.length,
    pending_review: verifications.filter((v) => v.status === 'pending_review').length,
    awaiting_payment: verifications.filter(
      (v) => v.status === 'awaiting_payment' || v.paymentStatus === 'pending_confirmation' || v.status === 'paid_awaiting_details'
    ).length,
    verified: verifications.filter((v) => v.status === 'verified').length,
    rejected: verifications.filter((v) => v.status === 'rejected' || v.status === 'revoked').length,
  }), [verifications]);

  const filtered = useMemo(() => {
    return verifications.filter((v) => {
      if (filter === 'all') return true;
      if (filter === 'awaiting_payment') {
        return (
          v.status === 'awaiting_payment' ||
          v.paymentStatus === 'pending_confirmation' ||
          v.status === 'paid_awaiting_details'
        );
      }
      if (filter === 'rejected') {
        return v.status === 'rejected' || v.status === 'revoked';
      }
      return v.status === filter;
    });
  }, [verifications, filter]);

  return (
    <div className="admin-verify-queue" id="admin-vendor-verifications">
      <div className="admin-verify-head">
        <div>
          <span className="eyebrow">SHOP VERIFICATION &amp; BLUE TICK APPROVALS</span>
          <h3>Vendor Verification Requests ({verifications.length})</h3>
          <p className="muted">
            Inspect Paystack/transfer payment status, view attached Business CAC and National ID documents, verify owner records, and approve or reject the blue verified badge.
          </p>
        </div>
        <button type="button" className="secondary-btn" onClick={() => void onRefresh()} disabled={busy}>
          <RefreshCw size={14} /> Refresh requests
        </button>
      </div>

      <div className="profit-cal-tabs verify-filter-tabs" role="tablist" aria-label="Filter verification requests">
        {([
          ['all', `All (${counts.all})`],
          ['pending_review', `Pending review (${counts.pending_review})`],
          ['awaiting_payment', `Payment / docs (${counts.awaiting_payment})`],
          ['verified', `Verified (${counts.verified})`],
          ['rejected', `Rejected / Revoked (${counts.rejected})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'active' : ''}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="chart-empty compact">
          <ShieldCheck size={26} />
          <b>{verifications.length ? 'No verification requests in this filter' : 'No vendor verification requests yet'}</b>
          <small>Vendors who subscribe to Starter, Plus, Premium, or Pro Max verification appear here.</small>
        </div>
      ) : (
        <div className="compact-order-list">
          {filtered.map((item) => {
            const vendorId = String(item.vendorId || item.id);
            const isExpanded = Boolean(expandedIds[vendorId]) || item.status === 'pending_review';
            const shopTitle = item.vendorShopName || item.shopName || 'Vendor Shop';
            const reasonDraft = rejectionReasons[vendorId] || '';
            const statusClass =
              item.status === 'verified'
                ? 'approved'
                : item.status === 'rejected' || item.status === 'revoked'
                  ? 'rejected'
                  : 'pending';

            return (
              <article className="admin-verify-card" key={vendorId}>
                <div className="admin-verify-card-top">
                  <div className="admin-verify-card-title">
                    <div className="admin-verify-name-line">
                      <b>{shopTitle}</b>
                      <VerifiedShopBadge
                        verified={item.status === 'verified' && Boolean(item.isCurrentlyVerified)}
                        tierId={item.tierId}
                        size="sm"
                      />
                      <span className={`status ${statusClass}`}>{item.status.replace(/_/g, ' ')}</span>
                    </div>
                    <small className="tabular-nums">
                      {item.tierName} ({item.durationDays} days) · {money(item.feeAmount)} via {item.paymentMethod} · Payment:{' '}
                      <b>{item.paymentStatus.replace(/_/g, ' ')}</b> · Ref {item.paymentReference}
                    </small>
                    {item.legalBusinessName && (
                      <small>
                        Legal Name: <b>{item.legalBusinessName}</b> · CAC: <b>{item.cacNumber || 'Pending'}</b> · Owner:{' '}
                        <b>{item.ownerFullName || item.vendorOwnerName}</b> · ID: <b>{item.nationalIdNumber || 'Pending'}</b>
                      </small>
                    )}
                  </div>

                  <div className="admin-verify-card-controls">
                    {item.paymentMethod === 'Bank transfer' && item.paymentStatus === 'pending_confirmation' && (
                      <button
                        type="button"
                        className="primary-btn compact-btn"
                        disabled={busy}
                        onClick={() => void onConfirmTransfer(vendorId)}
                      >
                        <Landmark size={14} /> Confirm transfer payment
                      </button>
                    )}
                    <button
                      type="button"
                      className="secondary-btn compact-btn"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedIds((curr) => ({ ...curr, [vendorId]: !isExpanded }))}
                    >
                      {isExpanded ? <>Hide <ChevronUp size={14} /></> : <>Inspect KYC <ChevronDown size={14} /></>}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="admin-verify-details">
                    <div className="admin-user-detail-grid tabular-nums">
                      <div><small>Verification plan</small><b>{item.tierName} · {item.billingCycle} ({item.durationDays} days)</b></div>
                      <div><small>Fee &amp; payment</small><b>{money(item.feeAmount)} · {item.paymentMethod} ({item.paymentStatus})</b></div>
                      <div><small>Legal business name</small><b>{item.legalBusinessName || 'Not submitted yet'}</b></div>
                      <div><small>Business type</small><b>{item.businessType || 'Not submitted yet'}</b></div>
                      <div><small>CAC registration no.</small><b>{item.cacNumber || 'Not submitted yet'}</b></div>
                      <div><small>Tax ID / TIN</small><b>{item.tinNumber || 'Not provided'}</b></div>
                      <div><small>Owner full name &amp; role</small><b>{item.ownerFullName || 'Not submitted'}{item.ownerRole ? ` (${item.ownerRole})` : ''}</b></div>
                      <div><small>National ID / NIN</small><b>{item.nationalIdType ? `${item.nationalIdType}: ` : ''}{item.nationalIdNumber || 'Not submitted'}</b></div>
                      <div><small>Owner phone &amp; email</small><b>{[item.ownerPhone, item.ownerEmail].filter(Boolean).join(' · ') || 'Not submitted'}</b></div>
                      <div><small>Years in operation</small><b>{item.yearsInOperation || 'Not submitted'}</b></div>
                      <div><small>Owner residential address</small><b>{item.ownerAddress || 'Not submitted'}</b></div>
                      <div><small>Business operating address</small><b>{[item.businessAddress, item.city, item.state].filter(Boolean).join(', ') || 'Not submitted'}</b></div>
                      {item.websiteOrSocial && (
                        <div><small>Website / Social</small><b>{item.websiteOrSocial}</b></div>
                      )}
                      {item.verifiedUntil && (
                        <div><small>Verified active until</small><b>{new Date(item.verifiedUntil).toLocaleString('en-NG')}</b></div>
                      )}
                    </div>

                    {item.businessDescription && (
                      <div className="admin-verify-bio">
                        <small>Business &amp; catalog description</small>
                        <p>{item.businessDescription}</p>
                      </div>
                    )}

                    <div className="admin-verify-doc-strip">
                      {item.cacDocumentPath ? (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            setPreviewDoc({
                              title: `${shopTitle} — Business CAC Certificate`,
                              url: `/api/admin/vendors/${encodeURIComponent(vendorId)}/verification/document/cac`,
                              fileName: item.cacDocumentName,
                            })
                          }
                        >
                          <Eye size={14} /> View CAC Certificate ({item.cacDocumentName || 'file'})
                        </button>
                      ) : (
                        <span className="verify-file-missing"><FileText size={14} /> CAC not attached yet</span>
                      )}

                      {item.nationalIdDocumentPath ? (
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() =>
                            setPreviewDoc({
                              title: `${shopTitle} — National ID Card`,
                              url: `/api/admin/vendors/${encodeURIComponent(vendorId)}/verification/document/national_id`,
                              fileName: item.nationalIdDocumentName,
                            })
                          }
                        >
                          <Eye size={14} /> View National ID ({item.nationalIdDocumentName || 'file'})
                        </button>
                      ) : (
                        <span className="verify-file-missing"><FileText size={14} /> National ID not attached yet</span>
                      )}
                    </div>

                    {item.rejectionReason && (
                      <div className="checkout-note">
                        <b>Last review note:</b> {item.rejectionReason}
                      </div>
                    )}

                    <div className="admin-verify-decision-bar">
                      <input
                        type="text"
                        value={reasonDraft}
                        onChange={(e) =>
                          setRejectionReasons((curr) => ({ ...curr, [vendorId]: e.target.value }))
                        }
                        placeholder="Rejection or revocation reason (required when rejecting)"
                      />
                      <div className="admin-verify-decision-btns">
                        {item.status !== 'verified' && (
                          <button
                            type="button"
                            className="primary-btn compact-btn"
                            disabled={
                              busy ||
                              item.paymentStatus !== 'paid' ||
                              !item.cacDocumentPath ||
                              !item.nationalIdDocumentPath
                            }
                            onClick={() => void onReviewVerification(vendorId, 'approved')}
                          >
                            <CheckCircle2 size={14} /> Approve &amp; Issue Blue Tick
                          </button>
                        )}
                        {item.status !== 'verified' && (
                          <button
                            type="button"
                            className="secondary-btn compact-btn danger-outline-btn"
                            disabled={busy || !reasonDraft.trim()}
                            onClick={() => void onReviewVerification(vendorId, 'rejected', reasonDraft.trim())}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        )}
                        {item.status === 'verified' && (
                          <button
                            type="button"
                            className="secondary-btn compact-btn danger-outline-btn"
                            disabled={busy}
                            onClick={() =>
                              void onReviewVerification(
                                vendorId,
                                'revoked',
                                reasonDraft.trim() || 'Shop verification revoked by marketplace admin.'
                              )
                            }
                          >
                            <Clock3 size={14} /> Revoke Blue Tick
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ProtectedDocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </div>
  );
}
