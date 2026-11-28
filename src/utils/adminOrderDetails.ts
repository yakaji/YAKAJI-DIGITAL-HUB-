export interface AdminOrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  vendorId: string;
  vendorShopName?: string;
  productCategory?: string;
  productImage?: string;
  option: string;
  marketplaceCommissionPercent?: number;
  affiliateCommissionPercent?: number;
}

export interface AdminOrderCustomerAccount {
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  totalOrders?: number;
  paidOrders?: number;
  isGuest?: boolean;
}

export interface AdminOrderDetailRecord {
  id: string;
  orderNumber: string;
  customerUserId?: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: string;
  items: AdminOrderLineItem[];
  total: number;
  subtotal?: number;
  couponCode?: string;
  couponDiscount?: number;
  transferFee?: number;
  commissionPercent?: number;
  paymentGatewayFee?: number;
  paymentGatewayFeeSource?: string;
  paymentConfirmationMethod?: string;
  paymentConfirmationNote?: string;
  paymentConfirmedBy?: string;
  affiliateId?: string;
  affiliateReferralCode?: string;
  affiliateName?: string;
  status: string;
  paymentStatus?: string;
  paymentNotificationSentAt?: string;
  paymentCompletedAt?: string;
  paymentReviewedAt?: string;
  paymentReviewNote?: string;
  paymentRejectedAt?: string;
  paystackReference?: string;
  paymentReference?: string;
  cryptoWalletId?: string;
  cryptoCoin?: string;
  cryptoSymbol?: string;
  cryptoNetwork?: string;
  cryptoAddress?: string;
  cryptoInstructions?: string;
  cryptoTxHash?: string;
  cryptoTxSubmittedAt?: string;
  cryptoUsdtRate?: number;
  cryptoItemsUsdt?: number;
  cryptoTransferFeeUsdt?: number;
  cryptoTotalUsdt?: number;
  trackingNumber?: string;
  courier?: string;
  adminNote?: string;
  refundStatus?: string;
  refundedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  updatedAt?: string;
  createdAt: string;
  customerAccount?: AdminOrderCustomerAccount | null;
}

export interface OrderFinancialSummary {
  itemsSubtotal: number;
  couponCode: string;
  couponDiscount: number;
  transferFee: number;
  gatewayFee: number;
  total: number;
  itemCount: number;
  vendorCount: number;
}

export interface VendorOrderGroup {
  vendorKey: string;
  vendorName: string;
  subtotal: number;
  itemCount: number;
  items: AdminOrderLineItem[];
}

export function computeOrderLineSubtotal(
  item: Pick<AdminOrderLineItem, 'price' | 'quantity'>
): number {
  const unitPrice = Number(item.price);
  const quantity = Number(item.quantity);
  if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) {
    return 0;
  }
  return Math.max(0, unitPrice) * Math.max(0, quantity);
}

export function computeOrderFinancials(order: Pick<
  AdminOrderDetailRecord,
  'items' | 'subtotal' | 'couponCode' | 'couponDiscount' | 'transferFee' | 'paymentGatewayFee' | 'total'
>): OrderFinancialSummary {
  const items = Array.isArray(order.items) ? order.items : [];
  const computedItemsSubtotal = items.reduce(
    (sum, item) => sum + computeOrderLineSubtotal(item),
    0
  );
  const rawSubtotal = Number(order.subtotal);
  const itemsSubtotal =
    Number.isFinite(rawSubtotal) && rawSubtotal >= 0 && (rawSubtotal > 0 || computedItemsSubtotal === 0)
      ? rawSubtotal
      : computedItemsSubtotal;

  const couponDiscount = Math.max(0, Number(order.couponDiscount || 0));
  const transferFee = Math.max(0, Number(order.transferFee || 0));
  const gatewayFee = Math.max(0, Number(order.paymentGatewayFee || 0));
  const total = Math.max(0, Number(order.total || 0));
  const itemCount = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0);
  const vendorKeys = new Set(
    items.map((item) => String(item.vendorShopName || item.vendorId || 'marketplace'))
  );

  return {
    itemsSubtotal,
    couponCode: String(order.couponCode || '').trim(),
    couponDiscount,
    transferFee,
    gatewayFee,
    total,
    itemCount,
    vendorCount: vendorKeys.size,
  };
}

