import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  Package,
  Store,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import {
  computeOrderFinancials,
  formatOrderDetailsSummaryText,
  groupOrderItemsByVendor,
  type AdminOrderDetailRecord,
} from '../utils/adminOrderDetails';
import { formatOverdueNewDuration, isOrderOverdueNew } from '../utils/orderUrgency';
import type { AdminOrderPatchPayload } from './AdminOrderRow';

const ALL_ORDER_STAGES = [
  'New',
  'Confirmed',
  'Processing',
  'Ready for Shipping',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
  'Cancelled',
  'Returned',
  'Refunded',
] as const;

export function AdminOrderDetailsModal({
  order,
  onClose,
  money,
  paymentStatusLabel,
  onChangeStatus,
  onUpdateOrder,
  onConfirmPayment,
  onReviewPayment,
  onResendEmails,
  resendingEmail,
}: {
  order: AdminOrderDetailRecord;
  onClose: () => void;
  money: (n: number) => string;
  paymentStatusLabel: (status?: string) => string;
  onChangeStatus: (id: string, status: string) => void;
  onUpdateOrder?: (id: string, patch: AdminOrderPatchPayload) => Promise<void> | void;
  onConfirmPayment: (id: string, manualPaystack?: boolean) => void;
  onReviewPayment: (id: string, decision: 'pending' | 'rejected') => void;
  onResendEmails?: (id: string) => void;
  resendingEmail?: boolean;
}) {
  const [courier, setCourier] = useState(order.courier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [adminNote, setAdminNote] = useState(order.adminNote || '');
  const [savingTracking, setSavingTracking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmTransferArmed, setConfirmTransferArmed] = useState(false);
  const [failedThumbIds, setFailedThumbIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCourier(order.courier || '');
    setTrackingNumber(order.trackingNumber || '');
    setAdminNote(order.adminNote || '');
  }, [order.id, order.courier, order.trackingNumber, order.adminNote]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const financials = computeOrderFinancials(order);
  const vendorGroups = groupOrderItemsByVendor(order);
  const overdueNew = isOrderOverdueNew(order);
  const overdueLabel = overdueNew ? formatOverdueNewDuration(order.createdAt) : '';
  const paymentClass =
    order.paymentStatus === 'completed'
      ? 'approved'
      : order.paymentStatus === 'rejected'
        ? 'rejected'
        : 'pending';
  const orderStageClass = ['Completed'].includes(order.status)
    ? 'approved'
    : overdueNew || ['Cancelled', 'Refunded', 'Returned'].includes(order.status)
      ? 'rejected'
      : '';
  const canVerifyPayment =
    order.paymentStatus !== 'completed' && !['Cancelled', 'Refunded'].includes(order.status);

  const account = order.customerAccount;
  const locationText = [account?.city, account?.state, account?.country]
    .filter(Boolean)
    .join(', ');

  async function saveTracking(markShipped = false) {
    if (!onUpdateOrder) {
      if (markShipped) onChangeStatus(order.id, 'Shipped');
      return;
    }
    setSavingTracking(true);
    try {
      await onUpdateOrder(order.id, {
        courier: courier.trim(),
        trackingNumber: trackingNumber.trim(),
        adminNote: adminNote.trim(),
        ...(markShipped ? { status: 'Shipped' } : {}),
      });
    } finally {
      setSavingTracking(false);
    }
  }

  async function copySummary() {
    const summary = formatOrderDetailsSummaryText(order, money);
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="overlay admin-order-detail-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-order-detail-title"
    >
      <section
        className="admin-order-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="checkout-head admin-order-detail-head">
          <div>
            <span className="eyebrow">CUSTOMER ORDER RECORD · FULL INSPECTION</span>
            <h2 id="admin-order-detail-title" className="tabular-nums">
              {order.orderNumber}
            </h2>
            <p className="admin-order-detail-sub">
              <span>Placed {new Date(order.createdAt).toLocaleString()}</span>
              {order.updatedAt && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>Updated {new Date(order.updatedAt).toLocaleString()}</span>
                </>
              )}
              <span aria-hidden="true"> · </span>
              <span>ID: {order.id}</span>
            </p>
          </div>
          <div className="admin-order-detail-head-actions">
            <button
              type="button"
              className="secondary-btn compact-btn"
              onClick={() => void copySummary()}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy summary'}</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close order details"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="admin-order-detail-status-strip">
          <div className="admin-order-detail-status-left">
            <span className={'status ' + orderStageClass}>{order.status}</span>
            <span className={'status ' + paymentClass}>
              {paymentStatusLabel(order.paymentStatus)}
            </span>
            {overdueNew && (
              <span className="overdue-new-flag">
                <AlertTriangle size={13} aria-hidden="true" />
                <span>{overdueLabel}</span>
              </span>
            )}
          </div>
          <div className="admin-order-detail-total-callout tabular-nums">
            <small>Order total</small>
            <strong>{money(financials.total)}</strong>
          </div>
        </div>

        <div className="admin-order-detail-sections">
          <section className="admin-detail-block">
            <div className="admin-detail-block-head">
              <div>
                <span className="eyebrow">CUSTOMER &amp; SHIPPING</span>
                <h3>Customer Contact &amp; Delivery Address</h3>
              </div>
              <span className="admin-detail-meta-text">
                <UserRound size={14} aria-hidden="true" />
                {account && !account.isGuest
                  ? `Registered account · ${account.totalOrders ?? 1} order${(account.totalOrders ?? 1) === 1 ? '' : 's'}`
                  : order.customerUserId
                    ? `User ID: ${order.customerUserId}`
                    : 'Guest checkout'}
              </span>
            </div>

            <div className="order-info-grid">
              <div>
                <small>Customer name (checkout)</small>
                <b>{order.customerName || account?.fullName || 'Not provided'}</b>
              </div>
              <div>
                <small>Phone number</small>
                <b>{order.phone || account?.phone || 'Not provided'}</b>
              </div>
              <div>
                <small>Email address</small>
                <b>{order.email || account?.email || 'Not provided'}</b>
              </div>
              <div>
                <small>WhatsApp</small>
                <b>{account?.whatsapp || 'Not recorded'}</b>
              </div>
              <div>
                <small>Delivery address / instructions</small>
                <b>{order.address || account?.address || 'Not provided'}</b>
              </div>
              <div>
                <small>Customer location / region</small>
                <b>{locationText || 'Not recorded'}</b>
              </div>
              <div>
                <small>Customer account ID</small>
                <b className="tabular-nums">{account?.userId || order.customerUserId || 'Guest'}</b>
              </div>
              <div>
                <small>Customer order history</small>
                <b className="tabular-nums">
                  {account
                    ? `${account.totalOrders ?? 1} total (${account.paidOrders ?? 0} paid)`
                    : 'Current order'}
                </b>
              </div>
            </div>
          </section>

          <section className="admin-detail-block">
            <div className="admin-detail-block-head">
              <div>
                <span className="eyebrow">ORDER ITEMS ({financials.itemCount})</span>
                <h3>
                  Products Ordered Across {financials.vendorCount}{' '}
                  {financials.vendorCount === 1 ? 'Vendor' : 'Vendors'}
                </h3>
              </div>
            </div>

            <div className="admin-detail-vendor-groups">
              {vendorGroups.map((group) => (
                <div className="admin-detail-vendor-group" key={group.vendorKey}>
                  <div className="admin-detail-vendor-head">
                    <span className="admin-detail-vendor-title">
                      <Store size={14} aria-hidden="true" />
                      <b>{group.vendorName}</b>
                    </span>
                    <span className="admin-detail-meta-text tabular-nums">
                      {group.itemCount} item{group.itemCount === 1 ? '' : 's'} ·{' '}
                      {money(group.subtotal)}
                    </span>
                  </div>
                  <div className="admin-detail-items-list">
                    {group.items.map((item, idx) => {
                      const thumbKey = `${order.id}:${item.productId}:${idx}`;
                      const showImg = Boolean(item.productImage) && !failedThumbIds[thumbKey];
                      return (
                        <div className="admin-detail-item-row" key={thumbKey}>
                          <div className="admin-detail-item-thumb">
                            {showImg ? (
                              <img
                                src={item.productImage}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedThumbIds((prev) => ({ ...prev, [thumbKey]: true }))
                                }
                              />
                            ) : (
                              <Package size={18} aria-hidden="true" />
                            )}
                          </div>
                          <div className="admin-detail-item-main">
                            <b>{item.name}</b>
                            <small>
                              Qty {item.quantity} × {money(item.price)}
                              {item.option ? ` · Option: ${item.option}` : ''}
                              {item.productCategory ? ` · ${item.productCategory}` : ''}
                              {item.productId ? ` · Product ID: ${item.productId}` : ''}
                            </small>
                          </div>
                          <b className="admin-detail-item-total tabular-nums">
                            {money(Number(item.price || 0) * Number(item.quantity || 0))}
                          </b>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-detail-ledger tabular-nums">
              <div className="admin-detail-ledger-row">
                <span>Products subtotal</span>
                <b>{money(financials.itemsSubtotal)}</b>
              </div>
              {financials.couponDiscount > 0 && (
                <div className="admin-detail-ledger-row is-discount">
                  <span>
                    Coupon discount
                    {financials.couponCode ? ` (${financials.couponCode})` : ''}
                  </span>
                  <b>−{money(financials.couponDiscount)}</b>
                </div>
              )}
              {financials.transferFee > 0 && (
                <div className="admin-detail-ledger-row">
                  <span>Bank transfer fee</span>
                  <b>{money(financials.transferFee)}</b>
                </div>
              )}
              {financials.gatewayFee > 0 && (
                <div className="admin-detail-ledger-row">
                  <span>
                    Payment gateway fee
                    {order.paymentGatewayFeeSource
                      ? ` (${order.paymentGatewayFeeSource})`
                      : ''}
                  </span>
                  <b>{money(financials.gatewayFee)}</b>
                </div>
              )}
              <div className="admin-detail-ledger-row is-total">
                <span>Total charged</span>
                <strong>{money(financials.total)}</strong>
              </div>
            </div>
          </section>

          <section className="admin-detail-block">
            <div className="admin-detail-block-head">
              <div>
                <span className="eyebrow">PAYMENT &amp; ATTRIBUTION</span>
                <h3>Payment Verification &amp; Audit Trail</h3>
              </div>
              <span className={'status ' + paymentClass}>
                {paymentStatusLabel(order.paymentStatus).toUpperCase()}
              </span>
            </div>

            <div className="order-info-grid">
              <div>
                <small>Payment method</small>
                <b>{order.paymentMethod || 'Not recorded'}</b>
              </div>
              <div>
                <small>Transaction / Paystack reference</small>
                <b>{order.paystackReference || order.paymentReference || order.orderNumber}</b>
              </div>
              <div>
                <small>Payment confirmed at</small>
                <b>
                  {order.paymentCompletedAt
                    ? new Date(order.paymentCompletedAt).toLocaleString()
                    : 'Awaiting confirmation'}
                </b>
              </div>
              <div>
                <small>Confirmation source</small>
                <b>{order.paymentConfirmationMethod || 'Standard checkout flow'}</b>
              </div>
              <div>
                <small>Receipt emails sent</small>
                <b>
                  {order.paymentNotificationSentAt
                    ? new Date(order.paymentNotificationSentAt).toLocaleString()
                    : 'Pending / not logged'}
                </b>
              </div>
              <div>
                <small>Marketplace commission rate</small>
                <b className="tabular-nums">
                  {order.commissionPercent !== undefined
                    ? `${Number(order.commissionPercent)}%`
                    : 'Default'}
                </b>
              </div>
              {(order.affiliateReferralCode || order.affiliateId) && (
                <div>
                  <small>Affiliate attribution</small>
                  <b>
                    {[order.affiliateName, order.affiliateReferralCode || order.affiliateId]
                      .filter(Boolean)
                      .join(' · ')}
                  </b>
                </div>
              )}
              {order.paymentConfirmationNote && (
                <div>
                  <small>Payment confirmation note</small>
                  <b>{order.paymentConfirmationNote}</b>
                </div>
              )}
            </div>

            {canVerifyPayment ? (
              <div className="hero-buttons admin-detail-actions">
                {order.paymentMethod === 'Paystack' && (
                  <>
                    <button
                      type="button"
                      className="primary-btn compact-btn"
                      onClick={() => onConfirmPayment(order.id)}
                    >
                      Verify Paystack automatically
                    </button>
                    <button
                      type="button"
                      className="secondary-btn compact-btn"
                      onClick={() => onConfirmPayment(order.id, true)}
                    >
                      Confirm Paystack manually
                    </button>
                  </>
                )}
                {order.paymentMethod === 'Bank transfer' && (
                  <button
                    type="button"
                    className="primary-btn compact-btn"
                    onClick={() => {
                      if (!confirmTransferArmed) {
                        setConfirmTransferArmed(true);
                        window.setTimeout(() => setConfirmTransferArmed(false), 5000);
                        return;
                      }
                      setConfirmTransferArmed(false);
                      onConfirmPayment(order.id);
                    }}
                  >
                    {confirmTransferArmed
                      ? 'Tap again to confirm transfer'
                      : 'Confirm bank transfer received'}
                  </button>
                )}
                {!['Paystack', 'Bank transfer', 'Wallet'].includes(order.paymentMethod) && (
                  <button
                    type="button"
                    className="primary-btn compact-btn"
                    onClick={() => onUpdateOrder?.(order.id, { paymentStatus: 'completed' })}
                  >
                    Mark payment completed
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-btn compact-btn"
                  onClick={() => onReviewPayment(order.id, 'pending')}
                >
                  Keep pending
                </button>
                <button
                  type="button"
                  className="danger-icon"
                  onClick={() => onReviewPayment(order.id, 'rejected')}
                >
                  Reject payment
                </button>
              </div>
            ) : (
              order.paymentStatus === 'completed' &&
              onResendEmails && (
                <div className="admin-detail-actions">
                  <button
                    type="button"
                    className="secondary-btn compact-btn"
                    disabled={resendingEmail}
                    onClick={() => onResendEmails(order.id)}
                  >
                    {resendingEmail
                      ? 'Sending emails...'
                      : 'Resend payment emails (Customer, Vendor & Admin)'}
                  </button>
                </div>
              )
            )}
          </section>

          <section className="admin-detail-block">
            <div className="admin-detail-block-head">
              <div>
                <span className="eyebrow">FULFILMENT, DISPATCH &amp; STATUS</span>
                <h3>Order Stage, Tracking &amp; Internal Notes</h3>
              </div>
              <span className="admin-detail-meta-text">
                <MapPin size={14} aria-hidden="true" />
                {order.courier || order.trackingNumber
                  ? [order.courier, order.trackingNumber].filter(Boolean).join(' · ')
                  : 'No courier assigned yet'}
              </span>
            </div>

            <div className="order-stage-pills" role="group" aria-label="Set order stage">
              {ALL_ORDER_STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  className={
                    'order-stage-pill' +
                    (order.status === stage ? ' active' : '') +
                    (['Cancelled', 'Returned', 'Refunded'].includes(stage) ? ' danger' : '') +
                    (stage === 'Completed' ? ' complete' : '')
                  }
                  onClick={() => onChangeStatus(order.id, stage)}
                >
                  {stage === 'Completed' && <CheckCircle2 size={13} />}
                  {stage}
                </button>
              ))}
            </div>

            <div className="product-form admin-detail-tracking-form">
              <label>
                Courier / delivery service
                <input
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  placeholder="e.g. DHL, GIG Logistics, Dispatch Rider"
                />
              </label>
              <label>
                Tracking number / waybill
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. YKJ-TRK-88210"
                />
              </label>
              <label className="full-field">
                Admin order note (internal / dispatch reference)
                <input
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional delivery instructions or status note"
                />
              </label>
            </div>

            <div className="hero-buttons">
              <button
                type="button"
                className="secondary-btn compact-btn"
                disabled={savingTracking}
                onClick={() => void saveTracking(false)}
              >
                {savingTracking ? 'Saving...' : 'Save tracking & note'}
              </button>
              {order.status !== 'Shipped' && order.status !== 'Completed' && (
                <button
                  type="button"
                  className="primary-btn compact-btn"
                  disabled={savingTracking}
                  onClick={() => void saveTracking(true)}
                >
                  <Truck size={14} /> Save &amp; mark Shipped
                </button>
              )}
            </div>

            {(order.refundStatus || order.refundedAt || order.cancelledAt) && (
              <div className="order-info-grid admin-detail-audit-grid">
                {order.cancelledAt && (
                  <div>
                    <small>Cancelled at</small>
                    <b>{new Date(order.cancelledAt).toLocaleString()}</b>
                  </div>
                )}
                {order.cancelledBy && (
                  <div>
                    <small>Cancelled by</small>
                    <b>{order.cancelledBy}</b>
                  </div>
                )}
                {order.refundStatus && (
                  <div>
                    <small>Refund status</small>
                    <b>{order.refundStatus}</b>
                  </div>
                )}
                {order.refundedAt && (
                  <div>
                    <small>Refunded at</small>
                    <b>{new Date(order.refundedAt).toLocaleString()}</b>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
