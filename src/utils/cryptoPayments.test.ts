import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_RATE_SYNC_INTERVAL_MS,
  DEFAULT_CRYPTO_TRANSFER_FEE_USDT,
  DEFAULT_USDT_NGN_RATE,
  calculateCryptoCheckoutBreakdown,
  convertNgnToUsdt,
  formatCryptoWalletLabel,
  formatUsdt,
  getActiveCryptoWallets,
  getCryptoVerificationProgress,
  normalizeCryptoRateMode,
  normalizeCryptoSettings,
  parseGoogleFinanceRateHtml,
  sanitizeCryptoSettingsForPublic,
  shouldAutoRefreshGoogleRate,
  validateCheckoutCryptoSelection,
  validateCryptoPricingInput,
  validateCryptoTxHash,
  validateCryptoWalletInput,
} from './cryptoPayments';

test('validateCryptoWalletInput accepts valid coin/network/address and rejects malformed input', () => {
  const valid = validateCryptoWalletInput({
    id: 'usdt-trc20',
    coin: 'Tether USD',
    symbol: 'usdt',
    network: 'TRC-20 (Tron)',
    address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
    instructions: 'Send USDT via TRC-20 only.',
    enabled: true,
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.wallet.symbol, 'USDT');
    assert.equal(valid.wallet.id, 'usdt-trc20');
  }

  const shortAddress = validateCryptoWalletInput({
    coin: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin',
    address: 'short',
  });
  assert.equal(shortAddress.ok, false);

  const spacedAddress = validateCryptoWalletInput({
    coin: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin',
    address: 'bc1q invalid space address',
  });
  assert.equal(spacedAddress.ok, false);
});

test('sanitizeCryptoSettingsForPublic exposes only active wallets while always exposing rate & 1 USDT fee', () => {
  const settings = normalizeCryptoSettings({
    enabled: true,
    usdtNgnRate: 1650,
    transferFeeUsdt: 1,
    checkoutNote: 'Verify network carefully.',
    wallets: [
      {
        id: 'w-active',
        coin: 'Tether USD',
        symbol: 'USDT',
        network: 'TRC-20',
        address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        enabled: true,
      },
      {
        id: 'w-disabled',
        coin: 'Bitcoin',
        symbol: 'BTC',
        network: 'Bitcoin Mainnet',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        enabled: false,
      },
    ],
  });

  assert.equal(settings.wallets.length, 2);
  assert.equal(settings.usdtNgnRate, 1650);
  assert.equal(settings.transferFeeUsdt, 1);

  const pub = sanitizeCryptoSettingsForPublic(settings);
  assert.equal(pub.enabled, true);
  assert.equal(pub.usdtNgnRate, 1650);
  assert.equal(pub.transferFeeUsdt, 1);
  assert.deepEqual(
    pub.wallets.map((w) => w.id),
    ['w-active']
  );

  const disabledAll = sanitizeCryptoSettingsForPublic({ ...settings, enabled: false });
  assert.equal(disabledAll.enabled, false);
  assert.equal(disabledAll.usdtNgnRate, 1650);
  assert.deepEqual(disabledAll.wallets, []);
});

test('validateCheckoutCryptoSelection validates active network and optional TX hash', () => {
  const settings = normalizeCryptoSettings({
    enabled: true,
    wallets: [
      {
        id: 'eth-main',
        coin: 'Ethereum',
        symbol: 'ETH',
        network: 'Ethereum (ERC-20)',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        enabled: true,
      },
      {
        id: 'btc-paused',
        coin: 'Bitcoin',
        symbol: 'BTC',
        network: 'Bitcoin',
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        enabled: false,
      },
    ],
  });

  const ok = validateCheckoutCryptoSelection(
    settings,
    'eth-main',
    '0xabc123def4567890'
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.wallet.symbol, 'ETH');
    assert.equal(ok.txHash, '0xabc123def4567890');
  }

  const paused = validateCheckoutCryptoSelection(settings, 'btc-paused', '');
  assert.equal(paused.ok, false);

  const badHash = validateCheckoutCryptoSelection(settings, 'eth-main', 'bad hash with spaces!');
  assert.equal(badHash.ok, false);

  assert.equal(
    formatCryptoWalletLabel(getActiveCryptoWallets(settings)[0]),
    'ETH (Ethereum (ERC-20))'
  );
});

