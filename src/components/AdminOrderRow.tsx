import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MapPin,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import { formatOverdueNewDuration, isOrderOverdueNew } from '../utils/orderUrgency';
import {
  computeOrderFinancials,
  type AdminOrderDetailRecord,
  type AdminOrderLineItem,
} from '../utils/adminOrderDetails';

export type AdminOrderItem = AdminOrderLineItem;
export type AdminOrderRecord = AdminOrderDetailRecord;

export type AdminOrderPatchPayload = {
  status?: string;
  courier?: string;
  trackingNumber?: string;
  adminNote?: string;
  paymentStatus?: string;
};

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

const NEXT_STAGE_MAP: Record<string, { status: string; label: string }> = {
  New: { status: 'Confirmed', label: 'Confirm' },
  Confirmed: { status: 'Processing', label: 'Process' },
  Processing: { status: 'Ready for Shipping', label: 'Ready to Ship' },
  'Ready for Shipping': { status: 'Shipped', label: 'Mark Shipped' },
  Shipped: { status: 'Out for Delivery', label: 'Out for Delivery' },
  'Out for Delivery': { status: 'Delivered', label: 'Mark Delivered' },
  Delivered: { status: 'Completed', label: 'Complete Order' },
};

const FULFILMENT_TIMELINE_STEPS = [
  { status: 'New', label: 'New', icon: Clock },
  { status: 'Confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { status: 'Processing', label: 'Processing', icon: Package },
  { status: 'Ready for Shipping', label: 'Ready', icon: PackageCheck },
  { status: 'Shipped', label: 'Shipped', icon: Truck },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: MapPin },
  { status: 'Delivered', label: 'Delivered', icon: Check },
  { status: 'Completed', label: 'Completed', icon: CheckCircle2 },
] as const;

const EXCEPTION_STATUSES = new Set(['Cancelled', 'Returned', 'Refunded']);

export function isFulfilledOrderStatus(status?: string): boolean {
  return ['Completed', 'Cancelled', 'Refunded', 'Returned'].includes(String(status || ''));
}

