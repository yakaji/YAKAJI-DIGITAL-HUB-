import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Link2,
  LogIn,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Share2,
  TrendingUp,
  Wallet
} from 'lucide-react';

type AffiliateTab = 'catalog' | 'commissions' | 'payouts';
type AffiliateSort = 'rate-high' | 'earning-high' | 'price-low' | 'price-high';

export function AffiliateDashboard({
  user,
  signIn,
  navigateHome,
  openAffiliate,
  busy,
  flash,
  affiliateApplication,
  affiliateDashboard,
  affiliateTransfer,
  affiliateProducts,
  affiliateForm,
  setAffiliateForm,
  applyAsAffiliate,
  affiliateWithdrawForm,
  setAffiliateWithdrawForm,
  affiliateWithdrawBusy,
  requestAffiliateWithdrawal,
  copyProductLinkWithReferral,
  shareAffiliateProduct,
  shareProductToNetwork,
  money
}: {
  user: { userId: string; email?: string; name?: string } | null;
  signIn: () => Promise<void>;
  navigateHome: () => void;
  openAffiliate: () => Promise<void>;
  busy: boolean;
  flash: (msg: string) => void;
  affiliateApplication: any;
  affiliateDashboard: { commissions: any[]; withdrawals: any[]; summary: any };
  affiliateTransfer: any;
  affiliateProducts: any[];
  affiliateForm: {
    fullName: string;
    phone: string;
    whatsapp: string;
    address: string;
    city: string;
    state: string;
    socialHandle: string;
    promotionMethod: string;
    paymentMethod: string;
  };
  setAffiliateForm: (next: any) => void;
  applyAsAffiliate: (e: FormEvent) => Promise<void>;
  affiliateWithdrawForm: { amount: string; bankName: string; accountNumber: string; accountName: string };
  setAffiliateWithdrawForm: (next: any) => void;
  affiliateWithdrawBusy: boolean;
  requestAffiliateWithdrawal: (e: FormEvent) => Promise<void>;
  copyProductLinkWithReferral: (product: any, referralCode: string) => Promise<void>;
  shareAffiliateProduct: (product: any) => Promise<void>;
  shareProductToNetwork: (product: any, network: 'whatsapp' | 'facebook' | 'x', referralCode?: string) => void;
  money: (n: number) => string;
}) {
  const [activeTab, setActiveTab] = useState<AffiliateTab>('catalog');
  const [productQuery, setProductQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<AffiliateSort>('rate-high');
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [commissionQuery, setCommissionQuery] = useState('');

  const isApprovedAffiliate = Boolean(
    affiliateApplication && ['approved', 'active'].includes(String(affiliateApplication.status))
  );
  const referralUrl = affiliateApplication?.referralCode
    ? `${window.location.origin}/?ref=${affiliateApplication.referralCode}`
    : '';

  const productCategories = useMemo(() => {
    const unique = Array.from(new Set(affiliateProducts.map(p => String(p.category || 'Other')))).sort();
    return ['All', ...unique];
  }, [affiliateProducts]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const rows = affiliateProducts.filter(p => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q) ||
        String(p.vendorName || '').toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      if (sortBy === 'rate-high') return Number(b.affiliateCommissionPercent || 0) - Number(a.affiliateCommissionPercent || 0);
      if (sortBy === 'earning-high') return Number(b.affiliateCommissionAmount || 0) - Number(a.affiliateCommissionAmount || 0);
      if (sortBy === 'price-low') return Number(a.price || 0) - Number(b.price || 0);
      return Number(b.price || 0) - Number(a.price || 0);
    });
    return rows;
  }, [affiliateProducts, productQuery, categoryFilter, sortBy]);

  const commissions = affiliateDashboard?.commissions || [];
  const withdrawals = affiliateDashboard?.withdrawals || [];
  const filteredCommissions = useMemo(() => {
    const q = commissionQuery.trim().toLowerCase();
    return commissions.filter(c => {
      if (commissionFilter !== 'all' && String(c.status || 'pending') !== commissionFilter) return false;
      if (!q) return true;
      return (
        String(c.productName || '').toLowerCase().includes(q) ||
        String(c.orderNumber || c.orderId || '').toLowerCase().includes(q)
      );
    });
  }, [commissions, commissionFilter, commissionQuery]);

  const summary = affiliateDashboard?.summary || {};
  const totalClicks = Number(summary.totalClicks || 0);
  const trackedSales = Number(summary.trackedSales || 0);
  const conversionRate = totalClicks > 0 ? `${((trackedSales / totalClicks) * 100).toFixed(1)}%` : '0.0%';
  const availableBalance = Number(summary.availableBalance || 0);

  return (
    <main className="workspace">
      <button className="back-link" onClick={navigateHome}>
        <ArrowLeft size={16} /> Back to marketplace
      </button>

      {!user || !isApprovedAffiliate ? (
        <>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">YAKAJI PARTNER NETWORK</span>
              <h1>Affiliate Marketing Programme</h1>
              <p>
                Promote verified digital downloads, courses, services, and physical products worldwide using unique
                trackable referral links and earn verified commissions without holding inventory.
              </p>
            </div>
            <span className="role-pill">
              <TrendingUp size={16} /> Partner Programme
            </span>
          </div>

          <section className="panel">
            <h2>How partner earnings work</h2>
            <div className="stats-row">
              <div>
                <small>Step 1 · Account</small>
                <b>Sign in</b>
                <p className="muted">Use your regular Yakaji Digital Hub customer account.</p>
              </div>
              <div>
                <small>Step 2 · Apply</small>
                <b>Partner registration</b>
                <p className="muted">Submit your contact &amp; promotion details below.</p>
              </div>
              <div>
                <small>Step 3 · Verification</small>
                <b>Owner approval</b>
                <p className="muted">Marketplace operations reviews and activates your link studio.</p>
              </div>
              <div>
                <small>Step 4 · Payouts</small>
                <b>Share &amp; withdraw</b>
                <p className="muted">Share product links anywhere and withdraw confirmed commissions to your bank.</p>
              </div>
            </div>
          </section>

          {affiliateTransfer && (
            <section className="panel transfer-card">
              <h2>Complete affiliate registration payment</h2>
              <p>
                Transfer exactly <b className="tabular-nums">{money(Number(affiliateTransfer.amount))}</b> using this
                reference: <b>{affiliateTransfer.reference}</b>
              </p>
              <p>Bank: <b>{affiliateTransfer.bankName}</b></p>
              <p>Account name: <b>{affiliateTransfer.accountName}</b></p>
              <h2 className="tabular-nums">{affiliateTransfer.accountNumber}</h2>
              <button
                type="button"
                className="secondary-btn"
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(affiliateTransfer.accountNumber)
                    .then(() => flash('Account number copied.'))
                }
              >
                Copy account number
              </button>
              <p className="checkout-note">
                Your application stays pending until the owner confirms receipt. Please do not pay twice.
              </p>
            </section>
          )}

          {!user ? (
            <section className="panel centered">
              <LogIn size={36} />
              <h2>Sign in or create a customer account</h2>
              <p>Any marketplace customer can apply to become an affiliate marketer.</p>
              <button className="primary-btn" onClick={signIn}>
                Sign in / Create account <ArrowRight size={16} />
              </button>
            </section>
          ) : affiliateApplication && affiliateApplication.registrationPaymentStatus === 'paid' ? (
            <section className="panel centered">
              <Clock3 size={40} />
              <h2>Application {affiliateApplication.status}</h2>
              <p>
                Registration payment confirmed ({money(Number(affiliateApplication.registrationFee || 2000))}).
              </p>
              <p className="checkout-note">
                Your payment is verified. Marketplace operations must approve your application before your affiliate
                studio and referral catalog unlock.
              </p>
              <button type="button" className="secondary-btn" onClick={() => void openAffiliate()}>
                <RefreshCw size={15} /> Refresh status
              </button>
            </section>
          ) : (
            <form className="panel form-panel" onSubmit={applyAsAffiliate}>
              <div className="full-field">
                <h2>Affiliate marketer registration</h2>
                <p className="muted">
                  Complete your personal and promotion details, then pay the one-time registration fee of ₦2,000.
                </p>
              </div>
              <label>
                Full legal name
                <input
                  required
                  maxLength={100}
                  value={affiliateForm.fullName}
                  onChange={e => setAffiliateForm({ ...affiliateForm, fullName: e.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  type="tel"
                  maxLength={25}
                  value={affiliateForm.phone}
                  onChange={e => setAffiliateForm({ ...affiliateForm, phone: e.target.value })}
                />
              </label>
              <label>
                WhatsApp number
                <input
                  required
                  type="tel"
                  maxLength={25}
                  value={affiliateForm.whatsapp}
                  onChange={e => setAffiliateForm({ ...affiliateForm, whatsapp: e.target.value })}
                />
              </label>
              <label>
                Email address
                <input value={user.email || ''} disabled />
              </label>
              <label>
                Residential address
                <input
                  required
                  value={affiliateForm.address}
                  onChange={e => setAffiliateForm({ ...affiliateForm, address: e.target.value })}
                />
              </label>
              <label>
                City
                <input
                  required
                  value={affiliateForm.city}
                  onChange={e => setAffiliateForm({ ...affiliateForm, city: e.target.value })}
                />
              </label>
              <label>
                State
                <input
                  required
                  value={affiliateForm.state}
                  onChange={e => setAffiliateForm({ ...affiliateForm, state: e.target.value })}
                />
              </label>
              <label>
                Social media username / profile link
                <input
                  value={affiliateForm.socialHandle}
                  onChange={e => setAffiliateForm({ ...affiliateForm, socialHandle: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label>
                How will you promote products?
                <select
                  required
                  value={affiliateForm.promotionMethod}
                  onChange={e => setAffiliateForm({ ...affiliateForm, promotionMethod: e.target.value })}
                >
                  <option>WhatsApp and social media</option>
                  <option>Facebook</option>
                  <option>TikTok</option>
                  <option>Instagram</option>
                  <option>YouTube</option>
                  <option>Website or blog</option>
                  <option>In-person referrals</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Registration payment method
                <select
                  value={affiliateForm.paymentMethod}
                  onChange={e => setAffiliateForm({ ...affiliateForm, paymentMethod: e.target.value })}
                >
                  <option value="Wallet">1. Pay from marketplace wallet</option>
                  <option value="Paystack">2. Pay with Paystack</option>
                  <option value="Bank transfer">3. Manual bank transfer</option>
                </select>
              </label>
              <div className="checkout-note full-field">
                <b>Registration fee: ₦2,000.</b> Wallet payments deduct immediately. Paystack verifies automatically.
                Manual transfers remain pending until confirmed by the owner.
              </div>
              <button className="primary-btn" disabled={busy}>
                {busy ? 'Processing registration...' : 'Submit application & continue to payment'}{' '}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="seller-portal-header">
            <div className="workspace-heading">
              <div>
                <span className="eyebrow">AFFILIATE PARTNER STUDIO · ID {affiliateApplication.referralCode}</span>
                <h1>Affiliate Marketing Dashboard</h1>
                <p>
                  Share high-converting links across social channels, monitor real-time clicks &amp; commissions, and
                  withdraw confirmed payouts.
                </p>
              </div>
              <div className="seller-header-actions">
                <button type="button" className="secondary-btn" onClick={() => void openAffiliate()}>
                  <RefreshCw size={15} /> Refresh data
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() =>
                    navigator.clipboard?.writeText(referralUrl).then(() => flash('Personal storefront link copied.'))
                  }
                >
                  <Copy size={15} /> Copy partner link
                </button>
              </div>
            </div>

            <div className="affiliate-link-bar">
              <div className="affiliate-link-bar-label">
                <Link2 size={16} />
                <div>
                  <b>Your global referral link</b>
                  <small>Referral Code: {affiliateApplication.referralCode}</small>
                </div>
              </div>
              <div className="affiliate-link-bar-copy">
                <input type="text" readOnly value={referralUrl} aria-label="Your global affiliate referral link" />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    navigator.clipboard?.writeText(referralUrl).then(() => flash('Affiliate link copied.'))
                  }
                >
                  <Copy size={14} /> Copy
                </button>
              </div>
            </div>

            <nav className="seller-tabs" aria-label="Affiliate studio sections">
              <button
                type="button"
                className={activeTab === 'catalog' ? 'active' : ''}
                onClick={() => setActiveTab('catalog')}
              >
                <Share2 size={15} /> Promote Products ({affiliateProducts.length})
              </button>
              <button
                type="button"
                className={activeTab === 'commissions' ? 'active' : ''}
                onClick={() => setActiveTab('commissions')}
              >
                <BarChart3 size={15} /> Commissions ({commissions.length})
              </button>
              <button
                type="button"
                className={activeTab === 'payouts' ? 'active' : ''}
                onClick={() => setActiveTab('payouts')}
              >
                <Wallet size={15} /> Payouts &amp; Withdrawals ({withdrawals.length})
              </button>
            </nav>
          </div>

          <section className="admin-kpis tabular-nums" aria-label="Affiliate performance KPIs">
            <article className="admin-kpi kpi-green">
              <span><Wallet size={18} /></span>
              <small>Available balance</small>
              <b>{money(availableBalance)}</b>
              <em>Minimum payout: ₦1,000</em>
            </article>
            <article className="admin-kpi">
              <span><TrendingUp size={18} /></span>
              <small>Total commission earned</small>
              <b>{money(Number(summary.totalEarned || 0))}</b>
              <em>Lifetime verified earnings</em>
            </article>
            <article className="admin-kpi">
              <span><CheckCircle2 size={18} /></span>
              <small>Paid commission</small>
              <b>{money(Number(summary.paidCommission || 0))}</b>
              <em>Disbursed to bank</em>
            </article>
            <article className="admin-kpi">
              <span><Package size={18} /></span>
              <small>Tracked sales</small>
              <b>{trackedSales.toLocaleString()}</b>
              <em>Conversion rate: {conversionRate}</em>
            </article>
            <article className="admin-kpi">
              <span><Link2 size={18} /></span>
              <small>Product link clicks</small>
              <b>{totalClicks.toLocaleString()}</b>
              <em>Unique referral visits</em>
            </article>
          </section>

          {activeTab === 'catalog' && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">ELIGIBLE OFFER CATALOGUE</span>
                  <h2>Products you can promote ({filteredProducts.length})</h2>
                  <p>
                    Every link opens the exact product page with your referral code preserved across WhatsApp,
                    Facebook, and X previews.
                  </p>
                </div>
              </div>

              <div className="admin-order-toolbar">
                <label className="admin-inline-search">
                  <Search size={15} />
                  <input
                    type="search"
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    placeholder="Search eligible products, categories or vendors..."
                  />
                </label>

                <select
                  className="compact-stage-select"
                  aria-label="Filter affiliate products by category"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'All' ? 'All categories' : cat}</option>
                  ))}
                </select>

                <select
                  className="compact-stage-select"
                  aria-label="Sort affiliate products"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as AffiliateSort)}
                >
                  <option value="rate-high">Highest Commission %</option>
                  <option value="earning-high">Highest Earning (₦)</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {filteredProducts.length ? (
                <div className="affiliate-product-grid">
                  {filteredProducts.map((p: any) => (
                    <article className="affiliate-product-card" key={p.id}>
                      <div className="affiliate-product-photo">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={42} />
                        )}
                      </div>
                      <div className="affiliate-product-content">
                        <span className="product-meta-cat">{p.category} · {p.vendorName || 'Yakaji Vendor'}</span>
                        <h4>{p.name}</h4>
                        <b className="affiliate-product-price tabular-nums">{money(Number(p.price))}</b>
                        <p>{String(p.description || '').slice(0, 120)}{String(p.description || '').length > 120 ? '…' : ''}</p>
                        <div className="affiliate-rate-box tabular-nums">
                          <span>Partner commission</span>
                          <strong>{Number(p.affiliateCommissionPercent)}%</strong>
                          <small>Earn per sale: {money(Number(p.affiliateCommissionAmount || 0))} · {Number(p.stock || 0)} in stock</small>
                        </div>
                        <div className="affiliate-share-buttons">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => void copyProductLinkWithReferral(p, affiliateApplication.referralCode)}
                          >
                            <Copy size={14} /> Copy link
                          </button>
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => void shareAffiliateProduct(p)}
                          >
                            <Share2 size={14} /> Share
                          </button>
                          <button
                            type="button"
                            className="share-social whatsapp"
                            onClick={() => shareProductToNetwork(p, 'whatsapp', affiliateApplication.referralCode)}
                          >
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                          <button
                            type="button"
                            className="share-social"
                            onClick={() => shareProductToNetwork(p, 'facebook', affiliateApplication.referralCode)}
                          >
                            Facebook
                          </button>
                          <button
                            type="button"
                            className="share-social"
                            onClick={() => shareProductToNetwork(p, 'x', affiliateApplication.referralCode)}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="chart-empty compact">
                  <Package size={27} />
                  <b>{affiliateProducts.length ? 'No matching products' : 'No eligible affiliate products yet'}</b>
                  <small>
                    {affiliateProducts.length
                      ? 'Try clearing your search or category filter.'
                      : 'Products with 0% affiliate commission are not listed for promotion.'}
                  </small>
                </div>
              )}
            </section>
          )}

          {activeTab === 'commissions' && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">EARNINGS ATTRIBUTION</span>
                  <h2>Commission history ({commissions.length})</h2>
                  <p>Track every sale credited to your referral links and its settlement status.</p>
                </div>
              </div>

              <div className="admin-order-toolbar">
                <label className="admin-inline-search">
                  <Search size={15} />
                  <input
                    type="search"
                    value={commissionQuery}
                    onChange={e => setCommissionQuery(e.target.value)}
                    placeholder="Search by product name or order number..."
                  />
                </label>
                <div className="profit-cal-tabs" role="tablist" aria-label="Filter commission status">
                  {([
                    ['all', `All (${commissions.length})`],
                    ['pending', `Pending (${commissions.filter(c => String(c.status || 'pending') === 'pending').length})`],
                    ['paid', `Paid (${commissions.filter(c => c.status === 'paid').length})`]
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={commissionFilter === key ? 'active' : ''}
                      onClick={() => setCommissionFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCommissions.length ? (
                <div className="seller-scroll-panel">
                  {filteredCommissions.map((c: any) => (
                    <div className="manage-row tabular-nums" key={c.id}>
                      <div className="manage-main">
                        <b>{c.productName || 'Product sale'}</b>
                        <small>
                          Order {c.orderNumber || c.orderId} · Commission rate {Number(c.commissionPercent || 0)}% ·{' '}
                          {new Date(c.createdAt).toLocaleString()}
                        </small>
                      </div>
                      <b>{money(Number(c.commissionAmount || 0))}</b>
                      <span className={'status ' + (c.status === 'paid' ? 'approved' : 'pending')}>{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="chart-empty compact">
                  <TrendingUp size={27} />
                  <b>No commission records found</b>
                  <small>Start sharing product links from the Promote Products tab to record attributed sales.</small>
                </div>
              )}
            </section>
          )}

          {activeTab === 'payouts' && (
            <div className="seller-overview-grid">
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">PARTNER SETTLEMENT</span>
                    <h2>Request bank withdrawal</h2>
                    <p>
                      Available balance: <b className="tabular-nums">{money(availableBalance)}</b> · Minimum ₦1,000
                    </p>
                  </div>
                </div>
                <form className="product-form" onSubmit={requestAffiliateWithdrawal}>
                  <label>
                    Amount (₦)
                    <input
                      type="number"
                      min="1000"
                      step="1"
                      required
                      value={affiliateWithdrawForm.amount}
                      onChange={e =>
                        setAffiliateWithdrawForm({ ...affiliateWithdrawForm, amount: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Bank name
                    <input
                      required
                      value={affiliateWithdrawForm.bankName}
                      onChange={e =>
                        setAffiliateWithdrawForm({ ...affiliateWithdrawForm, bankName: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Account number
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={affiliateWithdrawForm.accountNumber}
                      onChange={e =>
                        setAffiliateWithdrawForm({
                          ...affiliateWithdrawForm,
                          accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10)
                        })
                      }
                    />
                  </label>
                  <label>
                    Account name
                    <input
                      required
                      value={affiliateWithdrawForm.accountName}
                      onChange={e =>
                        setAffiliateWithdrawForm({ ...affiliateWithdrawForm, accountName: e.target.value })
                      }
                    />
                  </label>
                  <button
                    className="primary-btn"
                    disabled={affiliateWithdrawBusy || Number(affiliateWithdrawForm.amount) > availableBalance}
                  >
                    {affiliateWithdrawBusy ? 'Submitting...' : 'Request bank withdrawal'}
                  </button>
                </form>
              </section>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">PAYOUT HISTORY</span>
                    <h2>Withdrawal requests ({withdrawals.length})</h2>
                    <p>Monitor payout approvals and completed bank settlements.</p>
                  </div>
                </div>
                {withdrawals.length ? (
                  <div className="seller-scroll-panel">
                    {withdrawals.map((w: any) => (
                      <div className="manage-row tabular-nums" key={w.id}>
                        <div className="manage-main">
                          <b>{money(Number(w.amount || 0))}</b>
                          <small>
                            {w.bankName} · {w.accountNumber}
                            {w.createdAt ? ` · ${new Date(w.createdAt).toLocaleString()}` : ''}
                          </small>
                        </div>
                        <span className={'status ' + (w.status === 'paid' ? 'approved' : w.status === 'rejected' ? 'rejected' : 'pending')}>
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-empty compact">
                    <Wallet size={27} />
                    <b>No withdrawal requests yet</b>
                    <small>Once your available balance reaches ₦1,000, you can request a bank payout here.</small>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}
