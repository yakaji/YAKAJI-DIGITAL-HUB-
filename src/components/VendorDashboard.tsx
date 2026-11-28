import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  ImagePlus,
  LayoutDashboard,
  Lock,
  LogIn,
  Megaphone,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
  Wallet
} from 'lucide-react';
import { ShopAvatar, ShopCoverBanner } from './ShopDirectoryView';
import { VerifiedShopBadge } from './VerifiedShopBadge';
import { VendorAnnouncementPanel } from './VendorAnnouncementPanel';
import { VendorVerificationWizard } from './VendorVerificationWizard';
import { isAnnouncementActive } from '../utils/announcements';
import {
  getVendorEntitlements,
  type VendorVerificationKycPayload,
  type VendorVerificationRecord,
  type VerificationBillingCycle,
  type VerificationPaymentMethod,
  type VerificationTierId,
} from '../utils/vendorVerification';

export type VendorTab = 'overview' | 'products' | 'orders' | 'coupons' | 'payouts' | 'announcements' | 'shop' | 'verification';

export type VendorUser = { userId: string; email?: string; name?: string; picture?: string };
export type VendorAccount = {
  id: string;
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  description: string;
  tagline?: string;
  specialty?: string;
  location?: string;
  city?: string;
  state?: string;
  returnPolicy?: string;
  iconPath?: string;
  coverPath?: string;
  iconUrl?: string;
  coverUrl?: string;
  followerCount?: number;
  isVerified?: boolean;
  verificationStatus?: string;
  verificationTier?: string;
  verificationTierName?: string;
  verifiedAt?: string;
  verifiedUntil?: string;
  status: string;
  createdAt: string;
};
export type VendorProfileFormState = {
  shopName: string;
  phone: string;
  whatsapp: string;
  tagline: string;
  specialty: string;
  location: string;
  city: string;
  state: string;
  description: string;
  returnPolicy: string;
};
export type VendorProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  tag: string;
  images: string[];
  videos: string[];
  imagePaths?: string[];
  videoPaths?: string[];
  stock: number;
  options: string[];
  vendorId: string;
  vendorName: string;
  status: string;
  affiliateCommissionPercent?: number;
  marketplaceCommissionPercent?: number;
  standardPrice?: number;
  discountPrice?: number;
  discountPercent?: number;
  discountActive?: boolean;
  discountStartAt?: string;
  discountEndAt?: string;
};
export type VendorOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  paymentMethod: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number; vendorId: string; option: string }>;
  total: number;
  status: string;
  paymentStatus?: string;
  createdAt: string;
  vendorTotal?: number;
};
export type VendorProductDraft = {
  id?: string;
  name: string;
  category: string;
  price: string;
  description: string;
  stock: string;
  tag: string;
  options: string;
  images: string[];
  videos: string[];
  affiliateCommissionPercent: string;
  marketplaceCommissionPercent: string;
  discountMode: string;
  discountValue: string;
  discountStartAt: string;
  discountEndAt: string;
};

