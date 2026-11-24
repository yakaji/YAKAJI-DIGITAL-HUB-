import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';

type DailyPoint = {
  dateKey?: string;
  label: string;
  ordersCount?: number;
  commissionEarned: number;
};

type MonthlyPoint = {
  monthKey?: string;
  label: string;
  ordersCount?: number;
  commissionEarned: number;
};

type CommissionByDateEntry = {
  label: string;
  commissionEarned: number;
  paidSales: number;
  ordersCount: number;
};

type CommissionAnalyticsData = {
  today?: number;
  thisWeek?: number;
  thisMonth?: number;
  allTime?: number;
  netProfit?: number;
  refundedCommission?: number;
  verifiedPaidSales?: number;
  pendingSales?: number;
  commissionByVendor?: Array<{
    vendorId: string;
    shopName: string;
    sales: number;
    commissionEarned: number;
    affiliateCommission?: number;
    paymentGatewayFees?: number;
    vendorNetEarnings: number;
  }>;
  commissionByProduct?: Array<{
    productId: string;
    productName: string;
    vendorId?: string;
    vendorName?: string;
    sales: number;
    commissionEarned: number;
  }>;
  dailyCommissionTrend?: DailyPoint[];
  monthlyCommissionTrend?: MonthlyPoint[];
  commissionByDate?: Record<string, CommissionByDateEntry>;
};

type FilterMode = 'day' | 'range' | 'month';

function formatIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatIsoMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function AdminProfitCalendar({
  commissionAnalytics,
  money
}: {
  commissionAnalytics?: CommissionAnalyticsData | null;
  money: (n: number) => string;
}) {
  const now = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => formatIsoDay(now), [now]);
  const currentMonthIso = useMemo(() => formatIsoMonth(now), [now]);

  const [filterMode, setFilterMode] = useState<FilterMode>('day');
  const [cursorYear, setCursorYear] = useState(() => now.getFullYear());
  const [cursorMonth, setCursorMonth] = useState(() => now.getMonth());
  const [selectedDay, setSelectedDay] = useState(() => todayIso);
  const [rangeStart, setRangeStart] = useState(() => {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return formatIsoDay(start);
  });
  const [rangeEnd, setRangeEnd] = useState(() => todayIso);
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthIso);
  const [breakdownTab, setBreakdownTab] = useState<'vendor' | 'product'>('vendor');

  const commissionByDate = useMemo<Record<string, CommissionByDateEntry>>(() => {
    if (commissionAnalytics?.commissionByDate && Object.keys(commissionAnalytics.commissionByDate).length > 0) {
      return commissionAnalytics.commissionByDate;
    }
    const fallback: Record<string, CommissionByDateEntry> = {};
    for (const point of commissionAnalytics?.dailyCommissionTrend || []) {
      if (!point.dateKey) continue;
      fallback[point.dateKey] = {
        label: point.label,
        commissionEarned: Number(point.commissionEarned || 0),
        paidSales: 0,
        ordersCount: Number(point.ordersCount || 0)
      };
    }
    return fallback;
  }, [commissionAnalytics]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(cursorYear, cursorMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
    const cells: Array<{ iso: string; dayNum: number } | null> = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ iso, dayNum: day });
    }
    return cells;
  }, [cursorYear, cursorMonth]);

  const cursorMonthPrefix = `${cursorYear}-${String(cursorMonth + 1).padStart(2, '0')}`;
  const cursorMonthTitle = new Date(cursorYear, cursorMonth, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric'
  });

  function shiftMonth(delta: number) {
    const next = new Date(cursorYear, cursorMonth + delta, 1);
    setCursorYear(next.getFullYear());
    setCursorMonth(next.getMonth());
    if (filterMode === 'month') {
      setSelectedMonth(formatIsoMonth(next));
    }
  }

  function jumpToToday() {
    setCursorYear(now.getFullYear());
    setCursorMonth(now.getMonth());
    setSelectedDay(todayIso);
    setSelectedMonth(currentMonthIso);
    setRangeStart(todayIso);
    setRangeEnd(todayIso);
  }

  function handleDayClick(iso: string) {
    if (filterMode === 'month') {
      setFilterMode('day');
      setSelectedDay(iso);
      return;
    }
    if (filterMode === 'day') {
      setSelectedDay(iso);
      return;
    }
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd(iso);
      return;
    }
    if (iso < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(iso);
    } else {
      setRangeEnd(iso);
    }
  }

  const normalizedRange = useMemo(() => {
    const a = rangeStart || todayIso;
    const b = rangeEnd || a;
    return a <= b ? { from: a, to: b } : { from: b, to: a };
  }, [rangeStart, rangeEnd, todayIso]);

  const activeFilterResult = useMemo(() => {
    const entries = Object.entries(commissionByDate);
    if (filterMode === 'day') {
      const match = commissionByDate[selectedDay];
      const parsed = parseIsoDate(selectedDay);
      return {
        heading: parsed
          ? parsed.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
          : selectedDay,
        commissionEarned: Number(match?.commissionEarned || 0),
        paidSales: Number(match?.paidSales || 0),
        ordersCount: Number(match?.ordersCount || 0),
        matchingDays: match
          ? [{ iso: selectedDay, ...match }]
          : []
      };
    }

    if (filterMode === 'month') {
      const matching = entries
        .filter(([iso]) => iso.startsWith(selectedMonth))
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([iso, val]) => ({ iso, ...val }));
      const [y, m] = selectedMonth.split('-').map(Number);
      const monthLabel = y && m
        ? new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
        : selectedMonth;
      return {
        heading: monthLabel,
        commissionEarned: matching.reduce((sum, item) => sum + Number(item.commissionEarned || 0), 0),
        paidSales: matching.reduce((sum, item) => sum + Number(item.paidSales || 0), 0),
        ordersCount: matching.reduce((sum, item) => sum + Number(item.ordersCount || 0), 0),
        matchingDays: matching
      };
    }

    const matching = entries
      .filter(([iso]) => iso >= normalizedRange.from && iso <= normalizedRange.to)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([iso, val]) => ({ iso, ...val }));
    const fromParsed = parseIsoDate(normalizedRange.from);
    const toParsed = parseIsoDate(normalizedRange.to);
    const fmt = (d: Date | null, fallback: string) =>
      d ? d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : fallback;
    return {
      heading:
        normalizedRange.from === normalizedRange.to
          ? fmt(fromParsed, normalizedRange.from)
          : `${fmt(fromParsed, normalizedRange.from)} – ${fmt(toParsed, normalizedRange.to)}`,
      commissionEarned: matching.reduce((sum, item) => sum + Number(item.commissionEarned || 0), 0),
      paidSales: matching.reduce((sum, item) => sum + Number(item.paidSales || 0), 0),
      ordersCount: matching.reduce((sum, item) => sum + Number(item.ordersCount || 0), 0),
      matchingDays: matching
    };
  }, [commissionByDate, filterMode, selectedDay, selectedMonth, normalizedRange]);

  const monthCommissionTotal = useMemo(() => {
    return Object.entries(commissionByDate)
      .filter(([iso]) => iso.startsWith(cursorMonthPrefix))
      .reduce((sum, [, row]) => sum + Number(row.commissionEarned || 0), 0);
  }, [commissionByDate, cursorMonthPrefix]);

  const vendorRows = commissionAnalytics?.commissionByVendor || [];
  const productRows = commissionAnalytics?.commissionByProduct || [];

  return (
    <section className="panel" id="admin-commission-profit">
      <div className="panel-title">
        <div>
          <span className="eyebrow">OWNER ONLY · PLATFORM EARNINGS</span>
          <h2>Marketplace profit &amp; commission analytics</h2>
          <p>Private to the marketplace owner. Filter historical profit with the compact calendar or date range picker.</p>
        </div>
        <span className="role-pill"><ShieldCheck size={15} /> Admin only</span>
      </div>

      <div className="stats-row tabular-nums">
        <div><small>Today&apos;s commission</small><b>{money(commissionAnalytics?.today || 0)}</b></div>
        <div><small>This week&apos;s commission</small><b>{money(commissionAnalytics?.thisWeek || 0)}</b></div>
        <div><small>This month&apos;s commission</small><b>{money(commissionAnalytics?.thisMonth || 0)}</b></div>
        <div><small>All-time marketplace profit</small><b>{money(commissionAnalytics?.netProfit || 0)}</b></div>
        <div><small>Refunded commission reversed</small><b>{money(commissionAnalytics?.refundedCommission || 0)}</b></div>
      </div>

      <p className="muted tabular-nums">
        Verified vendor sales: <b>{money(commissionAnalytics?.verifiedPaidSales || 0)}</b> · Pending unpaid sales excluded: <b>{money(commissionAnalytics?.pendingSales || 0)}</b>
      </p>

      <div className="profit-calendar-layout">
        <div className="profit-calendar-card">
          <div className="profit-cal-mode-bar">
            <div className="profit-cal-tabs" role="tablist" aria-label="Profit date filter mode">
              <button
                type="button"
                className={filterMode === 'day' ? 'active' : ''}
                onClick={() => setFilterMode('day')}
              >
                Single Day
              </button>
              <button
                type="button"
                className={filterMode === 'range' ? 'active' : ''}
                onClick={() => setFilterMode('range')}
              >
                Date Range
              </button>
              <button
                type="button"
                className={filterMode === 'month' ? 'active' : ''}
                onClick={() => {
                  setFilterMode('month');
                  setSelectedMonth(cursorMonthPrefix);
                }}
              >
                Month View
              </button>
            </div>
            <button type="button" className="secondary-btn profit-today-btn" onClick={jumpToToday}>
              Today
            </button>
          </div>

          <div className="profit-cal-inputs">
            {filterMode === 'day' && (
              <label>
                <span>Jump to date</span>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    setSelectedDay(val);
                    const parsed = parseIsoDate(val);
                    if (parsed) {
                      setCursorYear(parsed.getFullYear());
                      setCursorMonth(parsed.getMonth());
                    }
                  }}
                />
              </label>
            )}
            {filterMode === 'range' && (
              <>
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={e => {
                      const val = e.target.value;
                      setRangeStart(val);
                      const parsed = parseIsoDate(val);
                      if (parsed) {
                        setCursorYear(parsed.getFullYear());
                        setCursorMonth(parsed.getMonth());
                      }
                    }}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={e => setRangeEnd(e.target.value)}
                  />
                </label>
              </>
            )}
            {filterMode === 'month' && (
              <label>
                <span>Select month</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    setSelectedMonth(val);
                    const [y, m] = val.split('-').map(Number);
                    if (y && m) {
                      setCursorYear(y);
                      setCursorMonth(m - 1);
                    }
                  }}
                />
              </label>
            )}
          </div>

          <div className="profit-cal-header">
            <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <div className="profit-cal-month-title">
              <b>{cursorMonthTitle}</b>
              <small className="tabular-nums">Month profit: {money(monthCommissionTotal)}</small>
            </div>
            <button type="button" className="icon-btn" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="profit-cal-weekdays">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="profit-cal-grid">
            {calendarCells.map((cell, idx) => {
              if (!cell) return <span key={'empty-' + idx} className="profit-cal-empty" />;
              const entry = commissionByDate[cell.iso];
              const hasProfit = Boolean(entry && entry.commissionEarned > 0);
              const isSelected =
                (filterMode === 'day' && selectedDay === cell.iso) ||
                (filterMode === 'range' && (cell.iso === normalizedRange.from || cell.iso === normalizedRange.to)) ||
                (filterMode === 'month' && cell.iso.startsWith(selectedMonth));
              const isInRange =
                filterMode === 'range' && cell.iso > normalizedRange.from && cell.iso < normalizedRange.to;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  title={entry ? `${entry.label}: ${money(entry.commissionEarned)} (${entry.ordersCount} paid orders)` : cell.iso}
                  onClick={() => handleDayClick(cell.iso)}
                  className={[
                    'profit-cal-day',
                    isSelected ? 'is-selected' : '',
                    isInRange ? 'is-in-range' : '',
                    hasProfit ? 'has-profit' : '',
                    isToday ? 'is-today' : ''
                  ].filter(Boolean).join(' ')}
                >
                  <span>{cell.dayNum}</span>
                  {hasProfit && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="profit-filter-summary">
          <div className="profit-filter-head">
            <div>
              <span className="eyebrow">FILTERED PROFIT REPORT</span>
              <h3>{activeFilterResult.heading}</h3>
            </div>
            <span className="profit-cal-badge"><Calendar size={14} /> {filterMode === 'day' ? 'Day' : filterMode === 'range' ? 'Range' : 'Month'}</span>
          </div>

          <div className="profit-filter-metrics tabular-nums">
            <div>
              <small>Commission profit</small>
              <strong>{money(activeFilterResult.commissionEarned)}</strong>
            </div>
            <div>
              <small>Verified paid sales</small>
              <b>{money(activeFilterResult.paidSales)}</b>
            </div>
            <div>
              <small>Paid orders</small>
              <b>{activeFilterResult.ordersCount}</b>
            </div>
          </div>

          <div className="profit-active-days-head">
            <b>Active earning dates in selection</b>
            <small>{activeFilterResult.matchingDays.length} day(s)</small>
          </div>
          <div className="profit-active-days-list tabular-nums">
            {activeFilterResult.matchingDays.length ? (
              activeFilterResult.matchingDays.map(day => (
                <button
                  key={day.iso}
                  type="button"
                  className="profit-active-day-row"
                  onClick={() => {
                    setFilterMode('day');
                    setSelectedDay(day.iso);
                  }}
                >
                  <span>
                    <b>{day.label || day.iso}</b>
                    <small>{day.ordersCount} paid order(s) · Sales {money(day.paidSales)}</small>
                  </span>
                  <strong>{money(day.commissionEarned)}</strong>
                </button>
              ))
            ) : (
              <p className="muted profit-empty-note">No verified commission earnings recorded for this selection. Highlighted calendar days contain earnings.</p>
            )}
          </div>
        </div>
      </div>

      <div className="profit-breakdown-wrap">
        <div className="profit-breakdown-head">
          <h3>Commission breakdown</h3>
          <div className="profit-cal-tabs">
            <button
              type="button"
              className={breakdownTab === 'vendor' ? 'active' : ''}
              onClick={() => setBreakdownTab('vendor')}
            >
              By vendor ({vendorRows.length})
            </button>
            <button
              type="button"
              className={breakdownTab === 'product' ? 'active' : ''}
              onClick={() => setBreakdownTab('product')}
            >
              By product ({productRows.length})
            </button>
          </div>
        </div>

        <div className="profit-breakdown-scroll tabular-nums">
          {breakdownTab === 'vendor' ? (
            vendorRows.length ? (
              vendorRows.map(v => (
                <div className="manage-row" key={v.vendorId}>
                  <div className="manage-main">
                    <b>{v.shopName}</b>
                    <small>
                      Sales {money(v.sales)} · Marketplace commission {money(v.commissionEarned)} · Affiliate {money(v.affiliateCommission || 0)} · Gateway {money(v.paymentGatewayFees || 0)} · Net {money(v.vendorNetEarnings)}
                    </small>
                  </div>
                  <b>{money(v.commissionEarned)}</b>
                </div>
              ))
            ) : (
              <p className="muted">No verified vendor commissions yet.</p>
            )
          ) : productRows.length ? (
            productRows.map(p => (
              <div className="manage-row" key={p.productId}>
                <div className="manage-main">
                  <b>{p.productName}</b>
                  <small>Vendor: {p.vendorName || p.vendorId} · Sales {money(p.sales)}</small>
                </div>
                <b>{money(p.commissionEarned)}</b>
              </div>
            ))
          ) : (
            <p className="muted">No product commission records yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
