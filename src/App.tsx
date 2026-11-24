import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { auth, api, notifications, ws } from './lib/appdeploy-client';
import heroMarketImg from './assets/images/hero_marketplace_hub_1795438758209.jpg';
import heroCoursesImg from './assets/images/hero_online_courses_1795438758229.jpg';
import heroServicesImg from './assets/images/hero_digital_services_1795438758557.jpg';
import heroDealsImg from './assets/images/hero_curated_deals_1795438758085.jpg';
import {
  shopShowcaseCategories,
  extraCategoryPages,
  allCategoryPages,
  resolveCategoryMeta,
  catalogBannerImage,
  CategoryLogoCluster,
  CategoryHighlightIcon
} from './data/categoryShowcase';
import { AdminProfitCalendar } from './components/AdminProfitCalendar';
import { AdminOrderRow, isFulfilledOrderStatus, type AdminOrderPatchPayload } from './components/AdminOrderRow';
import { VendorDashboard } from './components/VendorDashboard';
import { AffiliateDashboard } from './components/AffiliateDashboard';
import {
  ArrowLeft, ArrowRight, Award, BarChart3, Bell, Briefcase, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Code2, Copy, Droplets, GraduationCap, Headphones, Heart, History, Home, ImagePlus, Laptop, LayoutDashboard,
  Lock, LogIn, LogOut, Megaphone, Menu, MessageCircle, MessageSquare, Package,
  PlayCircle, Plus, Search, Share2, ShieldCheck, Shirt, ShoppingBag, Star, Store, Tag,
  Trash2, TrendingUp, Truck, UploadCloud, UserRound, Users, Utensils, Wallet, X, Zap
} from 'lucide-react';