export function VendorDashboard({
  user,
  vendor,
  shopForm,
  setShopForm,
  applyAsVendor,
  signIn,
  navigateHome,
  refreshVendor,
  busy,
  isAdmin,
  wallet,
  settings,
  withdrawForm,
  setWithdrawForm,
  requestWithdrawal,
  vendorReports,
  analyticsPeriod,
  setAnalyticsPeriod,
  products,
  categories,
  draft,
  setDraft,
  editing,
  startNewProduct,
  startEdit,
  saveProduct,
  deleteProduct,
  selectedFiles,
  setSelectedFiles,
  vendorCoupons,
  couponDraft,
  setCouponDraft,
  saveVendorCoupon,
  updateVendorCoupon,
  deleteVendorCoupon,
  orders,
  money,
  openWallet,
  vendorProfileForm,
  setVendorProfileForm,
  saveVendorProfile,
  uploadVendorShopMedia,
  clearVendorShopMedia,
  shopMediaBusy,
  openPublicShop,
  requestedTab,
  onClearRequestedTab,
  verification,
  paystackConfigured,
  verificationBusy,
  verificationDocBusy,
  onStartVerificationPayment,
  onVerifyVerificationPaystack,
  onUploadVerificationDocument,
  onSubmitVerificationKyc,
  onRefreshVerification,
  vendorAnnouncements,
  vendorFollowerCount,
  vendorAnnouncementForm,
  setVendorAnnouncementForm,
  vendorAnnouncementBusy,
  cancellingVendorAnnouncementId,
  onPublishVendorAnnouncement,
  onCancelVendorAnnouncement,
  onRefreshVendorAnnouncements,
}: {
  user: VendorUser | null;
  vendor: VendorAccount | null;
  shopForm: { shopName: string; phone: string; description: string };
  setShopForm: (next: { shopName: string; phone: string; description: string }) => void;
  applyAsVendor: (e: FormEvent) => Promise<void>;
  signIn: () => Promise<void>;
  navigateHome: () => void;
  refreshVendor: () => Promise<void>;
  busy: boolean;
  isAdmin: boolean;
  wallet: any;
  settings: { withdrawalFee: number; commissionPercent: number };
  withdrawForm: { amount: string; bankName: string; accountNumber: string; accountName: string };
  setWithdrawForm: (next: { amount: string; bankName: string; accountNumber: string; accountName: string }) => void;
  requestWithdrawal: (e: FormEvent) => Promise<void>;
  vendorReports: any;
  analyticsPeriod: 'day' | 'week' | 'month' | 'year';
  setAnalyticsPeriod: (p: 'day' | 'week' | 'month' | 'year') => void;
  products: VendorProduct[];
  categories: string[];
  draft: VendorProductDraft;
  setDraft: React.Dispatch<React.SetStateAction<VendorProductDraft>>;
  editing: boolean;
  startNewProduct: () => void;
  startEdit: (p: VendorProduct) => void;
  saveProduct: (e: FormEvent) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  vendorCoupons: any[];
  couponDraft: {
    code: string;
    discountType: string;
    discountValue: string;
    productIds: string[];
    minOrderAmount: string;
    maxDiscount: string;
    usageLimit: string;
    startsAt: string;
    expiresAt: string;
  };
  setCouponDraft: (next: any) => void;
  saveVendorCoupon: (e: FormEvent) => Promise<void>;
  updateVendorCoupon: (id: string, status: string) => Promise<void>;
  deleteVendorCoupon: (id: string) => Promise<void>;
  orders: VendorOrder[];
  money: (n: number) => string;
  openWallet: () => Promise<void>;
  vendorProfileForm: VendorProfileFormState;
  setVendorProfileForm: React.Dispatch<React.SetStateAction<VendorProfileFormState>>;
  saveVendorProfile: (e: FormEvent) => Promise<void>;
  uploadVendorShopMedia: (kind: 'icon' | 'cover', file: File) => Promise<void>;
  clearVendorShopMedia: (kind: 'icon' | 'cover') => Promise<void>;
  shopMediaBusy: '' | 'icon' | 'cover' | 'profile';
  openPublicShop: (shopId: string) => void;
  requestedTab?: VendorTab | '';
  onClearRequestedTab?: () => void;
  verification: VendorVerificationRecord | null;
  paystackConfigured: boolean;
  verificationBusy: boolean;
  verificationDocBusy: '' | 'cac' | 'national_id';
  onStartVerificationPayment: (payload: {
    tierId: VerificationTierId;
    billingCycle: VerificationBillingCycle;
    paymentMethod: VerificationPaymentMethod;
  }) => Promise<any>;
  onVerifyVerificationPaystack: (reference: string) => Promise<void>;
  onUploadVerificationDocument: (kind: 'cac' | 'national_id', file: File) => Promise<void>;
  onSubmitVerificationKyc: (payload: VendorVerificationKycPayload) => Promise<void>;
  onRefreshVerification: () => Promise<void>;
  vendorAnnouncements: any[];
  vendorFollowerCount: number;
  vendorAnnouncementForm: { title: string; message: string };
  setVendorAnnouncementForm: (next: { title: string; message: string }) => void;
  vendorAnnouncementBusy: boolean;
  cancellingVendorAnnouncementId: string;
  onPublishVendorAnnouncement: (e: FormEvent) => Promise<void>;
  onCancelVendorAnnouncement: (id: string) => Promise<void>;
  onRefreshVendorAnnouncements: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<VendorTab>('overview');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStageFilter, setOrderStageFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (editing) {
      setActiveTab('products');
    }
  }, [editing]);

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      onClearRequestedTab?.();
    }
  }, [requestedTab, onClearRequestedTab]);

  const myProducts = useMemo(
    () => (user ? products.filter(p => p.vendorId === user.userId) : []),
    [products, user]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return myProducts.filter(p => {
      if (productStatusFilter !== 'all' && p.status !== productStatusFilter) return false;
      if (productCategoryFilter !== 'All' && p.category !== productCategoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.tag || '').toLowerCase().includes(q)
      );
    });
  }, [myProducts, productSearch, productStatusFilter, productCategoryFilter]);

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return sortedOrders.filter(o => {
      const closed = ['Completed', 'Cancelled', 'Refunded', 'Returned'].includes(o.status);
      if (orderStageFilter === 'active' && closed) return false;
      if (orderStageFilter === 'completed' && !closed) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    });
  }, [sortedOrders, orderSearch, orderStageFilter]);

  const approvedProductCount = myProducts.filter(p => p.status === 'approved').length;
  const activeOrdersCount = orders.filter(
    o => !['Completed', 'Cancelled', 'Refunded', 'Returned'].includes(o.status)
  ).length;
  const activeCouponsCount = vendorCoupons.filter(
    c => c.status === 'active' && new Date(c.expiresAt).getTime() > Date.now()
  ).length;

  const entitlements = useMemo(() => getVendorEntitlements(vendor), [vendor]);
  const productLimitReached =
    !isAdmin &&
    !editing &&
    entitlements.maxProducts !== null &&
    myProducts.length >= entitlements.maxProducts;
  const couponLimitReached =
    !isAdmin &&
    entitlements.maxActiveCoupons !== null &&
    activeCouponsCount >= entitlements.maxActiveCoupons;
  const effectiveAnalyticsPeriod: 'day' | 'week' | 'month' | 'year' =
    isAdmin || entitlements.analyticsPeriods.includes(analyticsPeriod) ? analyticsPeriod : 'day';
  const [lockedPeriodNotice, setLockedPeriodNotice] = useState('');

  const topProductsByRevenue = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
      if (['Cancelled', 'Refunded', 'Returned'].includes(order.status)) continue;
      for (const item of order.items) {
        const key = item.productId || item.name;
        const prev = map.get(key) || { name: item.name, units: 0, revenue: 0 };
        map.set(key, {
          name: item.name || prev.name,
          units: prev.units + Number(item.quantity || 0),
          revenue: prev.revenue + Number(item.price || 0) * Number(item.quantity || 0),
        });
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  function exportOrdersCsv() {
    if (!isAdmin && !entitlements.allowCsvExport) {
      setActiveTab('verification');
      return;
    }
    const escapeCell = (val: unknown) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = [
      ['Order Number', 'Date', 'Customer', 'Phone', 'Payment Method', 'Status', 'Items', 'Vendor Total (NGN)'],
      ...filteredOrders.map(o => [
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerName,
        o.phone,
        o.paymentMethod,
        o.status,
        o.items.map(i => `${i.name} x${i.quantity}`).join('; '),
        Number(o.vendorTotal || o.items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
      ]),
    ];
    const csv = rows.map(row => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(vendor?.shopName || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-orders.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openNewProductEditor() {
    startNewProduct();
    setActiveTab('products');
    window.setTimeout(() => {
      document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  function handleEditProduct(p: VendorProduct) {
    setActiveTab('products');
    startEdit(p);
    window.setTimeout(() => {
      document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  return (
    <main className="workspace">
      <button className="back-link" onClick={navigateHome}>
        <ArrowLeft size={16} /> Back to marketplace
      </button>

      {!user ? (
        <>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">SELLER CENTRE · GLOBAL MERCHANT PORTAL</span>
              <h1>Sell on Yakaji Digital Hub</h1>
              <p>Reach verified buyers across digital downloads, courses, services, and physical products.</p>
            </div>
            <span className="role-pill">
              <Store size={16} /> Seller Portal
            </span>
          </div>
          <div className="panel centered">
            <LogIn size={36} />
            <h2>Sign in to launch or manage your storefront</h2>
            <p>Access your seller analytics, product publishing studio, customer orders, coupons, and bank payouts.</p>
            <button className="primary-btn" onClick={signIn}>
              Sign in / Register <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : !vendor ? (
        <>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">SELLER ONBOARDING</span>
              <h1>Launch your vendor storefront</h1>
              <p>Complete your merchant profile once to sell digital or physical products worldwide.</p>
            </div>
            <span className="role-pill">
              <Store size={16} /> Merchant Application
            </span>
          </div>

          <section className="panel">
            <h2>Seller benefits &amp; payout workflow</h2>
            <div className="stats-row">
              <div>
                <small>01 · Global Reach</small>
                <b>Digital &amp; Physical</b>
                <p className="muted">List downloads, courses, services, and physical inventory side by side.</p>
              </div>
              <div>
                <small>02 · Built-In Marketing</small>
                <b>Coupons &amp; Affiliates</b>
                <p className="muted">Create checkout promo codes and let approved affiliates promote your catalog.</p>
              </div>
              <div>
                <small>03 · Clear Accounting</small>
                <b>Transparent Ledger</b>
                <p className="muted">Track gross sales, marketplace fees, affiliate payouts, and net earnings.</p>
              </div>
              <div>
                <small>04 · Bank Payouts</small>
                <b>Direct Withdrawals</b>
                <p className="muted">Request payouts straight to your verified Nigerian bank account anytime.</p>
              </div>
            </div>
          </section>

          <form className="panel form-panel" onSubmit={applyAsVendor}>
            <div className="full-field">
              <h2>Register your vendor shop</h2>
              <p className="muted">Tell us about your business. Applications are reviewed promptly by marketplace operations.</p>
            </div>
            <label>
              Shop / brand name
              <input
                required
                value={shopForm.shopName}
                onChange={e => setShopForm({ ...shopForm, shopName: e.target.value })}
                placeholder="e.g. Studio Yakaji Goods"
              />
            </label>
            <label>
              Phone / WhatsApp
              <input
                required
                type="tel"
                value={shopForm.phone}
                onChange={e => setShopForm({ ...shopForm, phone: e.target.value })}
                placeholder="+234..."
              />
            </label>
            <label className="full-field">
              What will you sell?
              <textarea
                required
                rows={4}
                value={shopForm.description}
                onChange={e => setShopForm({ ...shopForm, description: e.target.value })}
                placeholder="Describe your product catalog, target customers, and fulfilment approach"
              />
            </label>
            <button className="primary-btn" disabled={busy}>
              {busy ? 'Submitting application...' : 'Submit vendor application'} <ArrowRight size={16} />
            </button>
          </form>
        </>
      ) : vendor.status !== 'approved' ? (
        <div className="panel centered">
          <Clock3 size={42} />
          <h2>Application {vendor.status === 'rejected' ? 'not approved' : 'under review'}</h2>
          <p>
            {vendor.status === 'rejected'
              ? 'Please contact Yakaji Digital Hub support for more details about your application.'
              : 'Thank you for registering your shop. Your merchant account is awaiting owner verification before product publishing opens.'}
          </p>
          <b>{vendor.shopName}</b>
        </div>
      ) : (
        <>
          <div className="seller-portal-header">
            <div className="workspace-heading">
              <div className="seller-portal-identity">
                <ShopAvatar shopName={vendor.shopName} iconUrl={vendor.iconUrl} size="md" />
                <div>
                  <span className="eyebrow">SELLER CENTRE · {vendor.shopName.toUpperCase()}</span>
                  <h1 className="shop-title-verified-row">
                    <span>{vendor.shopName}</span>
                    <VerifiedShopBadge
                      verified={vendor.isVerified}
                      tierId={vendor.verificationTier}
                      size="lg"
                      showLabel
                    />
                  </h1>
                  <p>
                    {vendor.isVerified ? 'Verified Business Storefront' : 'Approved Storefront'} · {approvedProductCount} live listing{approvedProductCount === 1 ? '' : 's'} ·{' '}
                    {activeOrdersCount} active order{activeOrdersCount === 1 ? '' : 's'} ·{' '}
                    {Number(vendor.followerCount || 0).toLocaleString()} follower{Number(vendor.followerCount || 0) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="seller-header-actions">
                <button type="button" className="secondary-btn" onClick={() => openPublicShop(vendor.id)}>
                  <Store size={15} /> View storefront
                </button>
                <button type="button" className="secondary-btn" onClick={() => void refreshVendor()}>
                  <RefreshCw size={15} /> Refresh
                </button>
                <button type="button" className="primary-btn" onClick={openNewProductEditor}>
                  <Plus size={16} /> Publish product
                </button>
              </div>
            </div>

            <nav className="seller-tabs" aria-label="Vendor dashboard sections">
              <button
                type="button"
                className={activeTab === 'overview' ? 'active' : ''}
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={15} /> Overview
              </button>
              <button
                type="button"
                className={activeTab === 'verification' ? 'active' : ''}
                onClick={() => setActiveTab('verification')}
              >
                <ShieldCheck size={15} /> Verify Shop
                <VerifiedShopBadge verified={vendor.isVerified} tierId={vendor.verificationTier} size="xs" />
              </button>
              <button
                type="button"
                className={activeTab === 'shop' ? 'active' : ''}
                onClick={() => setActiveTab('shop')}
              >
                <Store size={15} /> Shop Profile
              </button>
              <button
                type="button"
                className={activeTab === 'products' ? 'active' : ''}
                onClick={() => setActiveTab('products')}
              >
                <ShoppingBag size={15} /> Products ({myProducts.length})
              </button>
              <button
                type="button"
                className={activeTab === 'orders' ? 'active' : ''}
                onClick={() => setActiveTab('orders')}
              >
                <Package size={15} /> Orders ({orders.length})
              </button>
              <button
                type="button"
                className={activeTab === 'coupons' ? 'active' : ''}
                onClick={() => setActiveTab('coupons')}
              >
                <Tag size={15} /> Coupons ({activeCouponsCount})
              </button>
              <button
                type="button"
                className={activeTab === 'announcements' ? 'active' : ''}
                onClick={() => setActiveTab('announcements')}
              >
                <Megaphone size={15} /> Follower Alerts ({vendorAnnouncements.filter(isAnnouncementActive).length})
              </button>
              <button
                type="button"
                className={activeTab === 'payouts' ? 'active' : ''}
                onClick={() => setActiveTab('payouts')}
              >
                <Wallet size={15} /> Wallet &amp; Payouts
              </button>
            </nav>
          </div>

          <section className="admin-kpis tabular-nums" aria-label="Seller performance summary">
            <article className="admin-kpi kpi-green">
              <span><Wallet size={18} /></span>
              <small>Available to withdraw</small>
              <b>{money(wallet?.available || 0)}</b>
              <em>Net after commissions &amp; fees</em>
            </article>
            <article className="admin-kpi">
              <span><TrendingUp size={18} /></span>
              <small>Completed earnings (Year)</small>
              <b>{money(vendorReports?.year?.completedEarnings || 0)}</b>
              <em>Gross sales: {money(wallet?.gross || 0)}</em>
            </article>
            <article className="admin-kpi">
              <span><Users size={18} /></span>
              <small>Shop followers</small>
              <b>{Number(vendor.followerCount || 0).toLocaleString()}</b>
              <em>Customers following your shop</em>
            </article>
            <article className="admin-kpi">
              <span><ShoppingBag size={18} /></span>
              <small>My catalog</small>
              <b>{myProducts.length.toLocaleString()}</b>
              <em>{approvedProductCount} published · {myProducts.length - approvedProductCount} pending/other</em>
            </article>
            <article className="admin-kpi">
              <span><Package size={18} /></span>
              <small>Customer orders</small>
              <b>{orders.length.toLocaleString()}</b>
              <em>{activeOrdersCount} active · {orders.length - activeOrdersCount} closed</em>
            </article>
          </section>

          <section className="vendor-plan-strip tabular-nums" aria-label="Active shop plan and tool limits">
            <div className="vendor-plan-strip-head">
              <div>
                <span className="eyebrow">ACTIVE SHOP PLAN · TOOL ACCESS</span>
                <b className="vendor-plan-strip-title">
                  <span>{entitlements.planName}</span>
                  <VerifiedShopBadge verified={vendor.isVerified} tierId={vendor.verificationTier} size="sm" />
                </b>
              </div>
              <button type="button" className="secondary-btn" onClick={() => setActiveTab('verification')}>
                <ShieldCheck size={14} /> {entitlements.isPaidTier ? 'Compare / Upgrade Plan (Save 20% Yearly)' : 'Upgrade Plan · From ₦3,000/mo'}
              </button>
            </div>
            <div className="vendor-plan-quotas">
              <div>
                <small>Product catalog</small>
                <b>{myProducts.length} / {entitlements.maxProducts === null ? 'Unlimited' : entitlements.maxProducts}</b>
              </div>
              <div>
                <small>Active coupons</small>
                <b>
                  {entitlements.maxActiveCoupons === 0
                    ? 'Locked (Starter+)'
                    : `${activeCouponsCount} / ${entitlements.maxActiveCoupons === null ? 'Unlimited' : entitlements.maxActiveCoupons}`}
                </b>
              </div>
              <div>
                <small>Product media</small>
                <b>
                  Up to {entitlements.maxProductImages} photos · {entitlements.allowProductVideos ? 'Videos on' : 'No video'}
                </b>
              </div>
              <div>
                <small>Affiliate recruitment</small>
                <b>
                  {entitlements.maxAffiliateCommissionPercent === 0
                    ? 'Locked (Plus+)'
                    : `Up to ${entitlements.maxAffiliateCommissionPercent}%`}
                </b>
              </div>
              <div>
                <small>Storefront &amp; exports</small>
                <b>
                  {entitlements.allowCoverBanner ? 'Cover + CSV' : 'Icon only (No CSV)'}
                </b>
              </div>
            </div>
          </section>

          {activeTab === 'overview' && (
            <>
              {!vendor.isVerified && (
                <section className="panel verify-overview-callout">
                  <div className="verify-overview-copy">
                    <span className="eyebrow">UNLOCK PAID VENDOR TOOLS &amp; BLUE TICK</span>
                    <h3>Verify {vendor.shopName} — Starter from ₦3,000/month (₦28,800/year · Save 20%)</h3>
                    <p>
                      Free shops are limited to 5 products with no coupons, discounts, or cover banner. Upgrade to <b>Starter</b> (₦3,000/mo), <b>Plus</b>, <b>Premium</b>, or <b>Pro Max</b>, attach your CAC &amp; National ID, and unlock full seller tools plus your blue verified tick.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => setActiveTab('verification')}
                  >
                    <ShieldCheck size={16} /> Compare Plans &amp; Verify
                  </button>
                </section>
              )}

              <div className="seller-overview-grid">
                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <span className="eyebrow">SALES ANALYTICS</span>
                      <h2>Performance by period</h2>
                      <p>Calculated from verified orders containing your products.</p>
                    </div>
                  </div>
                  <div className="profit-cal-tabs seller-period-tabs" role="tablist" aria-label="Sales report period">
                    {(['day', 'week', 'month', 'year'] as const).map(period => {
                      const allowed = isAdmin || entitlements.analyticsPeriods.includes(period);
                      const label =
                        period === 'day'
                          ? 'Today'
                          : period === 'week'
                            ? 'This week'
                            : period === 'month'
                              ? 'This month'
                              : 'This year';
                      return (
                        <button
                          key={period}
                          type="button"
                          className={(effectiveAnalyticsPeriod === period ? 'active' : '') + (!allowed ? ' is-locked-tab' : '')}
                          onClick={() => {
                            if (!allowed) {
                              setLockedPeriodNotice(
                                period === 'year'
                                  ? 'Full-year analytics unlock on Plus (₦5,000/mo), Premium, and Pro Max.'
                                  : 'Weekly & monthly analytics unlock on Starter (₦3,000/mo) and above.'
                              );
                              return;
                            }
                            setLockedPeriodNotice('');
                            setAnalyticsPeriod(period);
                          }}
                        >
                          {!allowed && <Lock size={12} />} {label}
                        </button>
                      );
                    })}
                  </div>
                  {lockedPeriodNotice && (
                    <div className="vendor-gate-inline">
                      <Lock size={14} />
                      <span>{lockedPeriodNotice}</span>
                      <button type="button" className="secondary-btn" onClick={() => setActiveTab('verification')}>
                        Upgrade plan
                      </button>
                    </div>
                  )}
                  <div className="seller-metric-grid tabular-nums">
                    <div>
                      <small>Orders</small>
                      <b>{vendorReports?.[effectiveAnalyticsPeriod]?.orders || 0}</b>
                    </div>
                    <div>
                      <small>Units sold</small>
                      <b>{vendorReports?.[effectiveAnalyticsPeriod]?.unitsSold || 0}</b>
                    </div>
                    <div>
                      <small>Gross sales</small>
                      <b>{money(vendorReports?.[effectiveAnalyticsPeriod]?.grossSales || 0)}</b>
                    </div>
                    <div>
                      <small>Completed earnings</small>
                      <strong>{money(vendorReports?.[effectiveAnalyticsPeriod]?.completedEarnings || 0)}</strong>
                    </div>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <span className="eyebrow">REVENUE LEDGER</span>
                      <h2>Earnings &amp; fee breakdown</h2>
                      <p>Exact deduction summary for completed vendor sales.</p>
                    </div>
                    <button type="button" className="secondary-btn" onClick={() => setActiveTab('payouts')}>
                      Withdraw <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="seller-ledger-rows tabular-nums">
                    <div>
                      <span>Completed gross sales</span>
                      <b>{money(wallet?.gross || 0)}</b>
                    </div>
                    <div>
                      <span>Marketplace commission</span>
                      <b className="ledger-deduction">−{money(wallet?.marketplaceCommission || 0)}</b>
                    </div>
                    <div>
                      <span>Affiliate commission</span>
                      <b className="ledger-deduction">−{money(wallet?.affiliateCommission || 0)}</b>
                    </div>
                    <div>
                      <span>Payment gateway fees</span>
                      <b className="ledger-deduction">−{money(wallet?.paymentGatewayFees || 0)}</b>
                    </div>
                    <div className="ledger-net-row">
                      <span>Available earnings to withdraw</span>
                      <strong>{money(wallet?.available || 0)}</strong>
                    </div>
                  </div>
                </section>
              </div>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">PRODUCT INTELLIGENCE · PREMIUM &amp; PRO MAX</span>
                    <h2>Top performing products by revenue</h2>
                    <p>Identify your highest-earning items across customer orders.</p>
                  </div>
                  {(isAdmin || entitlements.allowCsvExport) && (
                    <button type="button" className="secondary-btn" onClick={exportOrdersCsv}>
                      <Download size={14} /> Export Orders CSV
                    </button>
                  )}
                </div>
                {!(isAdmin || entitlements.allowTopProductsAnalytics) ? (
                  <div className="vendor-locked-card">
                    <Award size={26} />
                    <div>
                      <b>Unlock Top Product Revenue Analytics on Premium &amp; Pro Max</b>
                      <small>
                        See your top-earning products, unit velocity, and revenue share on Premium (₦8,500/mo) and Pro Max (₦15,000/mo) — save 20% with 1-Year Annual billing.
                      </small>
                    </div>
                    <button type="button" className="primary-btn" onClick={() => setActiveTab('verification')}>
                      Upgrade to Premium
                    </button>
                  </div>
                ) : topProductsByRevenue.length ? (
                  <div className="compact-order-list tabular-nums">
                    {topProductsByRevenue.map((item, idx) => (
                      <div className="manage-row" key={item.name + idx}>
                        <div className="manage-main">
                          <b>#{idx + 1} · {item.name}</b>
                          <small>{item.units} unit{item.units === 1 ? '' : 's'} ordered</small>
                        </div>
                        <strong>{money(item.revenue)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-empty compact">
                    <TrendingUp size={24} />
                    <b>No product sales recorded yet</b>
                    <small>Top-selling items appear here once customers place orders.</small>
                  </div>
                )}
              </section>

              <div className="seller-overview-grid">
                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <span className="eyebrow">RECENT ACTIVITY</span>
                      <h2>Latest customer orders</h2>
                    </div>
                    <button type="button" className="secondary-btn" onClick={() => setActiveTab('orders')}>
                      All orders ({orders.length})
                    </button>
                  </div>
                  {sortedOrders.length ? (
                    <div className="compact-order-list">
                      {sortedOrders.slice(0, 5).map(o => (
                        <div className="manage-row tabular-nums" key={o.id}>
                          <div className="manage-main">
                            <b>{o.orderNumber} · {o.customerName}</b>
                            <small>
                              {o.items.map(i => `${i.name} × ${i.quantity}`).join(', ')} ·{' '}
                              {new Date(o.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            </small>
                          </div>
                          <span className={'status ' + (o.status === 'Completed' ? 'approved' : '')}>{o.status}</span>
                          <b>{money(o.vendorTotal || o.items.reduce((sum, i) => sum + i.price * i.quantity, 0))}</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chart-empty compact">
                      <Package size={26} />
                      <b>No customer orders yet</b>
                      <small>Incoming purchases for your products appear here automatically.</small>
                    </div>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <span className="eyebrow">STOREFRONT INVENTORY</span>
                      <h2>Your products</h2>
                    </div>
                    <button type="button" className="secondary-btn" onClick={() => setActiveTab('products')}>
                      Manage catalog ({myProducts.length})
                    </button>
                  </div>
                  {myProducts.length ? (
                    <div className="seller-scroll-panel">
                      {myProducts.slice(0, 6).map(p => (
                        <div className="manage-row tabular-nums" key={p.id}>
                          <div className="mini-product">
                            {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <Package size={18} />}
                          </div>
                          <div className="manage-main">
                            <b>{p.name}</b>
                            <small>
                              {money(p.price)} · Stock {p.stock} · {p.status}
                            </small>
                          </div>
                          <button type="button" onClick={() => handleEditProduct(p)}>Edit</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chart-empty compact">
                      <ShoppingBag size={26} />
                      <b>No products listed yet</b>
                      <small>Publish your first digital or physical listing to start selling.</small>
                      <button type="button" className="primary-btn" onClick={openNewProductEditor}>
                        <Plus size={15} /> Publish first product
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {activeTab === 'products' && (
            <>
              <section className="panel" id="product-editor">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">PRODUCT STUDIO · {entitlements.planName.toUpperCase()}</span>
                    <h2>{editing ? 'Edit product listing' : 'Publish a new product'}</h2>
                    <p className="tabular-nums">
                      Catalog usage: <b>{myProducts.length} / {entitlements.maxProducts === null ? 'Unlimited' : entitlements.maxProducts}</b> products · Up to {entitlements.maxProductImages} photos{entitlements.allowProductVideos ? ' + promo videos' : ' (videos on Plus+)'}.
                    </p>
                  </div>
                  {editing && (
                    <button type="button" className="secondary-btn" onClick={startNewProduct}>
                      Cancel edit
                    </button>
                  )}
                </div>

                {productLimitReached && (
                  <div className="vendor-locked-card" role="alert">
                    <Lock size={24} />
                    <div>
                      <b>Catalog limit reached on {entitlements.planName} ({myProducts.length}/{entitlements.maxProducts})</b>
                      <small>
                        {entitlements.planId === 'free'
                          ? 'Free shops can publish up to 5 products. Upgrade to Starter (₦3,000/mo · 20 products), Plus (60), Premium (200), or Pro Max (Unlimited).'
                          : `Upgrade to the next verification tier in Verify Shop to unlock more listings.`}
                      </small>
                    </div>
                    <button type="button" className="primary-btn" onClick={() => setActiveTab('verification')}>
                      Upgrade plan
                    </button>
                  </div>
                )}

                <form className="product-form" onSubmit={saveProduct}>
                  <label>
                    Product name
                    <input
                      required
                      disabled={productLimitReached}
                      value={draft.name}
                      onChange={e => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </label>
                  <label>
                    Category
                    <select disabled={productLimitReached} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>
                      {categories.filter(x => x !== 'All').map(x => <option key={x}>{x}</option>)}
                    </select>
                  </label>
                  <label>
                    Standard price (₦)
                    <input
                      required
                      disabled={productLimitReached}
                      type="number"
                      min="1"
                      value={draft.price}
                      onChange={e => setDraft({ ...draft, price: e.target.value })}
                    />
                  </label>
                  <label>
                    Discount method {!isAdmin && !entitlements.allowProductDiscounts && '(Starter+)'}
                    <select
                      disabled={productLimitReached || (!isAdmin && !entitlements.allowProductDiscounts)}
                      value={!isAdmin && !entitlements.allowProductDiscounts ? 'none' : draft.discountMode}
                      onChange={e => setDraft({ ...draft, discountMode: e.target.value, discountValue: '' })}
                    >
                      <option value="none">No discount</option>
                      <option value="manual">Enter discount price</option>
                      <option value="percentage">Enter discount percentage</option>
                    </select>
                    {!isAdmin && !entitlements.allowProductDiscounts && (
                      <small className="verify-inline-warn">Product sale discounts unlock on Starter (₦3,000/mo).</small>
                    )}
                  </label>
                  {(isAdmin || entitlements.allowProductDiscounts) && draft.discountMode !== 'none' && (
                    <label>
                      {draft.discountMode === 'manual' ? 'Discount price (₦)' : 'Discount percentage (%)'}
                      <input
                        required
                        type="number"
                        min="1"
                        max={draft.discountMode === 'percentage' ? 99 : undefined}
                        step="1"
                        value={draft.discountValue}
                        onChange={e => setDraft({ ...draft, discountValue: e.target.value })}
                      />
                      <small>
                        {draft.discountMode === 'manual'
                          ? 'Enter the exact sale price (lower than standard price).'
                          : 'Sale price will be calculated automatically.'}
                      </small>
                    </label>
                  )}
                  {(isAdmin || entitlements.allowProductDiscounts) && draft.discountMode !== 'none' && (
                    <>
                      <label>
                        Discount starts {!isAdmin && !entitlements.allowScheduledFlashSales ? '(Plus+)' : '(optional)'}
                        <input
                          type="datetime-local"
                          disabled={!isAdmin && !entitlements.allowScheduledFlashSales}
                          value={draft.discountStartAt}
                          onChange={e => setDraft({ ...draft, discountStartAt: e.target.value })}
                        />
                        {!isAdmin && !entitlements.allowScheduledFlashSales && (
                          <small className="verify-inline-warn">Timed flash-sale scheduler unlocks on Plus (₦5,000/mo).</small>
                        )}
                      </label>
                      <label>
                        Discount ends {!isAdmin && !entitlements.allowScheduledFlashSales ? '(Plus+)' : '(optional)'}
                        <input
                          type="datetime-local"
                          disabled={!isAdmin && !entitlements.allowScheduledFlashSales}
                          value={draft.discountEndAt}
                          onChange={e => setDraft({ ...draft, discountEndAt: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Available stock
                    <input
                      required
                      disabled={productLimitReached}
                      type="number"
                      min="0"
                      value={draft.stock}
                      onChange={e => setDraft({ ...draft, stock: e.target.value })}
                    />
                  </label>
                  <label>
                    Product label
                    <input
                      disabled={productLimitReached}
                      value={draft.tag}
                      onChange={e => setDraft({ ...draft, tag: e.target.value })}
                      placeholder="New / Popular / Sale"
                    />
                  </label>
                  <label>
                    Options / variations
                    <input
                      disabled={productLimitReached}
                      value={draft.options}
                      onChange={e => setDraft({ ...draft, options: e.target.value })}
                      placeholder="Small, Medium, Large or Basic, Pro"
                    />
                  </label>
                  <label>
                    Affiliate commission (%) {!isAdmin && entitlements.maxAffiliateCommissionPercent === 0 && '(Plus+)'}
                    <input
                      type="number"
                      required
                      min="0"
                      max={isAdmin ? 25 : entitlements.maxAffiliateCommissionPercent}
                      step="1"
                      disabled={productLimitReached || (!isAdmin && entitlements.maxAffiliateCommissionPercent === 0)}
                      value={!isAdmin && entitlements.maxAffiliateCommissionPercent === 0 ? '0' : draft.affiliateCommissionPercent}
                      onChange={e => setDraft({ ...draft, affiliateCommissionPercent: e.target.value })}
                    />
                    <small>
                      {isAdmin || entitlements.maxAffiliateCommissionPercent >= 25
                        ? 'Choose 0% to disable affiliate payouts, or 5%–25% for partner promotions.'
                        : entitlements.maxAffiliateCommissionPercent > 0
                          ? `Plus supports 0% or 5%–${entitlements.maxAffiliateCommissionPercent}%. Upgrade to Premium/Pro Max for up to 25%.`
                          : 'Affiliate partner recruitment unlocks on Plus (up to 15%) and Premium/Pro Max (up to 25%).'}
                    </small>
                  </label>
                  {isAdmin && (
                    <label>
                      Marketplace commission (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={draft.marketplaceCommissionPercent}
                        onChange={e => setDraft({ ...draft, marketplaceCommissionPercent: e.target.value })}
                        placeholder={'Use marketplace default: ' + (settings?.commissionPercent ?? 8) + '%'}
                      />
                      <small>Owner only. Leave blank to use {settings?.commissionPercent ?? 8}% default.</small>
                    </label>
                  )}
                  <label className="full-field">
                    Description
                    <textarea
                      required
                      disabled={productLimitReached}
                      rows={3}
                      value={draft.description}
                      onChange={e => setDraft({ ...draft, description: e.target.value })}
                      placeholder="Describe the product clearly"
                    />
                  </label>
                  <label className="full-field upload-field">
                    <span>
                      <ImagePlus /> Product {isAdmin || entitlements.allowProductVideos ? 'images and videos' : 'images'} (optional when editing)
                    </span>
                    <input
                      type="file"
                      multiple
                      disabled={productLimitReached}
                      accept={isAdmin || entitlements.allowProductVideos ? 'image/*,video/mp4,video/webm,video/quicktime' : 'image/*'}
                      onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <small>
                      {entitlements.planName}: up to {entitlements.maxProductImages} images (max 8MB each)
                      {isAdmin || entitlements.allowProductVideos
                        ? ' and promo videos up to 30MB each.'
                        : ' · Promo video uploads unlock on Plus (₦5,000/mo).'}
                    </small>
                    {selectedFiles.length > 0 && <b>{selectedFiles.length} new file(s) selected</b>}
                    {draft.images.length + draft.videos.length > 0 && (
                      <small>{draft.images.length} saved image(s), {draft.videos.length} saved video(s)</small>
                    )}
                  </label>
                  {editing && draft.id && (
                    <div className="full-field product-media-editor">
                      <b>Current product photos</b>
                      <div className="product-media-edit-grid">
                        {(products.find(p => p.id === draft.id)?.images || []).map((src, index) => (
                          <div className="product-media-edit-item" key={draft.images[index] || index}>
                            <img src={src} alt={'Product photo ' + (index + 1)} />
                            <button
                              type="button"
                              className="danger-icon"
                              onClick={() =>
                                setDraft(current => ({
                                  ...current,
                                  images: current.images.filter((_, i) => i !== index)
                                }))
                              }
                            >
                              Remove photo
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="primary-btn" disabled={busy || productLimitReached}>
                    {busy ? 'Saving product...' : editing ? 'Save changes' : 'Publish product'}{' '}
                    <UploadCloud size={17} />
                  </button>
                </form>
              </section>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">CATALOG INVENTORY</span>
                    <h2>My shop products ({myProducts.length})</h2>
                    <p>Search, filter, update pricing, or remove items in your catalog.</p>
                  </div>
                </div>

                <div className="admin-order-toolbar">
                  <label className="admin-inline-search">
                    <Search size={15} />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search your products by name or category..."
                    />
                  </label>
                  <select
                    className="compact-stage-select"
                    aria-label="Filter vendor products by category"
                    value={productCategoryFilter}
                    onChange={e => setProductCategoryFilter(e.target.value)}
                  >
                    <option value="All">All categories</option>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="profit-cal-tabs" role="tablist" aria-label="Filter products by status">
                    {(['all', 'approved', 'pending', 'rejected'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        className={productStatusFilter === st ? 'active' : ''}
                        onClick={() => setProductStatusFilter(st)}
                      >
                        {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredProducts.length ? (
                  <div className="seller-scroll-panel">
                    {filteredProducts.map(p => (
                      <div className="manage-row tabular-nums" key={p.id}>
                        <div className="mini-product">
                          {p.images?.[0] ? <img src={p.images[0]} alt={p.name} /> : <Package size={18} />}
                        </div>
                        <div className="manage-main">
                          <b>{p.name}</b>
                          <small>
                            {p.category} ·{' '}
                            {p.discountActive
                              ? `${money(p.price)} sale (was ${money(p.standardPrice || p.price)})`
                              : money(p.price)}{' '}
                            · Stock {p.stock} · Affiliate {Number(p.affiliateCommissionPercent ?? 0)}%
                          </small>
                        </div>
                        <span className={'status ' + (p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending')}>
                          {p.status}
                        </span>
                        <button type="button" onClick={() => handleEditProduct(p)}>Edit</button>
                        <button type="button" className="danger-icon" onClick={() => void deleteProduct(p.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-empty compact">
                    <ShoppingBag size={26} />
                    <b>No matching products</b>
                    <small>Adjust your search filters or publish a new product above.</small>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'orders' && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">CUSTOMER FULFILMENT LEDGER</span>
                  <h2>My customer orders ({orders.length})</h2>
                  <p>View customer and delivery details. Only marketplace operations can approve, ship, or complete order stages.</p>
                </div>
                <div className="seller-header-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={exportOrdersCsv}
                  >
                    {isAdmin || entitlements.allowCsvExport ? (
                      <><Download size={14} /> Export CSV</>
                    ) : (
                      <><Lock size={14} /> Export CSV (Starter+)</>
                    )}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => void refreshVendor()}>
                    Refresh orders
                  </button>
                </div>
              </div>

              <div className="admin-order-toolbar">
                <label className="admin-inline-search">
                  <Search size={15} />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    placeholder="Search orders by #, customer name, phone or product..."
                  />
                </label>
                <div className="profit-cal-tabs" role="tablist" aria-label="Filter vendor orders">
                  {([
                    ['all', `All (${orders.length})`],
                    ['active', `Active (${activeOrdersCount})`],
                    ['completed', `Closed (${orders.length - activeOrdersCount})`]
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={orderStageFilter === key ? 'active' : ''}
                      onClick={() => setOrderStageFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length ? (
                <div className="compact-order-list">
                  {filteredOrders.map(o => {
                    const isExpanded = Boolean(expandedOrderIds[o.id]);
                    const vendorAmount = Number(
                      o.vendorTotal || o.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
                    );
                    const totalQty = o.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
                    return (
                      <article className={'compact-order-row' + (isExpanded ? ' is-expanded' : '')} key={o.id}>
                        <div className="compact-order-head">
                          <div className="compact-order-primary">
                            <div className="compact-order-id-line">
                              <b className="tabular-nums">{o.orderNumber}</b>
                              <span
                                className={
                                  'status ' +
                                  (o.status === 'Completed'
                                    ? 'approved'
                                    : ['Cancelled', 'Refunded', 'Returned'].includes(o.status)
                                      ? 'rejected'
                                      : '')
                                }
                              >
                                {o.status}
                              </span>
                            </div>
                            <small>
                              {o.customerName} · {totalQty} item{totalQty === 1 ? '' : 's'} · {o.paymentMethod} ·{' '}
                              {new Date(o.createdAt).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </small>
                          </div>
                          <div className="compact-order-controls">
                            <strong className="compact-order-amount tabular-nums">{money(vendorAmount)}</strong>
                            <button
                              type="button"
                              className="secondary-btn compact-expand-btn"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpandedOrderIds(current => ({ ...current, [o.id]: !current[o.id] }))
                              }
                            >
                              {isExpanded ? <>Hide <ChevronUp size={15} /></> : <>Details <ChevronDown size={15} /></>}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="compact-order-details">
                            <div className="order-history-items">
                              <b>Your items in this order</b>
                              {o.items.map((item, idx) => (
                                <div className="manage-row" key={item.productId + '-' + idx}>
                                  <div className="manage-main">
                                    <b>{item.name} × {item.quantity}</b>
                                    <small>{money(item.price)} each{item.option ? ' · ' + item.option : ''}</small>
                                  </div>
                                  <b className="tabular-nums">{money(item.price * item.quantity)}</b>
                                </div>
                              ))}
                            </div>
                            <div className="order-info-grid">
                              <div><small>Customer name</small><b>{o.customerName || 'Not provided'}</b></div>
                              <div><small>Phone / WhatsApp</small><b>{o.phone || 'Not provided'}</b></div>
                              <div><small>Email</small><b>{o.email || 'Not provided'}</b></div>
                              <div><small>Delivery address / notes</small><b>{o.address || 'Not provided'}</b></div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="chart-empty compact">
                  <Package size={27} />
                  <b>{orders.length ? 'No matching customer orders' : 'No customer orders yet'}</b>
                  <small>Orders containing your products will appear here once customers check out.</small>
                </div>
              )}
            </section>
          )}

          {activeTab === 'coupons' && (
            <section className="panel" id="vendor-coupons">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">PROMOTIONS &amp; DISCOUNTS</span>
                  <h2>My product coupons</h2>
                  <p>
                    {entitlements.maxActiveCoupons === 0
                      ? 'Checkout discount codes unlock starting on Starter (₦3,000/month).'
                      : `Create discount codes customers can apply at checkout (${activeCouponsCount} / ${entitlements.maxActiveCoupons === null ? 'Unlimited' : entitlements.maxActiveCoupons} active).`}
                  </p>
                </div>
                {entitlements.maxActiveCoupons !== 0 && (
                  <span className="verify-paid-callout tabular-nums">
                    {activeCouponsCount} / {entitlements.maxActiveCoupons === null ? 'Unlimited' : entitlements.maxActiveCoupons} active
                  </span>
                )}
              </div>

              {!isAdmin && entitlements.maxActiveCoupons === 0 ? (
                <div className="vendor-locked-card">
                  <Lock size={26} />
                  <div>
                    <b>Checkout coupons are locked on Free Shop</b>
                    <small>
                      Upgrade to <b>Starter (₦3,000/mo · 3 coupons)</b>, <b>Plus (15 coupons)</b>, <b>Premium (50 coupons)</b>, or <b>Pro Max (Unlimited)</b> — save 20% with a 1-Year Annual plan.
                    </small>
                  </div>
                  <button type="button" className="primary-btn" onClick={() => setActiveTab('verification')}>
                    <ShieldCheck size={15} /> Unlock Coupons on Starter
                  </button>
                </div>
              ) : (
                <>
                  {couponLimitReached && (
                    <div className="vendor-gate-inline">
                      <Lock size={14} />
                      <span>
                        Active coupon cap reached ({activeCouponsCount}/{entitlements.maxActiveCoupons}) on {entitlements.planName}. Deactivate an old coupon or upgrade.
                      </span>
                      <button type="button" className="secondary-btn" onClick={() => setActiveTab('verification')}>
                        Upgrade plan
                      </button>
                    </div>
                  )}
                  <form className="product-form" onSubmit={saveVendorCoupon}>
                    <label>
                      Coupon code
                      <input
                        required
                        disabled={couponLimitReached}
                        minLength={3}
                        maxLength={32}
                        value={couponDraft.code}
                        onChange={e =>
                          setCouponDraft({
                            ...couponDraft,
                            code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                          })
                        }
                        placeholder="e.g. SAVE10"
                      />
                    </label>
                    <label>
                      Discount type
                      <select
                        disabled={couponLimitReached}
                        value={couponDraft.discountType}
                        onChange={e => setCouponDraft({ ...couponDraft, discountType: e.target.value })}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed amount (₦)</option>
                      </select>
                    </label>
                    <label>
                      Discount value
                      <input
                        required
                        disabled={couponLimitReached}
                        type="number"
                        min="1"
                        max={couponDraft.discountType === 'percentage' ? 100 : 10000000}
                        value={couponDraft.discountValue}
                        onChange={e => setCouponDraft({ ...couponDraft, discountValue: e.target.value })}
                      />
                    </label>
                    <label>
                      Products covered
                      <select
                        multiple
                        disabled={couponLimitReached}
                        value={couponDraft.productIds}
                        onChange={e =>
                          setCouponDraft({
                            ...couponDraft,
                            productIds: Array.from(e.target.selectedOptions).map(option => option.value)
                          })
                        }
                      >
                        {myProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <small>Leave unselected to apply to all your products.</small>
                    </label>
                    <label>
                      Minimum order amount (₦)
                      <input
                        type="number"
                        disabled={couponLimitReached}
                        min="0"
                        value={couponDraft.minOrderAmount}
                        onChange={e => setCouponDraft({ ...couponDraft, minOrderAmount: e.target.value })}
                        placeholder="0 = no minimum"
                      />
                    </label>
                    <label>
                      Maximum discount (₦)
                      <input
                        type="number"
                        disabled={couponLimitReached}
                        min="0"
                        value={couponDraft.maxDiscount}
                        onChange={e => setCouponDraft({ ...couponDraft, maxDiscount: e.target.value })}
                        placeholder="0 = no cap"
                      />
                    </label>
                    <label>
                      Maximum uses
                      <input
                        type="number"
                        disabled={couponLimitReached}
                        min="0"
                        step="1"
                        value={couponDraft.usageLimit}
                        onChange={e => setCouponDraft({ ...couponDraft, usageLimit: e.target.value })}
                      />
                      <small>Enter 0 for unlimited uses.</small>
                    </label>
                    <label>
                      Starts at (optional)
                      <input
                        type="datetime-local"
                        disabled={couponLimitReached}
                        value={couponDraft.startsAt}
                        onChange={e => setCouponDraft({ ...couponDraft, startsAt: e.target.value })}
                      />
                    </label>
                    <label>
                      Expiry date and time
                      <input
                        required
                        disabled={couponLimitReached}
                        type="datetime-local"
                        value={couponDraft.expiresAt}
                        onChange={e => setCouponDraft({ ...couponDraft, expiresAt: e.target.value })}
                      />
                    </label>
                    <button className="primary-btn" disabled={busy || couponLimitReached}>
                      {busy ? 'Creating coupon...' : 'Create coupon'}
                    </button>
                  </form>
                </>
              )}

              <h3>Coupons you created ({vendorCoupons.length})</h3>
              {vendorCoupons.length ? (
                <div className="seller-scroll-panel">
                  {vendorCoupons.map(coupon => {
                    const isExpired = new Date(coupon.expiresAt).getTime() <= Date.now();
                    return (
                      <div className="manage-row tabular-nums" key={coupon.id}>
                        <div className="manage-main">
                          <b>
                            {coupon.code} ·{' '}
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : money(Number(coupon.discountValue))}{' '}
                            off
                          </b>
                          <small>
                            Expires {new Date(coupon.expiresAt).toLocaleString()} · Used {coupon.usedCount || 0}
                            {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''} ·{' '}
                            {coupon.productIds?.length ? `${coupon.productIds.length} product(s)` : 'All shop products'}
                          </small>
                        </div>
                        <span className={'status ' + (coupon.status === 'active' && !isExpired ? 'approved' : 'suspended')}>
                          {isExpired ? 'expired' : coupon.status}
                        </span>
                        {coupon.status === 'active' && !isExpired && (
                          <button type="button" className="secondary-btn" onClick={() => void updateVendorCoupon(coupon.id, 'inactive')}>
                            Deactivate
                          </button>
                        )}
                        {coupon.status === 'inactive' && !isExpired && (
                          <button type="button" className="secondary-btn" onClick={() => void updateVendorCoupon(coupon.id, 'active')}>
                            Activate
                          </button>
                        )}
                        <button type="button" className="danger-icon" onClick={() => void deleteVendorCoupon(coupon.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">You have not created any coupons yet.</p>
              )}
            </section>
          )}

          {activeTab === 'payouts' && (
            <div className="seller-overview-grid">
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">BANK SETTLEMENT</span>
                    <h2>Request sales withdrawal</h2>
                    <p>Available earnings: <b className="tabular-nums">{money(wallet?.available || 0)}</b></p>
                  </div>
                  <button type="button" className="secondary-btn" onClick={() => void openWallet()}>
                    Open Wallet
                  </button>
                </div>

                <div className="seller-ledger-rows tabular-nums">
                  <div><span>Spendable wallet balance</span><b>{money(wallet?.walletBalance || 0)}</b></div>
                  <div><span>Completed gross sales</span><b>{money(wallet?.gross || 0)}</b></div>
                  <div><span>Marketplace commission</span><b className="ledger-deduction">−{money(wallet?.marketplaceCommission || 0)}</b></div>
                  <div><span>Affiliate commission</span><b className="ledger-deduction">−{money(wallet?.affiliateCommission || 0)}</b></div>
                  <div><span>Payment gateway fees</span><b className="ledger-deduction">−{money(wallet?.paymentGatewayFees || 0)}</b></div>
                  <div className="ledger-net-row"><span>Available to withdraw</span><strong>{money(wallet?.available || 0)}</strong></div>
                </div>

                <form className="product-form" onSubmit={requestWithdrawal}>
                  <label>
                    Withdrawal amount (₦)
                    <input
                      type="number"
                      min="1"
                      required
                      value={withdrawForm.amount}
                      onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    />
                  </label>
                  <label>
                    Bank name
                    <input
                      required
                      value={withdrawForm.bankName}
                      onChange={e => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                    />
                  </label>
                  <label>
                    10-digit account number
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={withdrawForm.accountNumber}
                      onChange={e => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                    />
                  </label>
                  <label>
                    Account name
                    <input
                      required
                      value={withdrawForm.accountName}
                      onChange={e => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                    />
                  </label>
                  <div className="full-field checkout-note">
                    Net earnings exclude marketplace commission, affiliate payouts, and Paystack processing fees. Withdrawal fee:{' '}
                    <b className="tabular-nums">{money(wallet?.withdrawalFee ?? settings?.withdrawalFee ?? 100)}</b>. Owner approval required.
                  </div>
                  <button className="primary-btn">Request withdrawal</button>
                </form>
              </section>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <span className="eyebrow">PAYOUT LEDGER</span>
                    <h2>Withdrawal history ({(wallet?.withdrawals || []).length})</h2>
                    <p>Track all submitted bank transfer requests from your store sales.</p>
                  </div>
                </div>
                {(wallet?.withdrawals || []).length ? (
                  <div className="seller-scroll-panel">
                    {(wallet?.withdrawals || []).map((w: any) => (
                      <div className="manage-row tabular-nums" key={w.id}>
                        <div className="manage-main">
                          <b>{money(w.amount)} requested · Net {money(w.netAmount)}</b>
                          <small>
                            {w.bankName} · {w.accountNumber} · Fee {money(w.fee)}
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
                    <CheckCircle2 size={26} />
                    <b>No withdrawal requests yet</b>
                    <small>Your submitted sales payout requests will appear here with status updates.</small>
                  </div>
                )}
              </section>
            </div>
          )}
          {activeTab === 'shop' && (
            <section className="panel shop-profile-editor-panel" id="vendor-shop-profile">
              <div className="panel-title">
                <div>
                  <span className="eyebrow">STOREFRONT BRANDING &amp; IDENTITY</span>
                  <h2 className="shop-title-verified-row">
                    <span>Edit shop profile, icon &amp; cover banner</span>
                    <VerifiedShopBadge
                      verified={vendor.isVerified}
                      tierId={vendor.verificationTier}
                      size="md"
                      showLabel
                    />
                  </h2>
                  <p>Customize how customers see your storefront when browsing Vendor Shops and following your brand.</p>
                </div>
                <div className="seller-header-actions">
                  <button type="button" className="secondary-btn" onClick={() => setActiveTab('verification')}>
                    <ShieldCheck size={15} /> {vendor.isVerified ? 'Verification status' : 'Verify shop & get Blue Tick'}
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => openPublicShop(vendor.id)}>
                    <Store size={15} /> Preview public storefront
                  </button>
                </div>
              </div>

              <div className="shop-media-editor-grid">
                <div className="shop-media-card">
                  <div className="shop-media-card-head">
                    <div>
                      <b>Shop cover picture {!isAdmin && !entitlements.allowCoverBanner && '(Starter+)'}</b>
                      <small>Wide banner shown at the top of your shop storefront and directory card (JPG, PNG or WebP · up to 8MB)</small>
                    </div>
                  </div>
                  <div className="shop-cover-preview-frame">
                    <ShopCoverBanner shopName={vendorProfileForm.shopName || vendor.shopName} coverUrl={vendor.coverUrl} height="card" />
                  </div>
                  {!isAdmin && !entitlements.allowCoverBanner ? (
                    <div className="vendor-gate-inline">
                      <Lock size={14} />
                      <span>Custom cover banners unlock on Starter (₦3,000/mo or ₦28,800/yr). Shop icon uploads are free.</span>
                      <button type="button" className="secondary-btn" onClick={() => setActiveTab('verification')}>
                        Unlock on Starter
                      </button>
                    </div>
                  ) : (
                    <div className="shop-media-card-actions">
                      <label className="secondary-btn shop-upload-btn">
                        <ImagePlus size={15} />
                        <span>{shopMediaBusy === 'cover' ? 'Uploading cover...' : vendor.coverUrl ? 'Change cover image' : 'Upload cover image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={Boolean(shopMediaBusy)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadVendorShopMedia('cover', file);
                          }}
                        />
                      </label>
                      {vendor.coverUrl && (
                        <button
                          type="button"
                          className="danger-icon"
                          disabled={Boolean(shopMediaBusy)}
                          onClick={() => void clearVendorShopMedia('cover')}
                        >
                          <Trash2 size={14} /> Remove cover
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="shop-media-card">
                  <div className="shop-media-card-head">
                    <div>
                      <b>Shop icon / logo</b>
                      <small>Square brand avatar displayed on your storefront, cards, and product pages (JPG, PNG or WebP · up to 8MB)</small>
                    </div>
                  </div>
                  <div className="shop-icon-preview-row">
                    <ShopAvatar shopName={vendorProfileForm.shopName || vendor.shopName} iconUrl={vendor.iconUrl} size="lg" />
                    <div className="shop-media-card-actions">
                      <label className="secondary-btn shop-upload-btn">
                        <ImagePlus size={15} />
                        <span>{shopMediaBusy === 'icon' ? 'Uploading icon...' : vendor.iconUrl ? 'Change shop icon' : 'Upload shop icon'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={Boolean(shopMediaBusy)}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadVendorShopMedia('icon', file);
                          }}
                        />
                      </label>
                      {vendor.iconUrl && (
                        <button
                          type="button"
                          className="danger-icon"
                          disabled={Boolean(shopMediaBusy)}
                          onClick={() => void clearVendorShopMedia('icon')}
                        >
                          <Trash2 size={14} /> Remove icon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form className="product-form" onSubmit={saveVendorProfile}>
                <label>
                  Shop / brand name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={vendorProfileForm.shopName}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, shopName: e.target.value }))}
                    placeholder="e.g. Studio Yakaji Goods"
                  />
                </label>
                <label>
                  Short shop tagline
                  <input
                    maxLength={140}
                    value={vendorProfileForm.tagline}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, tagline: e.target.value }))}
                    placeholder="e.g. Curated design kits, courses & digital templates"
                  />
                </label>
                <label>
                  Primary specialty / category
                  <select
                    value={vendorProfileForm.specialty}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, specialty: e.target.value }))}
                  >
                    <option value="">General Marketplace</option>
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Business phone
                  <input
                    required
                    type="tel"
                    maxLength={30}
                    value={vendorProfileForm.phone}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, phone: e.target.value }))}
                    placeholder="+234..."
                  />
                </label>
                <label>
                  WhatsApp number (optional)
                  <input
                    type="tel"
                    maxLength={30}
                    value={vendorProfileForm.whatsapp}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, whatsapp: e.target.value }))}
                    placeholder="+234..."
                  />
                </label>
                <label>
                  City
                  <input
                    maxLength={80}
                    value={vendorProfileForm.city}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, city: e.target.value }))}
                    placeholder="e.g. Lagos, Abuja, Kano"
                  />
                </label>
                <label>
                  State
                  <input
                    maxLength={80}
                    value={vendorProfileForm.state}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, state: e.target.value }))}
                    placeholder="e.g. Lagos State, FCT"
                  />
                </label>
                <label>
                  Display location label (optional)
                  <input
                    maxLength={120}
                    value={vendorProfileForm.location}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, location: e.target.value }))}
                    placeholder="e.g. Ikeja, Lagos · Worldwide Digital Delivery"
                  />
                </label>
                <label className="full-field">
                  Shop bio &amp; what you sell
                  <textarea
                    required
                    minLength={5}
                    maxLength={1500}
                    rows={3}
                    value={vendorProfileForm.description}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, description: e.target.value }))}
                    placeholder="Describe your brand, product focus, and customer promise..."
                  />
                </label>
                <label className="full-field">
                  Delivery &amp; return note (shown on storefront)
                  <textarea
                    maxLength={600}
                    rows={2}
                    value={vendorProfileForm.returnPolicy}
                    onChange={(e) => setVendorProfileForm((curr) => ({ ...curr, returnPolicy: e.target.value }))}
                    placeholder="e.g. Instant download delivery or 24-hour dispatch across Nigeria."
                  />
                </label>
                <button className="primary-btn" disabled={shopMediaBusy === 'profile' || busy}>
                  {shopMediaBusy === 'profile' ? 'Saving shop profile...' : 'Save shop profile'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'announcements' && (
            <VendorAnnouncementPanel
              vendorId={vendor.id}
              shopName={vendor.shopName}
              followerCount={Number(vendorFollowerCount || vendor.followerCount || 0)}
              announcements={vendorAnnouncements}
              form={vendorAnnouncementForm}
              setForm={setVendorAnnouncementForm}
              busy={vendorAnnouncementBusy}
              cancellingId={cancellingVendorAnnouncementId}
              onPublish={onPublishVendorAnnouncement}
              onCancel={onCancelVendorAnnouncement}
              onRefresh={onRefreshVendorAnnouncements}
              onOpenPublicShop={() => openPublicShop(vendor.id)}
            />
          )}

          {activeTab === 'verification' && (
            <VendorVerificationWizard
              vendor={vendor}
              verification={verification}
              paystackConfigured={paystackConfigured}
              walletBalance={Number(wallet?.walletBalance ?? 0)}
              money={money}
              onStartPayment={onStartVerificationPayment}
              onVerifyPaystack={onVerifyVerificationPaystack}
              onUploadDocument={onUploadVerificationDocument}
              onSubmitKyc={onSubmitVerificationKyc}
              onRefresh={onRefreshVerification}
              busy={verificationBusy}
              docUploadBusy={verificationDocBusy}
            />
          )}
        </>
      )}
    </main>
  );
}