test('convertNgnToUsdt and formatUsdt calculate exact USDT values from configured rate', () => {
  assert.equal(DEFAULT_USDT_NGN_RATE, 1600);
  assert.equal(DEFAULT_CRYPTO_TRANSFER_FEE_USDT, 1);

  assert.equal(convertNgnToUsdt(16000, 1600), 10);
  assert.equal(convertNgnToUsdt(24000, 1600), 15);
  assert.equal(convertNgnToUsdt(10000, 1600), 6.25);
  assert.equal(convertNgnToUsdt(15000, 1600), 9.38);
  assert.equal(convertNgnToUsdt(0, 1600), 0);
  assert.equal(convertNgnToUsdt(-500, 1600), 0);
  assert.equal(convertNgnToUsdt(16000, 0), 0);

  assert.equal(formatUsdt(10), '10.00 USDT');
  assert.equal(formatUsdt(1234.5), '1,234.50 USDT');
});

test('calculateCryptoCheckoutBreakdown adds exact 1 USDT transfer fee and respects discounts', () => {
  const standard = calculateCryptoCheckoutBreakdown({
    ngnSubtotal: 16000,
    usdtNgnRate: 1600,
    transferFeeUsdt: 1,
  });
  assert.equal(standard.itemsUsdt, 10);
  assert.equal(standard.transferFeeUsdt, 1);
  assert.equal(standard.transferFeeNgn, 1600);
  assert.equal(standard.totalUsdt, 11);
  assert.equal(standard.totalNgn, 17600);

  const discounted = calculateCryptoCheckoutBreakdown({
    ngnSubtotal: 32000,
    couponDiscount: 8000,
    usdtNgnRate: 1600,
    transferFeeUsdt: 1,
  });
  assert.equal(discounted.ngnAfterDiscount, 24000);
  assert.equal(discounted.itemsUsdt, 15);
  assert.equal(discounted.transferFeeUsdt, 1);
  assert.equal(discounted.totalUsdt, 16);
  assert.equal(discounted.totalNgn, 25600);

  const empty = calculateCryptoCheckoutBreakdown({
    ngnSubtotal: 0,
    usdtNgnRate: 1600,
    transferFeeUsdt: 1,
  });
  assert.equal(empty.totalUsdt, 0);
  assert.equal(empty.transferFeeNgn, 0);
});

test('validateCryptoPricingInput rejects invalid rates and fees', () => {
  assert.equal(validateCryptoPricingInput({ usdtNgnRate: 1600, transferFeeUsdt: 1 }).ok, true);
  assert.equal(validateCryptoPricingInput({ usdtNgnRate: 0, transferFeeUsdt: 1 }).ok, false);
  assert.equal(validateCryptoPricingInput({ usdtNgnRate: -100, transferFeeUsdt: 1 }).ok, false);
  assert.equal(validateCryptoPricingInput({ usdtNgnRate: 1600, transferFeeUsdt: -1 }).ok, false);
});

test('normalizeCryptoSettings and shouldAutoRefreshGoogleRate handle manual and auto_google modes', () => {
  assert.equal(normalizeCryptoRateMode('auto_google'), 'auto_google');
  assert.equal(normalizeCryptoRateMode('manual'), 'manual');
  assert.equal(normalizeCryptoRateMode('something-else'), 'manual');

  const now = Date.UTC(2026, 10, 28, 12, 0, 0);
  const manual = normalizeCryptoSettings({
    enabled: true,
    usdtNgnRate: 1550,
    rateMode: 'manual',
    lastRateSyncedAt: '',
  });
  assert.equal(manual.rateMode, 'manual');
  assert.equal(manual.rateSource, 'Manual owner rate');
  assert.equal(shouldAutoRefreshGoogleRate(manual, now), false);

  const freshAuto = normalizeCryptoSettings({
    enabled: true,
    usdtNgnRate: 1361.23,
    rateMode: 'auto_google',
    rateSource: 'Google Finance (USD/NGN)',
    lastRateSyncedAt: new Date(now - 5 * 60 * 1000).toISOString(),
  });
  assert.equal(freshAuto.rateMode, 'auto_google');
  assert.equal(shouldAutoRefreshGoogleRate(freshAuto, now), false);

  const staleAuto = normalizeCryptoSettings({
    ...freshAuto,
    lastRateSyncedAt: new Date(now - AUTO_RATE_SYNC_INTERVAL_MS - 1000).toISOString(),
  });
  assert.equal(shouldAutoRefreshGoogleRate(staleAuto, now), true);

  const missingTimestampAuto = normalizeCryptoSettings({
    ...freshAuto,
    lastRateSyncedAt: '',
  });
  assert.equal(shouldAutoRefreshGoogleRate(missingTimestampAuto, now), true);

  const pub = sanitizeCryptoSettingsForPublic(freshAuto);
  assert.equal(pub.rateMode, 'auto_google');
  assert.equal(pub.rateSource, 'Google Finance (USD/NGN)');
  assert.equal(pub.lastRateSyncedAt, freshAuto.lastRateSyncedAt);
});