type User = { userId: string; email?: string; name?: string; picture?: string; role?: string; isAdmin?: boolean; redirectTo?: string };
type Media = { path: string; url: string; type: 'image' | 'video' };
type Product = {
  id: string; name: string; category: string; price: number; description: string;
  tag: string; images: string[]; videos: string[]; imagePaths?: string[]; videoPaths?: string[]; stock: number;
  options: string[]; vendorId: string; vendorName: string; status: string; affiliateCommissionPercent?: number; marketplaceCommissionPercent?: number;
  standardPrice?: number; discountPrice?: number; discountPercent?: number; discountActive?: boolean; discountStartAt?: string; discountEndAt?: string;
  averageRating?: number; reviewCount?: number;
};
type Vendor = { id: string; shopName: string; ownerName: string; email: string; phone: string; description: string; status: string; createdAt: string };
type MarketSettings = {customerTransferFee:number;withdrawalFee:number;walletFundingFee:number;commissionPercent:number;cashbackPercent:number};
type Order = {
  id: string; orderNumber: string; customerName: string; phone: string; email: string;
  address: string; paymentMethod: string; items: Array<{ productId: string; name: string; quantity: number; price: number; vendorId: string; option: string }>;
  total: number; subtotal?: number; transferFee?: number; status: string; paymentStatus?: string; paymentNotificationSentAt?: string; paymentCompletedAt?: string; paystackReference?: string; paymentReference?: string; trackingNumber?: string; courier?: string; adminNote?: string; refundStatus?: string; refundedAt?: string; updatedAt?: string; createdAt: string;
};
type ProductDraft = {
  id?: string; name: string; category: string; price: string; description: string;
  stock: string; tag: string; options: string; images: string[]; videos: string[]; affiliateCommissionPercent: string; marketplaceCommissionPercent: string;
  discountMode: string; discountValue: string; discountStartAt: string; discountEndAt: string;
};
const blankDraft: ProductDraft = { name: '', category: 'Digital Products', price: '', description: '', stock: '10', tag: 'New', options: '', images: [], videos: [], affiliateCommissionPercent: '5', marketplaceCommissionPercent: '', discountMode: 'none', discountValue: '', discountStartAt: '', discountEndAt: '' };
const categories = ['Digital Products', 'Electronics', 'Fashion', 'Beauty & Personal Care', 'Home & Living', 'Food & Groceries', 'Digital Courses', 'Social Media', 'Digital Services', 'Other'];
const heroSlides = [
  {
    eyebrow: 'YAKAJI DIGITAL HUB · GLOBAL MARKETPLACE',
    title: 'Discover Curated',
    highlight: 'Digital & Physical',
    ending: 'Products',
    description: 'Shop with confidence across verified digital downloads, online courses, business services, and everyday physical goods from trusted independent vendors.',
    button: 'Start Shopping',
    category: 'All',
    action: 'shop',
    trust: ['Verified Vendors', 'Instant Digital Access', 'Protected Payments'],
    visualTitle: 'SHOP · SELL · GROW',
    visualSubtitle: 'Curated products from verified independent sellers',
    footnote: 'Trusted Marketplace',
    image: heroMarketImg
  },
  {
    eyebrow: 'LEARN · BUILD · SUCCEED',
    title: 'Advance Your',
    highlight: 'Skills with',
    ending: 'Expert Courses',
    description: 'Master practical digital skills through structured video courses, AI workflows, and creator-led training programmes built for real-world results.',
    button: 'Explore Courses',
    category: 'Digital Courses',
    action: 'category',
    trust: ['Self-Paced Learning', 'Instant Delivery', 'Creator Verified'],
    visualTitle: 'LEARN · BUILD · ACHIEVE',
    visualSubtitle: 'Structured training from independent educators',
    footnote: 'Digital Academy',
    image: heroCoursesImg
  },
  {
    eyebrow: 'TOOLS FOR YOUR NEXT MOVE',
    title: 'Scale Your',
    highlight: 'Business with',
    ending: 'Digital Services',
    description: 'Source vetted creative, technical, and growth services—from brand templates and software to business registration and marketing support.',
    button: 'Discover Services',
    category: 'Digital Services',
    action: 'category',
    trust: ['Business Solutions', 'Skilled Specialists', 'Direct Vendor Chat'],
    visualTitle: 'CREATE · CONNECT · SCALE',
    visualSubtitle: 'Professional services tailored for modern teams',
    footnote: 'Service Providers',
    image: heroServicesImg
  },
  {
    eyebrow: 'SMART FINDS · GREAT VALUE',
    title: 'Explore',
    highlight: 'Seasonal Deals',
    ending: '& Best Value Offers',
    description: 'Compare verified vendor listings, apply marketplace coupons at checkout, and pay seamlessly via Wallet, Paystack, or Bank Transfer.',
    button: 'Shop Deals',
    category: 'All',
    action: 'shop',
    trust: ['Transparent Pricing', 'Flexible Checkout', '24/7 Live Support'],
    visualTitle: 'FIND · SAVE · ENJOY',
    visualSubtitle: 'Limited-time discounts across active storefronts',
    footnote: 'Marketplace Offers',
    image: heroDealsImg
  }
];
const money = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);
const paymentStatusLabel = (status?: string) => status === 'completed' ? 'Payment Successful' : status === 'rejected' ? 'Payment Rejected' : 'Pending Payment';
const errorText = (e: unknown) => {
  const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
};
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}
const DEFAULT_MARKET_SETTINGS: MarketSettings = { customerTransferFee: 100, withdrawalFee: 100, walletFundingFee: 100, commissionPercent: 8, cashbackPercent: 1 };
function normalizeMarketSettings(next: unknown, prev?: MarketSettings): MarketSettings {
  const base = prev || DEFAULT_MARKET_SETTINGS;
  if (!next || typeof next !== 'object') return base;
  const obj = next as Partial<MarketSettings>;
  return {
    customerTransferFee: Number(obj.customerTransferFee ?? base.customerTransferFee ?? 100),
    withdrawalFee: Number(obj.withdrawalFee ?? base.withdrawalFee ?? 100),
    walletFundingFee: Number(obj.walletFundingFee ?? base.walletFundingFee ?? 100),
    commissionPercent: Number(obj.commissionPercent ?? base.commissionPercent ?? 8),
    cashbackPercent: Number(obj.cashbackPercent ?? base.cashbackPercent ?? 1)
  };
}
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '', audience: 'all' });
  const [announcementHistory, setAnnouncementHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendorReports, setVendorReports] = useState<any>(null);
  const [adminAnalytics, setAdminAnalytics] = useState<any>(null);
  const [settings, setSettings] = useState<MarketSettings>(DEFAULT_MARKET_SETTINGS);
  const [wallet,setWallet]=useState<any>(null);
  const [walletSummary,setWalletSummary]=useState<any>(null);
  const [walletTopupAmount,setWalletTopupAmount]=useState('');
  const [walletTopupMethod,setWalletTopupMethod]=useState('Bank transfer');
  const [walletTopupEmail,setWalletTopupEmail]=useState('');
  const [walletTopupBusy,setWalletTopupBusy]=useState(false);
  const [customerWithdrawalBusy,setCustomerWithdrawalBusy]=useState(false);
  const [walletTransferDetails,setWalletTransferDetails]=useState<{reference:string;amount:number;fee:number;total:number}|null>(null);
  const [walletTopups,setWalletTopups]=useState<any[]>([]);
  const [customerWithdrawals,setCustomerWithdrawals]=useState<any[]>([]);
  const [customerWithdrawalForm,setCustomerWithdrawalForm]=useState({amount:'',bankName:'',accountNumber:'',accountName:''});
  const [vendorCreditForm,setVendorCreditForm]=useState({vendorId:'',amount:''});
  const [customerCreditForm,setCustomerCreditForm]=useState({customerId:'',amount:''});
  const [withdrawForm,setWithdrawForm]=useState({amount:'',bankName:'',accountNumber:'',accountName:''});
  const [withdrawals,setWithdrawals]=useState<any[]>([]);
  const [adminUsers,setAdminUsers]=useState<any[]>([]);
  const [affiliateData,setAffiliateData]=useState<any>({affiliates:[],commissions:[],withdrawals:[],summary:{}});
  const [profile,setProfile]=useState<any>(null);
  const [avatarFile,setAvatarFile]=useState<File|null>(null);
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null);
  const deepLinkRequestRef = useRef('');
  const [selectedProductOption,setSelectedProductOption]=useState('');
  const [selectedImageIndex,setSelectedImageIndex]=useState(0);

  const [photoViewerOpen,setPhotoViewerOpen]=useState(false);
  const [touchStartX,setTouchStartX]=useState<number|null>(null);
  const [reviewSubmitting,setReviewSubmitting]=useState(false);
  const [detailQuantity,setDetailQuantity]=useState(1);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [page, setPage] = useState<'home' | 'catalog' | 'category' | 'vendor' | 'admin' | 'admin-history' | 'profile' | 'wallet' | 'support' | 'orders' | 'affiliate'>('home');
  const [adminSupportCollapsed, setAdminSupportCollapsed] = useState(false);
  const [adminSupportFilter, setAdminSupportFilter] = useState<'all' | 'waiting' | 'human' | 'active' | 'closed'>('all');
  const supportAdminMessagesRef = useRef<HTMLDivElement | null>(null);
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminOrderFilter, setAdminOrderFilter] = useState<'all' | 'New' | 'processing' | 'delivery' | 'unpaid'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Record<string, boolean>>({});
  const [showPaidInPayments, setShowPaidInPayments] = useState(false);
  const [adminHistorySearch, setAdminHistorySearch] = useState('');
  const [adminHistoryStatus, setAdminHistoryStatus] = useState<'all' | 'Completed' | 'Cancelled' | 'Refunded' | 'Returned'>('all');
  const [adminHistoryFrom, setAdminHistoryFrom] = useState('');
  const [adminHistoryTo, setAdminHistoryTo] = useState('');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Record<string, boolean>>({});
  const [emailStatus, setEmailStatus] = useState<{ configured?: boolean; hasApiKey?: boolean; hasFromAddress?: boolean; fromAddress?: string; adminRecipient?: string; logs?: any[] } | null>(null);
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [adminSecurity, setAdminSecurity] = useState<{ ownerEmail?: string; hasEnvOverride?: boolean; hasSavedHash?: boolean; lastLoginAt?: string | null } | null>(null);
  const [adminPwForm, setAdminPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [adminPwBusy, setAdminPwBusy] = useState(false);
  const [adminBackups, setAdminBackups] = useState<Array<{ id: string; backupType: string; status: string; verified: boolean; checksumSha256: string; recordCount: number; retentionDays: number; createdAt: string }>>([]);
  const [backupBusy, setBackupBusy] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState('digital-products');
  const [affiliateApplication, setAffiliateApplication] = useState<any>(null);
  const [affiliateDashboard, setAffiliateDashboard] = useState<any>({ commissions: [], withdrawals: [], summary: {} });
  const [affiliateTransfer, setAffiliateTransfer] = useState<any>(null);
  const [affiliateForm, setAffiliateForm] = useState({ fullName: '', phone: '', whatsapp: '', address: '', city: '', state: '', socialHandle: '', promotionMethod: 'WhatsApp and social media', paymentMethod: 'Wallet' });
  const [affiliateProducts, setAffiliateProducts] = useState<Product[]>([]);
  const [affiliateWithdrawForm, setAffiliateWithdrawForm] = useState({ amount: '', bankName: '', accountNumber: '', accountName: '' });
  const [affiliateWithdrawBusy, setAffiliateWithdrawBusy] = useState(false);
  const [category, setCategory] = useState('All');
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroTouchStart, setHeroTouchStart] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('yakaji-market-favorites') || '[]'); }
    catch { return []; }
  });
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; option: string }>>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [vendorCoupons, setVendorCoupons] = useState<any[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<any[]>([]);
  const [adminCouponDraft, setAdminCouponDraft] = useState({ code: '', discountType: 'percentage', discountValue: '10', productIds: [] as string[], minOrderAmount: '', maxDiscount: '', usageLimit: '0', startsAt: '', expiresAt: '' });
  const [couponDraft, setCouponDraft] = useState({ code: '', discountType: 'percentage', discountValue: '10', productIds: [] as string[], minOrderAmount: '', maxDiscount: '', usageLimit: '0', startsAt: '', expiresAt: '' });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [manualTransferOrder, setManualTransferOrder] = useState<{orderNumber:string;total:number;creditAmount?:number;fee?:number}|null>(null);
  const [paystackReady, setPaystackReady] = useState(false);
  const [paystackMode, setPaystackMode] = useState('');
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerOrdersLoading, setCustomerOrdersLoading] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState('');
  const notificationDeepLinkHandledRef = useRef(false);
  const [supportConversation, setSupportConversation] = useState('');
  const supportConversationRef = useRef('');
  supportConversationRef.current = supportConversation;
  const [supportStatus, setSupportStatus] = useState<any>({ online: true, offlineMessage: '' });
  const [supportAdminSettings, setSupportAdminSettings] = useState<any>({ online: true, maxConcurrent: 1, offlineMessage: 'Live support is currently offline. Leave a message and our team will reply, or use WhatsApp or email.' });
  const supportSocketRef = useRef<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportDraft, setSupportDraft] = useState('');
  const [supportConversations, setSupportConversations] = useState<any[]>([]);
  const [activeSupportConversation, setActiveSupportConversation] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewAverage, setReviewAverage] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState<'all' | 'customers' | 'vendors' | 'affiliates'>('all');
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [adminUserPwDrafts, setAdminUserPwDrafts] = useState<Record<string, string>>({});
  const [adminUserPwBusyId, setAdminUserPwBusyId] = useState('');
  const [adminUserResetCodes, setAdminUserResetCodes] = useState<Record<string, { code: string; expiresAt: string; emailed: boolean }>>({});
  const photoCount = selectedProduct?.images?.length || 0;
  const activePhoto = selectedProduct?.images?.[selectedImageIndex] || '';
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [editing, setEditing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', paymentMethod: 'Bank transfer' });
  const [shopForm, setShopForm] = useState({ shopName: '', phone: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const isAdmin = Boolean(user?.isAdmin || user?.email?.toLowerCase() === 'salimaminu103@gmail.com');

  function markImageFailed(key: string) {
    setFailedImages(current => (current[key] ? current : { ...current, [key]: true }));
  }
  function pushCleanPath(pathname: string) {
    const url = new URL(window.location.href);
    url.pathname = pathname;
    url.search = '';
    url.hash = '';
    window.history.pushState({}, '', url.pathname);
  }
  function navigateHome() {
    setCategory('All');
    setShowFavoritesOnly(false);
    setPage('home');
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') pushCleanPath('/');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function navigateCatalog(opts?: { sort?: string; favoritesOnly?: boolean; categoryFilter?: string }) {
    setCategory(opts?.categoryFilter ?? 'All');
    setShowFavoritesOnly(Boolean(opts?.favoritesOnly));
    if (opts?.sort) setSortBy(opts.sort);
    setPage('catalog');
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/catalog') pushCleanPath('/catalog');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function navigateCategory(catNameOrSlug: string) {
    const meta = resolveCategoryMeta(catNameOrSlug);
    setActiveCategorySlug(meta.slug);
    setCategory(meta.filterCategory);
    setShowFavoritesOnly(false);
    setSortBy(meta.defaultSort || 'featured');
    setPage('category');
    setMobileMenuOpen(false);
    const targetPath = '/category/' + meta.slug;
    if (window.location.pathname !== targetPath) pushCleanPath(targetPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 4000); }
  async function loadNotifications() {
    if (!user) return;
    try { const r = await api.get('/api/notifications'); setUserNotifications(r.data.notifications || []); setUnreadNotifications(Number(r.data.unreadCount || 0)); } catch { /* optional account feature */ }
  }
  async function openNotifications() { if (!user) { await signIn(); return; } await loadNotifications(); setNotificationsOpen(true); }
  async function openNotificationTarget(notification: any) {
    const id = String(notification.id || '');
    if (id) await markNotificationRead(id);
    setNotificationsOpen(false);
    const link = String(notification.link || '');
    let params: URLSearchParams;
    try { params = new URL(link, window.location.origin).searchParams; }
    catch { params = new URLSearchParams(); }
    const conversationId = params.get('conversationId') || String(notification.conversationId || '');
    const orderId = params.get('orderId') || String(notification.orderId || '');
    const kind = String(notification.kind || '').toLowerCase();
    if (kind === 'support' || params.get('view') === 'support') {
      if (conversationId) window.history.replaceState({}, '', window.location.pathname + '?view=support&conversationId=' + encodeURIComponent(conversationId));
      setSupportConversation(conversationId);
      if (conversationId) {
        try { const thread = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(conversationId)); setSupportMessages(thread.data.messages || []); setSupportStatus((current:any) => ({ ...current, conversation: thread.data.conversation })); }
        catch (e) { setError(errorText(e)); }
      }
      setPage('support');
      return;
    }
    if (kind === 'chat' || conversationId) {
      await openChatInbox(undefined, conversationId);
      return;
    }
    if (kind === 'order' || orderId || params.get('view') === 'orders') {
      setHighlightedOrderId(orderId);
      setPage('orders');
      void loadCustomerOrders();
      return;
    }
    flash('This notification has been marked as read.');
  }
  async function enablePushNotifications() { try { await notifications.subscribe(); flash('Device notifications enabled.'); } catch (e) { setError(errorText(e)); } }
  async function markNotificationRead(id: string) {
    try { await api.put('/api/notifications/read', { ids: [id] }); await loadNotifications(); }
    catch (e) { setError(errorText(e)); }
  }
  async function markAllNotificationsRead() {
    try { await api.put('/api/notifications/read', { all: true }); await loadNotifications(); }
    catch (e) { setError(errorText(e)); }
  }
  async function openChatInbox(product?: Product, requestedConversationId = '') {
    if (!user) { flash('Please sign in with your customer account, then tap Chat with vendor again.'); await signIn(); return; }
    if (product && product.vendorId === user.userId) {
      setError('This is your own product. To test customer chat, sign out and open this product using a different customer account.');
      return;
    }
    setError(''); setChatMessages([]); setChatDraft(''); setActiveChatId(''); setChatOpen(true);
    try {
      let conversationId = '';
      if (product) {
        const started = await api.post('/api/chat/conversations', { productId: product.id });
        conversationId = String(started.data.conversationId || '');
        if (!conversationId) throw new Error('The conversation could not be opened. Please try again.');
      }
      const r = await api.get('/api/chat/conversations');
      const rows = r.data.conversations || []; setChatConversations(rows);
      const nextId = conversationId || requestedConversationId || (rows.length ? String(rows[0].id) : '');
      if (requestedConversationId && !rows.some((row: any) => String(row.id) === requestedConversationId)) throw new Error('This chat is no longer available to your account.');
      setActiveChatId(nextId);
      if (nextId) await loadChatMessages(nextId);
    } catch (e) { setChatOpen(false); setError(errorText(e)); }
  }
  async function loadChatMessages(id: string) {
    if (!id) { setChatMessages([]); return; }
    try { const r = await api.get('/api/chat/messages?conversationId='+encodeURIComponent(id)); setChatMessages(r.data.messages || []); }
    catch (e) { setError(errorText(e)); }
  }
  async function sendChatMessage(e: FormEvent) {
    e.preventDefault(); if (!activeChatId || !chatDraft.trim() || chatBusy) return; setChatBusy(true);
    try {
      await api.post('/api/chat/messages', { conversationId: activeChatId, message: chatDraft.trim() });
      setChatDraft(''); await loadChatMessages(activeChatId);
      const r = await api.get('/api/chat/conversations'); setChatConversations(r.data.conversations || []);
      flash('Message sent successfully.');
    } catch (e) { setError(errorText(e)); } finally { setChatBusy(false); }
  }
  async function sendAnnouncement(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const r = await api.post('/api/admin/announcements', announcement);
      setAnnouncementHistory(current => [r.data.announcement, ...current].filter(Boolean).slice(0, 100));
      flash(r.data.message || 'Announcement sent.');
      setAnnouncement({ title: '', message: '', audience: 'all' });
    }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function loadProducts() {
    const r = await api.get('/api/products');
    setProducts(r.data.products || []);
  }
  async function loadCustomerOrders() {
    if (!user) { setCustomerOrders([]); return; }
    setCustomerOrdersLoading(true);
    try {
      const r = await api.get('/api/customer/orders');
      setCustomerOrders(r.data.orders || []);
    } catch (e) { setError(errorText(e)); }
    finally { setCustomerOrdersLoading(false); }
  }
  async function loadVendor(): Promise<Vendor | null> {
    if (!user) { setVendor(null); return null; }
    try {
      const r = await api.get('/api/vendor/me');
      const current = r.data.vendor || null;
      setVendor(current);
      return current;
    } catch { setVendor(null); return null; }
  }
  async function loadVendorWorkspace() {
    const [p, o, c, walletResult] = await Promise.all([
      api.get('/api/vendor/products'),
      api.get('/api/vendor/orders'),
      api.get('/api/vendor/coupons'),
      api.get('/api/vendor/wallet')
    ]);
    const vendorProducts = Array.isArray(p.data?.products) ? p.data.products : [];
    setVendorCoupons(c.data?.coupons || []);
    setProducts(current => [...current.filter(x => !vendorProducts.some((v: Product) => v.id === x.id)), ...vendorProducts]);
    setOrders(o.data?.orders || []);
    setVendorReports(o.data?.summary || null);
    setWallet(walletResult.data || null);
  }
  async function loadAdmin() {
    await api.post('/api/admin/products/affiliate-default', {});
    const [v, o, p, a, s, w, u, t, c, af, announcements, mailStatus, secStatus, bkpRes] = await Promise.all([api.get('/api/admin/vendors'), api.get('/api/admin/orders'), api.get('/api/admin/products'), api.get('/api/admin/analytics'),api.get('/api/admin/settings'),api.get('/api/admin/withdrawals'),api.get('/api/admin/users'),api.get('/api/admin/wallet-topups'),api.get('/api/admin/coupons'),api.get('/api/admin/affiliates'),api.get('/api/admin/announcements'),api.get('/api/admin/email-status').catch(()=>({data:null})),api.get('/api/admin/security').catch(()=>({data:null})),api.get('/api/admin/backups').catch(()=>({data:null}))]);
    setAdminCoupons(c.data?.coupons || []); setAffiliateData(af.data || {affiliates:[],commissions:[],withdrawals:[],summary:{}});
    setSettings(current => normalizeMarketSettings(s.data?.settings, current)); setWithdrawals(w.data?.withdrawals||[]); setAdminUsers(u.data?.users||[]); setWalletTopups(t.data?.topups||[]);
    setVendors(v.data?.vendors || []);
    setOrders(o.data?.orders || []);
    setProducts(p.data?.products || []);
    setAdminAnalytics(a.data || null);
    setAnnouncementHistory(announcements.data?.announcements || []);
    if (mailStatus?.data) setEmailStatus(mailStatus.data);
    if (secStatus?.data) setAdminSecurity(secStatus.data);
    if (bkpRes?.data?.backups) setAdminBackups(bkpRes.data.backups);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setHeroSlide(current => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const restored = await auth.getUser();
        if (!active) return;
        setUser(restored);
        const [r,s] = await Promise.all([api.get('/api/products'),api.get('/api/settings/public')]);
        if (active) {
          setProducts(r.data?.products || []);
          setSettings(current => normalizeMarketSettings(s.data?.settings, current));
        }
        if (restored) {
          try {
            const pr = await api.get('/api/profile');
            if (active) {
              const savedProfile = pr.data.profile || null;
              setProfile(savedProfile);
              setCustomer(current => ({
                ...current,
                name: savedProfile?.fullName || restored.name || current.name,
                phone: savedProfile?.phone || current.phone,
                email: savedProfile?.email || restored.email || current.email,
                address: savedProfile?.address || current.address
              }));
            }
          } catch { /* profile can be completed later */ }
          try {
            const v = await api.get('/api/vendor/me');
            if (active) setVendor(v.data.vendor || null);
          } catch { /* vendor profile is optional */ }
        }
      } catch (e) { if (active) setError(errorText(e)); }
      finally { /* startup restoration has completed */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet') === 'paystack') {
      if (!user) return;
      const reference = params.get('reference') || params.get('trxref');
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      if (!reference) { setError('Paystack returned without a wallet reference. Please contact support.'); return; }
      api.post('/api/wallet/topups/paystack/verify', { reference }).then(async r => {
        const w = await api.get('/api/wallet');
        setWalletSummary(w.data);
        flash(r.data.message || 'Wallet funded successfully.');
      }).catch(e => setError(errorText(e)));
      return;
    }
    if (params.get('payment') !== 'paystack') return;
    const reference = params.get('reference') || params.get('trxref');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    if (!reference) { setError('Paystack returned without a transaction reference. Please contact support.'); return; }
    api.post('/api/payments/paystack/verify', { reference })
      .then(r => flash(r.data.message || 'Paystack payment verified successfully.'))
      .catch(e => setError(errorText(e)));
  }, [user]);

  useEffect(() => {
    if (!user) { setWalletSummary(null); return; }
    api.get('/api/wallet').then(r => setWalletSummary(r.data)).catch(() => setWalletSummary(null));
  }, [user]);

  useEffect(() => {
    api.get('/api/payments/status').then(r => {
      const ready = Boolean(r.data.paystackConfigured && r.data.paystackValid);
      setPaystackReady(ready);
      setPaystackMode(String(r.data.mode || ''));
      if (ready) { setCustomer(current => ({ ...current, paymentMethod: 'Paystack' })); setWalletTopupMethod('Paystack'); }
    }).catch(() => setPaystackReady(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('yakaji-market-favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    if (page !== 'support') return;
    api.get('/api/support/status').then(r => setSupportStatus(r.data)).catch(() => {});
    if (!user) { setSupportConversation(''); setSupportMessages([]); return; }
    const requestedConversation = new URLSearchParams(window.location.search).get('conversationId') || '';
    const openExisting = async (id: string) => {
      const thread = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(id));
      setSupportConversation(id);
      setSupportMessages(thread.data.messages || []);
      setSupportStatus((current:any) => ({ ...current, conversation: thread.data.conversation }));
    };
    if (requestedConversation) { openExisting(requestedConversation).catch(e => setError(errorText(e))); return; }
    api.post('/api/support/conversations', {}).then(r => {
      const id = String(r.data.conversation?.id || '');
      setSupportConversation(id);
      if (id) api.get('/api/support/messages?conversationId=' + encodeURIComponent(id)).then(m => { setSupportMessages(m.data.messages || []); setSupportStatus((current: any) => ({ ...current, conversation: m.data.conversation })); }).catch(() => {});
    }).catch(e => setError(errorText(e)));
  }, [page, user]);
  useEffect(() => {
    if (!user) return;
    const conn = ws.connect();
    supportSocketRef.current = conn;
    conn.onMessage((message: any) => {
      if (message?.type !== 'entity.update') return;
      const entity = message.payload || {};
      if (entity.entity_type === 'support_conversation' && entity.entity_id === supportConversationRef.current) {
        api.get('/api/support/messages?conversationId=' + encodeURIComponent(supportConversationRef.current)).then(r => { setSupportMessages(r.data.messages || []); setSupportStatus((current: any) => ({ ...current, conversation: r.data.conversation })); if (r.data.messages?.some((item:any) => item.sender === 'admin')) void loadNotifications(); }).catch(() => {});
      }
      if (entity.entity_type === 'support_admin_queue' && isAdmin) {
        api.get('/api/admin/support/conversations').then(r => setSupportConversations(r.data.conversations || [])).catch(() => {});
      }
    });
    return () => { conn.disconnect(); supportSocketRef.current = null; };
  }, [user]);
  useEffect(() => {
    const conn = supportSocketRef.current;
    if (!conn || !conn.connectionId) return;
    const subscriptions = async () => {
      if (page === 'support' && supportConversation) await api.post('/api/subscriptions', { entity_type: 'support_conversation', entity_id: supportConversation, connection_id: conn.connectionId });
      if (page === 'admin' && isAdmin) await api.post('/api/subscriptions', { entity_type: 'support_admin_queue', entity_id: 'marketplace', connection_id: conn.connectionId });
    };
    conn.ready.then(subscriptions).catch(() => {});
    return () => {
      if (page === 'support' && supportConversation) void api.post('/api/subscriptions/remove', { entity_type: 'support_conversation', entity_id: supportConversation, connection_id: conn.connectionId });
      if (page === 'admin' && isAdmin) void api.post('/api/subscriptions/remove', { entity_type: 'support_admin_queue', entity_id: 'marketplace', connection_id: conn.connectionId });
    };
  }, [page, supportConversation, isAdmin, user]);
  useEffect(() => {
    if (!user) { setUserNotifications([]); setUnreadNotifications(0); return; }
    void loadNotifications();
    const timer = window.setInterval(() => { void loadNotifications(); }, 20000);
    const off = notifications.onMessage(() => { void loadNotifications(); });
    return () => { window.clearInterval(timer); off(); };
  }, [user]);
  useEffect(() => {
    if (!chatOpen) return;
    let active = true;
    const refreshInbox = async () => {
      try {
        const r = await api.get('/api/chat/conversations');
        if (!active) return;
        const rows = r.data.conversations || [];
        setChatConversations(rows);
        if (!activeChatId && rows.length) setActiveChatId(String(rows[0].id));
      } catch (e) {
        if (active) setError(errorText(e));
      }
    };
    void refreshInbox();
    if (activeChatId) void loadChatMessages(activeChatId);
    const timer = window.setInterval(() => {
      void refreshInbox();
      if (activeChatId) void loadChatMessages(activeChatId);
    }, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, [chatOpen, activeChatId]);
  useEffect(() => {
    if (page !== 'orders' || !user) return;
    void loadCustomerOrders();
    // Keep My Orders in sync when an admin confirms a payment from another device.
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void loadCustomerOrders(); }, 8000);
    const refreshOnReturn = () => { if (document.visibilityState === 'visible') void loadCustomerOrders(); };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshOnReturn); };
  }, [page, user]);
  useEffect(() => {
    if (!user || notificationDeepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const orderId = params.get('orderId') || '';
    const conversationId = params.get('conversationId') || '';
    if (view === 'orders' || orderId) {
      notificationDeepLinkHandledRef.current = true;
      setHighlightedOrderId(orderId);
      setPage('orders');
      void loadCustomerOrders();
    } else if (view === 'chat' || conversationId) {
      notificationDeepLinkHandledRef.current = true;
      void openChatInbox(undefined, conversationId);
    }
  }, [user]);
  useEffect(() => {
    if (page !== 'orders' || !highlightedOrderId || !customerOrders.some(order => order.id === highlightedOrderId)) return;
    const timer = window.setTimeout(() => document.getElementById('customer-order-' + highlightedOrderId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => window.clearTimeout(timer);
  }, [page, highlightedOrderId, customerOrders]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = params.get('ref');
    const sharePathMatch = window.location.pathname.match(/^\/share\/product\/([^/]+)\/?$/);
    let pathProductId = '';
    try { pathProductId = sharePathMatch ? decodeURIComponent(sharePathMatch[1]) : ''; } catch { pathProductId = ''; }
    const sharedProductId = params.get('product') || pathProductId;
    if (referralCode) { localStorage.setItem('yakaji-affiliate-ref', referralCode); const clickKey = 'yakaji-aff-clicked:' + referralCode + ':' + String(sharedProductId || ''); if (sharedProductId && !sessionStorage.getItem(clickKey)) { sessionStorage.setItem(clickKey, '1'); api.post('/api/affiliate/click', { referralCode, productId: sharedProductId }).catch(() => sessionStorage.removeItem(clickKey)); } }
    if (!sharedProductId) return;
    const sharedProduct = products.find(product => product.id === sharedProductId && product.status === 'approved');
    if (sharedProduct) {
      deepLinkRequestRef.current = sharedProductId;
      setSelectedProduct(sharedProduct);
      setSelectedProductOption(sharedProduct.options?.[0] || '');
      setSelectedImageIndex(0);
      setPhotoViewerOpen(false);
      setDetailQuantity(1);
      return;
    }
    if (deepLinkRequestRef.current === sharedProductId) return;
    deepLinkRequestRef.current = sharedProductId;
    api.get('/api/products/' + encodeURIComponent(sharedProductId)).then(r => {
      const product = r.data.product as Product;
      if (!product?.id || product.status !== 'approved') throw new Error('This product is no longer available.');
      setProducts(current => current.some(item => item.id === product.id) ? current : [...current, product]);
      setSelectedProduct(product);
      setSelectedProductOption(product.options?.[0] || '');
      setSelectedImageIndex(0);
      setPhotoViewerOpen(false);
      setDetailQuantity(1);
    }).catch(e => {
      deepLinkRequestRef.current = '';
      setError(errorText(e));
    });
  }, [products]);

  useEffect(() => {
    if (!selectedProduct) return;
    let active = true;
    setProductReviews([]);
    setReviewAverage(Number(selectedProduct.averageRating || 0));
    setReviewCount(Number(selectedProduct.reviewCount || 0));
    setReviewComment('');
    setReviewRating(5);
    setReviewError('');
    setReviewNotice('');
    api.get('/api/products/' + selectedProduct.id + '/reviews').then(r => {
      if (!active) return;
      const list = Array.isArray(r.data.reviews) ? r.data.reviews : [];
      setProductReviews(list);
      setReviewAverage(Number(r.data.average || 0));
      setReviewCount(Number(r.data.count || 0));
      if (user?.userId) {
        const mine = list.find((item: any) => item.userId === user.userId);
        if (mine) {
          setReviewRating(Math.min(5, Math.max(1, Number(mine.rating || 5))));
          setReviewComment(String(mine.comment || ''));
        }
      }
    }).catch(() => { if (active) { setProductReviews([]); setReviewAverage(0); setReviewCount(0); } });
    return () => { active = false; };
  }, [selectedProduct?.id, user?.userId]);
  useEffect(() => {
    if (!photoViewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoViewerOpen(false);
      if (event.key === 'ArrowRight') setSelectedImageIndex(index => Math.min(index + 1, Math.max(0, photoCount - 1)));
      if (event.key === 'ArrowLeft') setSelectedImageIndex(index => Math.max(0, index - 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photoViewerOpen, photoCount]);
  useEffect(() => {
    if (page !== 'admin' || !isAdmin) return;
    Promise.all([api.get('/api/admin/support/conversations'), api.get('/api/admin/support/settings')]).then(([c,s]) => {
      setSupportConversations(c.data.conversations || []);
      setSupportAdminSettings(s.data.settings || { online: true, maxConcurrent: 1, offlineMessage: '' });
    }).catch(e => setError(errorText(e)));
  }, [page, isAdmin]);

  useEffect(() => {
    if ((page === 'admin' || page === 'admin-history') && isAdmin) {
      void loadAdmin().catch(e => setError(errorText(e)));
    }
  }, [page, isAdmin]);

  useEffect(() => {
    const el = supportAdminMessagesRef.current;
    if (!el || adminSupportCollapsed) return;
    el.scrollTop = el.scrollHeight;
  }, [supportMessages, activeSupportConversation, adminSupportCollapsed]);

  useEffect(() => {
    const applyPath = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';
      if (path === '/admin/order-history') {
        setPage('admin-history');
        return;
      }
      if (path === '/admin') {
        setPage('admin');
        return;
      }
      if (path === '/catalog') {
        setCategory('All');
        setPage('catalog');
        return;
      }
      if (path.startsWith('/category/')) {
        const slug = decodeURIComponent(path.slice('/category/'.length));
        const meta = resolveCategoryMeta(slug);
        setActiveCategorySlug(meta.slug);
        setCategory(meta.filterCategory);
        if (meta.defaultSort) setSortBy(meta.defaultSort);
        setPage('category');
        return;
      }
      if (path === '/') {
        setCategory('All');
        setPage(current => (current === 'catalog' || current === 'category' || current === 'admin' || current === 'admin-history' ? 'home' : current));
      }
    };
    applyPath();
    window.addEventListener('popstate', applyPath);
    return () => window.removeEventListener('popstate', applyPath);
  }, []);

  const activeCategoryMeta = useMemo(() => resolveCategoryMeta(activeCategorySlug), [activeCategorySlug]);
  const approvedProducts = useMemo(() => products.filter(p => p.status === 'approved'), [products]);
  const homeTrendingProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = approvedProducts.filter(p => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.vendorName || '').toLowerCase().includes(q));
    return list.slice(0, 8);
  }, [approvedProducts, search]);

  const visibleProducts = useMemo(() => {
    const result = approvedProducts.filter(p =>
      (category === 'All' || p.category === category) &&
      (!showFavoritesOnly || favorites.includes(p.id)) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) || (p.vendorName || '').toLowerCase().includes(search.toLowerCase()))
    );
    if (sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [approvedProducts, category, search, sortBy, showFavoritesOnly, favorites]);

  const sortedAdminOrders = useMemo(
    () => [...orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [orders]
  );

  const activeAdminOrders = useMemo(() => {
    const q = adminOrderSearch.trim().toLowerCase();
    return sortedAdminOrders.filter(o => {
      if (isFulfilledOrderStatus(o.status)) return false;
      if (adminOrderFilter === 'New' && o.status !== 'New') return false;
      if (adminOrderFilter === 'processing' && !['Confirmed', 'Processing', 'Ready for Shipping'].includes(o.status)) return false;
      if (adminOrderFilter === 'delivery' && !['Shipped', 'Out for Delivery', 'Delivered'].includes(o.status)) return false;
      if (adminOrderFilter === 'unpaid' && o.paymentStatus === 'completed') return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        o.items.some(item => item.name.toLowerCase().includes(q))
      );
    });
  }, [sortedAdminOrders, adminOrderSearch, adminOrderFilter]);

  const paymentQueueOrders = useMemo(() => {
    if (showPaidInPayments) return sortedAdminOrders.filter(o => !isFulfilledOrderStatus(o.status));
    return sortedAdminOrders.filter(o => !isFulfilledOrderStatus(o.status) && o.paymentStatus !== 'completed');
  }, [sortedAdminOrders, showPaidInPayments]);

  const allFulfilledOrders = useMemo(
    () => sortedAdminOrders.filter(o => isFulfilledOrderStatus(o.status)),
    [sortedAdminOrders]
  );

  const filteredFulfilledOrders = useMemo(() => {
    const q = adminHistorySearch.trim().toLowerCase();
    return allFulfilledOrders.filter(o => {
      if (adminHistoryStatus !== 'all' && o.status !== adminHistoryStatus) return false;
      const createdDay = String(o.createdAt || '').slice(0, 10);
      if (adminHistoryFrom && createdDay && createdDay < adminHistoryFrom) return false;
      if (adminHistoryTo && createdDay && createdDay > adminHistoryTo) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        o.items.some(item => item.name.toLowerCase().includes(q))
      );
    });
  }, [allFulfilledOrders, adminHistorySearch, adminHistoryStatus, adminHistoryFrom, adminHistoryTo]);

  const filteredSupportConversations = useMemo(() => {
    return supportConversations.filter((c: any) => {
      if (adminSupportFilter === 'all') return true;
      if (adminSupportFilter === 'waiting') return c.status === 'waiting';
      if (adminSupportFilter === 'human') return c.mode === 'human';
      if (adminSupportFilter === 'active') return c.status === 'active';
      if (adminSupportFilter === 'closed') return c.status === 'closed';
      return true;
    });
  }, [supportConversations, adminSupportFilter]);
  function toggleFavorite(id: string) {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  function productShareUrl(product: Product, referralCode?: string) {
    // Use the deployed marketplace root with a query-string deep link. The host reliably serves the SPA at '/',
    // while nested /share/product paths can be treated as static folders and fail to load app assets.
    const url = new URL('/', window.location.origin);
    url.searchParams.set('product', product.id);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  }
  function shareProductToNetwork(product: Product, network: 'whatsapp' | 'facebook' | 'x', referralCode?: string) {
    const link = productShareUrl(product, referralCode);
    const text = product.name + ' — ' + money(product.price) + '. ' + String(product.description || '').slice(0, 160);
    const target = network === 'whatsapp'
      ? 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + link)
      : network === 'facebook'
        ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link)
        : 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(product.name + ' — ' + money(product.price)) + '&url=' + encodeURIComponent(link);
    window.open(target, '_blank', 'noopener,noreferrer');
  }
  function openProduct(product: Product) {
    setSelectedProduct(product);
    setSelectedProductOption(product.options?.[0] || '');
    setSelectedImageIndex(0);
    setPhotoViewerOpen(false);
    setDetailQuantity(1);
    const url = new URL(window.location.href);
    url.searchParams.set('product', product.id);
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  function closeProduct() {
    setPhotoViewerOpen(false);
    setSelectedProduct(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('product');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
  async function copyProductLink(product: Product) {
    const link = productShareUrl(product);
    try {
      await navigator.clipboard.writeText(link);
      flash('Product link copied. You can paste and share it anywhere.');
    } catch {
      window.prompt('Copy this product link:', link);
    }
  }
  async function copyProductLinkWithReferral(product: Product, referralCode: string) {
    const link = productShareUrl(product, referralCode);
    try {
      await navigator.clipboard.writeText(link);
      flash('Your product affiliate link has been copied.');
    } catch {
      window.prompt('Copy your product affiliate link:', link);
    }
  }
  async function shareAffiliateProduct(product: Product) {
    const link = productShareUrl(product, affiliateApplication?.referralCode);
    const title = product.name + ' | Yakaji Digital Hub';
    const text = product.name + ' — ' + money(product.price) + '. ' + String(product.description || '').slice(0, 160);
    if (navigator.share) {
      try { await navigator.share({ title, text, url: link }); }
      catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) flash('Sharing was not completed. You can copy your affiliate link instead.'); }
    } else {
      await copyProductLinkWithReferral(product, String(affiliateApplication?.referralCode || ''));
    }
  }
  async function shareProduct(product: Product) {
    const url = productShareUrl(product);
    const title = product.name + ' | Yakaji Digital Hub';
    const shareText = product.name + ' — ' + money(product.price) + '. View this product on Yakaji Digital Hub:';
    if (navigator.share) {
      try { await navigator.share({ title, text: shareText, url }); }
      catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) flash('Sharing was not completed. You can copy the product link instead.'); }
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + url), '_blank', 'noopener,noreferrer');
    }
  }
  const cartSubtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const couponSavings = Math.min(cartSubtotal, Number(appliedCoupon?.discount || 0));
  const transferFee = Number(settings?.customerTransferFee ?? 100);
  const cartTotal = Math.max(0, cartSubtotal - couponSavings) + (customer.paymentMethod === 'Bank transfer' ? transferFee : 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const dailyTrend = adminAnalytics?.dailyTrend || [];
  const monthlyTrend = adminAnalytics?.monthlyTrend || [];
  const orderStatuses = adminAnalytics?.orderStatuses || [];
  const paymentMethods = adminAnalytics?.paymentMethods || [];
  const maxTrendRevenue = Math.max(1, ...monthlyTrend.map((point: any) => Number(point.paidRevenue || 0)));
  const maxTrendOrders = Math.max(1, ...dailyTrend.map((point: any) => Number(point.orders || 0)));

  async function hydrateSignedInUser(signedUser: User) {
    try {
      const [pr, vr] = await Promise.all([
        api.get('/api/profile').catch(() => null),
        api.get('/api/vendor/me').catch(() => null),
      ]);
      const savedProfile = pr?.data?.profile || null;
      setProfile(savedProfile);
      setCustomer(current => ({
        ...current,
        name: savedProfile?.fullName || signedUser.name || current.name,
        phone: savedProfile?.phone || current.phone,
        email: savedProfile?.email || signedUser.email || current.email,
        address: savedProfile?.address || current.address
      }));
      setVendor(vr?.data?.vendor || null);
    } catch { /* profile or vendor optional */ }
  }

  async function signIn(modeOrEvent?: 'login' | 'register' | unknown) {
    setError('');
    const initialMode = modeOrEvent === 'register' ? 'register' : 'login';
    try {
      const signedUser = await auth.signInWithRedirect({ initialMode });
      setUser(signedUser);
      await hydrateSignedInUser(signedUser);
      const isOwner = Boolean(
        signedUser?.isAdmin ||
        signedUser?.redirectTo === 'admin' ||
        signedUser?.email?.toLowerCase() === 'salimaminu103@gmail.com'
      );
      if (isOwner) {
        setPage('admin');
        if (window.location.pathname !== '/admin') pushCleanPath('/admin');
        window.scrollTo({ top: 0, behavior: 'auto' });
        try {
          const [supportRes, inbox] = await Promise.all([
            api.get('/api/admin/support/settings'),
            api.get('/api/admin/support/conversations'),
          ]);
          if (supportRes.data?.settings) setSupportAdminSettings(supportRes.data.settings);
          setSupportConversations(inbox.data?.conversations || []);
          await loadAdmin();
        } catch (adminErr) {
          setError(errorText(adminErr));
        }
        flash('Welcome back! Signed in successfully.');
      } else {
        flash('Welcome, ' + (signedUser.name || signedUser.email || 'Customer') + '!');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'Sign in cancelled.') return;
      setError(errorText(e));
    }
  }
  async function signOut() {
    await auth.signOut();
    setUser(null);
    setProfile(null);
    setVendor(null);
    setWalletSummary(null);
    setAdminUsers([]);
    setAdminAnalytics(null);
    setAdminSecurity(null);
    setPage('home');
    if (window.location.pathname.startsWith('/admin')) pushCleanPath('/');
    flash('You have signed out.');
  }
  function addToCart(product: Product, optionOverride?: string, quantityToAdd = 1) {
    if (product.stock < 1) { flash('This product is currently out of stock.'); return; }
    setCart(items => {
      const found = items.find(x => x.product.id === product.id);
      if (found) return items.map(x => x.product.id === product.id ? { ...x, quantity: Math.min(x.quantity + quantityToAdd, product.stock) } : x);
      return [...items, { product, quantity: Math.min(quantityToAdd, product.stock), option: optionOverride || product.options[0] || '' }];
    });
    flash('Added to your shopping cart.');
  }
  async function placeOrder(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const orderPayload = {
        customerName: customer.name, phone: customer.phone, email: customer.email.trim(),
        address: customer.address,
        couponCode: appliedCoupon?.code || '',
        referralCode: localStorage.getItem('yakaji-affiliate-ref') || '',
        items: cart.map(x => ({ productId: x.product.id, quantity: x.quantity, option: x.option }))
      };
      const r = customer.paymentMethod === 'Wallet'
        ? await api.post('/api/orders/wallet', orderPayload)
        : await api.post('/api/orders', { ...orderPayload, paymentMethod: customer.paymentMethod });
      setCart([]); setCheckoutOpen(false); setCouponCode(''); setAppliedCoupon(null);
      setCustomer({ name: '', phone: '', email: '', address: '', paymentMethod: 'Paystack' });
      if (customer.paymentMethod === 'Paystack' && r.data.authorizationUrl) {
        window.location.href = r.data.authorizationUrl;
        return;
      }
      if (customer.paymentMethod === 'Bank transfer') {
        setManualTransferOrder({ orderNumber: r.data.orderNumber, total: Number(r.data.total || 0) });
      } else if (customer.paymentMethod === 'Wallet') {
        const [w, history] = await Promise.all([api.get('/api/wallet'), api.get('/api/customer/orders')]);
        setWalletSummary(w.data); setCustomerOrders(history.data.orders || []);
        flash('Order ' + r.data.orderNumber + ' paid successfully. Exactly ' + money(Number(r.data.total)) + ' was deducted from your wallet.');
      } else {
        flash('Order ' + r.data.orderNumber + ' placed successfully.' + (Number(r.data.couponDiscount || 0) ? ' Coupon saved ' + money(Number(r.data.couponDiscount)) + '.' : ''));
      }
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function openWallet() {
    if (!user) { setPage('wallet'); await signIn(); return; }
    setError('');
    try {
      const [walletResult, withdrawalResult] = await Promise.all([api.get('/api/wallet'), api.get('/api/customer/withdrawals')]);
      setWalletSummary(walletResult.data);
      setCustomerWithdrawals(withdrawalResult.data.withdrawals || []);
      setPage('wallet');
    } catch (e) { setError(errorText(e)); }
  }
  async function refreshWallet() {
    if (!user) return;
    try {
      const [walletResult, withdrawalResult] = await Promise.all([api.get('/api/wallet'), api.get('/api/customer/withdrawals')]);
      setWalletSummary(walletResult.data);
      setCustomerWithdrawals(withdrawalResult.data.withdrawals || []);
      flash('Wallet balance, funding and withdrawal status refreshed.');
    } catch (e) { setError(errorText(e)); }
  }
  async function requestCustomerWithdrawal(e: FormEvent) {
    e.preventDefault(); setCustomerWithdrawalBusy(true); setError('');
    try {
      const result = await api.post('/api/customer/withdrawals', { ...customerWithdrawalForm, amount: Number(customerWithdrawalForm.amount) });
      const [walletResult, history] = await Promise.all([api.get('/api/wallet'), api.get('/api/customer/withdrawals')]);
      setWalletSummary(walletResult.data);
      setCustomerWithdrawals(history.data.withdrawals || []);
      setCustomerWithdrawalForm({ amount:'', bankName:'', accountNumber:'', accountName:'' });
      flash(result.data.message || 'Withdrawal request submitted for owner approval.');
    } catch (e) { setError(errorText(e)); }
    finally { setCustomerWithdrawalBusy(false); }
  }
  async function startWalletTopup(e: FormEvent) {
    e.preventDefault();
    const amount = Number(walletTopupAmount);
    if (!Number.isSafeInteger(amount) || amount < 100 || amount > 5000000) { setError('Enter an amount from ₦100 to ₦5,000,000.'); return; }
    setWalletTopupBusy(true); setError('');
    try {
      const r = await api.post('/api/wallet/topups', { amount, paymentMethod: walletTopupMethod, email: walletTopupEmail.trim() });
      if (walletTopupMethod === 'Paystack') {
        if (!r.data.authorizationUrl) throw new Error('Paystack did not return a checkout link. Your wallet was not credited. Refresh wallet history or contact support before trying again.');
        window.location.href = r.data.authorizationUrl;
        return;
      }
      setWalletTransferDetails({ reference: r.data.reference, amount: Number(r.data.amount), fee: Number(r.data.fee), total: Number(r.data.total) });
      const walletResult = await api.get('/api/wallet');
      setWalletSummary(walletResult.data);
      setWalletTopupAmount('');
    } catch (e) { setError(errorText(e)); }
    finally { setWalletTopupBusy(false); }
  }
  async function confirmWalletTopup(id: string) {
    try {
      const result = await api.put('/api/admin/wallet-topups/' + id + '/confirm', {});
      await loadAdmin();
      flash(result.data.message || 'Wallet top-up reviewed.');
    } catch (e) { setError(errorText(e)); }
  }
  async function rejectWalletTopup(id: string) {
    if (!window.confirm('Reject this pending wallet top-up? The customer wallet will not be credited.')) return;
    try { await api.put('/api/admin/wallet-topups/' + id + '/reject', {}); await loadAdmin(); flash('Wallet top-up request rejected.'); }
    catch (e) { setError(errorText(e)); }
  }
  async function fundCustomerWallet(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await api.post('/api/admin/customers/' + customerCreditForm.customerId + '/wallet-credit', { amount: Number(customerCreditForm.amount) });
      setCustomerCreditForm({customerId:'',amount:''});
      await loadAdmin();
      flash('Customer wallet funded: ' + money(Number(r.data.amount)) + '. New balance: ' + money(Number(r.data.balance)));
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function fundVendorWallet(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const r = await api.post('/api/admin/vendors/' + vendorCreditForm.vendorId + '/wallet-credit', { amount: Number(vendorCreditForm.amount) }); setVendorCreditForm({vendorId:'',amount:''}); await loadAdmin(); flash('Vendor wallet funded: ' + money(Number(r.data.amount)) + '.'); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function openProfile() {
    if (!user) { await signIn(); return; }
    setError('');
    try {
      const r = await api.get('/api/profile');
      setProfile(r.data.profile || null);
      setAvatarFile(null);
      setPage('profile');
    } catch (e) { setError(errorText(e)); }
  }
  async function saveProfile(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (avatarFile) {
        const base64 = await fileToBase64(avatarFile);
        await api.post('/api/profile/avatar', { fileName: avatarFile.name, contentType: avatarFile.type, base64 });
      }
      const r = await api.put('/api/profile', profile);
      setProfile(r.data.profile || null);
      setAvatarFile(null);
      flash('Your marketplace profile has been saved.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function cancelCustomerOrder(order: Order) {
    if (!window.confirm('Cancel unpaid order ' + order.orderNumber + '?')) return;
    try { await api.put('/api/customer/orders/' + order.id + '/cancel', {}); await loadCustomerOrders(); flash('Your unpaid order has been cancelled.'); }
    catch (e) { setError(errorText(e)); }
  }
  async function sendSupportMessage(e: FormEvent) {
    e.preventDefault(); if (!supportDraft.trim() || !supportConversation) return;
    setBusy(true);
    try {
      const r = await api.post('/api/support/messages', { conversationId: supportConversation, message: supportDraft.trim() });
      setSupportDraft('');
      const thread = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(supportConversation));
      setSupportMessages(thread.data.messages || []);
      setSupportStatus((current: any) => ({ ...current, conversation: thread.data.conversation }));
      if (r.data.handedOff) flash('Your request has been sent to a human support agent. Yakaji AI is now paused for this chat.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function requestHumanSupport() {
    if (!supportConversation) return;
    try {
      await api.post('/api/support/messages', { conversationId: supportConversation, message: 'I want to speak with a human live support agent, please.' });
      const thread = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(supportConversation));
      setSupportMessages(thread.data.messages || []);
      setSupportStatus((current:any) => ({ ...current, conversation: thread.data.conversation }));
      flash('Human support requested. AI replies are paused until the agent finishes or resumes AI support.');
    } catch (e) { setError(errorText(e)); }
  }
  async function sendAdminReply(e: FormEvent) {
    e.preventDefault();
    const message = adminReply.trim();
    const conversationId = activeSupportConversation;
    if (!message || !conversationId || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/api/admin/support/reply', { conversationId, message });
      setAdminReply('');
      const [thread, inbox] = await Promise.all([
        api.get('/api/support/messages?conversationId=' + encodeURIComponent(conversationId)),
        api.get('/api/admin/support/conversations')
      ]);
      setSupportMessages(thread.data.messages || []);
      setSupportConversations(inbox.data.conversations || []);
      flash('Your private reply was sent to this customer.');
    } catch (e) {
      setError('Reply was not sent: ' + errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function updateSupportAvailability(online: boolean) {
    try {
      const r = await api.put('/api/admin/support/settings', { ...supportAdminSettings, online });
      if (r.data?.settings) setSupportAdminSettings(r.data.settings);
      flash(online ? 'Live support is now available.' : 'Live support is now offline. Customers can still leave messages.');
    } catch (e) { setError(errorText(e)); }
  }
  async function updateSupportConversationStatus(conversationId: string, status: string, mode?: string) {
    try {
      await api.put('/api/admin/support/conversations/' + encodeURIComponent(conversationId), { status, ...(mode ? { mode } : {}) });
      const r = await api.get('/api/admin/support/conversations');
      setSupportConversations(r.data.conversations || []);
      if (activeSupportConversation === conversationId) {
        const m = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(conversationId));
        setSupportMessages(m.data.messages || []);
      }
    } catch (e) { setError(errorText(e)); }
  }
  async function submitProductReview(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!user) {
      await signIn('login');
      return;
    }
    const cleanComment = reviewComment.trim();
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Please select a star rating from 1 to 5 stars.');
      return;
    }
    if (cleanComment.length < 2) {
      setReviewError('Please write at least 2 characters for your product review.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    setReviewNotice('');
    setError('');
    try {
      const res = await api.post('/api/products/' + selectedProduct.id + '/reviews', {
        rating: reviewRating,
        comment: cleanComment,
      });
      let nextReviews = Array.isArray(res.data?.reviews) ? res.data.reviews : null;
      let nextAvg = Number(res.data?.average ?? 0);
      let nextCount = Number(res.data?.count ?? 0);
      if (!nextReviews) {
        const r = await api.get('/api/products/' + selectedProduct.id + '/reviews');
        nextReviews = r.data.reviews || [];
        nextAvg = Number(r.data.average || 0);
        nextCount = Number(r.data.count || 0);
      }
      const roundedAvg = Math.round(nextAvg * 10) / 10;
      setProductReviews(nextReviews || []);
      setReviewAverage(nextAvg);
      setReviewCount(nextCount);
      setProducts(current =>
        current.map(p => (p.id === selectedProduct.id ? { ...p, averageRating: roundedAvg, reviewCount: nextCount } : p))
      );
      setSelectedProduct(current =>
        current && current.id === selectedProduct.id ? { ...current, averageRating: roundedAvg, reviewCount: nextCount } : current
      );
      const okMsg = String(res.data?.message || 'Your product review has been published. Thank you!');
      setReviewNotice(okMsg);
      flash(okMsg);
    } catch (e) {
      const msg = errorText(e);
      setReviewError(msg);
      setError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  }
  async function adminResetCustomerPassword(userId: string) {
    const nextPw = String(adminUserPwDrafts[userId] || '');
    if (nextPw.length < 8) {
      setError('Customer new password must be at least 8 characters long.');
      return;
    }
    setAdminUserPwBusyId(userId);
    setError('');
    try {
      const r = await api.post('/api/admin/users/' + encodeURIComponent(userId) + '/reset-password', {
        newPassword: nextPw,
        confirmPassword: nextPw,
      });
      setAdminUserPwDrafts(current => ({ ...current, [userId]: '' }));
      setAdminUsers(current =>
        current.map(item =>
          item.id === userId
            ? {
                ...item,
                hasPasswordAccount: true,
                passwordStatus: 'Protected (salted scrypt hash)',
                lastPasswordResetAt: r.data?.lastPasswordResetAt || new Date().toISOString(),
                hasPendingResetCode: false,
              }
            : item
        )
      );
      flash(r.data?.message || 'Customer password updated securely.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAdminUserPwBusyId('');
    }
  }
  async function adminIssueCustomerResetCode(userId: string) {
    setAdminUserPwBusyId('code:' + userId);
    setError('');
    try {
      const r = await api.post('/api/admin/users/' + encodeURIComponent(userId) + '/reset-code', {});
      if (r.data?.code) {
        setAdminUserResetCodes(current => ({
          ...current,
          [userId]: {
            code: String(r.data.code),
            expiresAt: String(r.data.expiresAt || ''),
            emailed: Boolean(r.data.emailed),
          },
        }));
      }
      flash(r.data?.message || '6-digit verification code generated.');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAdminUserPwBusyId('');
    }
  }
  function changePhoto(direction: number) {
    if (!photoCount) return;
    setSelectedImageIndex(index => (index + direction + photoCount) % photoCount);
  }
  async function reviewPayment(id: string, decision: 'pending' | 'rejected') {
    const reason = decision === 'rejected'
      ? window.prompt('Reason for rejecting this payment (optional):', 'Payment not received or could not be verified.')
      : '';
    if (decision === 'rejected' && reason === null) return;
    try {
      const r = await api.put('/api/admin/orders/' + id + '/payment-review', { decision, reason: reason || '' });
      await loadAdmin();
      flash(r.data.message || 'Payment review saved.');
    } catch (e) { setError(errorText(e)); }
  }
  async function confirmPayment(id: string, manualPaystack = false) {
    let payload: Record<string, unknown> = {};
    if (manualPaystack) {
      const confirmationNote = window.prompt('You must first check your Paystack dashboard and confirm that this exact order reference and amount show SUCCESS. Enter an audit note (for example: Checked Paystack dashboard; transaction successful; amount and reference match):');
      if (confirmationNote === null || confirmationNote.trim().length < 8) { setError('Manual confirmation cancelled. Enter an audit note after checking Paystack.'); return; }
      if (!window.confirm('Confirm that you personally checked Paystack and verified the successful payment, exact amount and transaction reference? This will mark the payment successful and notify the customer.')) return;
      payload = { manualConfirmation: true, confirmationNote: confirmationNote.trim() };
    }
    try {
      const r = await api.put('/api/admin/orders/' + id + '/payment', payload);
      await loadAdmin();
      flash(r.data.message || 'Payment review completed.');
    } catch (e) { setError(errorText(e)); }
  }
  async function resendOrderEmails(id: string) {
    setResendingOrderId(id); setError('');
    try {
      const r = await api.post('/api/admin/orders/' + id + '/resend-emails', {});
      await loadAdmin();
      if (r.data?.sent) flash(r.data.message || 'Payment confirmation emails sent to customer, vendor and admin.');
      else setError(r.data?.message || 'Some payment emails could not be delivered.');
    } catch (e) { setError(errorText(e)); }
    finally { setResendingOrderId(null); }
  }
  async function openAffiliate() {
    setPage('affiliate');
    if (!user) { await signIn(); return; }
    setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      // Load the affiliate account and eligible product catalogue concurrently to reduce dashboard wait time.
      const [r, catalog] = await Promise.all([
        api.get('/api/affiliate/me'),
        api.get('/api/affiliate/products').then(response => response).catch(() => ({ data: { products: [] } }))
      ]);
      if (r.data.affiliate && ['approved','active'].includes(String(r.data.affiliate.status))) setAffiliateProducts(catalog.data.products || []);
      setAffiliateApplication(r.data.affiliate || null);
      setAffiliateDashboard({ commissions: r.data.commissions || [], withdrawals: r.data.withdrawals || [], summary: r.data.summary || {} });
      if (params.get('affiliate') === 'paystack' && params.get('reference')) {
        const verified = await api.post('/api/affiliate/paystack/verify', { reference: params.get('reference') });
        setAffiliateApplication(verified.data.affiliate);
        window.history.replaceState({}, '', window.location.pathname);
        flash('Affiliate registration payment verified. Your application is awaiting owner approval.');
      }
      if (r.data.affiliate) {
        const a = r.data.affiliate;
        setAffiliateForm(current => ({ ...current, fullName: String(a.fullName || current.fullName), phone: String(a.phone || current.phone), whatsapp: String(a.whatsapp || current.whatsapp), address: String(a.address || ''), city: String(a.city || ''), state: String(a.state || ''), socialHandle: String(a.socialHandle || ''), paymentMethod: String(a.registrationPaymentMethod || 'Wallet') }));
      } else {
        setAffiliateForm(current => ({ ...current, fullName: current.fullName || user.name || '', phone: current.phone || profile?.phone || '', whatsapp: current.whatsapp || profile?.whatsapp || '', address: profile?.address || '', city: profile?.city || '', state: profile?.state || '' }));
      }
    } catch (e) { setError(errorText(e)); }
  }
  async function requestAffiliateWithdrawal(e: FormEvent) {
    e.preventDefault(); setAffiliateWithdrawBusy(true); setError('');
    try { const result = await api.post('/api/affiliate/withdrawals', { ...affiliateWithdrawForm, amount: Number(affiliateWithdrawForm.amount) }); setAffiliateWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' }); await openAffiliate(); flash(result.data.message || 'Withdrawal request submitted.'); }
    catch (e) { setError(errorText(e)); } finally { setAffiliateWithdrawBusy(false); }
  }
  async function applyAsAffiliate(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await api.post('/api/affiliate/apply', affiliateForm);
      setAffiliateApplication(r.data.affiliate);
      if (r.data.authorizationUrl) { window.location.href = r.data.authorizationUrl; return; }
      if (r.data.bankTransfer) setAffiliateTransfer(r.data.bankTransfer);
      flash(affiliateForm.paymentMethod === 'Wallet' ? 'Registration fee paid from your wallet. Your application is awaiting owner approval.' : 'Application submitted. Complete the manual transfer and wait for owner confirmation.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function applyAsVendor(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await api.post('/api/vendor/apply', shopForm);
      setVendor(r.data.vendor); flash('Vendor application submitted. Your shop will open after approval.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  function startNewProduct() { setDraft(blankDraft); setSelectedFiles([]); setEditing(false); }
  function startEdit(p: Product) {
    setDraft({ id: p.id, name: p.name, category: p.category, price: String(p.standardPrice ?? p.price), description: p.description, stock: String(p.stock), tag: p.tag, options: p.options.join(', '), images: p.imagePaths || [], videos: p.videoPaths || [], affiliateCommissionPercent: String(Number(p.affiliateCommissionPercent ?? 0) >= 5 ? p.affiliateCommissionPercent : 5), marketplaceCommissionPercent: p.marketplaceCommissionPercent === undefined ? '' : String(p.marketplaceCommissionPercent), discountMode: p.discountPrice ? 'manual' : 'none', discountValue: p.discountPrice ? String(p.discountPrice) : '', discountStartAt: p.discountStartAt ? new Date(p.discountStartAt).toISOString().slice(0,16) : '', discountEndAt: p.discountEndAt ? new Date(p.discountEndAt).toISOString().slice(0,16) : '' });
    setSelectedFiles([]); setEditing(true);
    document.getElementById('product-editor')?.scrollIntoView({ behavior: 'smooth' });
  }
  async function uploadMedia(): Promise<Media[]> {
    const uploaded: Media[] = [];
    for (const file of selectedFiles) {
      const max = file.type.startsWith('video/') ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > max) throw new Error(file.type.startsWith('video/') ? 'Each video must be 30MB or smaller.' : 'Each image must be 8MB or smaller.');
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error('Only image and video files are supported.');
      const data = await fileToBase64(file);
      const r = await api.post('/api/media', { fileName: file.name, contentType: file.type, base64: data });
      uploaded.push({ path: r.data.path, url: r.data.url, type: file.type.startsWith('video/') ? 'video' : 'image' });
    }
    return uploaded;
  }
  async function saveProduct(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const media = await uploadMedia();
      const standardPrice = Number(draft.price);
      const discountPrice = draft.discountMode === 'manual'
        ? Number(draft.discountValue || 0)
        : draft.discountMode === 'percentage'
          ? Math.round(standardPrice * (1 - Number(draft.discountValue || 0) / 100))
          : 0;
      if (discountPrice > 0 && discountPrice >= standardPrice) throw new Error('Discount price must be lower than the standard price.');
      if (draft.discountMode === 'percentage' && (Number(draft.discountValue) <= 0 || Number(draft.discountValue) >= 100)) throw new Error('Enter a discount percentage between 1 and 99.');
      const payload = {
        name: draft.name, category: draft.category, price: standardPrice, discountPrice,
        discountStartAt: draft.discountStartAt ? new Date(draft.discountStartAt).toISOString() : '',
        discountEndAt: draft.discountEndAt ? new Date(draft.discountEndAt).toISOString() : '',
        description: draft.description, stock: Number(draft.stock), tag: draft.tag,
        affiliateCommissionPercent: Number(draft.affiliateCommissionPercent),
        ...(isAdmin && draft.marketplaceCommissionPercent !== '' ? { marketplaceCommissionPercent: Number(draft.marketplaceCommissionPercent) } : {}),
        options: draft.options.split(',').map(x => x.trim()).filter(Boolean),
        images: [...draft.images, ...media.filter(x => x.type === 'image').map(x => x.path)],
        videos: [...draft.videos, ...media.filter(x => x.type === 'video').map(x => x.path)]
      };
      if (editing && draft.id) await api.put((isAdmin ? '/api/admin/products/' : '/api/vendor/products/') + draft.id, payload);
      else await api.post(isAdmin ? '/api/admin/products' : '/api/vendor/products', payload);
      await loadProducts();
      if (page === 'admin') await loadAdmin(); else await loadVendorWorkspace();
      startNewProduct(); flash(editing ? 'Product updated.' : 'Product submitted. It will appear after approval.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function applyCoupon() {
    if (!couponCode.trim()) { setError('Enter a coupon code first.'); return; }
    if (!cart.length) { setError('Add products to your cart before applying a coupon.'); return; }
    setCouponBusy(true); setError('');
    try {
      const result = await api.post('/api/coupons/validate', {
        code: couponCode.trim(),
        items: cart.map(line => ({ productId: line.product.id, quantity: line.quantity }))
      });
      setAppliedCoupon(result.data);
      flash('Coupon ' + result.data.code + ' applied. You save ' + money(Number(result.data.discount)) + '.');
    } catch (e) {
      setAppliedCoupon(null);
      setError(errorText(e));
    } finally { setCouponBusy(false); }
  }
  async function saveVendorCoupon(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/api/vendor/coupons', {
        ...couponDraft,
        discountValue: Number(couponDraft.discountValue),
        minOrderAmount: Number(couponDraft.minOrderAmount || 0),
        maxDiscount: Number(couponDraft.maxDiscount || 0),
        usageLimit: Number(couponDraft.usageLimit || 0),
        startsAt: couponDraft.startsAt ? new Date(couponDraft.startsAt).toISOString() : '',
        expiresAt: couponDraft.expiresAt ? new Date(couponDraft.expiresAt).toISOString() : ''
      });
      setCouponDraft({ code: '', discountType: 'percentage', discountValue: '10', productIds: [], minOrderAmount: '', maxDiscount: '', usageLimit: '0', startsAt: '', expiresAt: '' });
      const refreshed = await api.get('/api/vendor/coupons');
      setVendorCoupons(refreshed.data.coupons || []);
      flash('Coupon created successfully.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function saveAdminCoupon(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api.post('/api/admin/coupons', {
        ...adminCouponDraft,
        discountValue: Number(adminCouponDraft.discountValue),
        minOrderAmount: Number(adminCouponDraft.minOrderAmount || 0),
        maxDiscount: Number(adminCouponDraft.maxDiscount || 0),
        usageLimit: Number(adminCouponDraft.usageLimit || 0),
        startsAt: adminCouponDraft.startsAt ? new Date(adminCouponDraft.startsAt).toISOString() : '',
        expiresAt: adminCouponDraft.expiresAt ? new Date(adminCouponDraft.expiresAt).toISOString() : ''
      });
      setAdminCouponDraft({ code: '', discountType: 'percentage', discountValue: '10', productIds: [], minOrderAmount: '', maxDiscount: '', usageLimit: '0', startsAt: '', expiresAt: '' });
      const refreshed = await api.get('/api/admin/coupons');
      setAdminCoupons(refreshed.data.coupons || []);
      flash('Marketplace coupon created successfully.');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function updateAdminCoupon(id: string, status: string) {
    try {
      await api.put('/api/admin/coupons/' + id, { status });
      const refreshed = await api.get('/api/admin/coupons');
      setAdminCoupons(refreshed.data.coupons || []);
      flash('Marketplace coupon status updated.');
    } catch (e) { setError(errorText(e)); }
  }
  async function deleteAdminCoupon(id: string) {
    if (!window.confirm('Delete this marketplace coupon?')) return;
    try {
      await api.delete('/api/admin/coupons/' + id);
      setAdminCoupons(current => current.filter(coupon => coupon.id !== id));
      flash('Marketplace coupon deleted.');
    } catch (e) { setError(errorText(e)); }
  }
  async function updateVendorCoupon(id: string, status: string) {
    try {
      await api.put('/api/vendor/coupons/' + id, { status });
      const refreshed = await api.get('/api/vendor/coupons');
      setVendorCoupons(refreshed.data.coupons || []);
      flash('Coupon status updated.');
    } catch (e) { setError(errorText(e)); }
  }
  async function deleteVendorCoupon(id: string) {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await api.delete('/api/vendor/coupons/' + id);
      setVendorCoupons(current => current.filter(coupon => coupon.id !== id));
      flash('Coupon deleted.');
    } catch (e) { setError(errorText(e)); }
  }
  async function deleteProduct(id: string) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete((isAdmin ? '/api/admin/products/' : '/api/vendor/products/') + id);
      await loadProducts(); if (page === 'admin') await loadAdmin(); else await loadVendorWorkspace();
      flash('Product deleted.');
    } catch (e) { setError(errorText(e)); }
  }
  async function openVendor() {
    if (!user) { await signIn(); return; }
    setPage('vendor'); setError('');
    // The vendor profile is already restored during app startup. Show the approved dashboard immediately
    // and refresh its panels in parallel instead of waiting for another profile round trip.
    if (vendor?.status === 'approved') {
      void Promise.all([loadVendorWorkspace(), loadVendor()]).catch(e => setError(errorText(e)));
      return;
    }
    try {
      const currentVendor = await loadVendor();
      if (currentVendor?.status === 'approved') await loadVendorWorkspace();
    } catch (e) { setError(errorText(e)); }
  }
  async function openAdmin() {
    if (!isAdmin) { await signIn(); return; }
    setPage('admin');
    setError('');
    if (window.location.pathname !== '/admin') pushCleanPath('/admin');
    window.scrollTo({ top: 0, behavior: 'auto' });
    try {
      const [supportRes, inbox] = await Promise.all([api.get('/api/admin/support/settings'), api.get('/api/admin/support/conversations')]);
      if (supportRes.data?.settings) setSupportAdminSettings(supportRes.data.settings);
      setSupportConversations(inbox.data?.conversations || []);
      await loadAdmin();
    } catch (e) { setError(errorText(e)); }
  }
  async function openAdminOrderHistory() {
    if (!isAdmin) { await signIn(); return; }
    setPage('admin-history');
    setError('');
    if (window.location.pathname !== '/admin/order-history') pushCleanPath('/admin/order-history');
    window.scrollTo({ top: 0, behavior: 'auto' });
    try {
      await loadAdmin();
    } catch (e) { setError(errorText(e)); }
  }
  async function saveSettings(){try{const r=await api.put('/api/admin/settings',settings);setSettings(current => normalizeMarketSettings(r.data?.settings, current));flash('Marketplace fees and commission saved.');}catch(e){setError(errorText(e));}}
  async function saveAdminPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setAdminPwBusy(true);
    try {
      const r = await api.post('/api/admin/change-password', adminPwForm);
      setAdminPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      const sec = await api.get('/api/admin/security').catch(() => null);
      if (sec?.data) setAdminSecurity(sec.data);
      flash(r.data?.message || 'Owner admin password updated securely.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setAdminPwBusy(false);
    }
  }
  async function runManualBackup() {
    setError('');
    setBackupBusy(true);
    try {
      const r = await api.post('/api/admin/backups/run', {});
      const list = await api.get('/api/admin/backups').catch(() => null);
      if (list?.data?.backups) setAdminBackups(list.data.backups);
      flash(r.data?.message || 'Backup completed and verified.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBackupBusy(false);
    }
  }
  async function verifyBackup(id: string) {
    setError('');
    setBackupBusy(true);
    try {
      const r = await api.post('/api/admin/backups/' + encodeURIComponent(id) + '/verify', {});
      const list = await api.get('/api/admin/backups').catch(() => null);
      if (list?.data?.backups) setAdminBackups(list.data.backups);
      flash(r.data?.message || 'Backup integrity verified.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBackupBusy(false);
    }
  }
  async function restoreBackupSafe(id: string) {
    if (!window.confirm('Recover any missing records from this verified backup without overwriting current live accounts?')) return;
    setError('');
    setBackupBusy(true);
    try {
      const r = await api.post('/api/admin/backups/' + encodeURIComponent(id) + '/restore', {});
      await loadAdmin();
      flash(r.data?.message || 'Safe recovery completed.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBackupBusy(false);
    }
  }
  async function setDefaultAffiliateRates(){
    if (!window.confirm('Set every existing product with no affiliate rate (or below 5%) to 5%? Existing rates of 5% or more will stay unchanged.')) return;
    setBusy(true); setError('');
    try { const r=await api.post('/api/admin/products/affiliate-default',{}); await loadAdmin(); flash('Affiliate rate update complete: '+r.data.updatedCount+' of '+r.data.totalProducts+' products set to 5%.'); }
    catch(e){setError(errorText(e));}
    finally{setBusy(false);}
  }
  async function requestWithdrawal(e:FormEvent){e.preventDefault();try{await api.post('/api/vendor/withdrawals',{...withdrawForm,amount:Number(withdrawForm.amount)});setWithdrawForm({amount:'',bankName:'',accountNumber:'',accountName:''});await loadVendorWorkspace();flash('Withdrawal request submitted for owner approval.');}catch(e){setError(errorText(e));}}
  async function updateWithdrawal(id:string,status:string){try{await api.put('/api/admin/withdrawals/'+id,{status});await loadAdmin();flash('Withdrawal status updated.');}catch(e){setError(errorText(e));}}
  async function updateAffiliateStatus(id:string,status:string) {
    try { await api.put('/api/admin/affiliates/'+id,{status}); await loadAdmin(); flash('Affiliate status updated.'); }
    catch(e) { setError(errorText(e)); }
  }
  async function updateAffiliateWithdrawal(id:string,status:string) {
    try { await api.put('/api/admin/affiliate-withdrawals/'+id,{status}); await loadAdmin(); flash('Affiliate withdrawal updated.'); }
    catch(e) { setError(errorText(e)); }
  }
  async function approveVendor(id: string, status: string) {
    try { await api.put('/api/admin/vendors/' + id, { status }); await loadAdmin(); flash('Vendor status updated.'); }
    catch (e) { setError(errorText(e)); }
  }
  async function approveProduct(id: string, status: string) {
    try { await api.put('/api/admin/products/' + id + '/review', { status }); await loadAdmin(); flash('Product review status updated.'); }
    catch (e) { setError(errorText(e)); }
  }
  async function changeOrderStatus(id: string, status: string) {
    try {
      await api.put('/api/admin/orders/' + id, { status });
      await loadAdmin();
      flash('Order updated to ' + status + '.');
    } catch (e) { setError(errorText(e)); }
  }
  async function updateAdminOrder(id: string, patch: AdminOrderPatchPayload) {
    try {
      await api.put('/api/admin/orders/' + id, patch);
      await loadAdmin();
      flash(patch.status ? 'Order updated to ' + patch.status + '.' : 'Order details saved.');
    } catch (e) { setError(errorText(e)); }
  }

  function renderCategoryIcon(slug: string, size = 18) {
    switch (slug) {
      case 'digital-products': return <Code2 size={size}/>;
      case 'digital-courses': return <GraduationCap size={size}/>;
      case 'social-media': return <Megaphone size={size}/>;
      case 'digital-services': return <Briefcase size={size}/>;
      case 'electronics': return <Laptop size={size}/>;
      case 'fashion': return <Shirt size={size}/>;
      case 'home-living': return <Home size={size}/>;
      case 'special-offers': return <Tag size={size}/>;
      case 'beauty-personal-care': return <Droplets size={size}/>;
      case 'food-groceries': return <Utensils size={size}/>;
      default: return <Package size={size}/>;
    }
  }

  function renderProductCard(p: Product) {
    const rating = Number((p as any).averageRating || (p as any).ratingAverage || 0);
    const reviewsTotal = Number((p as any).reviewCount || 0);
    const hasImage = Boolean(p.images?.[0]) && !failedImages['card:' + p.id];
    return <article className="product-card" key={p.id} onClick={() => openProduct(p)} onKeyDown={e => { if (e.key === 'Enter') openProduct(p); }} role="button" tabIndex={0}>
      <div className="product-media">
        {hasImage
          ? <img src={p.images[0]} alt={p.name} loading="lazy" referrerPolicy="no-referrer" onError={() => markImageFailed('card:' + p.id)}/>
          : <div className="media-placeholder"><Package size={34}/><span>{p.category}</span></div>}
        <button className={favorites.includes(p.id) ? 'favorite-btn saved' : 'favorite-btn'} aria-label={favorites.includes(p.id) ? 'Remove from saved products' : 'Save product'} onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}>
          <Heart size={16} fill={favorites.includes(p.id) ? 'currentColor' : 'none'}/>
        </button>
        {p.tag && <span className="product-tag">{p.tag}</span>}
        {p.stock < 1 && <span className="sold-out">Out of stock</span>}
        {p.videos?.length > 0 && <span className="video-indicator"><PlayCircle size={13}/> Video</span>}
      </div>
      <div className="product-body">
        <div className="product-meta-line">
          <span className="product-meta-cat">{p.category}</span>
          <span aria-hidden="true">·</span>
          <span>{p.vendorName || 'Yakaji Hub'}</span>
        </div>
        <h3>{p.name}</h3>
        {rating > 0 && <small className="product-rating-line"><Star size={13} fill="currentColor"/> {rating.toFixed(1)} <span>({reviewsTotal})</span></small>}
        <div className="product-foot">
          {p.discountActive ? <span className="sale-prices">
            <span className="sale-prices-top"><del>{money(p.standardPrice || p.price)}</del><small>-{p.discountPercent}%</small></span>
            <strong>{money(p.price)}</strong>
          </span> : <b>{money(p.price)}</b>}
          <button disabled={p.stock < 1} onClick={e => { e.stopPropagation(); addToCart(p); }}>
            <Plus size={15}/> {p.stock < 1 ? 'Sold out' : 'Add'}
          </button>
        </div>
        <small className="view-details-hint">{p.stock > 0 ? 'In stock · View details' : 'Currently unavailable'}</small>
      </div>
    </article>;
  }

  return <div className="market">
    <div className="top-strip">
      <div className="top-strip-inner">
        <div className="top-strip-left">
          <span className="top-strip-item"><ShieldCheck size={14}/> Buyer &amp; Payment Protection</span>
          <span className="top-strip-sep" aria-hidden="true">|</span>
          <span className="top-strip-item"><Zap size={14}/> Instant Digital Delivery</span>
          <span className="top-strip-sep" aria-hidden="true">|</span>
          <span className="top-strip-item"><Headphones size={14}/> 24/7 Live Support</span>
        </div>
        <div className="top-strip-right">
          {user ? <>
            <button type="button" onClick={openWallet}>Wallet: {money(walletSummary?.balance || 0)}</button>
            <span className="top-strip-sep" aria-hidden="true">|</span>
            <button type="button" onClick={openProfile}>{profile?.fullName || user.email || 'Account'}</button>
          </> : <>
            <button type="button" onClick={() => void signIn('login')}>Sign in</button>
            <span className="top-strip-sep" aria-hidden="true">|</span>
            <button type="button" onClick={() => void signIn('register')}>Create account</button>
          </>}
        </div>
      </div>
    </div>

    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={navigateHome} aria-label="Yakaji Digital Hub home">
          <span className="brand-symbol">Y<span>.</span></span>
          <span className="brand-wordmark"><b>Yakaji</b><small>Digital Hub</small></span>
        </button>

        <label className="header-search">
          <Search size={18}/>
          <input
            aria-label="Search marketplace"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && page !== 'catalog' && page !== 'category') navigateCatalog(); }}
            placeholder="Search products, courses, digital services or sellers..."
          />
          <button
            type="button"
            className="header-search-btn"
            aria-label="Search"
            onClick={() => { if (page !== 'catalog' && page !== 'category') navigateCatalog(); }}
          >
            Search
          </button>
        </label>

        <div className="header-right">
          {user && <button className="header-icon-btn desktop-only-action" onClick={() => void openChatInbox()} aria-label="Messages"><MessageSquare size={17}/><span>Messages</span></button>}
          {user && <button className="header-icon-btn desktop-only-action" onClick={() => { setHighlightedOrderId(''); setPage('orders'); void loadCustomerOrders(); }} aria-label="My orders"><Package size={17}/><span>Orders</span></button>}
          {user && <button className="header-icon-btn" onClick={() => void openNotifications()} aria-label="Notifications"><Bell size={17}/>{unreadNotifications > 0 && <span className="header-count-badge alert">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}<span className="desktop-only-action">Alerts</span></button>}
          <button
            className={showFavoritesOnly && page === 'catalog' ? 'header-icon-btn active desktop-only-action' : 'header-icon-btn desktop-only-action'}
            onClick={() => navigateCatalog({ favoritesOnly: !showFavoritesOnly })}
            aria-label="Saved wishlist"
          >
            <Heart size={17}/>
            {favorites.length > 0 && <span className="header-count-badge">{favorites.length}</span>}
          </button>
          <button className="cart-btn" onClick={() => setCheckoutOpen(true)} aria-label="Open shopping cart">
            <ShoppingBag size={17}/>
            <span className="cart-btn-label">Cart</span>
            <b>{cartCount}</b>
          </button>
          <button className="account-btn desktop-only-action" onClick={user ? openProfile : signIn}>
            <UserRound size={16}/>
            <span>{user ? (profile?.fullName?.split(' ')[0] || 'Account') : 'Sign in'}</span>
          </button>
          {user && <>
            <button className="header-icon-btn desktop-only-action" onClick={openWallet} aria-label="My wallet"><Wallet size={17}/><span>Wallet</span></button>
            <button className="header-icon-btn desktop-only-action" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={17}/></button>
          </>}
          <button type="button" className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={20}/>
          </button>
        </div>
      </div>
    </header>

    <div className="market-nav-wrap">
      <nav className="market-nav" aria-label="Main marketplace navigation">
        <div className="market-nav-links">
          <button className={page === 'home' ? 'nav-active' : ''} onClick={navigateHome}>Home</button>
          <button className={page === 'catalog' ? 'nav-active' : ''} onClick={() => navigateCatalog()}>All Products</button>
          <button className={page === 'category' && activeCategorySlug === 'digital-products' ? 'nav-active' : ''} onClick={() => navigateCategory('Digital Products')}>Digital Products</button>
          <button className={page === 'category' && activeCategorySlug === 'digital-courses' ? 'nav-active' : ''} onClick={() => navigateCategory('Digital Courses')}>Courses</button>
          <button className={page === 'category' && activeCategorySlug === 'digital-services' ? 'nav-active' : ''} onClick={() => navigateCategory('Digital Services')}>Services</button>
          <button className={page === 'category' && activeCategorySlug === 'electronics' ? 'nav-active' : ''} onClick={() => navigateCategory('Electronics')}>Electronics</button>
          <button className={page === 'category' && activeCategorySlug === 'social-media' ? 'nav-active' : ''} onClick={() => navigateCategory('Social Media')}>Social Media</button>
        </div>
        <div className="market-nav-portals">
          <button className="nav-portal-link" onClick={openVendor}><Store size={14}/> Vendor Portal</button>
          <button className="nav-portal-link" onClick={openAffiliate}><TrendingUp size={14}/> Affiliate</button>
          <button className="nav-portal-link" onClick={() => setPage('support')}><Headphones size={14}/> Support</button>
          {isAdmin && <button className="nav-portal-link" onClick={openAdmin}><ShieldCheck size={14}/> Owner Console</button>}
        </div>
      </nav>
    </div>

    {mobileMenuOpen && <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
      <aside className="mobile-drawer" onClick={e => e.stopPropagation()} aria-label="Mobile navigation drawer">
        <div className="mobile-drawer-head">
          <div className="brand">
            <span className="brand-symbol">Y<span>.</span></span>
            <span className="brand-wordmark"><b>Yakaji</b><small>Digital Hub</small></span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu"><X size={18}/></button>
        </div>

        <div className="mobile-drawer-group">
          <span className="mobile-drawer-label">Account &amp; Shopping</span>
          {!user ? <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void signIn(); }}><span><LogIn size={17}/> Sign in / Create account</span><ChevronRight size={16}/></button> : <>
            <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openProfile(); }}><span><UserRound size={17}/> My Profile</span><ChevronRight size={16}/></button>
            <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openWallet(); }}><span><Wallet size={17}/> My Wallet</span><b>{money(walletSummary?.balance || 0)}</b></button>
            <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); setHighlightedOrderId(''); setPage('orders'); void loadCustomerOrders(); }}><span><Package size={17}/> My Orders</span><ChevronRight size={16}/></button>
            <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openChatInbox(); }}><span><MessageSquare size={17}/> Messages</span><ChevronRight size={16}/></button>
            <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openNotifications(); }}><span><Bell size={17}/> Notifications</span>{unreadNotifications > 0 && <span className="header-count-badge alert">{unreadNotifications}</span>}</button>
          </>}
          <button className="mobile-drawer-item" onClick={() => navigateCatalog({ favoritesOnly: true })}><span><Heart size={17}/> Saved Wishlist</span><b>{favorites.length}</b></button>
          <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); setCheckoutOpen(true); }}><span><ShoppingBag size={17}/> Shopping Cart</span><b>{cartCount}</b></button>
        </div>

        <div className="mobile-drawer-group">
          <span className="mobile-drawer-label">Marketplace Portals</span>
          <button className="mobile-drawer-item" onClick={navigateHome}><span><Store size={17}/> Marketplace Home</span><ChevronRight size={16}/></button>
          <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openVendor(); }}><span><Store size={17}/> Vendor Dashboard</span><ChevronRight size={16}/></button>
          <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openAffiliate(); }}><span><TrendingUp size={17}/> Affiliate Program</span><ChevronRight size={16}/></button>
          <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); setPage('support'); }}><span><Headphones size={17}/> Help &amp; Live Support</span><ChevronRight size={16}/></button>
          {isAdmin && <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void openAdmin(); }}><span><ShieldCheck size={17}/> Owner Dashboard</span><ChevronRight size={16}/></button>}
        </div>

        <div className="mobile-drawer-group">
          <span className="mobile-drawer-label">Shop by Categories</span>
          <button className="mobile-drawer-item" onClick={() => navigateCatalog()}><span>All Products</span><ChevronRight size={16}/></button>
          {shopShowcaseCategories.map(item => <button key={item.slug} className="mobile-drawer-item" onClick={() => navigateCategory(item.slug)}><span>{item.title}</span><ChevronRight size={16}/></button>)}
          {extraCategoryPages.map(item => <button key={item.slug} className="mobile-drawer-item" onClick={() => navigateCategory(item.slug)}><span>{item.title}</span><ChevronRight size={16}/></button>)}
        </div>

        {user && <div className="mobile-drawer-group">
          <button className="mobile-drawer-item" onClick={() => { setMobileMenuOpen(false); void signOut(); }}><span><LogOut size={17}/> Sign out</span></button>
        </div>}
      </aside>
    </div>}

    {page === 'home' && <main className="ydh-container">
      <section
        className="hero-section"
        aria-roledescription="carousel"
        aria-label="Yakaji Digital Hub featured collections"
        onTouchStart={event => setHeroTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={event => {
          if (heroTouchStart === null) return;
          const delta = event.changedTouches[0]?.clientX - heroTouchStart;
          if (delta < -45) setHeroSlide(current => (current + 1) % heroSlides.length);
          if (delta > 45) setHeroSlide(current => (current - 1 + heroSlides.length) % heroSlides.length);
          setHeroTouchStart(null);
        }}
      >
        <div className="hero-card">
          <button className="hero-arrow hero-arrow-left" type="button" aria-label="Previous slide" onClick={() => setHeroSlide(current => (current - 1 + heroSlides.length) % heroSlides.length)}><ChevronLeft size={20}/></button>
          <div className="hero-copy" key={heroSlide}>
            <span className="hero-eyebrow">{heroSlides[heroSlide].eyebrow}</span>
            <h1>{heroSlides[heroSlide].title} <em>{heroSlides[heroSlide].highlight}</em> {heroSlides[heroSlide].ending}</h1>
            <p>{heroSlides[heroSlide].description}</p>
            <div className="hero-buttons">
              <button className="primary-btn" type="button" onClick={() => {
                if (heroSlides[heroSlide].action === 'vendor') void openVendor();
                else if (heroSlides[heroSlide].category === 'All') navigateCatalog(heroSlide === 3 ? { sort: 'price-low' } : undefined);
                else navigateCategory(heroSlides[heroSlide].category);
              }}>{heroSlides[heroSlide].button} <ArrowRight size={16}/></button>
              {heroSlide === 0 && <button className="secondary-btn" type="button" onClick={openVendor}>Become a Seller <Store size={16}/></button>}
            </div>
            <div className="hero-trust-meta">
              <span><CheckCircle2 size={14}/> {heroSlides[heroSlide].trust[0]}</span>
              <span><CheckCircle2 size={14}/> {heroSlides[heroSlide].trust[1]}</span>
              <span><CheckCircle2 size={14}/> {heroSlides[heroSlide].trust[2]}</span>
            </div>
          </div>

          <div className="hero-media">
            <img src={heroSlides[heroSlide].image} alt={heroSlides[heroSlide].visualTitle} />
            <div className="hero-media-scrim"></div>
            <div className="hero-media-caption">
              <div>
                <b>{heroSlides[heroSlide].visualTitle}</b>
                <small>{heroSlides[heroSlide].visualSubtitle}</small>
              </div>
              <small>{heroSlides[heroSlide].footnote}</small>
            </div>
          </div>

          <button className="hero-arrow hero-arrow-right" type="button" aria-label="Next slide" onClick={() => setHeroSlide(current => (current + 1) % heroSlides.length)}><ChevronRight size={20}/></button>
          <div className="hero-pagination" aria-label="Select slide">
            {heroSlides.map((slide, index) => <button key={slide.eyebrow} type="button" aria-label={`Show slide ${index + 1}`} aria-current={heroSlide === index ? 'true' : undefined} className={heroSlide === index ? 'active' : ''} onClick={() => setHeroSlide(index)} />)}
          </div>
        </div>
      </section>

      <section className="benefit-strip" aria-label="Marketplace assurances">
        <div className="benefit-item"><span className="benefit-icon"><ShieldCheck size={18}/></span><div><b>Protected Checkout</b><small>Wallet, Paystack &amp; Bank Transfer</small></div></div>
        <div className="benefit-item"><span className="benefit-icon"><Zap size={18}/></span><div><b>Fast Order Processing</b><small>Instant access for digital items</small></div></div>
        <div className="benefit-item"><span className="benefit-icon"><Headphones size={18}/></span><div><b>Dedicated Live Care</b><small>Direct vendor chat &amp; 24/7 support</small></div></div>
        <div className="benefit-item"><span className="benefit-icon"><Award size={18}/></span><div><b>Verified Independent Sellers</b><small>Reviewed storefronts &amp; buyer ratings</small></div></div>
      </section>

      <section className="category-showcase market-section" aria-label="Shop by categories">
        <div className="section-head">
          <div>
            <span className="eyebrow">EXPLORE OUR MARKETPLACE</span>
            <h2>Shop by Categories</h2>
            <p>Visual storefronts for digital goods, online courses, social media channels, services, and physical products.</p>
          </div>
          <button className="view-all-link" onClick={() => navigateCatalog()}>All Products <ArrowRight size={15}/></button>
        </div>
        <div className="category-card-grid">
          {shopShowcaseCategories.map(item => <button
            key={item.slug}
            className="category-showcase-card"
            onClick={() => navigateCategory(item.slug)}
          >
            <div className="category-card-visual">
              <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" />
              <div className="category-card-scrim" />
              <span className="category-card-icon-badge" aria-hidden="true">{renderCategoryIcon(item.slug, 16)}</span>
              <span className="category-card-go" aria-hidden="true"><ArrowRight size={14}/></span>
            </div>
            <div className="category-card-body">
              <CategoryLogoCluster slug={item.slug} size="sm" />
              <b>{item.title}</b>
              <small>{item.hint}</small>
            </div>
          </button>)}
        </div>
      </section>

      <section className="promo-grid" aria-label="Featured marketplace pillars">
        <article className="promo-card promo-course">
          <div>
            <span className="promo-kicker">ACADEMY · SKILL UP</span>
            <h3>Master High-Demand Digital Skills</h3>
            <p>Creator courses, AI guides, and step-by-step training resources.</p>
          </div>
          <button type="button" onClick={() => navigateCategory('Digital Courses')}>Explore Courses <ArrowRight size={15}/></button>
        </article>
        <article className="promo-card promo-services">
          <div>
            <span className="promo-kicker">SOLUTIONS · FOR BUSINESS</span>
            <h3>Launch &amp; Scale with Vetted Services</h3>
            <p>CAC registration, branding, technical setups, and growth tools.</p>
          </div>
          <button type="button" onClick={() => navigateCategory('Digital Services')}>Browse Services <ArrowRight size={15}/></button>
        </article>
        <article className="promo-card promo-deals">
          <div>
            <span className="promo-kicker">CURATED VALUE</span>
            <h3>Explore Top Marketplace Offers</h3>
            <p>Compare live vendor pricing and apply checkout coupons easily.</p>
          </div>
          <button type="button" onClick={() => navigateCategory('Special Offers')}>View Offers <ArrowRight size={15}/></button>
        </article>
      </section>

      <section className="market-section" id="market">
        <div className="section-head">
          <div>
            <span className="eyebrow">HANDPICKED FROM OUR LIVE CATALOGUE</span>
            <h2>Trending Products</h2>
            <p>Popular listings currently available from verified Yakaji Digital Hub vendors.</p>
          </div>
          <button className="view-all-link" onClick={() => navigateCatalog()}>View All <ArrowRight size={15}/></button>
        </div>

        <div className="market-search-inline">
          <form className="search-field" onSubmit={e => { e.preventDefault(); navigateCatalog(); }}>
            <Search size={18}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products, categories or sellers..."/>
          </form>
        </div>

        {homeTrendingProducts.length ? <>
          <div className="product-grid">{homeTrendingProducts.map(renderProductCard)}</div>
          <div className="trending-footer-cta">
            <button type="button" className="secondary-btn" onClick={() => navigateCatalog()}>
              Browse Complete Catalog ({approvedProducts.length}) <ArrowRight size={16}/>
            </button>
          </div>
        </> : <div className="empty-box"><Package size={36}/><h3>No products match your search</h3><p>Clear your search query or explore our complete catalog page.</p><button className="secondary-btn" onClick={() => { setSearch(''); navigateCatalog(); }}>Browse Complete Catalog</button></div>}
      </section>

      <section className="partner-grid" aria-label="Sell and earn with Yakaji">
        <article className="vendor-callout">
          <div>
            <span className="eyebrow">SELL ON YAKAJI</span>
            <h2>Launch Your Vendor Storefront</h2>
            <p>Reach buyers across digital downloads, courses, services, and physical goods. Manage inventory, coupons, payouts, and customer messages from one dedicated workspace.</p>
          </div>
          <button className="primary-btn" onClick={openVendor}>Start Selling <ArrowRight size={16}/></button>
        </article>
        <article className="vendor-callout affiliate-callout">
          <div>
            <span className="eyebrow">PARTNER EARNINGS</span>
            <h2>Earn with the Affiliate Programme</h2>
            <p>Promote verified marketplace products with unique trackable referral links. Earn vendor-set commissions on completed sales without managing inventory.</p>
          </div>
          <button className="primary-btn" onClick={openAffiliate}>Join Affiliate Programme <TrendingUp size={16}/></button>
        </article>
      </section>
    </main>}

    {page === 'catalog' && <main className="ydh-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={navigateHome}>Marketplace Home</button>
        <span aria-hidden="true">/</span>
        <strong>Complete Product Catalog</strong>
      </nav>

      <section className="page-banner is-visual">
        <div className="page-banner-copy">
          <div className="page-banner-main">
            <span className="page-banner-icon">{renderCategoryIcon('home-living', 22)}</span>
            <div>
              <span className="eyebrow">COMPLETE MARKETPLACE CATALOGUE</span>
              <h1>All Products</h1>
              <p>Browse every verified digital download, online course, social media channel, service, and physical product across Yakaji Digital Hub.</p>
            </div>
          </div>
          <div className="page-banner-meta">
            <span className="page-banner-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'listing' : 'listings'}</span>
          </div>
        </div>
        <div className="page-banner-visual">
          <img src={catalogBannerImage} alt="Yakaji Digital Hub complete marketplace showcase" referrerPolicy="no-referrer" />
        </div>
      </section>

      <section className="catalog-department-strip" aria-label="Browse dedicated category pages">
        {allCategoryPages.map(item => <button
          key={item.slug}
          type="button"
          className="catalog-dept-tile"
          onClick={() => navigateCategory(item.slug)}
        >
          <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" />
          <span>{item.title}</span>
        </button>)}
      </section>

      <div className="catalog-search-row">
        <label className="search-field">
          <Search size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all products, categories or sellers..."/>
        </label>
      </div>

      <div className="category-list" role="tablist" aria-label="Filter catalog by category">
        <button className={category === 'All' ? 'selected' : ''} onClick={() => setCategory('All')}>All Products</button>
        {categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}
      </div>

      <div className="catalog-toolbar">
        <span>Showing {visibleProducts.length} of {approvedProducts.length} approved products</span>
        <div className="catalog-toolbar-controls">
          <button className={showFavoritesOnly ? 'filter-chip active' : 'filter-chip'} onClick={() => setShowFavoritesOnly(value => !value)}>
            <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'}/> Saved ({favorites.length})
          </button>
          <label className="sort-control">
            Sort by
            <select aria-label="Sort catalog products" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="featured">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {visibleProducts.length ? <div className="product-grid">{visibleProducts.map(renderProductCard)}</div> : <div className="empty-box"><Package size={36}/><h3>No products match these filters</h3><p>Try clearing your search or category filter to view the complete catalog.</p><button className="secondary-btn" onClick={() => { setCategory('All'); setSearch(''); setShowFavoritesOnly(false); }}>Show all products</button></div>}
    </main>}

    {page === 'category' && <main className="ydh-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={navigateHome}>Marketplace Home</button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={() => navigateCatalog()}>All Products</button>
        <span aria-hidden="true">/</span>
        <strong>{activeCategoryMeta.title}</strong>
      </nav>

      <section className="page-banner is-visual">
        <div className="page-banner-copy">
          <div className="page-banner-main">
            <span className="page-banner-icon">{renderCategoryIcon(activeCategoryMeta.slug, 24)}</span>
            <div>
              <span className="eyebrow">{activeCategoryMeta.eyebrow}</span>
              <h1>{activeCategoryMeta.title}</h1>
              <p>{activeCategoryMeta.description}</p>
            </div>
          </div>
          <CategoryLogoCluster slug={activeCategoryMeta.slug} size="lg" showLabels />
          <div className="page-banner-meta">
            <span className="page-banner-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'listing' : 'listings'}</span>
            <button type="button" className="secondary-btn" onClick={() => navigateCatalog()}>View All Products <ArrowRight size={15}/></button>
          </div>
        </div>
        <div className="page-banner-visual">
          <img src={activeCategoryMeta.image} alt={activeCategoryMeta.title} referrerPolicy="no-referrer" />
        </div>
      </section>

      <section className="department-highlights" aria-label={`Inside ${activeCategoryMeta.title}`}>
        {activeCategoryMeta.highlights.map(item => (
          <article className="dept-highlight-card" key={item.title}>
            <span className={'dept-highlight-icon accent-' + item.accent}>
              <CategoryHighlightIcon iconKey={item.iconKey} size={20} />
            </span>
            <div>
              <b>{item.title}</b>
              <small>{item.subtitle}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="catalog-search-row">
        <label className="search-field">
          <Search size={18}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${activeCategoryMeta.title}...`}/>
        </label>
      </div>

      <div className="category-list" aria-label="Switch category page">
        <button onClick={() => navigateCatalog()}>All Products</button>
        {allCategoryPages.map(item => <button
          key={item.slug}
          className={activeCategorySlug === item.slug ? 'selected' : ''}
          onClick={() => navigateCategory(item.slug)}
        >
          {item.title}
        </button>)}
      </div>

      <div className="catalog-toolbar">
        <span>{visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'} in {activeCategoryMeta.title}</span>
        <div className="catalog-toolbar-controls">
          <button className={showFavoritesOnly ? 'filter-chip active' : 'filter-chip'} onClick={() => setShowFavoritesOnly(value => !value)}>
            <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'}/> Saved ({favorites.length})
          </button>
          <label className="sort-control">
            Sort by
            <select aria-label="Sort category products" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="featured">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {visibleProducts.length ? <div className="product-grid">{visibleProducts.map(renderProductCard)}</div> : <div className="empty-box"><Package size={36}/><h3>No listings in {activeCategoryMeta.title} yet</h3><p>Explore the complete marketplace catalog or choose another category above.</p><button className="primary-btn" onClick={() => navigateCatalog()}>Browse Complete Catalog <ArrowRight size={15}/></button></div>}
    </main>}

    {page === 'affiliate' && (
      <AffiliateDashboard
        user={user}
        signIn={signIn}
        navigateHome={navigateHome}
        openAffiliate={openAffiliate}
        busy={busy}
        flash={flash}
        affiliateApplication={affiliateApplication}
        affiliateDashboard={affiliateDashboard}
        affiliateTransfer={affiliateTransfer}
        affiliateProducts={affiliateProducts}
        affiliateForm={affiliateForm}
        setAffiliateForm={setAffiliateForm}
        applyAsAffiliate={applyAsAffiliate}
        affiliateWithdrawForm={affiliateWithdrawForm}
        setAffiliateWithdrawForm={setAffiliateWithdrawForm}
        affiliateWithdrawBusy={affiliateWithdrawBusy}
        requestAffiliateWithdrawal={requestAffiliateWithdrawal}
        copyProductLinkWithReferral={copyProductLinkWithReferral}
        shareAffiliateProduct={shareAffiliateProduct}
        shareProductToNetwork={shareProductToNetwork}
        money={money}
      />
    )}
    {page === 'support' && <main className="workspace">
      <button className="back-link" onClick={navigateHome}><ArrowLeft size={16}/> Back to marketplace</button>
      <div className="workspace-heading"><div><span className="eyebrow">YAKAJI CUSTOMER CARE</span><h1>Help & Support Centre</h1><p>Your conversation is private. Only you and authorised marketplace support staff can read it.</p></div></div>
      <div className="support-contact-grid"><a className="support-contact-card" href="https://wa.me/2349042497253" target="_blank" rel="noreferrer"><b>WhatsApp Support</b><strong>09042497253</strong><small>Chat with our team on WhatsApp</small></a><a className="support-contact-card" href="mailto:yakajidigitalhub@gmail.com"><b>Email Support</b><strong>yakajidigitalhub@gmail.com</strong><small>Send us your question or complaint</small></a></div>
      <section className="panel support-chat-panel"><div className="panel-title"><div><h2>Live customer support</h2><p>{supportStatus.online ? 'Support is online. If an agent is busy, you will be placed in the private queue.' : (supportStatus.offlineMessage || 'Live chat is offline. You can still leave a private message or contact us below.')}</p></div><span className="role-label">{supportStatus.online ? 'Support Online' : 'Support Offline'}</span></div>
        {!user ? <div className="panel centered"><h3>Sign in to start a private support conversation</h3><p>Sign-in protects your chat so other customers cannot access your messages.</p><button className="primary-btn" onClick={signIn}>Sign in to chat</button></div> : <>
          <div className="checkout-note"><b>{supportStatus.conversation?.mode === 'human' ? 'Human agent requested / connected' : 'Yakaji AI Assistant is ready'}</b><br/>{supportStatus.conversation?.mode === 'human' ? 'The AI assistant is paused for this conversation. Only a human support agent can reply until the team resumes AI support.' : 'Ask about shopping, orders, payments, vendors, affiliate accounts, wallets, products and how to use the marketplace.'}</div>
          {supportStatus.conversation?.status === 'waiting' && <div className="checkout-note">Your request is waiting for a human support agent{supportStatus.conversation.queuePosition ? ' — queue position ' + supportStatus.conversation.queuePosition : ''}.</div>}
          {supportStatus.conversation?.status === 'on_hold' && <div className="checkout-note">Your human support conversation is currently on hold. The support team will continue when available.</div>}
          {supportStatus.conversation?.status === 'closed' && <div className="checkout-note">This conversation is closed. Start a new chat by reopening Support Centre.</div>}
          <div className="support-messages">{supportMessages.map((m:any)=><div key={m.id} className={'support-message '+m.sender}><small>{m.sender === 'admin' ? 'Yakaji Support' : m.sender === 'customer' ? 'You' : m.sender === 'assistant' ? 'Yakaji AI Assistant' : 'Support'}</small><p>{m.message}</p></div>)}{!supportMessages.length && <p className="muted">Welcome. Ask Yakaji Assistant how to use the marketplace or request a human support agent.</p>}</div>
          <div className="support-chat-actions"><button type="button" className="secondary-btn" onClick={requestHumanSupport} disabled={!supportConversation || supportStatus.conversation?.mode === 'human' || supportStatus.conversation?.status === 'closed'}>Talk to a human agent</button><small>Human support will take over this private conversation and pause AI replies.</small></div>
          <form className="support-send-row" onSubmit={sendSupportMessage}><input required maxLength={1500} value={supportDraft} onChange={e=>setSupportDraft(e.target.value)} placeholder={supportStatus.conversation?.mode === 'human' ? 'Message the human support team...' : 'Ask Yakaji Assistant a question...'} disabled={!supportConversation || supportStatus.conversation?.status === 'closed'}/><button className="primary-btn" disabled={busy || !supportConversation || supportStatus.conversation?.status === 'closed'}>Send <ArrowRight size={16}/></button></form>
        </>}
      </section>
      <section className="panel"><h2>Refund & Return Policy</h2><p>Contact support within 48 hours after delivery if an item is damaged, incorrect or significantly different from its listing. Keep the product, packaging and proof of purchase while your request is reviewed.</p><p>Digital products and services are generally not returnable after delivery, download, access or activation, except where delivery failed, the product is materially defective or applicable law requires otherwise.</p><p>Refunds are not automatic. The support team reviews each request, may ask for photos or order details, and confirms whether it is approved. Approved refunds are returned through the original payment method where possible. Bank-transfer refunds may require verified bank details.</p><p><b>How to request:</b> Send your order number, reason and supporting evidence through this chat, WhatsApp or email. Do not send passwords, card PINs or OTPs.</p></section>
    </main>}
    {page === 'orders' && <main className="workspace">
      <button className="back-link" onClick={navigateHome}><ArrowLeft size={16}/> Back to marketplace</button>
      <div className="workspace-heading"><div><span className="eyebrow">YOUR PURCHASES</span><h1>My Orders & History</h1><p>Every order, item, payment, delivery and refund detail in one place.</p></div><button className="secondary-btn" onClick={loadCustomerOrders} disabled={customerOrdersLoading}>{customerOrdersLoading ? 'Refreshing...' : 'Refresh history'}</button></div>
      {!user ? <div className="panel centered"><h2>Sign in to view your order history</h2><button className="primary-btn" onClick={signIn}>Sign in</button></div> :
      customerOrdersLoading && !customerOrders.length ? <div className="panel centered"><p>Loading your order history...</p></div> :
      customerOrders.length ? customerOrders.map(order => {
        const subtotal = Number(order.subtotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0));
        const transferFee = Number(order.transferFee || 0);
        const stages = ['New', 'Confirmed', 'Processing', 'Ready for Shipping', 'Shipped', 'Out for Delivery', 'Delivered', 'Completed'];
        const currentStage = ['Cancelled', 'Refunded', 'Returned'].includes(order.status) ? -1 : stages.indexOf(order.status);
        return <section className={'panel order-history-card' + (highlightedOrderId === order.id ? ' is-highlighted' : '')} id={'customer-order-' + order.id} key={order.id}>
          <div className="panel-title"><div><span className="eyebrow">ORDER DETAILS</span><h2>{order.orderNumber}</h2><p>Placed {new Date(order.createdAt).toLocaleString()}</p></div><div><span className="status">{order.status}</span><p><span className={'status '+(order.paymentStatus === 'completed' ? 'approved' : order.paymentStatus === 'rejected' ? 'rejected' : 'pending')}>{paymentStatusLabel(order.paymentStatus)}</span></p></div></div>
          <div className="order-history-items"><h3>Items ordered</h3>{order.items.map((item, index) => <div className="manage-row" key={item.productId + '-' + index}><div className="manage-main"><b>{item.name}</b><small>Quantity: {item.quantity}{item.option ? ' · Option: ' + item.option : ''} · Unit price: {money(item.price)}</small></div><b>{money(item.price * item.quantity)}</b></div>)}</div>
          <div className="panel-title"><h3>Order progress</h3><b>{order.status}</b></div>
          {['Cancelled', 'Refunded', 'Returned'].includes(order.status) ? <p className="checkout-note">This order is {order.status.toLowerCase()}.{order.refundStatus ? ' Refund: ' + order.refundStatus + '.' : ''}</p> : <div className="order-progress">{stages.map((stage, index) => <div className={'order-progress-step ' + (currentStage >= index ? 'is-complete' : '')} key={stage}><span>{index + 1}</span><small>{stage}</small></div>)}</div>}
          <div className="total-line"><span>Products subtotal</span><b>{money(subtotal)}</b></div>
          {transferFee > 0 && <div className="total-line"><span>Bank transfer fee</span><b>{money(transferFee)}</b></div>}
          <div className="total-line"><span>Order total</span><b>{money(order.total)}</b></div>
          <div className="order-info-grid">
            <div><small>Payment method</small><b>{order.paymentMethod || 'Not recorded'}</b></div>
            <div><small>Payment status</small><b>{paymentStatusLabel(order.paymentStatus)}</b></div>
            <div><small>Payment reference</small><b>{order.paystackReference || order.paymentReference || order.orderNumber}</b></div>
            <div><small>Paid date</small><b>{order.paymentCompletedAt ? new Date(order.paymentCompletedAt).toLocaleString() : 'Awaiting payment confirmation'}</b></div>
            <div><small>Customer name</small><b>{order.customerName || 'Not provided'}</b></div>
            <div><small>Phone / WhatsApp</small><b>{order.phone || 'Not provided'}</b></div>
            <div><small>Email</small><b>{order.email || 'Not provided'}</b></div>
            <div><small>Delivery address / instructions</small><b>{order.address || 'Not provided'}</b></div>
            {(order.trackingNumber || order.courier) && <div><small>Delivery tracking</small><b>{[order.courier, order.trackingNumber].filter(Boolean).join(' · ')}</b></div>}
            {order.refundStatus && <div><small>Refund status</small><b>{order.refundStatus}{order.refundedAt ? ' · ' + new Date(order.refundedAt).toLocaleString() : ''}</b></div>}
            <div><small>Last updated</small><b>{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'No later update recorded'}</b></div>
          </div>
          {order.paymentStatus !== 'completed' && order.status === 'New' && order.paymentMethod !== 'Wallet' && <button className="danger-icon" onClick={() => cancelCustomerOrder(order)}>Cancel unpaid order</button>}
        </section>;
      }) : <div className="panel centered"><Package size={36}/><h2>No purchases yet</h2><p>Your orders will appear here as soon as you place an order.</p><button className="primary-btn" onClick={() => navigateCatalog()}>Start shopping</button></div>}
    </main>}
    {page === 'profile' && <main className="workspace">
      <button className="back-link" onClick={navigateHome}><ArrowLeft size={16}/> Back to marketplace</button>
      <div className="workspace-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h1>My profile</h1><p>Keep your contact and delivery information up to date.</p></div></div>
      {!user ? <div className="panel centered"><h2>Sign in to manage your profile</h2><button className="primary-btn" onClick={signIn}>Sign in</button></div> :
      <form className="panel form-panel profile-form" onSubmit={saveProfile}>
        <div className="profile-picture-row">{profile?.avatarUrl ? <img className="profile-large-avatar" src={profile.avatarUrl} alt="Profile"/> : <div className="profile-large-avatar avatar-placeholder"><UserRound size={38}/></div>}<label className="avatar-picker">Upload profile picture<input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0] || null)}/><small>{avatarFile ? avatarFile.name : 'Optional · JPG, PNG or WebP · up to 8MB'}</small></label></div>
        <label>Full name<input required value={profile?.fullName || ''} onChange={e=>setProfile({...profile,fullName:e.target.value})}/></label>
        <label>Email address<input value={profile?.email || user.email || ''} disabled/></label>
        <label>Phone number<input required type="tel" value={profile?.phone || ''} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+234..."/></label>
        <label>WhatsApp number<input type="tel" value={profile?.whatsapp || ''} onChange={e=>setProfile({...profile,whatsapp:e.target.value})} placeholder="Optional"/></label>
        <label className="full-field">Home / delivery address<textarea rows={2} value={profile?.address || ''} onChange={e=>setProfile({...profile,address:e.target.value})}/></label>
        <label>City<input value={profile?.city || ''} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>
        <label>State<input value={profile?.state || ''} onChange={e=>setProfile({...profile,state:e.target.value})}/></label>
        <label>Country<input value={profile?.country || 'Nigeria'} onChange={e=>setProfile({...profile,country:e.target.value})}/></label>
        <button className="primary-btn" disabled={busy}>{busy ? 'Saving profile...' : 'Save profile details'}</button>
      </form>}
    </main>}

    {page === 'vendor' && (
      <VendorDashboard
        user={user}
        vendor={vendor}
        shopForm={shopForm}
        setShopForm={setShopForm}
        applyAsVendor={applyAsVendor}
        signIn={signIn}
        navigateHome={navigateHome}
        refreshVendor={openVendor}
        busy={busy}
        isAdmin={isAdmin}
        wallet={wallet}
        settings={settings}
        withdrawForm={withdrawForm}
        setWithdrawForm={setWithdrawForm}
        requestWithdrawal={requestWithdrawal}
        vendorReports={vendorReports}
        analyticsPeriod={analyticsPeriod}
        setAnalyticsPeriod={setAnalyticsPeriod}
        products={products}
        categories={categories}
        draft={draft}
        setDraft={setDraft}
        editing={editing}
        startNewProduct={startNewProduct}
        startEdit={startEdit}
        saveProduct={saveProduct}
        deleteProduct={deleteProduct}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        vendorCoupons={vendorCoupons}
        couponDraft={couponDraft}
        setCouponDraft={setCouponDraft}
        saveVendorCoupon={saveVendorCoupon}
        updateVendorCoupon={updateVendorCoupon}
        deleteVendorCoupon={deleteVendorCoupon}
        orders={orders}
        money={money}
        openWallet={openWallet}
      />
    )}

        {page === 'wallet' && <main className="workspace"><button className="back-link" onClick={navigateHome}><ArrowLeft size={16}/> Back to marketplace</button><div className="workspace-heading"><div><span className="eyebrow">YOUR MONEY</span><h1>My wallet</h1><p>Add money, request a bank withdrawal, or use your balance to pay for marketplace products.</p></div><span className="role-pill">Wallet account</span></div>{!user ? <div className="panel centered"><h2>Sign in to access your wallet</h2><button className="primary-btn" onClick={signIn}>Sign in</button></div> : <><div className="stats-row"><div><small>Available wallet balance</small><b>{money(walletSummary?.balance || 0)}</b></div><div><small>Wallet funding fee</small><b>{money(walletSummary?.topupFee ?? 100)}</b></div><div><small>Withdrawal transfer fee</small><b>{money(settings?.withdrawalFee ?? 100)}</b></div></div><section className="panel"><div className="panel-title"><div><h2>Wallet actions</h2><p>Fund your wallet, request a withdrawal, or refresh the latest balance.</p></div><button className="secondary-btn" onClick={refreshWallet}>Refresh wallet</button></div><div className="hero-buttons"><a className="primary-btn" href="#wallet-fund">Add money</a><a className="secondary-btn" href="#wallet-withdraw">Withdraw money</a></div></section><section className="panel" id="wallet-fund"><h2>Add money to wallet</h2><p className="muted">Enter the exact amount you want credited. Paystack uses a secure hosted checkout and credits your wallet only after server verification. Manual bank transfers remain pending until the owner confirms receipt. The wallet funding fee is fixed at ₦100 for every wallet top-up.</p><form className="product-form" onSubmit={startWalletTopup}><label>Amount to add (₦)<input type="number" min="100" max="5000000" step="1" required value={walletTopupAmount} onChange={e=>setWalletTopupAmount(e.target.value)} placeholder="e.g. 5000"/></label><label>Payment method<select value={walletTopupMethod} onChange={e=>setWalletTopupMethod(e.target.value)}><option value="Paystack" disabled={!paystackReady}>Paystack {paystackReady ? '(Card / Bank / USSD)' : '(not connected — add Paystack Secret Key)'}</option><option value="Bank transfer">Manual bank transfer</option></select></label>{walletTopupMethod==='Paystack' && <label>Email address for Paystack<input type="email" required value={walletTopupEmail || user?.email || ''} onChange={e=>setWalletTopupEmail(e.target.value)} placeholder="name@example.com"/></label>}<div className="full-field checkout-note">Wallet credit: {money(Number(walletTopupAmount)||0)} · Fixed fee: {money(walletSummary?.topupFee ?? 100)} · Total payment: {money((Number(walletTopupAmount)||0)+(walletSummary?.topupFee ?? 100))}</div><button type="submit" className="primary-btn" disabled={walletTopupBusy || !walletTopupAmount || (walletTopupMethod==='Paystack' && !paystackReady)}>{walletTopupBusy ? 'Preparing wallet funding...' : walletTopupMethod==='Paystack' ? 'Continue to Paystack funding' : 'Continue to manual bank funding'}</button></form></section><section className="panel"><div className="panel-title"><div><h2>My wallet top-up requests</h2><p>Pending transfers are not spendable. Completed payments are credited to your wallet.</p></div><button className="secondary-btn" onClick={refreshWallet}>Refresh status</button></div>{walletSummary?.topups?.length ? walletSummary.topups.map((t:any)=><div className="manage-row" key={t.id}><div className="manage-main"><b>{money(t.amount)} wallet credit</b><small>{t.paymentMethod} · Fee {money(t.fee)} · Total paid {money(t.total)} · {new Date(t.createdAt).toLocaleString()}</small><small>Reference: {t.id}{t.paystackReference ? ' · Paystack: '+t.paystackReference : ''}</small></div><span className={'status '+(t.status==='completed'?'approved':'')}>{t.status}</span></div>) : <p className="muted">No wallet top-up requests yet.</p>}</section><section className="panel" id="wallet-withdraw"><h2>Withdraw money to your bank</h2><p className="muted">Enter your bank details and amount. The requested amount plus the displayed transfer fee is reserved from your wallet. The marketplace owner reviews the request and completes the bank transfer manually. If rejected, the full reserved amount and fee are returned to your wallet.</p><form className="product-form" onSubmit={requestCustomerWithdrawal}><label>Amount to receive (₦)<input type="number" min="1000" max="5000000" step="1" required value={customerWithdrawalForm.amount} onChange={e=>setCustomerWithdrawalForm({...customerWithdrawalForm,amount:e.target.value})}/></label><label>Bank name<input required value={customerWithdrawalForm.bankName} onChange={e=>setCustomerWithdrawalForm({...customerWithdrawalForm,bankName:e.target.value})} placeholder="e.g. Moniepoint"/></label><label>10-digit account number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={customerWithdrawalForm.accountNumber} onChange={e=>setCustomerWithdrawalForm({...customerWithdrawalForm,accountNumber:e.target.value.replace(/\D/g,'').slice(0,10)})}/></label><label>Account name<input required value={customerWithdrawalForm.accountName} onChange={e=>setCustomerWithdrawalForm({...customerWithdrawalForm,accountName:e.target.value})}/></label><div className="full-field checkout-note">Amount to receive: {money(Number(customerWithdrawalForm.amount)||0)} · Fee: {money(settings?.withdrawalFee ?? 100)} · Total wallet debit: {money((Number(customerWithdrawalForm.amount)||0)+(settings?.withdrawalFee ?? 100))}</div><button type="submit" className="primary-btn" disabled={customerWithdrawalBusy || !customerWithdrawalForm.amount}>{customerWithdrawalBusy ? 'Submitting withdrawal request...' : 'Submit withdrawal request'}</button></form><h3>My withdrawal requests</h3>{customerWithdrawals.length ? customerWithdrawals.map((w:any)=><div className="manage-row" key={w.id}><div className="manage-main"><b>{money(w.amount)} requested · Fee {money(w.fee)}</b><small>{w.bankName} · {w.accountNumber} · {w.accountName}</small><small>{new Date(w.createdAt).toLocaleString()}</small></div><span className={'status '+(w.status==='paid'?'approved':w.status)}>{w.status}</span></div>) : <p className="muted">No withdrawal requests yet.</p>}</section><section className="panel"><h2>Wallet transaction history</h2>{walletSummary?.transactions?.length ? walletSummary.transactions.map((t:any)=><div className="manage-row" key={t.id}><div className="manage-main"><b>{t.description}</b><small>{new Date(t.createdAt).toLocaleString()} · {t.type} · Ref: {t.reference}</small></div><b>{t.amount>0?'+':''}{money(t.amount)}</b></div>) : <p className="muted">No wallet transactions yet.</p>}</section></>}</main>}

    {page === 'admin' && <main className="workspace">
      <button className="back-link" onClick={navigateHome}><ArrowLeft size={16}/> Back to marketplace</button>
      {!isAdmin ? <div className="panel centered"><Package size={40}/><h2>Page unavailable</h2><p>This marketplace page is not available for your current account.</p><button className="primary-btn" onClick={navigateHome}>Return to marketplace</button></div> : <>
      <div className="admin-heading">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">YAKAJI DIGITAL HUB · CONTROL CENTRE</span>
            <h1>Marketplace overview</h1>
            <p>Monitor performance, manage daily operations and control your marketplace cleanly.</p>
          </div>
          <span className="role-pill"><ShieldCheck size={16}/> Owner / Admin</span>
        </div>
        <div className="admin-heading-actions">
          <button type="button" className="secondary-btn" onClick={() => void openAdminOrderHistory()}>
            <History size={16}/> Order History ({allFulfilledOrders.length})
          </button>
          <button type="button" className="secondary-btn admin-refresh" onClick={loadAdmin}>
            <TrendingUp size={16}/> Refresh live data
          </button>
        </div>
      </div>

      <nav className="admin-nav" aria-label="Owner dashboard navigation">
        <a href="#admin-overview"><LayoutDashboard size={15}/> Overview</a>
        <a href="#admin-announcements"><Bell size={15}/> Announcements</a>
        <a href="#admin-support"><MessageSquare size={15}/> Live support</a>
        <a href="#admin-orders"><Package size={15}/> Active orders ({activeAdminOrders.length})</a>
        <a href="#admin-payments"><Wallet size={15}/> Payments</a>
        <a href="#admin-commission-profit"><Calendar size={15}/> Profit calendar</a>
        <a href="#admin-analytics"><BarChart3 size={15}/> Analytics</a>
        <a href="#admin-affiliate-marketing"><TrendingUp size={15}/> Affiliates</a>
        <a href="#admin-products"><ShoppingBag size={15}/> Products</a>
        <a href="#admin-vendors"><Store size={15}/> Vendors</a>
        <a href="#admin-withdrawals"><Wallet size={15}/> Withdrawals</a>
        <a href="#admin-order-history"><History size={15}/> Fulfilled history</a>
      </nav>

      <section className="admin-kpis tabular-nums" id="admin-overview">
        <article className="admin-kpi kpi-green"><span><Wallet size={18}/></span><small>Paid revenue · all time</small><b>{money(adminAnalytics?.paidRevenue || 0)}</b><em>Verified completed payments</em></article>
        <article className="admin-kpi"><span><Package size={18}/></span><small>Active orders queue</small><b>{orders.filter(o => !isFulfilledOrderStatus(o.status)).length.toLocaleString()}</b><em>{allFulfilledOrders.length} fulfilled in Order History</em></article>
        <article className="admin-kpi"><span><Store size={18}/></span><small>Active vendors</small><b>{vendors.filter(v=>v.status==='approved').length}</b><em>{vendors.filter(v=>v.status==='pending').length} awaiting review</em></article>
        <article className="admin-kpi"><span><ShoppingBag size={18}/></span><small>Marketplace products</small><b>{products.length.toLocaleString()}</b><em>{products.filter(p=>p.status==='approved').length} published</em></article>
        <article className="admin-kpi"><span><Users size={18}/></span><small>Registered customers</small><b>{adminUsers.length.toLocaleString()}</b><em>Profiles in marketplace</em></article>
      </section>

      <section className="admin-quick-controls" aria-label="Quick owner controls">
        <div className="admin-quick-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>Owner Control Shortcuts</h2><p>Jump straight to any marketplace control panel or open the dedicated Order History ledger.</p></div></div>
        <div className="admin-quick-grid">
          <a href="#admin-announcements"><Bell/><b>Marketplace announcements</b><small>Send saved updates &amp; notifications to customers or vendors</small></a>
          <a href="#admin-support"><Headphones/><b>Live support desk</b><small>Collapsible fixed-height customer chat inbox</small></a>
          <a href="#admin-orders"><Package/><b>Active order queue</b><small>Update stages, shipping &amp; payment checks cleanly</small></a>
          <button type="button" className="admin-quick-action-btn" onClick={() => void openAdminOrderHistory()}><History/><b>Dedicated Order History Page</b><small>Browse &amp; filter all {allFulfilledOrders.length} completed/closed orders</small></button>
          <a href="#admin-commission-profit"><Calendar/><b>Profit calendar</b><small>Filter daily, monthly &amp; date-range commission profit</small></a>
          <a href="#admin-payments"><Wallet/><b>Payment verification</b><small>Verify Paystack or confirm incoming bank transfers</small></a>
          <a href="#admin-vendors"><Store/><b>Manage vendors</b><small>Approve, reject or suspend sellers</small></a>
          <a href="#admin-products"><ShoppingBag/><b>Manage products</b><small>Add, edit, approve or remove listings</small></a>
          <a href="#admin-affiliate-marketing"><TrendingUp/><b>Affiliate marketing</b><small>Review applicants, commissions and withdrawals</small></a>
          <a href="#admin-topups"><Wallet/><b>Wallet top-ups</b><small>Confirm customer bank or Paystack wallet funding</small></a>
          <a href="#admin-withdrawals"><ArrowRight/><b>Withdrawals</b><small>Approve or mark customer &amp; vendor bank payouts</small></a>
          <a href="#admin-finance"><ShieldCheck/><b>Fees &amp; commission</b><small>Configure marketplace charges and rates</small></a>
        </div>
      </section>

      <section className="panel" id="admin-announcements">
        <div className="panel-title">
          <div>
            <span className="eyebrow">COMMUNICATIONS · BROADCAST</span>
            <h2>Marketplace announcements</h2>
            <p className="muted">Send a saved in-app announcement and notification to all customers, vendors or one audience group.</p>
          </div>
          <button type="button" className="secondary-btn" onClick={async()=>{try{const r=await api.get('/api/admin/announcements');setAnnouncementHistory(r.data.announcements||[]);}catch(e){setError(errorText(e));}}}>Refresh history</button>
        </div>
        <form className="product-form" onSubmit={sendAnnouncement}>
          <label>Announcement title<input required maxLength={120} value={announcement.title} onChange={e=>setAnnouncement({...announcement,title:e.target.value})} placeholder="Announcement title"/></label>
          <label>Audience<select value={announcement.audience} onChange={e=>setAnnouncement({...announcement,audience:e.target.value})}><option value="all">All customers and vendors</option><option value="customers">Customers only</option><option value="vendors">Vendors only</option></select></label>
          <label className="full-field">Message<textarea required maxLength={1000} rows={3} value={announcement.message} onChange={e=>setAnnouncement({...announcement,message:e.target.value})} placeholder="Write your announcement..."/></label>
          <button className="primary-btn" disabled={busy || !announcement.title.trim() || !announcement.message.trim()}>{busy?'Sending...':'Send announcement'}</button>
        </form>
        <h3>Recent announcements ({announcementHistory.length})</h3>
        <div className="admin-scroll-list">
          {announcementHistory.length ? announcementHistory.map((item:any) => (
            <div className="manage-row" key={item.id}>
              <div className="manage-main">
                <b>{item.title}</b>
                <small>{item.audience === 'all' ? 'Customers and vendors' : item.audience} · {item.deliveredCount ?? item.sentCount ?? 0} notified · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small>
                <p>{item.message}</p>
              </div>
              <span className="status approved">Saved</span>
            </div>
          )) : <p className="muted">No announcements have been sent yet.</p>}
        </div>
      </section>

      <section className={'panel admin-support-panel' + (adminSupportCollapsed ? ' is-collapsed' : '')} id="admin-support">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CUSTOMER CARE · FIXED-HEIGHT DESK</span>
            <h2>
              Live customer support desk
              <span className={'support-live-pill ' + (supportAdminSettings.online ? 'online' : 'offline')}>
                {supportAdminSettings.online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </h2>
            <p>
              {supportConversations.length} conversation(s) · {supportConversations.filter((c: any) => c.status === 'waiting').length} waiting for agent
            </p>
          </div>
          <div className="admin-support-header-actions">
            <button type="button" className="secondary-btn" onClick={()=>api.get('/api/admin/support/conversations').then(r=>setSupportConversations(r.data.conversations||[]))}>
              Refresh inbox
            </button>
            <button
              type="button"
              className="secondary-btn"
              aria-expanded={!adminSupportCollapsed}
              onClick={() => setAdminSupportCollapsed(current => !current)}
            >
              {adminSupportCollapsed ? <><ChevronDown size={16}/> Expand chat desk</> : <><ChevronUp size={16}/> Collapse desk</>}
            </button>
          </div>
        </div>

        {!adminSupportCollapsed && <>
          <div className="support-admin-controls">
            <button type="button" className={supportAdminSettings.online ? 'primary-btn' : 'secondary-btn'} onClick={()=>updateSupportAvailability(true)}>Admin available</button>
            <button type="button" className={!supportAdminSettings.online ? 'primary-btn' : 'secondary-btn'} onClick={()=>updateSupportAvailability(false)}>Set offline / closed</button>
            <label>Max active chats
              <select value={supportAdminSettings.maxConcurrent} onChange={e=>setSupportAdminSettings((current:any)=>({...current,maxConcurrent:Number(e.target.value)}))}>
                <option value={1}>1 customer</option>
                <option value={2}>2 customers</option>
                <option value={3}>3 customers</option>
              </select>
            </label>
            <button type="button" className="secondary-btn" onClick={()=>api.put('/api/admin/support/settings',supportAdminSettings).then(r=>{setSupportAdminSettings(r.data.settings);flash('Support settings saved.');}).catch(e=>setError(errorText(e)))}>Save support settings</button>
          </div>

          <div className="profit-cal-tabs support-filter-tabs" role="tablist" aria-label="Filter support conversations">
            {([
              ['all', `All (${supportConversations.length})`],
              ['waiting', `Waiting (${supportConversations.filter((c:any)=>c.status==='waiting').length})`],
              ['human', `Human (${supportConversations.filter((c:any)=>c.mode==='human').length})`],
              ['active', `Active (${supportConversations.filter((c:any)=>c.status==='active').length})`],
              ['closed', `Closed (${supportConversations.filter((c:any)=>c.status==='closed').length})`]
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={adminSupportFilter === key ? 'active' : ''}
                onClick={() => setAdminSupportFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {supportConversations.length ? (
            <div className="support-admin-grid">
              <div className="support-thread-list" aria-label="Customer support threads">
                {filteredSupportConversations.length ? filteredSupportConversations.map((conversation:any) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={'support-thread ' + (activeSupportConversation === conversation.id ? 'active' : '')}
                    onClick={async () => {
                      setActiveSupportConversation(conversation.id);
                      const m = await api.get('/api/support/messages?conversationId=' + encodeURIComponent(conversation.id));
                      setSupportMessages(m.data.messages || []);
                    }}
                  >
                    <b>{conversation.customerName}</b>
                    <small>{conversation.email || conversation.customerId}</small>
                    <span>{conversation.lastMessage?.message || 'New support request'}</span>
                    <em>
                      {conversation.mode === 'human' ? 'Human mode' : 'AI mode'} ·{' '}
                      {conversation.status === 'waiting' ? 'Waiting' : conversation.status === 'on_hold' ? 'On hold' : conversation.status === 'active' ? 'Active' : 'Closed'}
                    </em>
                  </button>
                )) : <p className="muted support-empty-thread">No conversations match this filter.</p>}
              </div>

              <div className="support-admin-thread-pane">
                {activeSupportConversation ? (
                  <>
                    <div className="support-admin-messages" ref={supportAdminMessagesRef}>
                      {supportMessages.filter(m => m.conversationId === activeSupportConversation).map((m:any) => (
                        <div key={m.id} className={'support-admin-msg is-' + m.sender}>
                          <small>{m.sender === 'admin' ? 'You (Owner)' : m.sender === 'assistant' ? 'Yakaji AI Assistant' : m.customerName || 'Customer'}</small>
                          <p>{m.message}</p>
                        </div>
                      ))}
                      {!supportMessages.filter(m => m.conversationId === activeSupportConversation).length && (
                        <p className="muted">No messages in this thread yet.</p>
                      )}
                    </div>

                    <div className="support-admin-thread-actions">
                      <button type="button" className="primary-btn compact-btn" onClick={()=>updateSupportConversationStatus(activeSupportConversation,'active','human')}>Take over (Human)</button>
                      <button type="button" className="secondary-btn compact-btn" onClick={()=>updateSupportConversationStatus(activeSupportConversation,'active','ai')}>Resume AI</button>
                      <button type="button" className="secondary-btn compact-btn" onClick={()=>updateSupportConversationStatus(activeSupportConversation,'on_hold','human')}>Hold</button>
                      <button type="button" className="secondary-btn compact-btn" onClick={()=>updateSupportConversationStatus(activeSupportConversation,'closed','human')}>Close chat</button>
                      <button type="button" className="secondary-btn compact-btn" onClick={()=>updateSupportConversationStatus(activeSupportConversation,'active','human')}>Reopen</button>
                    </div>

                    <form className="support-send-row" onSubmit={sendAdminReply}>
                      <input
                        required
                        maxLength={1500}
                        value={adminReply}
                        onChange={e=>setAdminReply(e.target.value)}
                        placeholder="Write a private reply to this customer..."
                      />
                      <button type="submit" className="primary-btn" disabled={busy || !activeSupportConversation || !adminReply.trim()}>
                        {busy ? 'Sending…' : 'Send reply'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="support-admin-empty">
                    <MessageSquare size={28} />
                    <b>Select a customer thread</b>
                    <small>Messages scroll inside this fixed-height desk so the dashboard layout stays compact.</small>
                  </div>
                )}
              </div>
            </div>
          ) : <p className="muted">No support conversations yet.</p>}
        </>}
      </section>

      <section className="panel" id="admin-orders">
        <div className="panel-title">
          <div>
            <span className="eyebrow">OWNER ONLY · ACTIVE ORDER QUEUE</span>
            <h2>Order Management</h2>
            <p>Active orders in compact collapsible rows. Completed, cancelled and refunded transactions move to Order History.</p>
          </div>
          <div className="admin-support-header-actions">
            <button type="button" className="secondary-btn" onClick={() => void openAdminOrderHistory()}>
              <History size={15}/> Order History ({allFulfilledOrders.length})
            </button>
            <button type="button" className="secondary-btn" onClick={loadAdmin}>Refresh orders</button>
          </div>
        </div>

        <div className="stats-row tabular-nums">
          <div><small>New orders</small><b>{orders.filter(o => o.status === 'New').length}</b></div>
          <div><small>Being processed</small><b>{orders.filter(o => ['Confirmed','Processing','Ready for Shipping'].includes(o.status)).length}</b></div>
          <div><small>In delivery</small><b>{orders.filter(o => ['Shipped','Out for Delivery','Delivered'].includes(o.status)).length}</b></div>
          <div><small>Fulfilled / closed (History)</small><b>{allFulfilledOrders.length}</b></div>
        </div>

        <div className="admin-order-toolbar">
          <label className="admin-inline-search">
            <Search size={15}/>
            <input
              type="search"
              value={adminOrderSearch}
              onChange={e => setAdminOrderSearch(e.target.value)}
              placeholder="Search active orders by #, customer, phone or item..."
            />
          </label>
          <div className="profit-cal-tabs" role="tablist" aria-label="Filter active orders">
            {([
              ['all', 'All active'],
              ['New', 'New'],
              ['processing', 'Processing'],
              ['delivery', 'Delivery'],
              ['unpaid', 'Unpaid']
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={adminOrderFilter === key ? 'active' : ''}
                onClick={() => setAdminOrderFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="compact-order-list">
          {activeAdminOrders.length ? activeAdminOrders.map(order => (
            <AdminOrderRow
              key={'fulfilment-' + order.id}
              order={order}
              mode="fulfilment"
              expanded={Boolean(expandedOrderIds[order.id])}
              onToggleExpand={() => setExpandedOrderIds(current => ({ ...current, [order.id]: !current[order.id] }))}
              money={money}
              paymentStatusLabel={paymentStatusLabel}
              onChangeStatus={(id, status) => void changeOrderStatus(id, status)}
              onUpdateOrder={(id, patch) => updateAdminOrder(id, patch)}
              onConfirmPayment={(id, manual) => void confirmPayment(id, manual)}
              onReviewPayment={(id, decision) => void reviewPayment(id, decision)}
              onResendEmails={(id) => void resendOrderEmails(id)}
              resendingEmail={resendingOrderId === order.id}
            />
          )) : (
            <div className="chart-empty compact">
              <CheckCircle2 size={27}/>
              <b>{orders.length ? 'No active orders match this filter' : 'No customer orders yet'}</b>
              <small>{allFulfilledOrders.length > 0 ? 'All fulfilled orders are stored cleanly in Order History.' : 'Incoming customer orders will appear here.'}</small>
            </div>
          )}
        </div>
      </section>

      <section className="panel" id="admin-payments">
        <div className="panel-title">
          <div>
            <span className="eyebrow">OWNER ONLY · PAYMENT CONTROL</span>
            <h2>Order Payment Management</h2>
            <p>Verify received money before fulfilment. Expand any compact row for items, reference and manual review.</p>
          </div>
          <div className="admin-support-header-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowPaidInPayments(current => !current)}
            >
              {showPaidInPayments ? 'Show pending only' : 'Include already paid active orders'}
            </button>
            <button type="button" className="secondary-btn" onClick={loadAdmin}>Refresh</button>
          </div>
        </div>

        <div className="stats-row tabular-nums">
          <div><small>Awaiting payment</small><b>{orders.filter(o => o.paymentStatus !== 'completed' && !['Cancelled','Refunded'].includes(o.status)).length}</b></div>
          <div><small>Payment completed</small><b>{orders.filter(o => o.paymentStatus === 'completed').length}</b></div>
          <div><small>Rejected payments</small><b>{orders.filter(o => o.paymentStatus === 'rejected').length}</b></div>
        </div>

        <div className="compact-order-list">
          {paymentQueueOrders.length ? paymentQueueOrders.map(order => (
            <AdminOrderRow
              key={'payment-' + order.id}
              order={order}
              mode="payment"
              expanded={Boolean(expandedPaymentIds[order.id])}
              onToggleExpand={() => setExpandedPaymentIds(current => ({ ...current, [order.id]: !current[order.id] }))}
              money={money}
              paymentStatusLabel={paymentStatusLabel}
              onChangeStatus={(id, status) => void changeOrderStatus(id, status)}
              onUpdateOrder={(id, patch) => updateAdminOrder(id, patch)}
              onConfirmPayment={(id, manual) => void confirmPayment(id, manual)}
              onReviewPayment={(id, decision) => void reviewPayment(id, decision)}
              onResendEmails={(id) => void resendOrderEmails(id)}
              resendingEmail={resendingOrderId === order.id}
            />
          )) : (
            <div className="chart-empty compact">
              <CheckCircle2 size={27}/>
              <b>No pending order payments</b>
              <small>All active order payments are currently verified.</small>
            </div>
          )}
        </div>

        <div className="email-delivery-panel">
          <div className="email-delivery-head">
            <div>
              <b>Transactional Emails (SendGrid)</b>
              <small>
                {emailStatus?.configured
                  ? `Active · Sender: ${emailStatus.fromAddress} · Admin report: ${emailStatus.adminRecipient || 'salimaminu103@gmail.com'}`
                  : 'Waiting for SENDGRID_API_KEY and EMAIL_FROM server environment variables. Paid orders send receipts to Customer, Vendor shop, and Admin.'}
              </small>
            </div>
            <span className={'status ' + (emailStatus?.configured ? 'approved' : 'pending')}>
              {emailStatus?.configured ? 'SendGrid Connected' : 'Not Configured'}
            </span>
          </div>
          {emailStatus?.logs && emailStatus.logs.length > 0 && (
            <div className="admin-scroll-list email-log-list">
              {emailStatus.logs.slice(0, 18).map((log: any) => (
                <div className="manage-row email-log-row" key={log.id}>
                  <div className="manage-main">
                    <b>{log.orderNumber || 'Marketplace'} · {String(log.role || 'recipient').toUpperCase()} ({log.recipient})</b>
                    <small>{log.subject} · {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</small>
                    {log.reason && <small className="muted">{log.reason}</small>}
                  </div>
                  <span className={'status ' + (log.status === 'sent' ? 'approved' : log.status === 'failed' ? 'rejected' : 'pending')}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <AdminProfitCalendar commissionAnalytics={adminAnalytics?.commissionAnalytics} money={money} />

      <section className="admin-chart-grid" id="admin-analytics">
        <article className="admin-chart-card admin-chart-wide">
          <div className="admin-chart-head"><div><span className="eyebrow">REVENUE PERFORMANCE</span><h2>Paid revenue by month</h2><p>Last 6 months · verified completed payments only</p></div><span className="chart-key"><i/> Paid revenue</span></div>
          {monthlyTrend.some((point:any)=>Number(point.paidRevenue)>0) ? <div className="revenue-bars tabular-nums">{monthlyTrend.map((point:any)=><div className="revenue-bar-column" key={point.label}><b>{money(point.paidRevenue)}</b><div className="revenue-bar-track"><span style={{height:Math.max(4,(Number(point.paidRevenue)/maxTrendRevenue)*100)+'%'}}/></div><small>{point.label}</small></div>)}</div> : <div className="chart-empty"><BarChart3 size={30}/><b>No verified revenue yet</b><small>When payments are completed, monthly revenue will appear here.</small></div>}
        </article>
        <article className="admin-chart-card">
          <div className="admin-chart-head"><div><span className="eyebrow">ORDER ACTIVITY</span><h2>Daily orders</h2><p>Last 14 days · all order statuses</p></div><span className="chart-total tabular-nums">{orders.length}</span></div>
          {dailyTrend.some((point:any)=>Number(point.orders)>0) ? <div className="daily-bars">{dailyTrend.map((point:any,index:number)=><div className="daily-bar-column" key={index} title={point.label+': '+point.orders+' orders'}><span style={{height:Math.max(4,(Number(point.orders)/maxTrendOrders)*100)+'%'}}/><small>{index%2===0?point.label:''}</small></div>)}</div> : <div className="chart-empty compact"><Package size={27}/><b>No orders yet</b><small>New orders will be charted here.</small></div>}
        </article>
      </section>
      <section className="admin-chart-grid admin-chart-grid-lower">
        <article className="admin-chart-card">
          <div className="admin-chart-head"><div><span className="eyebrow">FULFILMENT</span><h2>Order status breakdown</h2><p>Current order pipeline</p></div></div>
          {orderStatuses.some((row:any)=>row.count>0) ? <div className="status-chart-list tabular-nums">{orderStatuses.map((row:any)=><div className="status-chart-row" key={row.status}><div><span>{row.status}</span><b>{row.count}</b></div><div className="status-track"><i style={{width:(orders.length?row.count/orders.length*100:0)+'%'}}/></div></div>)}</div> : <div className="chart-empty compact"><Package size={27}/><b>No order statuses yet</b></div>}
        </article>
        <article className="admin-chart-card">
          <div className="admin-chart-head"><div><span className="eyebrow">PAYMENT CHANNELS</span><h2>Payment methods</h2><p>Based on recorded orders</p></div></div>
          {paymentMethods.length ? <div className="payment-method-list tabular-nums">{paymentMethods.map((row:any)=><div className="payment-method-row" key={row.method}><span>{row.method}</span><b>{row.count} orders</b></div>)}</div> : <div className="chart-empty compact"><Wallet size={27}/><b>No payment records yet</b></div>}
        </article>
      </section>

      <section className="panel" id="admin-sales-reports"><h2>Sales reports by period</h2><p className="muted">All marketplace vendors and Yakaji Digital Hub owner products are included.</p><div className="category-list">{(['day','week','month','year'] as const).map(period=><button key={period} className={analyticsPeriod===period?'selected':''} onClick={()=>setAnalyticsPeriod(period)}>{period==='day'?'Today':period==='week'?'This week':period==='month'?'This month':'This year'}</button>)}</div><div className="stats-row tabular-nums"><div><small>Orders</small><b>{adminAnalytics?.reports?.[analyticsPeriod]?.orders || 0}</b></div><div><small>Units sold</small><b>{adminAnalytics?.reports?.[analyticsPeriod]?.unitsSold || 0}</b></div><div><small>Gross sales</small><b>{money(adminAnalytics?.reports?.[analyticsPeriod]?.grossSales || 0)}</b></div><div><small>Completed earnings</small><b>{money(adminAnalytics?.reports?.[analyticsPeriod]?.completedEarnings || 0)}</b></div><div><small>Pending sales</small><b>{money(adminAnalytics?.reports?.[analyticsPeriod]?.pendingSales || 0)}</b></div></div><h3>Vendor sales ranking</h3><div className="admin-scroll-list tabular-nums">{(adminAnalytics?.vendorSales || []).map((v:any)=><div className="manage-row" key={v.vendorId}><div className="manage-main"><b>{v.shopName}</b><small>{v.orders} orders · {v.unitsSold} units · Completed {money(v.completedEarnings)}</small></div><b>{money(v.grossSales)}</b></div>)}</div></section>

      <section className="panel" id="admin-affiliate-marketing">
        <div className="panel-title"><div><span className="eyebrow">OWNER ONLY · AFFILIATE PROGRAM</span><h2>Affiliate Marketing Dashboard</h2><p>One place to monitor affiliate applicants, approved marketers, tracked sales, commissions and withdrawal requests.</p></div><button className="secondary-btn" onClick={loadAdmin}>Refresh affiliate data</button></div>
        <div className="stats-row tabular-nums">
          <div><small>Affiliate applications</small><b>{Number(affiliateData.summary?.totalApplicants||0)}</b></div>
          <div><small>Awaiting approval</small><b>{Number(affiliateData.summary?.pendingApplicants||0)}</b></div>
          <div><small>Active affiliates</small><b>{Number(affiliateData.summary?.activeAffiliates||0)}</b></div>
          <div><small>Tracked sales</small><b>{Number(affiliateData.summary?.totalTrackedSales||0)}</b></div>
          <div><small>Total affiliate commissions</small><b>{money(Number(affiliateData.summary?.totalCommission||0))}</b></div>
          <div><small>Commission awaiting payout</small><b>{money(Number(affiliateData.summary?.payableCommission||0))}</b></div>
          <div><small>Paid affiliate commissions</small><b>{money(Number(affiliateData.summary?.paidCommission||0))}</b></div>
          <div><small>Pending withdrawals</small><b>{Number(affiliateData.summary?.pendingWithdrawals||0)} · {money(Number(affiliateData.summary?.withdrawalAmountPending||0))}</b></div>
        </div>
        <h3>Affiliate registration applicants</h3>
        <p className="muted">Review applicant details and approve, reject or suspend affiliate accounts. Registration payment status is shown when supplied by the registration system.</p>
        {affiliateData.affiliates?.length ? affiliateData.affiliates.map((a:any)=><div className="manage-row" key={a.id}><div className="manage-main"><b>{a.fullName || a.name || a.email || 'Affiliate applicant'}</b><small>{a.email || 'No email'} · {a.phone || 'No phone'} · WhatsApp {a.whatsapp || 'Not provided'}</small><small>{a.address || ''} {a.city || ''} {a.state || ''} · Promotion: {a.promotionMethod || 'Not supplied'}</small><small>Applied {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Date not recorded'} · Payment: {a.registrationPaymentStatus || a.paymentStatus || 'Not recorded'} · Method: {a.registrationPaymentMethod || 'Not selected'} · Fee {money(Number(a.registrationFee || 2000))}</small></div><span className={'status '+(a.status==='approved'?'approved':a.status==='rejected'?'rejected':a.status==='suspended'?'suspended':'pending')}>{a.status || 'pending'}</span>{a.registrationPaymentMethod==='Bank transfer' && a.registrationPaymentStatus==='pending_confirmation' && <button className="primary-btn" onClick={async()=>{try{await api.post('/api/admin/affiliates/'+a.id+'/confirm-transfer',{});await loadAdmin();flash('Affiliate transfer confirmed.');}catch(e){setError(errorText(e));}}}>Confirm received transfer</button>}<select aria-label={'Affiliate status for '+(a.email||a.id)} value={a.status || 'pending'} onChange={e=>updateAffiliateStatus(a.id,e.target.value)}><option value="pending">Pending review</option><option value="approved" disabled={a.registrationPaymentStatus!=='paid'}>Approve affiliate</option><option value="rejected">Reject application</option><option value="suspended">Suspend affiliate</option></select></div>) : <div className="chart-empty compact"><Users size={27}/><b>No affiliate applications yet</b><small>New applications will appear here when the affiliate registration form is connected.</small></div>}
        <h3>Affiliate sales &amp; commission records</h3>
        {affiliateData.commissions?.length ? affiliateData.commissions.map((c:any)=><div className="manage-row" key={c.id}><div className="manage-main"><b>{c.affiliateName || c.affiliateEmail || 'Affiliate'} · {c.productName || 'Product sale'}</b><small>Order {c.orderNumber || c.orderId || 'Not recorded'} · Sale {money(Number(c.saleAmount||0))} · Rate {Number(c.commissionPercent||0)}% · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</small></div><b>{money(Number(c.commissionAmount||0))}</b><span className={'status '+(c.status==='paid'?'approved':'pending')}>{c.status || 'pending'}</span></div>) : <p className="muted">No affiliate-attributed sales or commission records yet.</p>}
        <h3>Affiliate withdrawal requests</h3>
        {affiliateData.withdrawals?.length ? affiliateData.withdrawals.map((w:any)=><div className="manage-row" key={w.id}><div className="manage-main"><b>{w.affiliateName || w.affiliateEmail || 'Affiliate'} · {money(Number(w.amount||0))}</b><small>{w.bankName || 'Bank not provided'} · {w.accountName || ''} · {w.accountNumber || ''} · Requested {w.createdAt ? new Date(w.createdAt).toLocaleString() : ''}</small></div><span className={'status '+(w.status==='paid'?'approved':w.status==='rejected'?'rejected':'pending')}>{w.status || 'pending'}</span><select aria-label={'Affiliate withdrawal status '+w.id} value={w.status || 'pending'} onChange={e=>updateAffiliateWithdrawal(w.id,e.target.value)}><option value="pending">Pending</option><option value="approved" disabled={w.status!=='pending'}>Approve</option><option value="rejected" disabled={!['pending','approved'].includes(w.status)}>Reject</option><option value="paid" disabled={w.status!=='approved'}>Mark paid</option></select></div>) : <p className="muted">No affiliate withdrawal requests yet.</p>}
        <div className="checkout-note"><b>Affiliate programme:</b> Approved affiliates can access eligible active products, create unique product links, track clicks and verified completed sales, and request bank withdrawals. Each product uses the commission percentage selected by its vendor.</div>
      </section>

      <section className="panel" id="admin-products"><div className="panel-title" id="product-editor"><div><h2>{editing ? 'Edit marketplace product' : 'Add a product to Yakaji Digital Hub'}</h2><p>Publish products directly as the marketplace owner. Add photos, videos, options and stock.</p></div>{editing && <button className="secondary-btn" onClick={startNewProduct}>Cancel edit</button>}</div><form className="product-form" onSubmit={saveProduct}><label>Product name<input required value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})} placeholder="Enter product name"/></label><label>Category<select value={draft.category} onChange={e => setDraft({...draft,category:e.target.value})}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>Standard price (₦)<input required type="number" min="1" value={draft.price} onChange={e => setDraft({...draft,price:e.target.value})}/></label>
        <label>Discount method<select value={draft.discountMode} onChange={e=>setDraft({...draft,discountMode:e.target.value,discountValue:''})}><option value="none">No discount</option><option value="manual">Enter discount price</option><option value="percentage">Enter discount percentage</option></select></label>
        {draft.discountMode !== 'none' && <label>{draft.discountMode === 'manual' ? 'Discount price (₦)' : 'Discount percentage (%)'}<input required type="number" min="1" max={draft.discountMode === 'percentage' ? 99 : undefined} step="1" value={draft.discountValue} onChange={e=>setDraft({...draft,discountValue:e.target.value})}/><small>{draft.discountMode === 'manual' ? 'Enter the exact sale price. It must be lower than the standard price.' : 'The sale price will be calculated automatically from the standard price.'}</small></label>}
        {draft.discountMode !== 'none' && <><label>Discount starts (optional)<input type="datetime-local" value={draft.discountStartAt} onChange={e=>setDraft({...draft,discountStartAt:e.target.value})}/></label><label>Discount ends (optional)<input type="datetime-local" value={draft.discountEndAt} onChange={e=>setDraft({...draft,discountEndAt:e.target.value})}/></label></>}<label>Available stock<input required type="number" min="0" value={draft.stock} onChange={e => setDraft({...draft,stock:e.target.value})}/></label><label>Product label<input value={draft.tag} onChange={e => setDraft({...draft,tag:e.target.value})} placeholder="New / Popular / Sale"/></label><label>Options / variations<input value={draft.options} onChange={e => setDraft({...draft,options:e.target.value})} placeholder="Small, Medium, Large or Basic, Pro"/></label><label>Affiliate commission (%)<input type="number" required min="0" max="25" step="1" value={draft.affiliateCommissionPercent} onChange={e => setDraft({...draft,affiliateCommissionPercent:e.target.value})}/><small>Choose 0% to disable affiliate earnings, or 5%–25% to pay an affiliate on verified sales.</small></label>{isAdmin && <label>Marketplace commission (%)<input type="number" min="0" max="100" step="0.1" value={draft.marketplaceCommissionPercent} onChange={e=>setDraft({...draft,marketplaceCommissionPercent:e.target.value})} placeholder={'Use marketplace default: '+(settings?.commissionPercent ?? 8)+'%'}/><small>Owner only. Leave blank to use the current marketplace default of {settings?.commissionPercent ?? 8}%.</small></label>}<label className="full-field">Description<textarea required rows={3} value={draft.description} onChange={e => setDraft({...draft,description:e.target.value})} placeholder="Describe the product clearly"/></label><label className="full-field upload-field"><span><ImagePlus/> Product images and videos (optional when editing)</span><input type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" onChange={e => setSelectedFiles(Array.from(e.target.files || []))}/><small>Choose new photos or videos to add. Existing media stays unless you remove it below. Images up to 8MB and videos up to 30MB each.</small>{selectedFiles.length > 0 && <b>{selectedFiles.length} new file(s) selected</b>}{(draft.images.length + draft.videos.length > 0) && <small>{draft.images.length} saved image(s), {draft.videos.length} saved video(s)</small>}</label>{editing && draft.id && <div className="full-field product-media-editor"><b>Current product photos</b><div className="product-media-edit-grid">{(products.find(p=>p.id===draft.id)?.images || []).map((src,index)=><div className="product-media-edit-item" key={draft.images[index] || index}><img src={src} alt={'Product photo '+(index+1)}/><button type="button" className="danger-icon" onClick={()=>setDraft(current=>({...current,images:current.images.filter((_,i)=>i!==index)}))}>Remove photo</button></div>)}</div><small>Photo changes are optional. Removing a photo updates the product gallery when you save.</small></div>}<button className="primary-btn" disabled={busy}>{busy ? 'Saving product...' : editing ? 'Save changes' : 'Publish product'} <UploadCloud size={17}/></button></form>
      </section>

      <section className="panel"><div className="panel-title"><div><h2>All marketplace products ({products.length})</h2><p>Review, edit product details, photos, pricing, stock and affiliate commission.</p></div><button className="secondary-btn" onClick={setDefaultAffiliateRates} disabled={busy}>Set missing affiliate rates to 5%</button></div><div className="admin-scroll-list">{products.map(p=><div className="manage-row" key={p.id}><div className="mini-product">{p.images?.[0]?<img src={p.images[0]} alt=""/>:<Package/>}</div><div className="manage-main"><b>{p.name}</b><small>{p.vendorName} · {money(p.price)} · Affiliate {Number(p.affiliateCommissionPercent ?? 0)}% · {p.status}</small></div><button onClick={()=>startEdit(p)}>Edit</button>{p.status !== 'approved' && <button onClick={()=>approveProduct(p.id,'approved')}>Approve</button>}<select aria-label={'Product status for '+p.name} value={p.status} onChange={e=>approveProduct(p.id,e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><button className="danger-icon" onClick={()=>deleteProduct(p.id)}><Trash2 size={17}/></button></div>)}</div></section>

      <section className="panel" id="admin-vendors"><h2>Vendor applications and permissions</h2>{vendors.length ? vendors.map(v=><div className="manage-row" key={v.id}><div className="vendor-avatar"><Store/></div><div className="manage-main"><b>{v.shopName}</b><small>{v.ownerName} · {v.email} · {v.phone}</small><small>{v.description}</small></div><span className={'status '+v.status}>{v.status}</span><select value={v.status} onChange={e=>approveVendor(v.id,e.target.value)}><option value="pending">Pending</option><option value="approved">Approve vendor</option><option value="rejected">Reject</option><option value="suspended">Suspend</option></select></div>) : <p className="muted">No vendor applications yet.</p>}</section>

      <section className="panel" id="admin-coupons"><div className="panel-title"><div><h2>Marketplace coupon management</h2><p>Create coupons that apply to all marketplace products or selected products. Choose an exact expiry date and time.</p></div></div>
        <form className="product-form" onSubmit={saveAdminCoupon}>
          <label>Coupon code<input required minLength={3} maxLength={32} value={adminCouponDraft.code} onChange={e=>setAdminCouponDraft({...adminCouponDraft,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,'')})} placeholder="e.g. YAKAJI20"/></label>
          <label>Discount type<select value={adminCouponDraft.discountType} onChange={e=>setAdminCouponDraft({...adminCouponDraft,discountType:e.target.value})}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₦)</option></select></label>
          <label>Discount value<input required type="number" min="1" max={adminCouponDraft.discountType==='percentage'?100:10000000} value={adminCouponDraft.discountValue} onChange={e=>setAdminCouponDraft({...adminCouponDraft,discountValue:e.target.value})}/></label>
          <label>Products covered<select multiple value={adminCouponDraft.productIds} onChange={e=>setAdminCouponDraft({...adminCouponDraft,productIds:Array.from(e.target.selectedOptions).map(option=>option.value)})}>{products.filter(p=>p.status==='approved').map(p=><option key={p.id} value={p.id}>{p.name} — {p.vendorName}</option>)}</select><small>Leave unselected to apply to all approved marketplace products.</small></label>
          <label>Minimum order amount (₦)<input type="number" min="0" value={adminCouponDraft.minOrderAmount} onChange={e=>setAdminCouponDraft({...adminCouponDraft,minOrderAmount:e.target.value})}/></label>
          <label>Maximum discount (₦)<input type="number" min="0" value={adminCouponDraft.maxDiscount} onChange={e=>setAdminCouponDraft({...adminCouponDraft,maxDiscount:e.target.value})}/></label>
          <label>Maximum uses<input type="number" min="0" step="1" value={adminCouponDraft.usageLimit} onChange={e=>setAdminCouponDraft({...adminCouponDraft,usageLimit:e.target.value})}/><small>0 means unlimited.</small></label>
          <label>Starts at (optional)<input type="datetime-local" value={adminCouponDraft.startsAt} onChange={e=>setAdminCouponDraft({...adminCouponDraft,startsAt:e.target.value})}/></label>
          <label>Expiry date and time<input required type="datetime-local" value={adminCouponDraft.expiresAt} onChange={e=>setAdminCouponDraft({...adminCouponDraft,expiresAt:e.target.value})}/></label>
          <button className="primary-btn" disabled={busy}>{busy?'Creating coupon...':'Create marketplace coupon'}</button>
        </form>
        <h3>Marketplace coupons</h3>{adminCoupons.filter(coupon=>coupon.vendorId==='marketplace').length ? adminCoupons.filter(coupon=>coupon.vendorId==='marketplace').map(coupon=><div className="manage-row" key={coupon.id}><div className="manage-main"><b>{coupon.code} · {coupon.discountType==='percentage'?coupon.discountValue+'%':money(Number(coupon.discountValue))} off</b><small>Expires {new Date(coupon.expiresAt).toLocaleString()} · Used {coupon.usedCount || 0}{coupon.usageLimit?' / '+coupon.usageLimit:''}</small></div><span className={'status '+(coupon.status==='active'?'approved':'suspended')}>{new Date(coupon.expiresAt).getTime()<=Date.now()?'expired':coupon.status}</span>{coupon.status==='active' && <button className="secondary-btn" onClick={()=>updateAdminCoupon(coupon.id,'inactive')}>Deactivate</button>}{coupon.status==='inactive' && <button className="secondary-btn" onClick={()=>updateAdminCoupon(coupon.id,'active')}>Activate</button>}<button className="danger-icon" onClick={()=>deleteAdminCoupon(coupon.id)}><Trash2 size={17}/></button></div>) : <p className="muted">No marketplace coupons created yet.</p>}
      </section>

      <section className="panel" id="admin-finance"><h2>Marketplace fees &amp; earnings settings</h2><div className="product-form"><label>Customer transfer fee (₦)<input type="number" min="0" value={settings?.customerTransferFee ?? 100} onChange={e=>setSettings(current => ({...normalizeMarketSettings(current),customerTransferFee:Number(e.target.value)}))}/></label><label>Vendor withdrawal fee (₦)<input type="number" min="0" value={settings?.withdrawalFee ?? 100} onChange={e=>setSettings(current => ({...normalizeMarketSettings(current),withdrawalFee:Number(e.target.value)}))}/></label><label>Default marketplace commission (%)<input type="number" min="0" max="100" step="0.1" value={settings?.commissionPercent ?? 8} onChange={e=>setSettings(current => ({...normalizeMarketSettings(current),commissionPercent:Number(e.target.value)}))}/><small>Default is 8%. The owner can override this percentage on individual products.</small></label><label>Wallet funding fee (₦)<input type="number" value="100" readOnly/><small>Fixed at ₦100 for every wallet funding request.</small></label><label>Customer cashback (%)<input type="number" min="0" max="100" step="0.1" value={settings?.cashbackPercent ?? 1} onChange={e=>setSettings(current => ({...normalizeMarketSettings(current),cashbackPercent:Number(e.target.value)}))}/></label><button className="primary-btn" onClick={saveSettings}>Save marketplace settings</button></div><p className="muted">Cashback percentage is stored as a setting; customer wallet crediting is not enabled in this release.</p></section>
      <section className="panel" id="admin-vendor-funding"><h2>Fund a vendor wallet</h2><p className="muted">As marketplace owner, manually add any amount to an approved vendor&apos;s spendable wallet balance.</p><form className="product-form" onSubmit={fundVendorWallet}><label>Vendor<select required value={vendorCreditForm.vendorId} onChange={e=>setVendorCreditForm({...vendorCreditForm,vendorId:e.target.value})}><option value="">Select approved vendor</option>{vendors.filter(v=>v.status==='approved').map(v=><option key={v.id} value={v.id}>{v.shopName} — {v.email}</option>)}</select></label><label>Amount to add (₦)<input type="number" min="1" max="10000000" required value={vendorCreditForm.amount} onChange={e=>setVendorCreditForm({...vendorCreditForm,amount:e.target.value})}/></label><button className="primary-btn" disabled={busy || !vendorCreditForm.vendorId}>Add money to vendor wallet</button></form></section>
      <section className="panel" id="admin-topups"><h2>Customer wallet top-up requests</h2><p className="muted">Review all incoming wallet funding. For manual bank transfers, confirm only after the money is received in your bank account. For Paystack, use server-side verification: the wallet is credited only when Paystack confirms success and the amount, currency and reference match. If Paystack still reports pending or failed, the request stays pending and no credit is made. Rejecting a request never credits the wallet.</p>{walletTopups.length ? walletTopups.map(t=><div className="manage-row" key={t.id}><div className="manage-main"><b>{t.userName || t.email || 'Customer'} · {money(t.amount)} wallet credit</b><small>{t.role} · {t.email || 'No email'} · {t.paymentMethod} · Fee {money(t.fee)} · Total received {money(t.total)} · {new Date(t.createdAt).toLocaleString()}</small><small>Reference: {t.id}{t.paystackReference ? ' · Paystack reference: '+t.paystackReference : ''} · Status: {t.status}</small></div>{t.status==='pending' && <>{t.paymentMethod==='Bank transfer' ? <button className="primary-btn" onClick={()=>confirmWalletTopup(t.id)}>Confirm received transfer &amp; credit</button> : t.paymentMethod==='Paystack' ? <button className="primary-btn" onClick={()=>confirmWalletTopup(t.id)}>Verify Paystack &amp; credit if successful</button> : null}<button className="secondary-btn" onClick={()=>rejectWalletTopup(t.id)}>Reject request</button></>}<span className={'status '+(t.status==='completed'?'approved':t.status)}>{t.status}</span></div>) : <p className="muted">No customer wallet top-up requests.</p>}</section>
      <section className="panel" id="admin-customer-funding"><h2>Manually fund a customer wallet</h2><p className="muted">As marketplace owner, select a customer and add any amount directly to their spendable wallet balance. This is separate from vendor wallet funding and customer top-up requests.</p><form className="product-form" onSubmit={fundCustomerWallet}><label>Customer<select required value={customerCreditForm.customerId} onChange={e=>setCustomerCreditForm({...customerCreditForm,customerId:e.target.value})}><option value="">Select customer account</option>{adminUsers.filter(u=>u.vendorStatus==='customer').map(u=><option key={u.id} value={u.id}>{u.fullName || 'Customer'} — {u.email || u.id}</option>)}</select></label><label>Amount to add (₦)<input type="number" min="1" max="10000000" required value={customerCreditForm.amount} onChange={e=>setCustomerCreditForm({...customerCreditForm,amount:e.target.value})} placeholder="Enter amount"/></label><button type="submit" className="primary-btn" disabled={busy || !customerCreditForm.customerId || !customerCreditForm.amount}>Manually add money to customer wallet</button></form><p className="checkout-note">Customer accounts appear after they sign in and open their profile. Manual credits are recorded in wallet transaction history.</p></section>
      <section className="panel" id="admin-withdrawals"><h2>Customer &amp; vendor bank withdrawals</h2><p className="muted">Review customer wallet withdrawals and vendor sales withdrawals separately. Approve a pending request before marking it paid. Rejecting a customer request automatically returns the reserved amount and fee to the customer&apos;s wallet. Bank transfers are completed manually by the owner.</p>{withdrawals.length?withdrawals.map(w=><div className="manage-row" key={w.id}><div className="manage-main"><b>{w.withdrawalType==='customer' ? (w.customerName || w.email || 'Customer') : (w.shopName || 'Vendor')} · {money(w.amount)}</b><small>{w.withdrawalType==='customer' ? 'CUSTOMER WALLET' : 'VENDOR SALES'} · {w.bankName} · {w.accountNumber} · {w.accountName}</small><small>Fee {money(w.fee)} · {w.withdrawalType==='customer' ? 'Customer receives' : 'Vendor receives'} {money(w.netAmount ?? Math.max(0,Number(w.amount)-Number(w.fee)))}</small></div><span className={'status '+(w.status==='paid'?'approved':w.status)}>{w.status}</span><select value={w.status} onChange={e=>updateWithdrawal(w.id,e.target.value)}><option value="pending">Pending</option><option value="approved" disabled={w.status!=='pending'}>Approve</option><option value="rejected" disabled={!['pending','approved'].includes(w.status)}>Reject</option><option value="paid" disabled={w.status!=='approved'}>Mark paid</option></select></div>):<p className="muted">No withdrawal requests.</p>}</section>
      <section className="panel" id="admin-users">
        <div className="panel-title">
          <div>
            <h2>Registered customers &amp; accounts ({adminUsers.length})</h2>
            <p className="muted">Complete customer directory with profile records, contact &amp; delivery addresses, wallet balances, recent orders, and password reset tools.</p>
          </div>
        </div>
        <div className="stats-row tabular-nums">
          <div><small>Total registered accounts</small><b>{adminUsers.length}</b></div>
          <div><small>Customers</small><b>{adminUsers.filter(u=>u.vendorStatus==='customer' && u.accountRole!=='admin').length}</b></div>
          <div><small>Vendor accounts</small><b>{adminUsers.filter(u=>u.vendorStatus!=='customer').length}</b></div>
          <div><small>Saved login passwords</small><b>{adminUsers.filter(u=>u.hasPasswordAccount).length}</b></div>
        </div>
        <div className="admin-users-toolbar">
          <label className="admin-inline-search">
            <Search size={15}/>
            <input
              type="search"
              value={adminUserSearch}
              onChange={e => setAdminUserSearch(e.target.value)}
              placeholder="Search customer by name, email, phone, address, or ID..."
            />
          </label>
          <select value={adminUserFilter} onChange={e => setAdminUserFilter(e.target.value as 'all' | 'customers' | 'vendors' | 'affiliates')}>
            <option value="all">All accounts ({adminUsers.length})</option>
            <option value="customers">Customers only</option>
            <option value="vendors">Vendors</option>
            <option value="affiliates">Affiliates</option>
          </select>
        </div>
        <div className="admin-scroll-list admin-users-list">
          {(() => {
            const q = adminUserSearch.trim().toLowerCase();
            const filtered = adminUsers.filter(u => {
              if (adminUserFilter === 'customers' && (u.vendorStatus !== 'customer' || u.accountRole === 'admin')) return false;
              if (adminUserFilter === 'vendors' && u.vendorStatus === 'customer') return false;
              if (adminUserFilter === 'affiliates' && (!u.affiliateStatus || u.affiliateStatus === 'none')) return false;
              if (!q) return true;
              return [u.id, u.fullName, u.email, u.phone, u.whatsapp, u.address, u.city, u.state, u.country, u.shopName, u.affiliateCode]
                .some(v => String(v || '').toLowerCase().includes(q));
            });
            if (!filtered.length) {
              return <p className="muted">{adminUsers.length ? 'No customer accounts match your search or filter.' : 'No registered user profiles yet. Users appear here after creating an account.'}</p>;
            }
            return filtered.map(u => {
              const isExpanded = Boolean(expandedUserIds[u.id]);
              const isOwnerRow = u.accountRole === 'admin';
              const resetCodeInfo = adminUserResetCodes[u.id];
              return (
                <article className={'admin-user-card' + (isExpanded ? ' expanded' : '')} key={u.id}>
                  <div className="user-directory-row">
                    <div className="directory-avatar">{u.avatarUrl ? <img src={u.avatarUrl} alt=""/> : <UserRound size={20}/>}</div>
                    <div className="manage-main">
                      <b>{u.fullName || 'Name not provided'}</b>
                      <small>{u.email || 'No email'} · {u.phone || 'No phone'} · {u.whatsapp ? 'WhatsApp ' + u.whatsapp : 'No WhatsApp'}</small>
                      <small>{[u.address, u.city, u.state, u.country].filter(Boolean).join(', ') || 'Delivery address not provided'}</small>
                      <small className="tabular-nums">
                        {u.orderCount || 0} orders · Paid {money(u.totalSpent || 0)} · Wallet {money(u.walletBalance || 0)} · {isOwnerRow ? 'Owner Admin' : u.vendorStatus === 'customer' ? 'Customer' : `Vendor (${u.vendorStatus})`}{u.affiliateStatus && u.affiliateStatus !== 'none' ? ` · Affiliate (${u.affiliateStatus})` : ''}{u.hasPasswordAccount ? ' · Password saved' : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setExpandedUserIds(current => ({ ...current, [u.id]: !current[u.id] }))}
                    >
                      {isExpanded ? <><ChevronUp size={15}/> Hide details</> : <><ChevronDown size={15}/> Details &amp; password</>}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="admin-user-details">
                      <div className="admin-user-detail-grid">
                        <div><small>User ID</small><b>{u.id}</b></div>
                        <div><small>Email address</small><b>{u.email || 'Not provided'}</b></div>
                        <div><small>Phone number</small><b>{u.phone || 'Not provided'}</b></div>
                        <div><small>WhatsApp</small><b>{u.whatsapp || 'Not provided'}</b></div>
                        <div><small>Street address</small><b>{u.address || 'Not provided'}</b></div>
                        <div><small>City / State / Country</small><b>{[u.city, u.state, u.country].filter(Boolean).join(', ') || 'Not provided'}</b></div>
                        <div><small>Wallet balance</small><b className="tabular-nums">{money(u.walletBalance || 0)}</b></div>
                        <div><small>Paid orders / total spent</small><b className="tabular-nums">{u.paidOrderCount || 0} paid · {money(u.totalSpent || 0)}</b></div>
                        <div><small>Account registered</small><b>{u.createdAt ? new Date(u.createdAt).toLocaleString() : 'Unknown'}</b></div>
                        <div><small>Last login</small><b>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</b></div>
                        <div><small>Last password reset</small><b>{u.lastPasswordResetAt ? new Date(u.lastPasswordResetAt).toLocaleString() : 'Never'}</b></div>
                        <div><small>Credential status</small><b>{u.passwordStatus || (u.hasPasswordAccount ? 'Protected' : 'Not set')}</b></div>
                      </div>

                      {Array.isArray(u.recentOrders) && u.recentOrders.length > 0 && (
                        <div className="admin-user-subbox">
                          <b>Recent orders</b>
                          <div className="admin-user-orders">
                            {u.recentOrders.map((ord: any) => (
                              <div key={ord.id} className="admin-user-order-item">
                                <span><b>#{ord.orderNumber}</b> · {ord.status} · {ord.paymentMethod || 'Payment'} ({ord.paymentStatus})</span>
                                <b className="tabular-nums">{money(ord.total || 0)}</b>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isOwnerRow && (
                        <div className="admin-user-subbox admin-user-security-box">
                          <div className="admin-user-security-head">
                            <div>
                              <b>Customer password &amp; account recovery</b>
                              <small>Customer passwords are stored with one-way salted scrypt encryption so plaintext passwords cannot be viewed. Use these owner controls to set a new password or generate a 6-digit verification code for this customer.</small>
                            </div>
                          </div>
                          <div className="admin-user-pw-actions">
                            <div className="admin-user-pw-form">
                              <input
                                type="password"
                                minLength={8}
                                maxLength={128}
                                value={adminUserPwDrafts[u.id] || ''}
                                onChange={e => setAdminUserPwDrafts(current => ({ ...current, [u.id]: e.target.value }))}
                                placeholder="Enter new password (min 8 characters)"
                                aria-label={'New password for ' + (u.fullName || u.email)}
                              />
                              <button
                                type="button"
                                className="primary-btn"
                                disabled={adminUserPwBusyId === u.id || String(adminUserPwDrafts[u.id] || '').length < 8}
                                onClick={() => void adminResetCustomerPassword(u.id)}
                              >
                                {adminUserPwBusyId === u.id ? 'Saving...' : 'Set new password'}
                              </button>
                            </div>
                            <button
                              type="button"
                              className="secondary-btn"
                              disabled={adminUserPwBusyId === 'code:' + u.id}
                              onClick={() => void adminIssueCustomerResetCode(u.id)}
                            >
                              {adminUserPwBusyId === 'code:' + u.id ? 'Generating...' : 'Generate 6-digit reset code'}
                            </button>
                          </div>
                          {resetCodeInfo && (
                            <div className="admin-reset-code-banner">
                              <div>
                                <small>{resetCodeInfo.emailed ? 'Code emailed & active' : 'Active 6-digit verification code'}</small>
                                <strong>{resetCodeInfo.code}</strong>
                                <small>Expires {new Date(resetCodeInfo.expiresAt).toLocaleTimeString()}</small>
                              </div>
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => navigator.clipboard?.writeText(resetCodeInfo.code).then(() => flash('6-digit reset code copied.'))}
                              >
                                <Copy size={14}/> Copy code
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            });
          })()}
        </div>
      </section>

      <section className="panel" id="admin-security">
        <div className="panel-title">
          <div>
            <span className="eyebrow">OWNER CREDENTIALS · ACCESS CONTROL</span>
            <h2>Owner Admin Login &amp; Password Security</h2>
            <p className="muted">Dedicated owner login for <b>{adminSecurity?.ownerEmail || 'salimaminu103@gmail.com'}</b>. Signing in with this account routes directly to this Owner Admin Console.</p>
          </div>
          <span className="status approved">{adminSecurity?.hasEnvOverride ? 'Managed via ADMIN_PASSWORD secret' : adminSecurity?.hasSavedHash ? 'Saved encrypted password' : 'Active session'}</span>
        </div>
        {adminSecurity?.hasEnvOverride ? (
          <p className="checkout-note">Admin login password is currently controlled by the <code>ADMIN_PASSWORD</code> environment secret. To change it, update <code>ADMIN_PASSWORD</code> in Settings → Secrets.</p>
        ) : (
          <form className="product-form" onSubmit={saveAdminPassword}>
            <label>Current admin password<input type="password" required value={adminPwForm.currentPassword} onChange={e=>setAdminPwForm({...adminPwForm,currentPassword:e.target.value})} placeholder="Enter current password"/></label>
            <label>New admin password (min 8 chars)<input type="password" required minLength={8} value={adminPwForm.newPassword} onChange={e=>setAdminPwForm({...adminPwForm,newPassword:e.target.value})} placeholder="Enter new password"/></label>
            <label>Confirm new password<input type="password" required minLength={8} value={adminPwForm.confirmPassword} onChange={e=>setAdminPwForm({...adminPwForm,confirmPassword:e.target.value})} placeholder="Re-enter new password"/></label>
            <button type="submit" className="primary-btn" disabled={adminPwBusy}>{adminPwBusy ? 'Updating password...' : 'Update Owner Password'}</button>
          </form>
        )}
      </section>

      <section className="panel" id="admin-backups">
        <div className="panel-title">
          <div>
            <span className="eyebrow">DATA PROTECTION · DAILY BACKUPS &amp; RECOVERY</span>
            <h2>Automated Backups &amp; Safe Recovery ({adminBackups.length})</h2>
            <p className="muted">Daily verified snapshots protect all customers, vendors, affiliates, wallets, products, and orders with 30-day automatic retention (90 days for manual snapshots).</p>
          </div>
          <button type="button" className="primary-btn" disabled={backupBusy} onClick={() => void runManualBackup()}>
            <ShieldCheck size={16}/> {backupBusy ? 'Working...' : 'Run Verified Backup Now'}
          </button>
        </div>
        <div className="compact-order-list">
          {adminBackups.length ? adminBackups.slice(0, 10).map((b) => (
            <div className="user-admin-card" key={b.id}>
              <div>
                <b>{b.backupType === 'daily_auto' ? 'Daily Automatic Backup' : b.backupType === 'pre_migration' ? 'Pre-Migration Snapshot' : 'Manual Backup'} · {b.id}</b>
                <div className="muted">
                  {new Date(b.createdAt).toLocaleString('en-NG')} · {b.recordCount.toLocaleString()} records · Retention: {b.retentionDays} days · SHA-256: {b.checksumSha256.slice(0, 14)}...
                </div>
              </div>
              <div className="order-actions">
                <span className={'status ' + (b.verified ? 'approved' : 'pending')}>
                  {b.verified ? 'Verified' : b.status}
                </span>
                <button type="button" className="secondary-btn" disabled={backupBusy} onClick={() => void verifyBackup(b.id)}>Verify</button>
                <button type="button" className="secondary-btn" disabled={backupBusy} onClick={() => void restoreBackupSafe(b.id)}>Safe Restore</button>
              </div>
            </div>
          )) : (
            <p className="muted">No backups recorded yet. Click "Run Verified Backup Now" to create your first verified snapshot.</p>
          )}
        </div>
      </section>

      <section className="panel" id="admin-order-history">
        <div className="panel-title">
          <div>
            <span className="eyebrow">ARCHIVE · FULFILLED &amp; CLOSED ORDERS</span>
            <h2>Fulfilled Order History ({allFulfilledOrders.length})</h2>
            <p>Completed, cancelled, returned and refunded transactions are archived at the bottom to keep the active dashboard clean.</p>
          </div>
          <button type="button" className="primary-btn" onClick={() => void openAdminOrderHistory()}>
            <History size={16}/> Open dedicated Order History page
          </button>
        </div>

        <div className="compact-order-list">
          {allFulfilledOrders.length ? allFulfilledOrders.slice(0, 6).map(order => (
            <AdminOrderRow
              key={'bottom-history-' + order.id}
              order={order}
              mode="history"
              expanded={Boolean(expandedHistoryIds['bottom-' + order.id])}
              onToggleExpand={() => setExpandedHistoryIds(current => ({ ...current, ['bottom-' + order.id]: !current['bottom-' + order.id] }))}
              money={money}
              paymentStatusLabel={paymentStatusLabel}
              onChangeStatus={(id, status) => void changeOrderStatus(id, status)}
              onUpdateOrder={(id, patch) => updateAdminOrder(id, patch)}
              onConfirmPayment={(id, manual) => void confirmPayment(id, manual)}
              onReviewPayment={(id, decision) => void reviewPayment(id, decision)}
              onResendEmails={(id) => void resendOrderEmails(id)}
              resendingEmail={resendingOrderId === order.id}
            />
          )) : (
            <div className="chart-empty compact">
              <History size={26}/>
              <b>No fulfilled orders archived yet</b>
              <small>Once orders are marked Completed, Cancelled, Returned or Refunded, they appear here and on the Order History page.</small>
            </div>
          )}
        </div>

        {allFulfilledOrders.length > 6 && (
          <div className="history-footer-cta">
            <button type="button" className="secondary-btn" onClick={() => void openAdminOrderHistory()}>
              View all {allFulfilledOrders.length} archived transactions <ArrowRight size={15}/>
            </button>
          </div>
        )}
      </section>
      </>}
    </main>}

    {page === 'admin-history' && <main className="workspace">
      <div className="history-page-nav-row">
        {isAdmin && <button className="back-link" onClick={() => void openAdmin()}><ArrowLeft size={16}/> Back to Admin Dashboard</button>}
        <button className="back-link" onClick={navigateHome}>Marketplace Home</button>
      </div>
      {!isAdmin ? (
        <div className="panel centered">
          <Package size={40}/>
          <h2>Page unavailable</h2>
          <p>This marketplace page is not available for your current account.</p>
          <button className="primary-btn" onClick={navigateHome}>Return to marketplace</button>
        </div>
      ) : (
        <>
          <div className="admin-heading">
            <div className="workspace-heading">
              <div>
                <span className="eyebrow">YAKAJI DIGITAL HUB · ARCHIVE LEDGER</span>
                <h1>Order History</h1>
                <p>Complete archive of fulfilled, completed, cancelled, returned and refunded marketplace transactions.</p>
              </div>
              <span className="role-pill"><History size={16}/> Fulfilled Archive</span>
            </div>
            <div className="admin-heading-actions">
              <button type="button" className="secondary-btn" onClick={() => void openAdmin()}>
                <LayoutDashboard size={16}/> Admin Overview
              </button>
              <button type="button" className="secondary-btn" onClick={loadAdmin}>
                <TrendingUp size={16}/> Refresh archive
              </button>
            </div>
          </div>

          <section className="admin-kpis tabular-nums">
            <article className="admin-kpi kpi-green">
              <span><History size={18}/></span>
              <small>Total archived orders</small>
              <b>{allFulfilledOrders.length.toLocaleString()}</b>
              <em>Completed &amp; closed records</em>
            </article>
            <article className="admin-kpi">
              <span><CheckCircle2 size={18}/></span>
              <small>Completed orders</small>
              <b>{allFulfilledOrders.filter(o => o.status === 'Completed').length.toLocaleString()}</b>
              <em>Successfully fulfilled</em>
            </article>
            <article className="admin-kpi">
              <span><Wallet size={18}/></span>
              <small>Completed order volume</small>
              <b>{money(allFulfilledOrders.filter(o => o.status === 'Completed' && o.paymentStatus === 'completed').reduce((sum, o) => sum + Number(o.total || 0), 0))}</b>
              <em>Verified paid completed orders</em>
            </article>
            <article className="admin-kpi">
              <span><Package size={18}/></span>
              <small>Cancelled / refunded / returned</small>
              <b>{allFulfilledOrders.filter(o => o.status !== 'Completed').length.toLocaleString()}</b>
              <em>Closed non-fulfilled orders</em>
            </article>
            <article className="admin-kpi">
              <span><Search size={18}/></span>
              <small>Matching current filter</small>
              <b>{filteredFulfilledOrders.length.toLocaleString()}</b>
              <em>Showing in ledger below</em>
            </article>
          </section>

          <section className="panel">
            <div className="admin-history-filters">
              <label className="admin-inline-search">
                <Search size={15}/>
                <input
                  type="search"
                  value={adminHistorySearch}
                  onChange={e => setAdminHistorySearch(e.target.value)}
                  placeholder="Search order #, customer, phone, email or item..."
                />
              </label>

              <label>
                Status
                <select
                  value={adminHistoryStatus}
                  onChange={e => setAdminHistoryStatus(e.target.value as 'all' | 'Completed' | 'Cancelled' | 'Refunded' | 'Returned')}
                >
                  <option value="all">All fulfilled / closed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Returned">Returned</option>
                </select>
              </label>

              <label>
                From date
                <input type="date" value={adminHistoryFrom} onChange={e => setAdminHistoryFrom(e.target.value)}/>
              </label>

              <label>
                To date
                <input type="date" value={adminHistoryTo} onChange={e => setAdminHistoryTo(e.target.value)}/>
              </label>

              {(adminHistorySearch || adminHistoryStatus !== 'all' || adminHistoryFrom || adminHistoryTo) && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setAdminHistorySearch('');
                    setAdminHistoryStatus('all');
                    setAdminHistoryFrom('');
                    setAdminHistoryTo('');
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="compact-order-list">
              {filteredFulfilledOrders.length ? filteredFulfilledOrders.map(order => (
                <AdminOrderRow
                  key={'history-page-' + order.id}
                  order={order}
                  mode="history"
                  expanded={Boolean(expandedHistoryIds[order.id])}
                  onToggleExpand={() => setExpandedHistoryIds(current => ({ ...current, [order.id]: !current[order.id] }))}
                  money={money}
                  paymentStatusLabel={paymentStatusLabel}
                  onChangeStatus={(id, status) => void changeOrderStatus(id, status)}
                  onUpdateOrder={(id, patch) => updateAdminOrder(id, patch)}
                  onConfirmPayment={(id, manual) => void confirmPayment(id, manual)}
                  onReviewPayment={(id, decision) => void reviewPayment(id, decision)}
                  onResendEmails={(id) => void resendOrderEmails(id)}
                  resendingEmail={resendingOrderId === order.id}
                />
              )) : (
                <div className="chart-empty">
                  <History size={30}/>
                  <b>No archived orders match your filter</b>
                  <small>Try clearing the search or date range filter, or check the active Order Management queue on the main dashboard.</small>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>}

    {selectedProduct && <div className="overlay product-detail-overlay" onClick={closeProduct}><section className="product-detail-panel temu-detail" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">YAKAJI MARKETPLACE · PRODUCT</span><h2>{selectedProduct.name}</h2></div><button className="icon-btn" aria-label="Close product details" onClick={closeProduct}><X/></button></div><div className="detail-gallery"><button className="detail-main-image" onClick={()=>photoCount && !failedImages['detail:' + selectedProduct.id + ':' + selectedImageIndex] && setPhotoViewerOpen(true)} aria-label="Open full size product photos">{selectedProduct.images?.length && !failedImages['detail:' + selectedProduct.id + ':' + selectedImageIndex] ? <img src={selectedProduct.images[Math.min(selectedImageIndex,selectedProduct.images.length-1)]} alt={selectedProduct.name} referrerPolicy="no-referrer" onError={() => markImageFailed('detail:' + selectedProduct.id + ':' + selectedImageIndex)}/> : <div className="media-placeholder"><Package size={54}/><span>{selectedProduct.category}</span></div>}<span className="photo-open-hint">{photoCount ? 'Tap photo to view full size' : 'No product photos'}</span></button>{(selectedProduct.images?.length || 0)>1 && <div className="detail-thumbnails">{selectedProduct.images.map((url,index)=><button className={selectedImageIndex===index?'active':''} key={url+index} onClick={()=>setSelectedImageIndex(index)}><img src={url} alt={'Product view '+(index+1)} referrerPolicy="no-referrer"/></button>)}</div>}{selectedProduct.videos?.length>0 && <div className="detail-video-list">{selectedProduct.videos.map((url,index)=><video key={index} src={url} controls playsInline/> )}</div>}</div><div className="detail-product-info"><span className="product-meta-cat">{selectedProduct.category}</span><h2 className="detail-title">{selectedProduct.name}</h2><div className="detail-price-row"><b>{selectedProduct.discountActive ? <span className="sale-prices"><del>{money(selectedProduct.standardPrice || selectedProduct.price)}</del><strong>{money(selectedProduct.price)}</strong><small>-{selectedProduct.discountPercent}%</small></span> : money(selectedProduct.price)}</b><span className={selectedProduct.stock>0?'stock-live':'stock-out'}>{selectedProduct.stock>0?'In stock · '+selectedProduct.stock+' available':'Out of stock'}</span></div><p className="detail-description">{selectedProduct.description}</p><p className="muted">Sold by <strong>{selectedProduct.vendorName || 'Yakaji Digital Hub'}</strong></p><button type="button" className="secondary-btn chat-vendor-btn" onClick={()=>void openChatInbox(selectedProduct)}><MessageCircle size={16}/> Chat with vendor about this product</button><div className="product-share-panel"><b>Share this product</b><div className="product-share-actions"><button type="button" className="secondary-btn" onClick={()=>copyProductLink(selectedProduct)}><Copy size={15}/> Copy link</button><button type="button" className="primary-btn" onClick={()=>shareProduct(selectedProduct)}><Share2 size={15}/> Share</button><a className="share-social whatsapp" href={'https://wa.me/?text='+encodeURIComponent(selectedProduct.name+' — '+money(selectedProduct.price)+'. View on Yakaji Digital Hub: '+productShareUrl(selectedProduct))} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/> WhatsApp</a><a className="share-social" href={'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(productShareUrl(selectedProduct))} target="_blank" rel="noopener noreferrer">Facebook</a><a className="share-social" href={'https://twitter.com/intent/tweet?url='+encodeURIComponent(productShareUrl(selectedProduct))+'&text='+encodeURIComponent(selectedProduct.name+' — '+money(selectedProduct.price))} target="_blank" rel="noopener noreferrer">X / Twitter</a></div><small className="muted">Anyone who opens this link will go directly to this product.</small></div>{selectedProduct.options?.length>0 && <label className="detail-option">Select an option<select value={selectedProductOption} onChange={e=>setSelectedProductOption(e.target.value)}>{selectedProduct.options.map(option=><option key={option}>{option}</option>)}</select></label>}<div className="detail-quantity"><b>Quantity</b><div><button disabled={detailQuantity<=1} onClick={()=>setDetailQuantity(q=>Math.max(1,q-1))}>−</button><span>{detailQuantity}</span><button disabled={detailQuantity>=selectedProduct.stock} onClick={()=>setDetailQuantity(q=>Math.min(selectedProduct.stock,q+1))}>+</button></div></div><div className="detail-assurances"><div><span className="detail-assurances-icon"><Truck size={16}/></span><p><b>Delivery arrangement</b><small>Confirm delivery details at checkout</small></p></div><div><span className="detail-assurances-icon"><Lock size={16}/></span><p><b>Secure payment choices</b><small>Wallet, Paystack or bank transfer</small></p></div><div><span className="detail-assurances-icon"><Headphones size={16}/></span><p><b>Marketplace support</b><small>Order assistance from Yakaji Digital Hub</small></p></div></div>
      <section className="product-review-section">
        <div className="review-heading">
          <div>
            <h3>Customer reviews</h3>
            <p className="review-summary">
              <b>{reviewAverage.toFixed(1)} / 5</b>{' '}
              <span aria-label={`${reviewAverage.toFixed(1)} out of 5 stars`}>
                {reviewCount > 0
                  ? '★'.repeat(Math.round(reviewAverage)) + '☆'.repeat(5 - Math.round(reviewAverage))
                  : '☆☆☆☆☆'}
              </span>{' '}
              · {reviewCount} review(s)
            </p>
          </div>
          <span className="review-verified-label">Customer ratings &amp; reviews</span>
        </div>
        {productReviews.length ? productReviews.map((review: any) => (
          <article className="product-review" key={review.id}>
            <div className="product-review-top">
              <b>{'★'.repeat(Math.min(5, Math.max(1, Number(review.rating || 5))))}{'☆'.repeat(5 - Math.min(5, Math.max(1, Number(review.rating || 5))))}</b>
              {review.verifiedPurchase && <span className="review-verified-badge">Verified buyer</span>}
            </div>
            <small>{review.customerName} · {new Date(review.updatedAt || review.createdAt).toLocaleDateString()}</small>
            <p>{review.comment}</p>
          </article>
        )) : (
          <p className="muted">No customer reviews yet. Be the first customer to rate and review this product.</p>
        )}
        {user ? (
          <form onSubmit={submitProductReview} className="review-form">
            <div className="review-star-picker">
              <span>Your star rating</span>
              <div role="radiogroup" aria-label="Choose your star rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    role="radio"
                    aria-checked={reviewRating === star}
                    aria-label={star + ' star' + (star === 1 ? '' : 's')}
                    className={reviewRating >= star ? 'selected' : ''}
                    onClick={() => { setReviewRating(star); setReviewError(''); }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <small>{reviewRating} out of 5 stars ({['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating - 1]})</small>
            </div>
            <label>
              Write your review
              <textarea
                required
                minLength={2}
                maxLength={1200}
                value={reviewComment}
                onChange={e => { setReviewComment(e.target.value); if (reviewError) setReviewError(''); }}
                placeholder="Share your rating and review about quality, delivery or experience..."
              />
            </label>
            {reviewError && <div className="review-inline-alert error" role="alert">{reviewError}</div>}
            {reviewNotice && <div className="review-inline-alert success" role="status">{reviewNotice}</div>}
            <button className="primary-btn" disabled={reviewSubmitting || reviewComment.trim().length < 2}>
              {reviewSubmitting
                ? 'Submitting review...'
                : productReviews.some((r: any) => r.userId === user.userId)
                  ? 'Update my review'
                  : 'Submit my review'}
            </button>
            <small className="muted">Rate 1–5 stars and publish your review anytime. One review per product; you can update it anytime.</small>
          </form>
        ) : (
          <div className="review-signin">
            <p>Sign in to rate with stars and write your review for this product.</p>
            <button type="button" className="secondary-btn" onClick={() => void signIn('login')}>Sign in to review</button>
          </div>
        )}
      </section>
      <button className="primary-btn full-btn detail-add-btn" disabled={selectedProduct.stock<1} onClick={()=>{addToCart(selectedProduct,selectedProductOption,detailQuantity);setSelectedProduct(null);}}><ShoppingBag size={17}/> Add {detailQuantity} to cart · {money(selectedProduct.price*detailQuantity)}</button></div></section></div>}
    {photoViewerOpen && selectedProduct && photoCount>0 && <div className="photo-viewer-overlay" onClick={()=>setPhotoViewerOpen(false)}><div className="photo-viewer" onClick={e=>e.stopPropagation()} onTouchStart={e=>setTouchStartX(e.touches[0].clientX)} onTouchEnd={e=>{if(touchStartX!==null){const delta=e.changedTouches[0].clientX-touchStartX;if(Math.abs(delta)>45)changePhoto(delta<0?1:-1);}setTouchStartX(null);}}><div className="photo-viewer-toolbar"><span>{selectedProduct.name} · {selectedImageIndex+1} / {photoCount}</span><button className="photo-viewer-close" aria-label="Close photo viewer" onClick={()=>setPhotoViewerOpen(false)}><X/></button></div><button className="photo-viewer-arrow previous" aria-label="Previous photo" onClick={()=>changePhoto(-1)} disabled={photoCount<2}><ChevronLeft/></button><img className="photo-viewer-image" src={activePhoto} alt={selectedProduct.name+' full size photo '+(selectedImageIndex+1)} referrerPolicy="no-referrer"/><button className="photo-viewer-arrow next" aria-label="Next photo" onClick={()=>changePhoto(1)} disabled={photoCount<2}><ChevronRight/></button><div className="photo-viewer-thumbnails">{selectedProduct.images.map((url,index)=><button key={url+index} className={selectedImageIndex===index?'active':''} onClick={()=>setSelectedImageIndex(index)}><img src={url} alt={'Select photo '+(index+1)} referrerPolicy="no-referrer"/></button>)}</div><small>Swipe left or right to browse photos · Use arrow keys on desktop</small></div></div>}
    {checkoutOpen && <div className="overlay" onClick={()=>setCheckoutOpen(false)}><section className="checkout" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">YOUR SHOPPING CART</span><h2>Checkout</h2></div><button className="icon-btn" onClick={()=>setCheckoutOpen(false)}><X/></button></div>{cart.length ? <><div className="cart-lines">{cart.map(line=><div className="cart-line" key={line.product.id}><div><b>{line.product.name}</b><small>{line.product.discountActive ? <><del>{money(line.product.standardPrice || line.product.price)}</del> {money(line.product.price)} sale price</> : money(line.product.price)} each</small>{line.product.options.length>0&&<select value={line.option} onChange={e=>setCart(items=>items.map(x=>x.product.id===line.product.id?{...x,option:e.target.value}:x))}>{line.product.options.map(o=><option key={o}>{o}</option>)}</select>}</div><div className="qty"><button onClick={()=>setCart(items=>items.map(x=>x.product.id===line.product.id?{...x,quantity:Math.max(1,x.quantity-1)}:x))}>−</button><b>{line.quantity}</b><button onClick={()=>setCart(items=>items.map(x=>x.product.id===line.product.id?{...x,quantity:Math.min(x.product.stock,x.quantity+1)}:x))}>+</button><button className="remove" onClick={()=>setCart(items=>items.filter(x=>x.product.id!==line.product.id))}><Trash2 size={15}/></button></div></div>)}</div><div className="total-line"><span>Products subtotal</span><b>{money(cartSubtotal)}</b></div>
      <div className="coupon-entry"><label>Have a coupon code?</label><div><input value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());setAppliedCoupon(null);}} placeholder="Enter coupon code"/><button type="button" className="secondary-btn" onClick={applyCoupon} disabled={couponBusy || !couponCode.trim()}>{couponBusy?'Checking...':'Apply'}</button></div>{appliedCoupon && <small className="coupon-success">✓ {appliedCoupon.code} applied — you save {money(couponSavings)}</small>}</div>
      {couponSavings>0 && <div className="total-line coupon-saving"><span>Coupon discount</span><b>−{money(couponSavings)}</b></div>}
      {customer.paymentMethod === 'Bank transfer' && <div className="total-line"><span>Transfer fee</span><b>{money(transferFee)}</b></div>}<div className="total-line"><span>Total to pay</span><b>{money(cartTotal)}</b></div><form className="checkout-form" onSubmit={placeOrder}><label>Full name<input required value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/></label><label>Phone / WhatsApp<input required type="tel" minLength={7} value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/></label><label>Email {customer.paymentMethod === 'Paystack' ? '(required for payment receipt)' : '(optional for guest checkout)'}<input required={customer.paymentMethod === 'Paystack'} type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} placeholder="name@example.com"/></label><label>Delivery address / instructions<textarea rows={2} value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/></label><label>Payment method<select value={customer.paymentMethod} onChange={e=>setCustomer({...customer,paymentMethod:e.target.value})}><option value="Wallet" disabled={!user}>1. Pay with wallet ({money(walletSummary?.balance || 0)} available)</option><option value="Paystack" disabled={!paystackReady}>2. Pay online with Paystack (Card / Bank / USSD){paystackReady ? '' : ' — awaiting setup'}</option><option value="Bank transfer">3. Manual bank transfer</option></select></label><p className="checkout-note">You can order as a guest without creating an account. Email is optional for manual bank transfer, but required for Paystack receipts. Create an account or sign in if you want to use your wallet, save your profile and manage your account when you return. Manual transfers are confirmed by the marketplace admin. {paystackMode === 'test' ? 'Paystack is currently in TEST MODE: test payments are simulations and cannot collect real customer money.' : paystackMode === 'live' ? 'Paystack is connected in LIVE MODE.' : ''}</p><button className="primary-btn full-btn" disabled={busy}>{busy?'Placing order...':'Place order'} <ArrowRight size={17}/></button></form></> : <div className="empty-box"><ShoppingBag size={40}/><h3>Your cart is empty</h3><p>Add products from the marketplace to begin.</p><button className="primary-btn" onClick={()=>setCheckoutOpen(false)}>Continue shopping</button></div>}</section></div>}
    {walletTransferDetails && <div className="overlay" onClick={()=>setWalletTransferDetails(null)}><section className="checkout transfer-instructions" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">WALLET FUNDING · MANUAL BANK TRANSFER</span><h2>Continue funding your wallet</h2></div><button className="icon-btn" onClick={()=>setWalletTransferDetails(null)}><X/></button></div><div className="transfer-card"><p>Wallet funding reference: <b>{walletTransferDetails.reference}</b></p><p>Wallet amount to credit: <b>{money(walletTransferDetails.amount)}</b> · Fee: {money(walletTransferDetails.fee)}</p><p>Amount to transfer: <strong>{money(walletTransferDetails.total)}</strong></p><hr/><p>Account name</p><h3>Yakaji Digital Hub</h3><p>Account number</p><h2>3005758913</h2><p>Bank</p><h3>Moniepoint MFB</h3><p className="checkout-note">Use the wallet funding reference above as your transfer narration so the owner can identify your payment.</p><button className="secondary-btn full-btn" onClick={()=>navigator.clipboard?.writeText('3005758913').then(()=>flash('Account number copied.'))}>Copy account number</button></div><p className="checkout-note">Your wallet will be credited only after Yakaji Digital Hub confirms the transfer. This is a wallet funding action only; it does not submit or change any withdrawal request.</p><button className="primary-btn full-btn" onClick={()=>setWalletTransferDetails(null)}>I understand</button></section></div>}
    {manualTransferOrder && <div className="overlay" onClick={()=>setManualTransferOrder(null)}><section className="checkout transfer-instructions" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">MANUAL BANK TRANSFER</span><h2>{manualTransferOrder.creditAmount ? 'Fund your wallet' : 'Complete your payment'}</h2></div><button className="icon-btn" onClick={()=>setManualTransferOrder(null)}><X/></button></div><div className="transfer-card"><p>{manualTransferOrder.creditAmount ? 'Top-up reference:' : 'Order number:'} <b>{manualTransferOrder.orderNumber}</b></p>{manualTransferOrder.creditAmount && <p>Wallet amount to credit: <b>{money(manualTransferOrder.creditAmount)}</b> · Fee: {money(manualTransferOrder.fee || 0)}</p>}<p>Amount to transfer: <strong>{money(manualTransferOrder.total)}</strong></p><hr/><p>Account name</p><h3>Yakaji Digital Hub</h3><p>Account number</p><h2>3005758913</h2><p>Bank</p><h3>Moniepoint MFB</h3>{manualTransferOrder.creditAmount && <p className="checkout-note">Use the top-up reference above as your transfer narration so the owner can identify your payment.</p>}<button className="secondary-btn full-btn" onClick={()=>navigator.clipboard?.writeText('3005758913').then(()=>flash('Account number copied.'))}>Copy account number</button></div><p className="checkout-note">After making the transfer, keep your receipt. Your order or wallet top-up will remain pending until Yakaji Digital Hub confirms the money received. Do not make a second payment for the same reference.</p><button className="primary-btn full-btn" onClick={()=>setManualTransferOrder(null)}>I understand</button></section></div>}
    {notificationsOpen && <div className="overlay" onClick={()=>setNotificationsOpen(false)}><section className="checkout notifications-panel" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">YAKAJI DIGITAL HUB</span><h2>Notifications</h2></div><button className="icon-btn" onClick={()=>setNotificationsOpen(false)}><X/></button></div><div className="notification-actions"><button className="secondary-btn" onClick={enablePushNotifications}>Enable device alerts</button>{unreadNotifications>0 && <button className="secondary-btn" onClick={markAllNotificationsRead}>Mark all as read</button>}</div><div className="notification-list">{userNotifications.length ? userNotifications.map(n=><article className={'notification-item '+(n.read?'read':'unread')} key={n.id} onClick={()=>void openNotificationTarget(n)} role="button" tabIndex={0}><span className="notification-dot">{n.kind==='order'?<Package size={16}/>:n.kind==='chat'?<MessageSquare size={16}/>:n.kind==='announcement'?<Megaphone size={16}/>:<Bell size={16}/>}</span><div className="notification-copy"><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small>{!n.read && <button type="button" className="notification-mark-read" onClick={e => { e.stopPropagation(); void markNotificationRead(String(n.id)); }}>Mark as read</button>}</div></article>) : <div className="empty-box"><Bell size={34}/><h3>You're all caught up</h3><p>Order updates, vendor approvals and announcements will appear here.</p></div>}</div></section></div>}
    {chatOpen && <div className="overlay" onClick={()=>setChatOpen(false)}><section className="checkout chat-panel" onClick={e=>e.stopPropagation()}><div className="checkout-head"><div><span className="eyebrow">DIRECT MESSAGING</span><h2>Messages</h2></div><button className="icon-btn" onClick={()=>setChatOpen(false)}><X/></button></div><div className="chat-layout"><aside className="chat-conversations">{chatConversations.length ? chatConversations.map(c=><button key={c.id} className={activeChatId===c.id?'active':''} onClick={()=>setActiveChatId(c.id)}><b>{user?.userId===c.vendorId?c.customerName:c.vendorName}</b><small>{c.productName}</small><span>{c.lastMessage || 'Start the conversation'}</span></button>) : <p className="muted">No conversations yet. Open a product and select “Chat with vendor”.</p>}</aside><div className="chat-thread"><div className="chat-thread-title">{chatConversations.find(c=>c.id===activeChatId)?.productName || 'Select a conversation'}<small>Private messages between customer and vendor</small></div><div className="chat-message-list">{chatMessages.map(m=><div key={m.id} className={'chat-bubble '+(m.senderId===user?.userId?'mine':'theirs')}><b>{m.senderName}</b><p>{m.message}</p><small>{new Date(m.createdAt).toLocaleString()}</small></div>)}</div><form className="chat-compose" onSubmit={sendChatMessage}><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} placeholder="Write a message..." maxLength={2000} disabled={!activeChatId}/><button className="primary-btn" disabled={!activeChatId || !chatDraft.trim() || chatBusy}><ArrowRight size={16}/></button></form></div></div></section></div>}
    {error && <div className="alert-error"><span>{error}</span><button onClick={()=>setError('')}><X size={16}/></button></div>}
    {notice && <div className="toast"><CheckCircle2 size={18}/>{notice}</div>}
    {!isAdmin && page !== 'support' && <button type="button" className="floating-support-help" onClick={()=>setPage('support')} aria-label="Open customer support"><MessageCircle size={18}/><span>Live Support</span></button>}
    <footer className="footer">
      <div className="footer-box">
        <div className="footer-inner">
          <div className="footer-brand">
            <b>Yakaji Digital Hub</b>
            <span>Shop · Learn · Grow</span>
            <small>Curated international marketplace for digital goods, courses, business services, and verified physical storefronts.</small>
          </div>
          <div className="footer-links">
            <button onClick={navigateHome}>Marketplace</button>
            <button onClick={() => setPage('support')}>Help &amp; Support</button>
            <button onClick={openVendor}>Vendor Portal</button>
            <button onClick={openAffiliate}>Affiliate Programme</button>
            <button onClick={() => { if (user) void openWallet(); else void signIn(); }}>My Wallet</button>
            <button onClick={() => { if (user) void openProfile(); else void signIn(); }}>My Account</button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Yakaji Digital Hub. All rights reserved.</span>
          <span>Secure Checkout · Verified Independent Vendors</span>
        </div>
      </div>
    </footer>
  </div>;
}
export default App;
