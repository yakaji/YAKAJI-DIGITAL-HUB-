import { useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Coins, Copy, PauseCircle, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import {
  DEFAULT_CRYPTO_TRANSFER_FEE_USDT,
  DEFAULT_USDT_NGN_RATE,
  PRESET_CRYPTO_NETWORKS,
  calculateCryptoCheckoutBreakdown,
  formatUsdt,
  validateCryptoPricingInput,
  validateCryptoWalletInput,
  type CryptoSettings,
  type CryptoWalletConfig,
} from '../utils/cryptoPayments';

type AdminCryptoPanelProps = {
  cryptoSettings: CryptoSettings;
  onChangeCryptoSettings: (next: CryptoSettings) => void;
  onSaveCryptoSettings: (next: CryptoSettings) => Promise<void>;
  onSyncGoogleRate: (enableAutoSync?: boolean) => Promise<void>;
  saving?: boolean;
  syncingRate?: boolean;
};

export function AdminCryptoPanel({
  cryptoSettings,
  onChangeCryptoSettings,
  onSaveCryptoSettings,
  onSyncGoogleRate,
  saving = false,
  syncingRate = false,
}: AdminCryptoPanelProps) {
  const [draft, setDraft] = useState({
    coin: 'Tether USD',
    symbol: 'USDT',
    network: 'TRC-20 (Tron)',
    address: '',
    instructions: 'Send only USDT on the TRC-20 (Tron) network to avoid loss of funds.',
  });
  const [draftError, setDraftError] = useState('');
  const [pricingError, setPricingError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const activeRate = Number(cryptoSettings.usdtNgnRate) || DEFAULT_USDT_NGN_RATE;
  const activeFeeUsdt =
    cryptoSettings.transferFeeUsdt === undefined
      ? DEFAULT_CRYPTO_TRANSFER_FEE_USDT
      : Number(cryptoSettings.transferFeeUsdt);
  const rateMode = cryptoSettings.rateMode === 'auto_google' ? 'auto_google' : 'manual';
  const isBusy = saving || syncingRate;
  const samplePreview = calculateCryptoCheckoutBreakdown({
    ngnSubtotal: 16000,
    usdtNgnRate: activeRate,
    transferFeeUsdt: activeFeeUsdt,
  });

  function applyPreset(preset: (typeof PRESET_CRYPTO_NETWORKS)[number]) {
    setDraftError('');
    setDraft((current) => ({
      ...current,
      coin: preset.coin,
      symbol: preset.symbol,
      network: preset.network,
      instructions: preset.defaultInstructions,
    }));
  }

  async function saveRateAndSettings(overrideRateMode?: 'manual' | 'auto_google') {
    setPricingError('');
    const check = validateCryptoPricingInput({
      usdtNgnRate: cryptoSettings.usdtNgnRate,
      transferFeeUsdt: cryptoSettings.transferFeeUsdt,
    });
    if (!check.ok) {
      setPricingError(check.error);
      return;
    }
    const nextMode = overrideRateMode ?? rateMode;
    const nextSettings: CryptoSettings = {
      ...cryptoSettings,
      rateMode: nextMode,
      rateSource:
        nextMode === 'manual'
          ? 'Manual owner rate'
          : cryptoSettings.rateSource || 'Google USD/NGN Live FX',
      usdtNgnRate: check.usdtNgnRate,
      transferFeeUsdt: check.transferFeeUsdt,
    };
    onChangeCryptoSettings(nextSettings);
    await onSaveCryptoSettings(nextSettings);
  }

  async function handleToggleAutoSync() {
    setPricingError('');
    if (rateMode === 'auto_google') {
      const nextSettings: CryptoSettings = {
        ...cryptoSettings,
        rateMode: 'manual',
        rateSource: 'Manual owner rate',
      };
      onChangeCryptoSettings(nextSettings);
      await onSaveCryptoSettings(nextSettings);
      return;
    }
    await onSyncGoogleRate(true);
  }

  async function addWallet(e: FormEvent) {
    e.preventDefault();
    setDraftError('');
    setPricingError('');
    const pricingCheck = validateCryptoPricingInput({
      usdtNgnRate: cryptoSettings.usdtNgnRate,
      transferFeeUsdt: cryptoSettings.transferFeeUsdt,
    });
    if (!pricingCheck.ok) {
      setPricingError(pricingCheck.error);
      return;
    }

    const validated = validateCryptoWalletInput({
      coin: draft.coin,
      symbol: draft.symbol,
      network: draft.network,
      address: draft.address,
      instructions: draft.instructions,
      enabled: true,
    });
    if (!validated.ok) {
      setDraftError(validated.error);
      return;
    }

    const exists = cryptoSettings.wallets.some(
      (item) =>
        item.symbol.toLowerCase() === validated.wallet.symbol.toLowerCase() &&
        item.network.toLowerCase() === validated.wallet.network.toLowerCase()
    );
    const nextWallet: CryptoWalletConfig = exists
      ? { ...validated.wallet, id: `${validated.wallet.id}-${Date.now().toString(36)}` }
      : validated.wallet;

    const nextSettings: CryptoSettings = {
      ...cryptoSettings,
      enabled: true,
      usdtNgnRate: pricingCheck.usdtNgnRate,
      transferFeeUsdt: pricingCheck.transferFeeUsdt,
      wallets: [...cryptoSettings.wallets, nextWallet],
    };
    onChangeCryptoSettings(nextSettings);
    setDraft((current) => ({ ...current, address: '' }));
    await onSaveCryptoSettings(nextSettings);
  }

  async function toggleWalletEnabled(id: string) {
    const nextSettings: CryptoSettings = {
      ...cryptoSettings,
      wallets: cryptoSettings.wallets.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled, updatedAt: new Date().toISOString() } : w
      ),
    };
    onChangeCryptoSettings(nextSettings);
    await onSaveCryptoSettings(nextSettings);
  }

  async function removeWallet(id: string) {
    const nextSettings: CryptoSettings = {
      ...cryptoSettings,
      wallets: cryptoSettings.wallets.filter((w) => w.id !== id),
    };
    onChangeCryptoSettings(nextSettings);
    await onSaveCryptoSettings(nextSettings);
  }

  async function copyAddress(id: string, address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(''), 2000);
    } catch {
      setCopiedId('');
    }
  }

  const activeCount = cryptoSettings.wallets.filter((w) => w.enabled).length;
  const formattedSyncTime = cryptoSettings.lastRateSyncedAt
    ? new Date(cryptoSettings.lastRateSyncedAt).toLocaleString()
    : '';

  return (
    <section className="panel" id="admin-crypto">
      <div className="panel-title">
        <div>
          <span className="eyebrow">OWNER ONLY · USDT PRICING &amp; CRYPTO CHECKOUT</span>
          <h2>USDT Exchange Rate &amp; Crypto Payment Methods</h2>
          <p className="muted">
            Update the Naira-to-USDT exchange rate manually or connect live Google USD/NGN FX sync across all product prices and crypto checkouts.
          </p>
        </div>
        <div className="admin-support-header-actions">
          <button
            type="button"
            className={cryptoSettings.enabled ? 'primary-btn compact-btn' : 'secondary-btn compact-btn'}
            disabled={isBusy}
            onClick={() =>
              void onSaveCryptoSettings({
                ...cryptoSettings,
                enabled: !cryptoSettings.enabled,
              })
            }
          >
            <Power size={14} />
            {cryptoSettings.enabled ? 'Crypto Checkout Active' : 'Enable Crypto Checkout'}
          </button>
        </div>
      </div>

      <div className="stats-row tabular-nums">
        <div>
          <small>Checkout visibility</small>
          <b>{cryptoSettings.enabled && activeCount > 0 ? 'Live at Checkout' : cryptoSettings.enabled ? 'Enabled (Add a wallet)' : 'Paused'}</b>
        </div>
        <div>
          <small>Exchange rate</small>
          <b>1 USDT = ₦{activeRate.toLocaleString('en-NG')}</b>
        </div>
        <div>
          <small>Auto-Sync</small>
          <b>{rateMode === 'auto_google' ? 'Enabled' : 'Disabled'}</b>
        </div>
        <div>
          <small>Crypto transfer fee</small>
          <b>{formatUsdt(activeFeeUsdt)}</b>
        </div>
        <div>
          <small>Active receiving wallets</small>
          <b>{activeCount} / {cryptoSettings.wallets.length}</b>
        </div>
      </div>

      <div className="crypto-pricing-card">
        <div className="crypto-rate-header">
          <div>
            <strong>Google Finance Rate Auto-Sync</strong>
            <small>
              Toggle automatic Google Finance USD/NGN rate syncing (refreshes every 15 minutes), or turn off to manage a manual rate.
            </small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={rateMode === 'auto_google'}
            aria-label="Enable automatic Google Finance rate syncing"
            className={'crypto-autosync-toggle' + (rateMode === 'auto_google' ? ' active' : '')}
            disabled={isBusy}
            onClick={() => void handleToggleAutoSync()}
          >
            <span className="crypto-autosync-switch-track" aria-hidden="true">
              <span className="crypto-autosync-switch-thumb" />
            </span>
            <span className="crypto-autosync-toggle-text">
              {syncingRate
                ? 'Syncing Google Rate...'
                : rateMode === 'auto_google'
                  ? 'Google Auto-Sync: On'
                  : 'Google Auto-Sync: Off'}
            </span>
          </button>
        </div>

        <div
          className={'crypto-autosync-status tabular-nums ' + (rateMode === 'auto_google' ? 'is-active' : 'is-off')}
          aria-live="polite"
        >
          <span className="crypto-autosync-badge">
            {syncingRate ? (
              <RefreshCw size={14} className="spin" />
            ) : rateMode === 'auto_google' ? (
              <CheckCircle2 size={14} />
            ) : (
              <PauseCircle size={14} />
            )}
            <span>
              Auto-Sync:{' '}
              <b>
                {syncingRate
                  ? 'Syncing...'
                  : rateMode === 'auto_google'
                    ? 'Active'
                    : 'Disabled'}
              </b>
            </span>
          </span>
          <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
          <span>
            Last successful sync:{' '}
            <b>{formattedSyncTime || 'Not synced yet'}</b>
          </span>
          <span className="crypto-rate-meta-sep" aria-hidden="true">·</span>
          <span>
            Source: <b>{cryptoSettings.rateSource || 'Manual owner rate'}</b>
          </span>
        </div>

        <div className="crypto-pricing-grid">
          <label htmlFor="admin-usdt-ngn-rate-input">
            USDT exchange rate (₦ per 1 USDT)
            <div className="crypto-rate-input-row">
              <input
                id="admin-usdt-ngn-rate-input"
                type="number"
                min="1"
                max="1000000"
                step="0.01"
                value={cryptoSettings.usdtNgnRate || ''}
                onChange={(e) => {
                  setPricingError('');
                  onChangeCryptoSettings({
                    ...cryptoSettings,
                    rateMode: 'manual',
                    rateSource: 'Manual owner rate',
                    usdtNgnRate: Number(e.target.value),
                  });
                }}
                placeholder="e.g. 1600"
              />
              <button
                type="button"
                className="secondary-btn compact-btn"
                disabled={isBusy}
                onClick={() => void saveRateAndSettings('manual')}
              >
                {saving ? 'Saving...' : 'Save Rate'}
              </button>
              <button
                type="button"
                className="primary-btn compact-btn"
                disabled={isBusy}
                onClick={() => void onSyncGoogleRate(true)}
              >
                <RefreshCw size={14} className={syncingRate ? 'spin' : undefined} />
                <span>{syncingRate ? 'Syncing...' : 'Sync Google Rate'}</span>
              </button>
            </div>
            <small>
              {rateMode === 'auto_google'
                ? 'Auto-Sync is active from Google Finance USD/NGN FX. Editing this field switches to manual override.'
                : 'Manual rate active. All product cards & USDT checkouts convert Naira at this exact rate.'}
            </small>
          </label>
          <label htmlFor="admin-crypto-transfer-fee-input">
            Crypto transfer fee (USDT)
            <input
              id="admin-crypto-transfer-fee-input"
              type="number"
              min="0"
              max="1000"
              step="0.01"
              value={cryptoSettings.transferFeeUsdt ?? 1}
              onChange={(e) => {
                setPricingError('');
                onChangeCryptoSettings({
                  ...cryptoSettings,
                  transferFeeUsdt: e.target.value === '' ? 0 : Number(e.target.value),
                });
              }}
              placeholder="1"
            />
            <small>Charged on every Crypto / USDT order (default: 1.00 USDT).</small>
          </label>
        </div>

        <div className="crypto-pricing-preview tabular-nums">
          <span>
            Live conversion preview: ₦16,000 product = <b>{formatUsdt(samplePreview.itemsUsdt)}</b> +{' '}
            <b>{formatUsdt(samplePreview.transferFeeUsdt)}</b> transfer fee ={' '}
            <strong>{formatUsdt(samplePreview.totalUsdt)}</strong> (₦{samplePreview.totalNgn.toLocaleString('en-NG')})
          </span>
        </div>
        {pricingError && (
          <div className="review-inline-alert error" role="alert">
            {pricingError}
          </div>
        )}
      </div>

      <div className="crypto-checkout-note-row">
        <label>
          Global crypto checkout instructions (shown to customers)
          <input
            maxLength={320}
            value={cryptoSettings.checkoutNote}
            onChange={(e) =>
              onChangeCryptoSettings({ ...cryptoSettings, checkoutNote: e.target.value })
            }
            placeholder="Instructions displayed at checkout when customer picks Crypto..."
          />
        </label>
        <button
          type="button"
          className="primary-btn"
          disabled={isBusy}
          onClick={() => void saveRateAndSettings()}
        >
          {saving ? 'Saving...' : 'Save Rate, Fee & Note'}
        </button>
      </div>

      <div className="crypto-presets-bar" aria-label="Quick cryptocurrency presets">
        <span>Quick coin preset:</span>
        {PRESET_CRYPTO_NETWORKS.map((preset) => {
          const selected =
            draft.symbol === preset.symbol && draft.network === preset.network;
          return (
            <button
              key={`${preset.symbol}-${preset.network}`}
              type="button"
              className={'filter-chip' + (selected ? ' active' : '')}
              onClick={() => applyPreset(preset)}
            >
              {preset.symbol} · {preset.network}
            </button>
          );
        })}
      </div>

      <form className="product-form" onSubmit={addWallet}>
        <label>
          Cryptocurrency name
          <input
            required
            maxLength={48}
            value={draft.coin}
            onChange={(e) => setDraft({ ...draft, coin: e.target.value })}
            placeholder="e.g. Tether USD"
          />
        </label>
        <label>
          Ticker symbol
          <input
            required
            maxLength={12}
            value={draft.symbol}
            onChange={(e) =>
              setDraft({ ...draft, symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })
            }
            placeholder="e.g. USDT"
          />
        </label>
        <label>
          Network / chain
          <input
            required
            maxLength={48}
            value={draft.network}
            onChange={(e) => setDraft({ ...draft, network: e.target.value })}
            placeholder="e.g. TRC-20 (Tron)"
          />
        </label>
        <label>
          Receiving wallet address
          <input
            required
            minLength={16}
            maxLength={160}
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value.trim() })}
            placeholder="Paste your wallet receiving address"
          />
        </label>
        <label className="full-field">
          Buyer instructions for this network (optional)
          <input
            maxLength={240}
            value={draft.instructions}
            onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
            placeholder="e.g. Send only USDT on TRC-20."
          />
        </label>
        {draftError && (
          <div className="full-field review-inline-alert error" role="alert">
            {draftError}
          </div>
        )}
        <button type="submit" className="primary-btn" disabled={saving}>
          <Plus size={15} /> {saving ? 'Saving wallet...' : 'Add & Save Crypto Wallet'}
        </button>
      </form>

      <h3>Configured crypto wallets ({cryptoSettings.wallets.length})</h3>
      {cryptoSettings.wallets.length ? (
        <div className="admin-scroll-list">
          {cryptoSettings.wallets.map((wallet) => (
            <div className="manage-row crypto-wallet-row" key={wallet.id}>
              <div className="manage-main">
                <b>
                  {wallet.coin} ({wallet.symbol}) · {wallet.network}
                </b>
                <small className="crypto-address-mono">{wallet.address}</small>
                {wallet.instructions && <small>{wallet.instructions}</small>}
              </div>
              <span className={'status ' + (wallet.enabled ? 'approved' : 'pending')}>
                {wallet.enabled ? 'Active' : 'Paused'}
              </span>
              <button
                type="button"
                className="secondary-btn compact-btn"
                onClick={() => void copyAddress(wallet.id, wallet.address)}
              >
                {copiedId === wallet.id ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedId === wallet.id ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                className="secondary-btn compact-btn"
                disabled={saving}
                onClick={() => void toggleWalletEnabled(wallet.id)}
              >
                {wallet.enabled ? 'Pause' : 'Enable'}
              </button>
              <button
                type="button"
                className="danger-icon"
                disabled={saving}
                aria-label={`Delete ${wallet.symbol} wallet`}
                onClick={() => void removeWallet(wallet.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="chart-empty compact">
          <Coins size={26} />
          <b>No crypto wallets added yet</b>
          <small>
            Choose a preset above or enter your receiving wallet address to enable cryptocurrency payments.
          </small>
        </div>
      )}
    </section>
  );
}
