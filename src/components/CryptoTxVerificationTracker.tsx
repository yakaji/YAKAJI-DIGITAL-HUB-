import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Send,
  XCircle,
} from 'lucide-react';
import type { AdminOrderDetailRecord } from '../utils/adminOrderDetails';
import {
  formatUsdt,
  getCryptoVerificationProgress,
  validateCryptoTxHash,
} from '../utils/cryptoPayments';

type CryptoTxVerificationTrackerProps = {
  order: AdminOrderDetailRecord;
  onSubmitTxHash?: (orderId: string, txHash: string) => Promise<void>;
  submitting?: boolean;
};

export function CryptoTxVerificationTracker({
  order,
  onSubmitTxHash,
  submitting = false,
}: CryptoTxVerificationTrackerProps) {
  const progress = getCryptoVerificationProgress(order);
  const [editingHash, setEditingHash] = useState(false);
  const [draftHash, setDraftHash] = useState(progress.txHash || '');
  const [hashError, setHashError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    setDraftHash(progress.txHash || '');
    setHashError('');
    setEditingHash(false);
  }, [order.id, progress.txHash]);

  if (order.paymentMethod !== 'Crypto') {
    return null;
  }

  const showSubmitForm =
    Boolean(onSubmitTxHash) &&
    progress.canSubmitTxHash &&
    (progress.stage === 'awaiting_tx_hash' || progress.stage === 'rejected' || editingHash);

  async function copyValue(key: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      setCopiedKey('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onSubmitTxHash) return;
    setHashError('');
    const checked = validateCryptoTxHash(draftHash);
    if (!checked.ok) {
      setHashError(checked.error);
      return;
    }
    await onSubmitTxHash(order.id, checked.txHash);
    setEditingHash(false);
  }

  const stageIcon =
    progress.stage === 'verified' ? (
      <CheckCircle2 size={15} aria-hidden="true" />
    ) : progress.stage === 'rejected' ? (
      <AlertTriangle size={15} aria-hidden="true" />
    ) : progress.stage === 'cancelled' ? (
      <XCircle size={15} aria-hidden="true" />
    ) : (
      <Clock size={15} aria-hidden="true" />
    );

  return (
    <section
      className={`crypto-tx-tracker is-${progress.stage}`}
      aria-label={`Crypto transaction verification status for order ${order.orderNumber}`}
    >
      <div className="crypto-tx-tracker-head">
        <div>
          <span className="eyebrow">CRYPTO TRANSACTION VERIFICATION</span>
          <h4>{progress.headline}</h4>
          <p>{progress.description}</p>
        </div>
        <div className={`crypto-tx-status-tag is-${progress.stage}`} role="status">
          {stageIcon}
          <span>{progress.label}</span>
        </div>
      </div>

      <ol className="crypto-tx-steps" aria-label="Transaction verification milestones">
        {progress.steps.map((step, index) => (
          <li className={`crypto-tx-step is-${step.state}`} key={step.key}>
            <div className="crypto-tx-step-marker" aria-hidden="true">
              {step.state === 'complete' ? (
                <Check size={12} />
              ) : step.state === 'rejected' ? (
                <AlertTriangle size={12} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <div className="crypto-tx-step-copy">
              <b>{step.title}</b>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>

      <div className="crypto-tx-meta-grid tabular-nums">
        <div className="crypto-tx-hash-cell">
          <small>Submitted TX hash / reference</small>
          {progress.txHash ? (
            <div className="crypto-tx-hash-value">
              <code className="crypto-address-mono">{progress.txHash}</code>
              <button
                type="button"
                className="secondary-btn compact-btn"
                aria-label={`Copy TX hash for order ${order.orderNumber}`}
                onClick={() => void copyValue('tx', progress.txHash)}
              >
                {copiedKey === 'tx' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'tx' ? 'Copied' : 'Copy'}</span>
              </button>
              {progress.canSubmitTxHash && onSubmitTxHash && !showSubmitForm && (
                <button
                  type="button"
                  className="secondary-btn compact-btn"
                  onClick={() => {
                    setDraftHash(progress.txHash);
                    setHashError('');
                    setEditingHash(true);
                  }}
                >
                  <Edit3 size={13} />
                  <span>Update TX hash</span>
                </button>
              )}
            </div>
          ) : (
            <b className="crypto-tx-missing">No transaction hash submitted yet</b>
          )}
        </div>

        <div className="crypto-tx-timestamps">
          <span>
            Network:{' '}
            <b>
              {[order.cryptoSymbol || order.cryptoCoin, order.cryptoNetwork]
                .filter(Boolean)
                .join(' · ') || 'Crypto'}
            </b>
          </span>
          {order.cryptoTotalUsdt ? (
            <>
              <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
              <span>
                Expected: <b>{formatUsdt(Number(order.cryptoTotalUsdt))}</b>
              </span>
            </>
          ) : null}
          {progress.submittedAt && (
            <>
              <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
              <span>Submitted: {new Date(progress.submittedAt).toLocaleString()}</span>
            </>
          )}
          {progress.reviewedAt && progress.stage !== 'verified' && (
            <>
              <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
              <span>Reviewed: {new Date(progress.reviewedAt).toLocaleString()}</span>
            </>
          )}
          {progress.completedAt && (
            <>
              <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
              <span>Confirmed: {new Date(progress.completedAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {showSubmitForm && (
        <form className="crypto-tx-submit-form" onSubmit={handleSubmit}>
          <label htmlFor={`crypto-tx-input-${order.id}`}>
            {progress.stage === 'rejected'
              ? 'Resubmit corrected transaction hash (TXID)'
              : progress.txHash
                ? 'Update transaction hash (TXID)'
                : 'Submit transaction hash (TXID)'}
            <div className="crypto-tx-submit-row">
              <input
                id={`crypto-tx-input-${order.id}`}
                type="text"
                maxLength={140}
                value={draftHash}
                onChange={(e) => {
                  setHashError('');
                  setDraftHash(e.target.value);
                }}
                placeholder="Paste blockchain TXID or transfer reference..."
              />
              <button type="submit" className="primary-btn compact-btn" disabled={submitting}>
                <Send size={13} />
                <span>
                  {submitting
                    ? 'Submitting...'
                    : progress.stage === 'rejected'
                      ? 'Resubmit TX Hash'
                      : progress.txHash
                        ? 'Save TX Hash'
                        : 'Submit TX Hash'}
                </span>
              </button>
              {editingHash && (
                <button
                  type="button"
                  className="secondary-btn compact-btn"
                  disabled={submitting}
                  onClick={() => {
                    setEditingHash(false);
                    setHashError('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </label>
          {hashError && (
            <div className="review-inline-alert error" role="alert">
              {hashError}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
