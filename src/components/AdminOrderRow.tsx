import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Truck, CheckCircle2 } from 'lucide-react';

export type AdminOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  option: string;
};

export type AdminOrderRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: string;
  items: AdminOrderItem[];
  total: number;
  subtotal?: number;
  transferFee?: number;
  status: string;
  paymentStatus?: string;
  paymentNotificationSentAt?: string;
  paymentCompletedAt?: string;
  paystackReference?: string;
  paymentReference?: string;
  trackingNumber?: string;
  courier?: string;
  adminNote?: string;
  refundStatus?: string;
  refundedAt?: string;
  updatedAt?: string;
  createdAt: string;
};

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
  resendingEmail
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
  resendingEmail?: boolean;
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
  const paymentClass =
    order.paymentStatus === 'completed'
      ? 'approved'
      : order.paymentStatus === 'rejected'
        ? 'rejected'
        : 'pending';
  const orderStageClass = ['Completed'].includes(order.status)
    ? 'approved'
    : ['Cancelled', 'Refunded', 'Returned'].includes(order.status)
      ? 'rejected'
      : '';
  const canVerifyPayment =
    order.paymentStatus !== 'completed' && !['Cancelled', 'Refunded'].includes(order.status);
  const nextStage = NEXT_STAGE_MAP[order.status];

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
    <article className={'compact-order-row' + (expanded ? ' is-expanded' : '')}>
      <div className="compact-order-head">
        <div className="compact-order-primary">
          <div className="compact-order-id-line">
            <b className="tabular-nums">{order.orderNumber}</b>
            <span className={'status ' + orderStageClass}>{order.status}</span>
            <span className={'status ' + paymentClass}>{paymentStatusLabel(order.paymentStatus)}</span>
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
            <b>Order items</b>
            {order.items.map((item, index) => (
              <div className="manage-row" key={item.productId + '-' + index}>
                <div className="manage-main">
                  <b>
                    {item.name} × {item.quantity}
                  </b>
                  <small>
                    {money(item.price)} each{item.option ? ' · ' + item.option : ''}
                  </small>
                </div>
                <b className="tabular-nums">{money(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>

          <div className="order-info-grid">
            <div>
              <small>Customer</small>
              <b>{order.customerName || 'Not provided'}</b>
            </div>
            <div>
              <small>Phone</small>
              <b>{order.phone || 'Not provided'}</b>
            </div>
            <div>
              <small>Email</small>
              <b>{order.email || 'Not provided'}</b>
            </div>
            <div>
              <small>Delivery address</small>
              <b>{order.address || 'Not provided'}</b>
            </div>
            <div>
              <small>Courier &amp; tracking</small>
              <b>{[order.courier, order.trackingNumber].filter(Boolean).join(' · ') || 'Not assigned'}</b>
            </div>
            <div>
              <small>Placed at</small>
              <b>{new Date(order.createdAt).toLocaleString()}</b>
            </div>
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
