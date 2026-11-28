export type CryptoRateMode = 'manual' | 'auto_google';

export interface CryptoWalletConfig {
  id: string;
  coin: string;
  symbol: string;
  network: string;
  address: string;
  instructions?: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface CryptoSettings {
  enabled: boolean;
  usdtNgnRate: number;
  rateMode: CryptoRateMode;
  rateSource: string;
  lastRateSyncedAt: string;
  transferFeeUsdt: number;
  checkoutNote: string;
  wallets: CryptoWalletConfig[];
}

export interface PublicCryptoSettings {
  enabled: boolean;
  usdtNgnRate: number;
  rateMode: CryptoRateMode;
  rateSource: string;
  lastRateSyncedAt: string;
  transferFeeUsdt: number;
  checkoutNote: string;
  wallets: CryptoWalletConfig[];
}

export interface CryptoCheckoutBreakdown {
  ngnSubtotal: number;
  couponDiscount: number;
  ngnAfterDiscount: number;
  usdtNgnRate: number;
  itemsUsdt: number;
  transferFeeUsdt: number;
  transferFeeNgn: number;
  totalUsdt: number;
  totalNgn: number;
}

export interface CryptoPresetOption {
  coin: string;
  symbol: string;
  network: string;
  defaultInstructions: string;
}

export const DEFAULT_USDT_NGN_RATE = 1600;
export const DEFAULT_CRYPTO_TRANSFER_FEE_USDT = 1;
export const MIN_USDT_NGN_RATE = 1;
export const MAX_USDT_NGN_RATE = 1000000;
export const MAX_CRYPTO_TRANSFER_FEE_USDT = 1000;
export const AUTO_RATE_SYNC_INTERVAL_MS = 15 * 60 * 1000;

export const PRESET_CRYPTO_NETWORKS: CryptoPresetOption[] = [
  {
    coin: 'Tether USD',
    symbol: 'USDT',
    network: 'TRC-20 (Tron)',
    defaultInstructions: 'Send only USDT on the TRC-20 (Tron) network to avoid loss of funds.',
  },
  {
    coin: 'Tether USD',
    symbol: 'USDT',
    network: 'BEP-20 (BSC)',
    defaultInstructions: 'Send only USDT on BNB Smart Chain (BEP-20).',
  },
  {
    coin: 'Tether USD',
    symbol: 'USDT',
    network: 'ERC-20 (Ethereum)',
    defaultInstructions: 'Send only USDT on Ethereum Mainnet (ERC-20).',
  },
  {
    coin: 'USD Coin',
    symbol: 'USDC',
    network: 'Base / ERC-20',
    defaultInstructions: 'Send only USDC matching the exact network shown.',
  },
  {
    coin: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Mainnet',
    defaultInstructions: 'Send BTC on the Bitcoin network and include your transaction hash if available.',
  },
  {
    coin: 'Ethereum',
    symbol: 'ETH',
    network: 'Ethereum (ERC-20)',
    defaultInstructions: 'Send ETH on the Ethereum Mainnet.',
  },
  {
    coin: 'Solana',
    symbol: 'SOL',
    network: 'Solana Mainnet',
    defaultInstructions: 'Send SOL on the Solana network.',
  },
];

export const DEFAULT_CRYPTO_SETTINGS: CryptoSettings = {
  enabled: false,
  usdtNgnRate: DEFAULT_USDT_NGN_RATE,
  rateMode: 'manual',
  rateSource: 'Manual owner rate',
  lastRateSyncedAt: '',
  transferFeeUsdt: DEFAULT_CRYPTO_TRANSFER_FEE_USDT,
  checkoutNote:
    'Send the exact USDT total (including the 1.00 USDT transfer fee) to the selected wallet address, then keep your transaction hash for admin verification.',
  wallets: [],
};

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function roundUsdt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeUsdtNgnRate(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < MIN_USDT_NGN_RATE || num > MAX_USDT_NGN_RATE) {
    return DEFAULT_USDT_NGN_RATE;
  }
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function normalizeTransferFeeUsdt(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_CRYPTO_TRANSFER_FEE_USDT;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > MAX_CRYPTO_TRANSFER_FEE_USDT) {
    return DEFAULT_CRYPTO_TRANSFER_FEE_USDT;
  }
  return roundUsdt(num);
}

