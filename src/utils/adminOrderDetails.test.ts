import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOrderFinancials,
  computeOrderLineSubtotal,
  formatOrderDetailsSummaryText,
  groupOrderItemsByVendor,
  type AdminOrderDetailRecord,
} from './adminOrderDetails.ts';

const SAMPLE_ORDER: AdminOrderDetailRecord = {
  id: 'ord-101',
  orderNumber: 'YDH-90421A',
  customerUserId: 'cust-1',
  customerName: 'Amina Bello',
  phone: '+2348012345678',
  email: 'amina@example.com',
  address: '14 Maitama Crescent, Abuja',
  paymentMethod: 'Bank transfer',
  paymentStatus: 'completed',
  status: 'Shipped',
  subtotal: 42000,
  couponCode: 'SAVE10',
  couponDiscount: 4200,
  transferFee: 100,
  paymentGatewayFee: 0,
  total: 37900,
  courier: 'DHL Express',
  trackingNumber: 'DHL-88291',
  adminNote: 'Fragile electronic accessory',
  createdAt: '2026-11-24T10:30:00.000Z',
  items: [
    {
      productId: 'p1',
      name: 'Studio Wireless Mic',
      quantity: 1,
      price: 32000,
      vendorId: 'v1',
      vendorShopName: 'Yakaji Creator Studio',
      option: 'USB-C',
    },
    {
      productId: 'p2',
      name: 'Brand Kit Notion Pack',
      quantity: 2,
      price: 5000,
      vendorId: 'v2',
      vendorShopName: 'Lumina Digital Craft',
      option: 'Team',
    },
  ],
};

test('computeOrderFinancials calculates subtotal, discount, fees, item count, and distinct vendors', () => {
  const summary = computeOrderFinancials(SAMPLE_ORDER);
  assert.equal(summary.itemsSubtotal, 42000);
  assert.equal(summary.couponCode, 'SAVE10');
  assert.equal(summary.couponDiscount, 4200);
  assert.equal(summary.transferFee, 100);
  assert.equal(summary.total, 37900);
  assert.equal(summary.itemCount, 3);
  assert.equal(summary.vendorCount, 2);
});

test('computeOrderFinancials falls back to summing line items when subtotal is omitted', () => {
  const summary = computeOrderFinancials({
    items: SAMPLE_ORDER.items,
    total: 42000,
  });
  assert.equal(summary.itemsSubtotal, 42000);
  assert.equal(summary.couponDiscount, 0);
  assert.equal(summary.transferFee, 0);
});

test('groupOrderItemsByVendor groups items cleanly by vendor shop with subtotals', () => {
  const groups = groupOrderItemsByVendor(SAMPLE_ORDER);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].vendorName, 'Yakaji Creator Studio');
  assert.equal(groups[0].subtotal, 32000);
  assert.equal(groups[0].itemCount, 1);
  assert.equal(groups[1].vendorName, 'Lumina Digital Craft');
  assert.equal(groups[1].subtotal, 10000);
  assert.equal(groups[1].itemCount, 2);
});

test('formatOrderDetailsSummaryText outputs complete customer, item, vendor, and financial breakdown', () => {
  const money = (n: number) => `NGN ${Math.round(n).toLocaleString('en-US')}`;
  const text = formatOrderDetailsSummaryText(SAMPLE_ORDER, money);
  assert.match(text, /Order: YDH-90421A \(ID: ord-101\)/);
  assert.match(text, /Customer: Amina Bello/);
  assert.match(text, /14 Maitama Crescent, Abuja/);
  assert.match(text, /Studio Wireless Mic \(USB-C\) x1.*\[Yakaji Creator Studio\]/);
  assert.match(text, /Coupon \(SAVE10\): -NGN 4,200/);
  assert.match(text, /Tracking: DHL Express · DHL-88291/);
  assert.match(text, /Admin Note: Fragile electronic accessory/);
});

test('computeOrderLineSubtotal multiplies unit price by quantity and guards invalid or negative inputs', () => {
  assert.equal(computeOrderLineSubtotal({ price: 5000, quantity: 2 }), 10000);
  assert.equal(computeOrderLineSubtotal({ price: 1250.5, quantity: 3 }), 3751.5);
  assert.equal(computeOrderLineSubtotal({ price: -100, quantity: 2 }), 0);
  assert.equal(computeOrderLineSubtotal({ price: 1000, quantity: Number.NaN }), 0);
});
