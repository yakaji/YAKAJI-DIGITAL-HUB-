import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import {
  buildCompletedOrdersSeries,
  type ChartGranularity,
  type CompletedOrderPoint,
  type OrderChartInput,
} from '../utils/orderHistoryChart';

type ChartMetricMode = 'combined' | 'revenue' | 'count';

interface OrderHistoryChartProps {
  filteredOrders: ReadonlyArray<OrderChartInput>;
  allFulfilledOrders: ReadonlyArray<OrderChartInput>;
  fromDate: string;
  toDate: string;
  hasActiveFilters: boolean;
  money: (n: number) => string;
}

function formatCompactAxisNaira(value: number): string {
  const num = Number(value || 0);
  if (num >= 1_000_000) return `₦${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₦${Math.round(num / 1_000)}k`;
  return `₦${num}`;
}

export function OrderHistoryChart({
  filteredOrders,
  allFulfilledOrders,
  fromDate,
  toDate,
  hasActiveFilters,
  money,
}: OrderHistoryChartProps) {
  const [granularity, setGranularity] = useState<ChartGranularity>('daily');
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('combined');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');

  const sourceOrders = scope === 'filtered' ? filteredOrders : allFulfilledOrders;

  const summary = useMemo(
    () =>
      buildCompletedOrdersSeries(sourceOrders, {
        granularity,
        from: scope === 'filtered' ? fromDate : '',
        to: scope === 'filtered' ? toDate : '',
      }),
    [sourceOrders, granularity, scope, fromDate, toDate]
  );

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: CompletedOrderPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0]?.payload) return null;
    const point = payload[0].payload;
    return (
      <div className="history-chart-tooltip tabular-nums">
        <strong>{point.fullDateLabel}</strong>
        <div className="history-chart-tooltip-row">
          <span>Completed orders</span>
          <b>{point.completedCount.toLocaleString()}</b>
        </div>
        <div className="history-chart-tooltip-row">
          <span>Paid revenue</span>
          <b className="text-emerald">{money(point.paidRevenue)}</b>
        </div>
        {point.grossVolume !== point.paidRevenue && (
          <div className="history-chart-tooltip-row">
            <span>Gross completed volume</span>
            <b>{money(point.grossVolume)}</b>
          </div>
        )}
        <div className="history-chart-tooltip-row">
          <span>Avg. order value</span>
          <b>{money(point.avgOrderValue)}</b>
        </div>
      </div>
    );
  };

  return (
    <section className="panel history-chart-panel" aria-label="Completed orders over time chart">
      <div className="history-chart-head">
        <div>
          <span className="eyebrow">SALES PERFORMANCE ANALYTICS</span>
          <h2>Completed Orders Over Time</h2>
          <p>
            Track completed order volume and verified paid revenue across{' '}
            {granularity === 'daily' ? 'daily' : granularity === 'weekly' ? 'weekly' : 'monthly'} intervals
            {scope === 'filtered' && hasActiveFilters ? ' (matching current filters)' : ''}.
          </p>
        </div>

        <div className="history-chart-controls">
          {hasActiveFilters && (
            <div className="profit-cal-tabs" role="group" aria-label="Chart data scope">
              <button
                type="button"
                className={scope === 'filtered' ? 'active' : ''}
                onClick={() => setScope('filtered')}
              >
                Filtered
              </button>
              <button
                type="button"
                className={scope === 'all' ? 'active' : ''}
                onClick={() => setScope('all')}
              >
                All Completed
              </button>
            </div>
          )}

          <div className="profit-cal-tabs" role="group" aria-label="Time interval">
            {(['daily', 'weekly', 'monthly'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={granularity === item ? 'active' : ''}
                onClick={() => setGranularity(item)}
              >
                {item === 'daily' ? 'Daily' : item === 'weekly' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>

          <div className="profit-cal-tabs" role="group" aria-label="Chart series">
            <button
              type="button"
              className={metricMode === 'combined' ? 'active' : ''}
              onClick={() => setMetricMode('combined')}
            >
              Both
            </button>
            <button
              type="button"
              className={metricMode === 'revenue' ? 'active' : ''}
              onClick={() => setMetricMode('revenue')}
            >
              Revenue
            </button>
            <button
              type="button"
              className={metricMode === 'count' ? 'active' : ''}
              onClick={() => setMetricMode('count')}
            >
              Orders
            </button>
          </div>
        </div>
      </div>

      <div className="history-chart-metrics tabular-nums">
        <div className="history-chart-metric">
          <small><CheckCircle2 size={13} /> Completed orders</small>
          <b>{summary.totalCompletedOrders.toLocaleString()}</b>
        </div>
        <div className="history-chart-metric highlight">
          <small><TrendingUp size={13} /> Paid completed revenue</small>
          <b>{money(summary.totalPaidRevenue)}</b>
        </div>
        <div className="history-chart-metric">
          <small><BarChart3 size={13} /> Avg. order value</small>
          <b>{money(summary.averageOrderValue)}</b>
        </div>
        <div className="history-chart-metric">
          <small><Calendar size={13} /> Peak period</small>
          <b>{summary.peakLabel}</b>
          {summary.peakCount > 0 && (
            <em>
              {money(summary.peakRevenue)} · {summary.peakCount} order{summary.peakCount === 1 ? '' : 's'}
            </em>
          )}
        </div>
      </div>

      {summary.series.length > 0 ? (
        <div className="history-chart-canvas" data-testid="completed-orders-chart">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={summary.series}
              margin={{ top: 14, right: 16, left: 6, bottom: 8 }}
            >
              <defs>
                <linearGradient id="yakajiRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#087b50" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#087b50" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#475569', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                minTickGap={16}
              />
              {metricMode !== 'count' && (
                <YAxis
                  yAxisId="revenue"
                  orientation="left"
                  tickFormatter={formatCompactAxisNaira}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
              )}
              {metricMode !== 'revenue' && (
                <YAxis
                  yAxisId="count"
                  orientation={metricMode === 'count' ? 'left' : 'right'}
                  allowDecimals={false}
                  tick={{ fill: '#92400e', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
              )}
              <Tooltip content={renderTooltip} />
              <Legend
                verticalAlign="top"
                height={32}
                wrapperStyle={{ fontSize: '12px', color: '#334155' }}
              />
              {metricMode !== 'revenue' && (
                <Bar
                  yAxisId="count"
                  dataKey="completedCount"
                  name="Completed Orders"
                  fill="#d97706"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
              )}
              {metricMode !== 'count' && (
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="paidRevenue"
                  name="Paid Revenue (₦)"
                  stroke="#087b50"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#yakajiRevenueFill)"
                  activeDot={{ r: 5, fill: '#087b50', stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-empty">
          <BarChart3 size={30} />
          <b>No completed orders to chart</b>
          <small>
            {scope === 'filtered' && hasActiveFilters
              ? 'No completed orders match your current search/status filter. Switch to "All Completed" above or clear filters.'
              : 'Orders marked as Completed will automatically populate this sales performance chart.'}
          </small>
        </div>
      )}
    </section>
  );
}