export function groupOrderItemsByVendor(order: Pick<AdminOrderDetailRecord, 'items'>): VendorOrderGroup[] {
  const items = Array.isArray(order.items) ? order.items : [];
  const groups = new Map<string, VendorOrderGroup>();

  for (const item of items) {
    const vendorKey = String(item.vendorId || item.vendorShopName || 'marketplace');
    const vendorName = String(item.vendorShopName || '').trim() || (item.vendorId ? `Vendor (${item.vendorId})` : 'Yakaji Marketplace');
    const existing = groups.get(vendorKey) || {
      vendorKey,
      vendorName,
      subtotal: 0,
      itemCount: 0,
      items: [],
    };
    const qty = Math.max(0, Number(item.quantity || 0));
    const lineTotal = computeOrderLineSubtotal(item);
    existing.subtotal += lineTotal;
    existing.itemCount += qty;
    existing.items.push(item);
    groups.set(vendorKey, existing);
  }

  return Array.from(groups.values());
}

export function formatOrderDetailsSummaryText(
  order: AdminOrderDetailRecord,
  formatMoney: (n: number) => string
): string {
  const financials = computeOrderFinancials(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const lines: string[] = [
    `Order: ${order.orderNumber} (ID: ${order.id})`,
    `Status: ${order.status} | Payment: ${order.paymentStatus || 'pending'} (${order.paymentMethod || 'N/A'})`,
    `Placed: ${order.createdAt}`,
    `Customer: ${order.customerName || 'Not provided'}`,
    `Phone: ${order.phone || 'Not provided'} | Email: ${order.email || 'Not provided'}`,
    `Delivery Address: ${order.address || 'Not provided'}`,
  ];

  if (order.courier || order.trackingNumber) {
    lines.push(`Tracking: ${[order.courier, order.trackingNumber].filter(Boolean).join(' · ')}`);
  }

  lines.push('Items:');
  for (const item of items) {
    const shop = item.vendorShopName || item.vendorId || 'Marketplace';
    const opt = item.option ? ` (${item.option})` : '';
    lines.push(
      `- ${item.name}${opt} x${item.quantity} @ ${formatMoney(item.price)} = ${formatMoney(item.price * item.quantity)} [${shop}]`
    );
  }

  lines.push(`Subtotal: ${formatMoney(financials.itemsSubtotal)}`);
  if (financials.couponDiscount > 0) {
    lines.push(
      `Coupon${financials.couponCode ? ` (${financials.couponCode})` : ''}: -${formatMoney(financials.couponDiscount)}`
    );
  }
  if (financials.transferFee > 0) {
    lines.push(
      order.paymentMethod === 'Crypto'
        ? `Crypto Transfer Fee (${Number(order.cryptoTransferFeeUsdt ?? 1).toFixed(2)} USDT): ${formatMoney(financials.transferFee)}`
        : `Transfer Fee: ${formatMoney(financials.transferFee)}`
    );
  }
  lines.push(`Total: ${formatMoney(financials.total)}`);
  if (order.paymentMethod === 'Crypto' && order.cryptoTotalUsdt) {
    lines.push(
      `Crypto Total Due: ${Number(order.cryptoTotalUsdt).toFixed(2)} USDT (Rate: 1 USDT = ${formatMoney(Number(order.cryptoUsdtRate || 1600))})`
    );
  }

  if (order.adminNote) {
    lines.push(`Admin Note: ${order.adminNote}`);
  }
  if (order.refundStatus) {
    lines.push(`Refund: ${order.refundStatus}${order.refundedAt ? ` (${order.refundedAt})` : ''}`);
  }

  return lines.join('\n');
}
