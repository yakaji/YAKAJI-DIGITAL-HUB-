export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export interface OrderChartInput {
  id: string;
  status: string;
  paymentStatus?: string;
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CompletedOrderPoint {
  key: string;
  label: string;
  fullDateLabel: string;
  completedCount: number;
  paidRevenue: number;
  grossVolume: number;
  avgOrderValue: number;
}

export interface CompletedOrdersChartSummary {
  series: CompletedOrderPoint[];
  totalCompletedOrders: number;
  totalPaidRevenue: number;
  totalGrossVolume: number;
  averageOrderValue: number;
  peakLabel: string;
  peakRevenue: number;
  peakCount: number;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseUtcDate(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toIsoDay(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMondayStart(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayOfWeek = copy.getUTCDay(); // 0=Sun..6=Sat
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy;
}

function formatBucketLabels(
  date: Date,
  granularity: ChartGranularity
): { key: string; label: string; fullDateLabel: string } {
  const year = date.getUTCFullYear();
  const monthIdx = date.getUTCMonth();
  const monthName = SHORT_MONTHS[monthIdx];
  const day = date.getUTCDate();

  if (granularity === 'daily') {
    const key = toIsoDay(date);
    return {
      key,
      label: `${day} ${monthName}`,
      fullDateLabel: `${day} ${monthName} ${year}`,
    };
  }

  if (granularity === 'weekly') {
    const monday = getMondayStart(date);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const key = toIsoDay(monday);
    const monMonth = SHORT_MONTHS[monday.getUTCMonth()];
    const sunMonth = SHORT_MONTHS[sunday.getUTCMonth()];
    const label = `${monday.getUTCDate()} ${monMonth}`;
    const fullDateLabel =
      monday.getUTCFullYear() === sunday.getUTCFullYear()
        ? `${monday.getUTCDate()} ${monMonth} – ${sunday.getUTCDate()} ${sunMonth} ${sunday.getUTCFullYear()}`
        : `${monday.getUTCDate()} ${monMonth} ${monday.getUTCFullYear()} – ${sunday.getUTCDate()} ${sunMonth} ${sunday.getUTCFullYear()}`;
    return { key, label, fullDateLabel };
  }

  const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
  return {
    key,
    label: `${monthName} ${String(year).slice(-2)}`,
    fullDateLabel: `${monthName} ${year}`,
  };
}

export function buildCompletedOrdersSeries(
  orders: ReadonlyArray<OrderChartInput>,
  options: {
    granularity: ChartGranularity;
    from?: string;
    to?: string;
  }
): CompletedOrdersChartSummary {
  const { granularity, from = '', to = '' } = options;
  const fromBound = from.trim();
  const toBound = to.trim();

  const buckets = new Map<string, CompletedOrderPoint>();
  let totalCompletedOrders = 0;
  let totalPaidRevenue = 0;
  let totalGrossVolume = 0;

  for (const order of orders) {
    if (String(order.status || '') !== 'Completed') continue;

    const date = parseUtcDate(order.createdAt) || parseUtcDate(order.updatedAt);
    if (!date) continue;

    const dayKey = toIsoDay(date);
    if (fromBound && dayKey < fromBound) continue;
    if (toBound && dayKey > toBound) continue;

    const { key, label, fullDateLabel } = formatBucketLabels(date, granularity);
    const amount = Math.max(0, Number(order.total || 0));
    const isPaid = String(order.paymentStatus || '').toLowerCase() === 'completed';

    const existing = buckets.get(key) || {
      key,
      label,
      fullDateLabel,
      completedCount: 0,
      paidRevenue: 0,
      grossVolume: 0,
      avgOrderValue: 0,
    };

    existing.completedCount += 1;
    existing.grossVolume += amount;
    if (isPaid) {
      existing.paidRevenue += amount;
      totalPaidRevenue += amount;
    }
    existing.avgOrderValue =
      existing.completedCount > 0
        ? Math.round(existing.grossVolume / existing.completedCount)
        : 0;

    buckets.set(key, existing);
    totalCompletedOrders += 1;
    totalGrossVolume += amount;
  }

  const series = [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
  const averageOrderValue =
    totalCompletedOrders > 0 ? Math.round(totalGrossVolume / totalCompletedOrders) : 0;

  let peakPoint: CompletedOrderPoint | null = null;
  for (const point of series) {
    if (
      !peakPoint ||
      point.paidRevenue > peakPoint.paidRevenue ||
      (point.paidRevenue === peakPoint.paidRevenue && point.completedCount > peakPoint.completedCount)
    ) {
      peakPoint = point;
    }
  }

  return {
    series,
    totalCompletedOrders,
    totalPaidRevenue,
    totalGrossVolume,
    averageOrderValue,
    peakLabel: peakPoint ? peakPoint.fullDateLabel : '—',
    peakRevenue: peakPoint ? peakPoint.paidRevenue : 0,
    peakCount: peakPoint ? peakPoint.completedCount : 0,
  };
}
