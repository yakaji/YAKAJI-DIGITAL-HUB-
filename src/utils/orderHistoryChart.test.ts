import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompletedOrdersSeries, type OrderChartInput } from './orderHistoryChart.ts';

const SAMPLE_ORDERS: OrderChartInput[] = [
  {
    id: 'o1',
    status: 'Completed',
    paymentStatus: 'completed',
    total: 15000,
    createdAt: '2026-03-02T10:15:00.000Z', // Monday
  },
  {
    id: 'o2',
    status: 'Completed',
    paymentStatus: 'completed',
    total: 25000,
    createdAt: '2026-03-02T16:40:00.000Z', // Same Monday
  },
  {
    id: 'o3',
    status: 'Cancelled',
    paymentStatus: 'rejected',
    total: 90000,
    createdAt: '2026-03-03T09:00:00.000Z', // Excluded (Cancelled)
  },
  {
    id: 'o4',
    status: 'Completed',
    paymentStatus: 'pending',
    total: 10000,
    createdAt: '2026-03-05T11:30:00.000Z', // Thursday same week
  },
  {
    id: 'o5',
    status: 'Completed',
    paymentStatus: 'completed',
    total: 40000,
    createdAt: '2026-04-12T14:20:00.000Z', // Next month
  },
  {
    id: 'o6',
    status: 'Refunded',
    paymentStatus: 'completed',
    total: 50000,
    createdAt: '2026-04-13T14:20:00.000Z', // Excluded (Refunded)
  },
];

test('buildCompletedOrdersSeries groups completed orders daily and excludes non-completed statuses', () => {
  const result = buildCompletedOrdersSeries(SAMPLE_ORDERS, { granularity: 'daily' });
  assert.equal(result.totalCompletedOrders, 4);
  assert.equal(result.totalPaidRevenue, 80000);
  assert.equal(result.totalGrossVolume, 90000);
  assert.equal(result.averageOrderValue, 22500);
  assert.equal(result.series.length, 3);
  assert.deepEqual(
    result.series.map((p) => p.key),
    ['2026-03-02', '2026-03-05', '2026-04-12']
  );
  assert.equal(result.series[0].completedCount, 2);
  assert.equal(result.series[0].paidRevenue, 40000);
  assert.equal(result.series[1].completedCount, 1);
  assert.equal(result.series[1].paidRevenue, 0);
  assert.equal(result.series[1].grossVolume, 10000);
});

test('buildCompletedOrdersSeries aggregates weekly buckets starting on Monday', () => {
  const result = buildCompletedOrdersSeries(SAMPLE_ORDERS, { granularity: 'weekly' });
  assert.equal(result.series.length, 2);
  assert.equal(result.series[0].key, '2026-03-02');
  assert.equal(result.series[0].completedCount, 3);
  assert.equal(result.series[0].paidRevenue, 40000);
  assert.equal(result.series[0].grossVolume, 50000);
  assert.equal(result.series[1].key, '2026-04-06');
  assert.equal(result.series[1].completedCount, 1);
});

test('buildCompletedOrdersSeries aggregates monthly buckets and tracks peak revenue period', () => {
  const result = buildCompletedOrdersSeries(SAMPLE_ORDERS, { granularity: 'monthly' });
  assert.equal(result.series.length, 2);
  assert.deepEqual(
    result.series.map((p) => ({ key: p.key, count: p.completedCount, paid: p.paidRevenue })),
    [
      { key: '2026-03', count: 3, paid: 40000 },
      { key: '2026-04', count: 1, paid: 40000 },
    ]
  );
  // Both months have 40000 paid revenue, March breaks tie with higher completedCount (3 vs 1)
  assert.equal(result.peakLabel, 'Mar 2026');
  assert.equal(result.peakCount, 3);
});

test('buildCompletedOrdersSeries respects from and to date filters cleanly', () => {
  const result = buildCompletedOrdersSeries(SAMPLE_ORDERS, {
    granularity: 'daily',
    from: '2026-03-04',
    to: '2026-04-30',
  });
  assert.equal(result.totalCompletedOrders, 2);
  assert.deepEqual(
    result.series.map((p) => p.key),
    ['2026-03-05', '2026-04-12']
  );
});

test('buildCompletedOrdersSeries returns empty summary cleanly when no completed orders exist', () => {
  const result = buildCompletedOrdersSeries([], { granularity: 'monthly' });
  assert.equal(result.series.length, 0);
  assert.equal(result.totalCompletedOrders, 0);
  assert.equal(result.totalPaidRevenue, 0);
  assert.equal(result.averageOrderValue, 0);
  assert.equal(result.peakLabel, '—');
});