export function AdminOrderRow({
  order,
  mode,
  expanded,
  onToggleExpand,
  money,
  paymentStatusLabel,
  onChangeStatus,
  onUpdateOrder,
  onConfirmPayment,
  onReviewPayment,
  onResendEmails,
  onOpenDetails,
  resendingEmail,
  selectable = false,
  selected = false,
  onToggleSelect
}: {
  order: AdminOrderRecord;
  mode: 'fulfilment' | 'payment' | 'history';
  expanded: boolean;
  onToggleExpand: () => void;
  money: (n: number) => string;
  paymentStatusLabel: (status?: string) => string;
  onChangeStatus: (id: string, status: string) => void;
  onUpdateOrder?: (id: string, patch: AdminOrderPatchPayload) => Promise<void> | void;
  onConfirmPayment: (id: string, manualPaystack?: boolean) => void;
  onReviewPayment: (id: string, decision: 'pending' | 'rejected') => void;
  onResendEmails?: (id: string) => void;
  onOpenDetails?: (order: AdminOrderRecord) => void;
  resendingEmail?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [courier, setCourier] = useState(order.courier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [adminNote, setAdminNote] = useState(order.adminNote || '');
  const [savingTracking, setSavingTracking] = useState(false);
  const [confirmTransferArmed, setConfirmTransferArmed] = useState(false);

  useEffect(() => {
    setCourier(order.courier || '');
    setTrackingNumber(order.trackingNumber || '');
    setAdminNote(order.adminNote || '');
  }, [order.courier, order.trackingNumber, order.adminNote]);

  const totalItems = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const financials = computeOrderFinancials(order);
  const account = order.customerAccount;
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
  const nextStage = NEXT_STAGE_MAP[order.status];
  const isExceptionStatus = EXCEPTION_STATUSES.has(order.status);
  const timelineIndex = FULFILMENT_TIMELINE_STEPS.findIndex(step => step.status === order.status);
  const activeStepIndex = timelineIndex >= 0 ? timelineIndex : 0;
  const progressPercent = isExceptionStatus
    ? 100
    : Math.round(((activeStepIndex + 1) / FULFILMENT_TIMELINE_STEPS.length) * 100);

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

  return (
    <article
      data-overdue-new={overdueNew ? 'true' : undefined}
      className={
        'compact-order-row' +
        (expanded ? ' is-expanded' : '') +
        (selectable && selected ? ' is-selected' : '') +
        (overdueNew ? ' is-overdue-new' : '')
      }
    >
      <div className="compact-order-head">
        {selectable && (
          <label className="order-select-check" title={`Select order ${order.orderNumber}`}>
            <input
              type="checkbox"
              checked={Boolean(selected)}
              aria-label={`Select order ${order.orderNumber}`}
              onChange={() => onToggleSelect?.(order.id)}
            />
          </label>
        )}
        <div className="compact-order-primary">
          <div className="compact-order-id-line">
            <b className="tabular-nums">{order.orderNumber}</b>
            <span className={'status ' + orderStageClass}>{order.status}</span>
            <span className={'status ' + paymentClass}>{paymentStatusLabel(order.paymentStatus)}</span>
            {overdueNew && (
              <span
                className="overdue-new-flag"
                title="Order has remained in New status for longer than 24 hours"
              >
                <AlertTriangle size={12} aria-hidden="true" />
                <span>{overdueLabel}</span>
              </span>
            )}
          </div>
          <small>
            {order.customerName || 'Customer'} · {totalItems} item{totalItems === 1 ? '' : 's'} ·{' '}
            {order.paymentMethod || 'Payment'} ·{' '}
            {new Date(order.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
            {(order.courier || order.trackingNumber) ? ` · Tracking: ${[order.courier, order.trackingNumber].filter(Boolean).join(' #')}` : ''}
          </small>
        </div>

        <div className="compact-order-controls">
          <strong className="compact-order-amount tabular-nums">{money(order.total)}</strong>

          {mode !== 'payment' ? (
            <>
              {nextStage && (
                <button
                  type="button"
                  className="primary-btn compact-btn"
                  onClick={() => onChangeStatus(order.id, nextStage.status)}
                >
                  {nextStage.label}
                </button>
              )}
              <select
                className="compact-stage-select"
                aria-label={'Order stage for ' + order.orderNumber}
                value={order.status}
                onChange={e => onChangeStatus(order.id, e.target.value)}
              >
                {ALL_ORDER_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </>
          ) : (
            canVerifyPayment && (
              <div className="compact-pay-quick-actions">
                {order.paymentMethod === 'Paystack' && (
                  <button
                    type="button"
                    className="primary-btn compact-btn"
                    onClick={() => onConfirmPayment(order.id)}
                  >
                    Verify Paystack
                  </button>
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
                    {confirmTransferArmed ? 'Tap again to confirm' : 'Confirm transfer'}
                  </button>
                )}
              </div>
            )
          )}

          {onOpenDetails && (
            <button
              type="button"
              className="secondary-btn compact-expand-btn"
              onClick={() => onOpenDetails(order)}
            >
              <Eye size={14} /> Full details
            </button>
          )}

          <button
            type="button"
            className="secondary-btn compact-expand-btn"
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            {expanded ? (
              <>
                Hide <ChevronUp size={15} />
              </>
            ) : (
              <>
                Manage <ChevronDown size={15} />
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={'order-progress-timeline' + (isExceptionStatus ? ' is-exception' : '')}
        aria-label={`Order ${order.orderNumber} progress: ${order.status}`}
      >
        <div className="order-timeline-meta">
          <span className="order-timeline-summary">
            {isExceptionStatus ? (
              <>
                {order.status === 'Cancelled' ? <XCircle size={13} /> : <RotateCcw size={13} />}
                <span>Order {order.status}</span>
              </>
            ) : (
              <>
                <span>
                  Stage {activeStepIndex + 1} of {FULFILMENT_TIMELINE_STEPS.length}: <b>{order.status}</b>
                </span>
              </>
            )}
          </span>
          <span className="order-timeline-percent tabular-nums">
            {isExceptionStatus ? order.status : `${progressPercent}%`}
          </span>
        </div>

        <ol className="order-timeline-steps">
          {FULFILMENT_TIMELINE_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompletedStage = order.status === 'Completed' && index === FULFILMENT_TIMELINE_STEPS.length - 1;
            const state = isExceptionStatus
              ? 'halted'
              : isCompletedStage || index < activeStepIndex
                ? 'done'
                : index === activeStepIndex
                  ? 'current'
                  : 'upcoming';
            const canClickStep = mode !== 'payment';
            return (
              <li key={step.status} className={`order-timeline-step is-${state}`}>
                {index > 0 && (
                  <span
                    className={
                      'order-timeline-connector' +
                      (!isExceptionStatus && index <= activeStepIndex ? ' is-filled' : '')
                    }
                    aria-hidden="true"
                  />
                )}
                {canClickStep ? (
                  <button
                    type="button"
                    className="order-timeline-step-btn"
                    title={`Set ${order.orderNumber} to ${step.status}`}
                    aria-label={`Set order ${order.orderNumber} status to ${step.status}`}
                    aria-current={state === 'current' ? 'step' : undefined}
                    onClick={() => onChangeStatus(order.id, step.status)}
                  >
                    <span className="order-timeline-node">
                      {state === 'done' ? <Check size={11} strokeWidth={3} /> : <StepIcon size={11} />}
                    </span>
                    <span className="order-timeline-label">{step.label}</span>
                  </button>
                ) : (
                  <div
                    className="order-timeline-step-btn is-readonly"
                    aria-current={state === 'current' ? 'step' : undefined}
                  >
                    <span className="order-timeline-node">
                      {state === 'done' ? <Check size={11} strokeWidth={3} /> : <StepIcon size={11} />}
                    </span>
                    <span className="order-timeline-label">{step.label}</span>
                  </div>
                )}
              </li>
            );
          })}
          {isExceptionStatus && (
            <li className="order-timeline-step is-exception-end">
              <span className="order-timeline-connector is-exception-line" aria-hidden="true" />
              <div className="order-timeline-step-btn is-readonly" aria-current="step">
                <span className="order-timeline-node">
                  {order.status === 'Cancelled' ? <XCircle size={11} /> : <RotateCcw size={11} />}
                </span>
                <span className="order-timeline-label">{order.status}</span>
              </div>
            </li>
          )}
        </ol>
      </div>

      {expanded && (
        <div className="compact-order-details">
          <div className="order-stage-control-box">
            <div className="order-stage-control-head">
              <div>
                <span className="eyebrow">FULL ORDER STAGE CONTROL</span>
                <h3>Update Order Stage</h3>
              </div>
              <span className={'status ' + orderStageClass}>{order.status}</span>
            </div>
            <div className="order-stage-pills" role="group" aria-label="Set order stage">
              {ALL_ORDER_STAGES.map(stage => (
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
          </div>

          <div className="order-history-items">
            <b>Order items ({financials.itemCount})</b>
            {order.items.map((item, index) => (
              <div className="manage-row" key={item.productId + '-' + index}>
                <div className="manage-main">
                  <b>
                    {item.name} × {item.quantity}
                  </b>
                  <small>
                    {money(item.price)} each
                    {item.option ? ' · ' + item.option : ''}
                    {(item.vendorShopName || item.vendorId) ? ' · Shop: ' + (item.vendorShopName || item.vendorId) : ''}
                    {item.productCategory ? ' · ' + item.productCategory : ''}
                  </small>
                </div>
                <b className="tabular-nums">{money(item.price * item.quantity)}</b>
              </div>
            ))}
            <div className="admin-inline-ledger tabular-nums">
              <span>Subtotal: <b>{money(financials.itemsSubtotal)}</b></span>
              {financials.couponDiscount > 0 && (
                <span>
                  Coupon{financials.couponCode ? ` (${financials.couponCode})` : ''}:{' '}
                  <b>−{money(financials.couponDiscount)}</b>
                </span>
              )}
              {financials.transferFee > 0 && (
                <span>Transfer fee: <b>{money(financials.transferFee)}</b></span>
              )}
              {financials.gatewayFee > 0 && (
                <span>Gateway fee: <b>{money(financials.gatewayFee)}</b></span>
              )}
              <span>Order total: <b>{money(financials.total)}</b></span>
            </div>
          </div>

          <div className="order-info-grid">
            <div>
              <small>Order ID</small>
              <b className="tabular-nums">{order.id}</b>
            </div>
            <div>
              <small>Customer</small>
              <b>{order.customerName || account?.fullName || 'Not provided'}</b>
            </div>
            <div>
              <small>Customer account</small>
              <b>
                {account && !account.isGuest
                  ? `Registered (${account.userId}) · ${account.totalOrders ?? 1} order${(account.totalOrders ?? 1) === 1 ? '' : 's'}`
                  : order.customerUserId
                    ? `User ID: ${order.customerUserId}`
                    : 'Guest checkout'}
              </b>
            </div>
            <div>
              <small>Phone{account?.whatsapp ? ' / WhatsApp' : ''}</small>
              <b>
                {[order.phone || account?.phone, account?.whatsapp ? `WA: ${account.whatsapp}` : '']
                  .filter(Boolean)
                  .join(' · ') || 'Not provided'}
              </b>
            </div>
            <div>
              <small>Email</small>
              <b>{order.email || account?.email || 'Not provided'}</b>
            </div>
            <div>
              <small>Delivery address</small>
              <b>
                {order.address ||
                  [account?.address, account?.city, account?.state].filter(Boolean).join(', ') ||
                  'Not provided'}
              </b>
            </div>
            <div>
              <small>Courier &amp; tracking</small>
              <b>{[order.courier, order.trackingNumber].filter(Boolean).join(' · ') || 'Not assigned'}</b>
            </div>
            <div>
              <small>Placed at</small>
              <b>{new Date(order.createdAt).toLocaleString()}</b>
            </div>
            <div>
              <small>Last updated</small>
              <b>{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'No later updates'}</b>
            </div>
            {(order.affiliateReferralCode || order.affiliateId) && (
              <div>
                <small>Affiliate referral</small>
                <b>{[order.affiliateName, order.affiliateReferralCode || order.affiliateId].filter(Boolean).join(' · ')}</b>
              </div>
            )}
            {(order.cancelledAt || order.refundStatus) && (
              <div>
                <small>Cancellation / refund</small>
                <b>
                  {[
                    order.refundStatus ? `Refund: ${order.refundStatus}` : '',
                    order.refundedAt ? new Date(order.refundedAt).toLocaleString() : '',
                    order.cancelledAt ? `Cancelled ${new Date(order.cancelledAt).toLocaleString()}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </b>
              </div>
            )}
          </div>

          <div className="order-tracking-editor">
            <div className="panel-title">
              <div>
                <span className="eyebrow">DISPATCH &amp; TRACKING</span>
                <h3>Shipping Courier, Tracking Number &amp; Owner Note</h3>
              </div>
            </div>
            <div className="product-form">
              <label>
                Courier / delivery service
                <input
                  value={courier}
                  onChange={e => setCourier(e.target.value)}
                  placeholder="e.g. DHL, GIG Logistics, Dispatch Rider"
                />
              </label>
              <label>
                Tracking number / waybill
                <input
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. YKJ-TRK-88210"
                />
              </label>
              <label className="full-field">
                Admin order note (internal / dispatch reference)
                <input
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
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
          </div>

          <div className="payment-review-inline">
            <div className="panel-title">
              <div>
                <span className="eyebrow">PAYMENT CONTROL</span>
                <h3>Payment Verification</h3>
                <p>Confirm, verify or reject payment independently from fulfilment stages.</p>
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
                <small>Transaction reference</small>
                <b>{order.paystackReference || order.paymentReference || order.orderNumber}</b>
              </div>
              <div>
                <small>Payment amount</small>
                <b className="tabular-nums">{money(order.total)}</b>
              </div>
              <div>
                <small>Payment confirmation</small>
                <b>
                  {order.paymentCompletedAt
                    ? new Date(order.paymentCompletedAt).toLocaleString()
                    : 'Not confirmed'}
                </b>
              </div>
            </div>

            {canVerifyPayment ? (
              <div className="hero-buttons">
                {order.paymentMethod === 'Paystack' && (
                  <>
                    <button type="button" className="primary-btn" onClick={() => onConfirmPayment(order.id)}>
                      Verify Paystack automatically
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => onConfirmPayment(order.id, true)}
                    >
                      I checked Paystack dashboard — confirm received
                    </button>
                  </>
                )}
                {order.paymentMethod === 'Bank transfer' && (
                  <button
                    type="button"
                    className="primary-btn"
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
                      ? 'Tap again to confirm bank transfer received'
                      : 'Confirm received money & mark payment successful'}
                  </button>
                )}
                {!['Paystack', 'Bank transfer', 'Wallet'].includes(order.paymentMethod) && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => onUpdateOrder?.(order.id, { paymentStatus: 'completed' })}
                  >
                    Mark payment completed
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onReviewPayment(order.id, 'pending')}
                >
                  Keep payment pending
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
              <div className="payment-confirmed-summary">
                <p className="checkout-note">
                  {order.paymentStatus === 'completed'
                    ? 'Payment is confirmed. Order fulfilment is ' +
                      order.status +
                      '. ' +
                      (order.paymentNotificationSentAt
                        ? 'Email receipts sent on ' +
                          new Date(order.paymentNotificationSentAt).toLocaleString() +
                          '.'
                        : 'Email confirmation status pending or awaiting SendGrid check.')
                    : 'This cancelled or refunded order cannot be marked as paid here.'}
                </p>
                {order.paymentStatus === 'completed' && onResendEmails && (
                  <button
                    type="button"
                    className="secondary-btn compact-btn"
                    disabled={resendingEmail}
                    onClick={() => onResendEmails(order.id)}
                  >
                    {resendingEmail ? 'Sending emails...' : 'Resend payment emails (Customer, Vendor & Admin)'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