export function validateCryptoPricingInput(input: {
  usdtNgnRate?: unknown;
  transferFeeUsdt?: unknown;
}):
  | { ok: true; usdtNgnRate: number; transferFeeUsdt: number }
  | { ok: false; error: string } {
  const rawRate = Number(input.usdtNgnRate);
  if (!Number.isFinite(rawRate) || rawRate < MIN_USDT_NGN_RATE || rawRate > MAX_USDT_NGN_RATE) {
    return {
      ok: false,
      error: `Enter a valid USDT exchange rate between ₦${MIN_USDT_NGN_RATE} and ₦${MAX_USDT_NGN_RATE.toLocaleString('en-US')} per 1 USDT.`,
    };
  }
  const rawFee =
    input.transferFeeUsdt === undefined || input.transferFeeUsdt === ''
      ? DEFAULT_CRYPTO_TRANSFER_FEE_USDT
      : Number(input.transferFeeUsdt);
  if (!Number.isFinite(rawFee) || rawFee < 0 || rawFee > MAX_CRYPTO_TRANSFER_FEE_USDT) {
    return {
      ok: false,
      error: `Enter a valid crypto transfer fee between 0 and ${MAX_CRYPTO_TRANSFER_FEE_USDT} USDT.`,
    };
  }
  return {
    ok: true,
    usdtNgnRate: Math.round((rawRate + Number.EPSILON) * 100) / 100,
    transferFeeUsdt: roundUsdt(rawFee),
  };
}

export function convertNgnToUsdt(
  ngnAmount: number,
  usdtNgnRate: number = DEFAULT_USDT_NGN_RATE
): number {
  const amount = Number(ngnAmount);
  const rate = Number(usdtNgnRate);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return roundUsdt(amount / rate);
}

export function formatUsdt(usdtAmount: number): string {
  const safe = Number.isFinite(usdtAmount) && usdtAmount > 0 ? roundUsdt(usdtAmount) : 0;
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)} USDT`;
}

export function calculateCryptoCheckoutBreakdown(input: {
  ngnSubtotal: number;
  couponDiscount?: number;
  usdtNgnRate?: number;
  transferFeeUsdt?: number;
}): CryptoCheckoutBreakdown {
  const ngnSubtotal = Math.max(0, Number(input.ngnSubtotal) || 0);
  const couponDiscount = Math.min(ngnSubtotal, Math.max(0, Number(input.couponDiscount) || 0));
  const ngnAfterDiscount = Math.max(0, ngnSubtotal - couponDiscount);
  const usdtNgnRate = normalizeUsdtNgnRate(input.usdtNgnRate);
  const feeSettingUsdt = normalizeTransferFeeUsdt(input.transferFeeUsdt);

  if (ngnSubtotal <= 0) {
    return {
      ngnSubtotal: 0,
      couponDiscount: 0,
      ngnAfterDiscount: 0,
      usdtNgnRate,
      itemsUsdt: 0,
      transferFeeUsdt: feeSettingUsdt,
      transferFeeNgn: 0,
      totalUsdt: 0,
      totalNgn: 0,
    };
  }

  const itemsUsdt = convertNgnToUsdt(ngnAfterDiscount, usdtNgnRate);
  const transferFeeNgn = Math.round(feeSettingUsdt * usdtNgnRate);
  const totalUsdt = roundUsdt(itemsUsdt + feeSettingUsdt);
  const totalNgn = ngnAfterDiscount + transferFeeNgn;

  return {
    ngnSubtotal,
    couponDiscount,
    ngnAfterDiscount,
    usdtNgnRate,
    itemsUsdt,
    transferFeeUsdt: feeSettingUsdt,
    transferFeeNgn,
    totalUsdt,
    totalNgn,
  };
}

export function validateCryptoWalletInput(input: Partial<CryptoWalletConfig> | null | undefined):
  | { ok: true; wallet: CryptoWalletConfig }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Crypto wallet payload is required.' };
  }

  const coin = cleanText(input.coin, 48);
  const symbol = cleanText(input.symbol, 12).toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const network = cleanText(input.network, 48);
  const address = String(input.address ?? '').trim();
  const instructions = cleanText(input.instructions, 240);
  const id = cleanText(input.id, 64) || `crypto-${symbol.toLowerCase()}-${network.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  if (coin.length < 2) {
    return { ok: false, error: 'Enter the cryptocurrency name (for example, Tether USD or Bitcoin).' };
  }
  if (symbol.length < 2 || symbol.length > 12) {
    return { ok: false, error: 'Enter a valid coin ticker symbol (2 to 12 characters, e.g. USDT, BTC).' };
  }
  if (network.length < 2) {
    return { ok: false, error: 'Specify the blockchain network (for example, TRC-20, ERC-20, or Bitcoin).' };
  }
  if (address.length < 16 || address.length > 160 || /\s|[<>'"`]/.test(address)) {
    return {
      ok: false,
      error: 'Enter a valid receiving wallet address (16–160 characters with no spaces or HTML characters).',
    };
  }

  return {
    ok: true,
    wallet: {
      id,
      coin,
      symbol,
      network,
      address,
      instructions,
      enabled: input.enabled !== false,
      updatedAt: String(input.updatedAt || new Date().toISOString()),
    },
  };
}

export function normalizeCryptoRateMode(value: unknown): CryptoRateMode {
  return value === 'auto_google' ? 'auto_google' : 'manual';
}

export function parseGoogleFinanceRateHtml(html: string): number | null {
  if (!html || typeof html !== 'string') return null;
  const patterns = [
    /data-last-price="([0-9][0-9.,]*)"/i,
    /class="YMlKec fxKbKc">([0-9][0-9.,]*)<\/div>/i,
    /"USD"\s*,\s*"NGN"\s*,\s*([0-9]+(?:\.[0-9]+)?)/i,
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (!match?.[1]) continue;
    const numeric = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(numeric) && numeric >= MIN_USDT_NGN_RATE && numeric <= MAX_USDT_NGN_RATE) {
      return Math.round((numeric + Number.EPSILON) * 100) / 100;
    }
  }
  return null;
}