test('parseGoogleFinanceRateHtml extracts valid USD-NGN quote and ignores invalid HTML', () => {
  assert.equal(
    parseGoogleFinanceRateHtml('<div data-last-price="1,365.42" data-currency="NGN"></div>'),
    1365.42
  );
  assert.equal(
    parseGoogleFinanceRateHtml('<div class="YMlKec fxKbKc">1,412.50</div>'),
    1412.5
  );
  assert.equal(parseGoogleFinanceRateHtml('<html><body>No quote here</body></html>'), null);
});

test('validateCryptoTxHash validates required transaction hash formatting cleanly', () => {
  const valid = validateCryptoTxHash('0xabc123def4567890');
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.txHash, '0xabc123def4567890');

  assert.equal(validateCryptoTxHash('').ok, false);
  assert.equal(validateCryptoTxHash('ab').ok, false);
  assert.equal(validateCryptoTxHash('hash with spaces!').ok, false);
});

test('getCryptoVerificationProgress maps awaiting TX, under review, verified, rejected, and cancelled states', () => {
  const awaiting = getCryptoVerificationProgress({
    paymentMethod: 'Crypto',
    paymentStatus: 'pending',
    status: 'New',
    cryptoTxHash: '',
  });
  assert.equal(awaiting.stage, 'awaiting_tx_hash');
  assert.equal(awaiting.canSubmitTxHash, true);
  assert.equal(awaiting.steps[1].state, 'current');
  assert.equal(awaiting.steps[2].state, 'upcoming');

  const underReview = getCryptoVerificationProgress({
    paymentMethod: 'Crypto',
    paymentStatus: 'pending',
    status: 'New',
    cryptoTxHash: '0xdeadbeef123456',
    cryptoTxSubmittedAt: '2026-11-28T09:00:00.000Z',
  });
  assert.equal(underReview.stage, 'under_review');
  assert.equal(underReview.canSubmitTxHash, true);
  assert.equal(underReview.steps[1].state, 'complete');
  assert.equal(underReview.steps[2].state, 'current');

  const verified = getCryptoVerificationProgress({
    paymentMethod: 'Crypto',
    paymentStatus: 'completed',
    status: 'Confirmed',
    cryptoTxHash: '0xdeadbeef123456',
    paymentCompletedAt: '2026-11-28T09:15:00.000Z',
  });
  assert.equal(verified.stage, 'verified');
  assert.equal(verified.canSubmitTxHash, false);
  assert.equal(verified.steps.every((s) => s.state === 'complete'), true);

  const rejected = getCryptoVerificationProgress({
    paymentMethod: 'Crypto',
    paymentStatus: 'rejected',
    status: 'New',
    cryptoTxHash: '0xdeadbeef123456',
    paymentReviewNote: 'Wrong network used.',
  });
  assert.equal(rejected.stage, 'rejected');
  assert.equal(rejected.canSubmitTxHash, true);
  assert.equal(rejected.description, 'Wrong network used.');
  assert.equal(rejected.steps[2].state, 'rejected');

  const cancelled = getCryptoVerificationProgress({
    paymentMethod: 'Crypto',
    paymentStatus: 'pending',
    status: 'Cancelled',
    cryptoTxHash: '',
  });
  assert.equal(cancelled.stage, 'cancelled');
  assert.equal(cancelled.canSubmitTxHash, false);
});