export function shouldAutoRefreshGoogleRate(
  settings: Pick<CryptoSettings, 'rateMode' | 'lastRateSyncedAt'> | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!settings || normalizeCryptoRateMode(settings.rateMode) !== 'auto_google') {
    return false;
  }
  const syncedRaw = String(settings.lastRateSyncedAt || '').trim();
  if (!syncedRaw) return true;
  const syncedMs = Date.parse(syncedRaw);
  if (!Number.isFinite(syncedMs)) return true;
  return nowMs - syncedMs >= AUTO_RATE_SYNC_INTERVAL_MS;
}

export function normalizeCryptoSettings(input: unknown): CryptoSettings {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_CRYPTO_SETTINGS, wallets: [] };
  }
  const obj = input as Partial<CryptoSettings>;
  const rawWallets = Array.isArray(obj.wallets) ? obj.wallets.slice(0, 24) : [];
  const wallets: CryptoWalletConfig[] = [];
  const seenIds = new Set<string>();

  for (const item of rawWallets) {
    const validated = validateCryptoWalletInput(item);
    if (!validated.ok) continue;
    let uniqueId = validated.wallet.id;
    let suffix = 2;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${validated.wallet.id}-${suffix}`;
      suffix++;
    }
    seenIds.add(uniqueId);
    wallets.push({ ...validated.wallet, id: uniqueId });
  }

  const rateMode = normalizeCryptoRateMode(obj.rateMode);
  const rateSource =
    cleanText(obj.rateSource, 80) ||
    (rateMode === 'auto_google' ? 'Google USD/NGN Live FX' : DEFAULT_CRYPTO_SETTINGS.rateSource);
  const lastRateSyncedAt = cleanText(obj.lastRateSyncedAt, 48);

  return {
    enabled: Boolean(obj.enabled),
    usdtNgnRate: normalizeUsdtNgnRate(obj.usdtNgnRate),
    rateMode,
    rateSource,
    lastRateSyncedAt,
    transferFeeUsdt: normalizeTransferFeeUsdt(obj.transferFeeUsdt),
    checkoutNote:
      cleanText(obj.checkoutNote, 320) || DEFAULT_CRYPTO_SETTINGS.checkoutNote,
    wallets,
  };
}

export function getActiveCryptoWallets(settings: CryptoSettings | PublicCryptoSettings | null | undefined): CryptoWalletConfig[] {
  if (!settings || !settings.enabled || !Array.isArray(settings.wallets)) {
    return [];
  }
  return settings.wallets.filter(
    (wallet) => Boolean(wallet?.enabled) && String(wallet?.address || '').trim().length >= 16
  );
}

export function sanitizeCryptoSettingsForPublic(settings: CryptoSettings | null | undefined): PublicCryptoSettings {
  const normalized = normalizeCryptoSettings(settings);
  return {
    enabled: normalized.enabled && getActiveCryptoWallets(normalized).length > 0,
    usdtNgnRate: normalized.usdtNgnRate,
    rateMode: normalized.rateMode,
    rateSource: normalized.rateSource,
    lastRateSyncedAt: normalized.lastRateSyncedAt,
    transferFeeUsdt: normalized.transferFeeUsdt,
    checkoutNote: normalized.checkoutNote,
    wallets: getActiveCryptoWallets(normalized),
  };
}

export function validateCheckoutCryptoSelection(
  settings: CryptoSettings | PublicCryptoSettings | null | undefined,
  selectedWalletId: unknown,
  rawTxHash?: unknown
):
  | { ok: true; wallet: CryptoWalletConfig; txHash: string }
  | { ok: false; error: string } {
  const activeWallets = getActiveCryptoWallets(settings);
  if (!settings?.enabled || activeWallets.length === 0) {
    return {
      ok: false,
      error: 'Cryptocurrency checkout is not currently enabled on this marketplace.',
    };
  }

  const targetId = String(selectedWalletId || '').trim();
  const wallet = activeWallets.find((item) => item.id === targetId);
  if (!wallet) {
    return {
      ok: false,
      error: 'Select one of the active cryptocurrency payment networks before placing your order.',
    };
  }

  const txHash = cleanText(rawTxHash, 140);
  if (txHash && !/^[a-zA-Z0-9:_./-]{4,140}$/.test(txHash)) {
    return {
      ok: false,
      error: 'Transaction hash or sender reference contains invalid characters.',
    };
  }

  return {
    ok: true,
    wallet,
    txHash,
  };
}

export function formatCryptoWalletLabel(wallet: Pick<CryptoWalletConfig, 'symbol' | 'network' | 'coin'>): string {
  return `${wallet.symbol} (${wallet.network})`;
}

export function validateCryptoTxHash(
  rawTxHash: unknown
): { ok: true; txHash: string } | { ok: false; error: string } {
  const txHash = cleanText(rawTxHash, 140);
  if (txHash.length < 4) {
    return {
      ok: false,
      error: 'Enter a valid transaction hash or sender reference (4 to 140 characters).',
    };
  }
  if (!/^[a-zA-Z0-9:_./-]{4,140}$/.test(txHash)) {
    return {
      ok: false,
      error: 'Transaction hash or sender reference contains invalid characters.',
    };
  }
  return { ok: true, txHash };
}

export type CryptoVerificationStage =
  | 'awaiting_tx_hash'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'cancelled';

export type CryptoVerificationStepState = 'complete' | 'current' | 'rejected' | 'upcoming';

export interface CryptoVerificationStep {
  key: 'placed' | 'submitted' | 'review' | 'verified';
  title: string;
  detail: string;
  state: CryptoVerificationStepState;
}

export interface CryptoVerificationProgress {
  stage: CryptoVerificationStage;
  label: string;
  headline: string;
  description: string;
  txHash: string;
  submittedAt: string;
  reviewedAt: string;
  completedAt: string;
  reviewNote: string;
  canSubmitTxHash: boolean;
  steps: CryptoVerificationStep[];
}

export interface CryptoOrderStatusInput {
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
  cryptoTxHash?: string;
  cryptoTxSubmittedAt?: string;
  paymentReviewedAt?: string;
  paymentReviewNote?: string;
  paymentCompletedAt?: string;
  paymentRejectedAt?: string;
  createdAt?: string;
}

export function getCryptoVerificationProgress(
  order: CryptoOrderStatusInput | null | undefined
): CryptoVerificationProgress {
  const txHash = cleanText(order?.cryptoTxHash, 140);
  const paymentStatus = String(order?.paymentStatus || 'pending').toLowerCase();
  const orderStatus = String(order?.status || 'New');
  const submittedAt = String(order?.cryptoTxSubmittedAt || (txHash ? order?.createdAt || '' : ''));
  const reviewedAt = String(order?.paymentReviewedAt || order?.paymentRejectedAt || '');
  const completedAt = String(order?.paymentCompletedAt || '');
  const reviewNote = cleanText(order?.paymentReviewNote, 320);

  const isClosed = ['Cancelled', 'Refunded', 'Returned'].includes(orderStatus);

  if (paymentStatus === 'completed') {
    return {
      stage: 'verified',
      label: 'Verified on Chain',
      headline: 'Transaction verified and order marked paid',
      description:
        'The marketplace owner confirmed your cryptocurrency transfer. Your order is now cleared for fulfilment.',
      txHash,
      submittedAt,
      reviewedAt,
      completedAt,
      reviewNote,
      canSubmitTxHash: false,
      steps: [
        { key: 'placed', title: 'Order Placed', detail: 'USDT total & rate locked', state: 'complete' },
        {
          key: 'submitted',
          title: 'TX Hash Submitted',
          detail: txHash ? 'Transaction hash recorded' : 'Confirmed via wallet receipt',
          state: 'complete',
        },
        { key: 'review', title: 'Admin Review', detail: 'On-chain amount verified', state: 'complete' },
        { key: 'verified', title: 'Payment Verified', detail: 'Paid & receipt issued', state: 'complete' },
      ],
    };
  }

  if (isClosed) {
    return {
      stage: 'cancelled',
      label: `Order ${orderStatus}`,
      headline: `Verification closed (${orderStatus.toLowerCase()})`,
      description: `This order is marked ${orderStatus.toLowerCase()}, so cryptocurrency verification is no longer active.`,
      txHash,
      submittedAt,
      reviewedAt,
      completedAt,
      reviewNote,
      canSubmitTxHash: false,
      steps: [
        { key: 'placed', title: 'Order Placed', detail: 'Order created', state: 'complete' },
        {
          key: 'submitted',
          title: 'TX Hash Submitted',
          detail: txHash ? 'TX hash recorded' : 'No TX hash provided',
          state: txHash ? 'complete' : 'upcoming',
        },
        { key: 'review', title: 'Admin Review', detail: `Closed (${orderStatus})`, state: 'rejected' },
        { key: 'verified', title: 'Payment Verified', detail: 'Closed', state: 'upcoming' },
      ],
    };
  }

  if (paymentStatus === 'rejected') {
    return {
      stage: 'rejected',
      label: 'Verification Rejected',
      headline: 'Submitted transaction could not be verified',
      description:
        reviewNote ||
        'The submitted transaction hash did not match an incoming transfer. Submit an updated TX hash or contact support.',
      txHash,
      submittedAt,
      reviewedAt,
      completedAt,
      reviewNote,
      canSubmitTxHash: true,
      steps: [
        { key: 'placed', title: 'Order Placed', detail: 'USDT total & rate locked', state: 'complete' },
        {
          key: 'submitted',
          title: 'TX Hash Submitted',
          detail: txHash ? 'Hash submitted for review' : 'No TX hash on file',
          state: txHash ? 'complete' : 'current',
        },
        {
          key: 'review',
          title: 'Admin Review',
          detail: 'Transfer not confirmed',
          state: 'rejected',
        },
        { key: 'verified', title: 'Payment Verified', detail: 'Resubmit valid TX hash', state: 'upcoming' },
      ],
    };
  }

  if (txHash) {
    return {
      stage: 'under_review',
      label: 'Under Admin Verification',
      headline: 'Transaction hash submitted — awaiting on-chain confirmation',
      description:
        reviewNote ||
        'Your TX hash is queued with the marketplace owner for blockchain verification. Status updates automatically once confirmed.',
      txHash,
      submittedAt,
      reviewedAt,
      completedAt,
      reviewNote,
      canSubmitTxHash: true,
      steps: [
        { key: 'placed', title: 'Order Placed', detail: 'USDT total & rate locked', state: 'complete' },
        { key: 'submitted', title: 'TX Hash Submitted', detail: 'Hash attached to order', state: 'complete' },
        { key: 'review', title: 'Admin Review', detail: 'Verifying on-chain receipt', state: 'current' },
        { key: 'verified', title: 'Payment Verified', detail: 'Pending approval', state: 'upcoming' },
      ],
    };
  }

  return {
    stage: 'awaiting_tx_hash',
    label: 'Awaiting TX Hash',
    headline: 'Submit your transaction hash to begin verification',
    description:
      'Complete your USDT transfer using the order wallet details, then paste your transaction hash below so the owner can verify it.',
    txHash: '',
    submittedAt: '',
    reviewedAt,
    completedAt,
    reviewNote,
    canSubmitTxHash: true,
    steps: [
      { key: 'placed', title: 'Order Placed', detail: 'USDT total & rate locked', state: 'complete' },
      { key: 'submitted', title: 'TX Hash Submitted', detail: 'Waiting for your TXID', state: 'current' },
      { key: 'review', title: 'Admin Review', detail: 'Starts after TX submission', state: 'upcoming' },
      { key: 'verified', title: 'Payment Verified', detail: 'Pending verification', state: 'upcoming' },
    ],
  };
}
