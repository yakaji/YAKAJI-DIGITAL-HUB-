import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Heart,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { VerifiedShopBadge } from './VerifiedShopBadge';
import {
  collectShopSpecialties,
  filterAndSortShops,
  formatShopLocation,
  getFollowedShopProducts,
  getShopMonogram,
  type PublicShop,
  type ShopFilterMode,
  type ShopSortMode,
} from '../utils/shopDirectory';

export interface ShopProductLike {
  id: string;
  name: string;
  category: string;
  price: number;
  vendorId: string;
  vendorName: string;
  status?: string;
}

export function ShopAvatar({
  shopName,
  iconUrl,
  size = 'md',
}: {
  shopName: string;
  iconUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(iconUrl) && !failed;
  return (
    <div className={`shop-avatar shop-avatar-${size}`}>
      {showImg ? (
        <img
          src={iconUrl}
          alt={`${shopName} shop icon`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="shop-avatar-fallback" aria-hidden="true">
          {getShopMonogram(shopName)}
        </span>
      )}
    </div>
  );
}

export function ShopCoverBanner({
  shopName,
  coverUrl,
  height = 'card',
}: {
  shopName: string;
  coverUrl?: string;
  height?: 'card' | 'hero';
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(coverUrl) && !failed;
  return (
    <div className={`shop-cover shop-cover-${height}`}>
      {showImg ? (
        <img
          src={coverUrl}
          alt={`${shopName} cover banner`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="shop-cover-fallback" aria-hidden="true">
          <div className="shop-cover-pattern" />
          <Store size={height === 'hero' ? 36 : 24} />
        </div>
      )}
    </div>
  );
}

export function ShopDirectoryPage<T extends ShopProductLike>({
  shops,
  followedShopIds,
  products,
  loading,
  userSignedIn,
  onSignIn,
  onNavigateHome,
  onOpenShop,
  onToggleFollow,
  followBusyId,
  renderProductCard,
  initialMode = 'all',
}: {
  shops: PublicShop[];
  followedShopIds: string[];
  products: T[];
  loading: boolean;
  userSignedIn: boolean;
  onSignIn: () => Promise<void>;
  onNavigateHome: () => void;
  onOpenShop: (shopId: string) => void;
  onToggleFollow: (shop: PublicShop) => Promise<void>;
  followBusyId: string;
  renderProductCard: (product: T) => ReactNode;
  initialMode?: ShopFilterMode;
}) {
  const [filterMode, setFilterMode] = useState<ShopFilterMode>(initialMode);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [sort, setSort] = useState<ShopSortMode>('popular');

  const specialties = useMemo(() => collectShopSpecialties(shops), [shops]);

  const visibleShops = useMemo(
    () =>
      filterAndSortShops(shops, {
        search,
        filterMode,
        specialty,
        sort,
        followedIds: followedShopIds,
      }),
    [shops, search, filterMode, specialty, sort, followedShopIds]
  );

  const followedProducts = useMemo(
    () => getFollowedShopProducts(products, followedShopIds),
    [products, followedShopIds]
  );

  return (
    <main className="ydh-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onNavigateHome}>Marketplace Home</button>
        <span aria-hidden="true">/</span>
        <strong>Vendor Shops &amp; Favorite Storefronts</strong>
      </nav>

      <section className="page-banner shop-directory-banner">
        <div className="page-banner-copy">
          <div className="page-banner-main">
            <span className="page-banner-icon"><Store size={24} /></span>
            <div>
              <span className="eyebrow">MARKETPLACE STOREFRONTS · CURATED SELLERS</span>
              <h1>Vendor Shops &amp; Favorites</h1>
              <p>
                Discover independent sellers, look for the blue verified tick on KYC-verified shops, and follow your favorite storefronts.
              </p>
            </div>
          </div>
          <div className="page-banner-meta tabular-nums">
            <span className="page-banner-count">
              {shops.length} active shop{shops.length === 1 ? '' : 's'}
            </span>
            <span className="page-banner-count is-accent">
              <Heart size={13} fill={followedShopIds.length > 0 ? 'currentColor' : 'none'} />{' '}
              Following {followedShopIds.length}
            </span>
          </div>
        </div>
      </section>

      <section className="panel shop-directory-controls">
        <div className="shop-directory-tabs-row">
          <div className="profit-cal-tabs" role="tablist" aria-label="Shop directory view">
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'all'}
              className={filterMode === 'all' ? 'active' : ''}
              onClick={() => setFilterMode('all')}
            >
              All Shops ({shops.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'following'}
              className={filterMode === 'following' ? 'active' : ''}
              onClick={() => setFilterMode('following')}
            >
              My Favorite Shops ({followedShopIds.length})
            </button>
          </div>

          <div className="shop-directory-filters">
            <label className="admin-inline-search">
              <Search size={15} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shops, specialty, city..."
              />
            </label>

            {specialties.length > 0 && (
              <select
                className="compact-stage-select"
                aria-label="Filter shops by specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                <option value="All">All specialties</option>
                {specialties.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            )}

            <select
              className="compact-stage-select"
              aria-label="Sort vendor shops"
              value={sort}
              onChange={(e) => setSort(e.target.value as ShopSortMode)}
            >
              <option value="popular">Most followed</option>
              <option value="products">Most products</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest shops</option>
            </select>
          </div>
        </div>

        {filterMode === 'following' && !userSignedIn && (
          <div className="checkout-note shop-signin-prompt">
            <div>
              <b>Sign in to save your favorite shops</b>
              <p className="muted">Follow verified vendor storefronts across devices and browse a personalized feed of their listings.</p>
            </div>
            <button type="button" className="primary-btn" onClick={() => void onSignIn()}>
              Sign in / Create account
            </button>
          </div>
        )}
      </section>

      {loading && !shops.length ? (
        <div className="panel centered">
          <Store size={34} />
          <p>Loading verified vendor shops...</p>
        </div>
      ) : visibleShops.length ? (
        <div className="shop-card-grid">
          {visibleShops.map((shop) => {
            const isFollowed = followedShopIds.includes(shop.id) || shop.isFollowed;
            const busy = followBusyId === shop.id;
            return (
              <article className="shop-card" key={shop.id}>
                <div
                  className="shop-card-media"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenShop(shop.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onOpenShop(shop.id); }}
                >
                  <ShopCoverBanner shopName={shop.shopName} coverUrl={shop.coverUrl} height="card" />
                  <div className="shop-card-avatar-wrap">
                    <ShopAvatar shopName={shop.shopName} iconUrl={shop.iconUrl} size="md" />
                  </div>
                </div>

                <div className="shop-card-body">
                  <div className="shop-card-title-row">
                    <div>
                      <h3
                        className="shop-card-name"
                        onClick={() => onOpenShop(shop.id)}
                      >
                        <span>{shop.shopName}</span>
                        <VerifiedShopBadge
                          verified={shop.isVerified}
                          tierId={shop.verificationTier}
                          size="sm"
                        />
                      </h3>
                      {shop.tagline ? (
                        <p className="shop-card-tagline">{shop.tagline}</p>
                      ) : (
                        <p className="shop-card-tagline">
                          {shop.description || 'Yakaji Digital Hub vendor storefront'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shop-card-meta tabular-nums">
                    <span>{shop.specialty || 'General Marketplace'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatShopLocation(shop)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{shop.productCount} listing{shop.productCount === 1 ? '' : 's'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{shop.followerCount} follower{shop.followerCount === 1 ? '' : 's'}</span>
                    {shop.averageRating > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="shop-rating-inline">
                          <Star size={12} fill="currentColor" /> {shop.averageRating.toFixed(1)}
                        </span>
                      </>
                    )}
                    {shop.isVerified && shop.verificationTier === 'pro_max' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="shop-tier-spotlight">Featured Flagship</span>
                      </>
                    )}
                    {shop.isVerified && shop.verificationTier === 'premium' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="shop-tier-priority">Priority Verified</span>
                      </>
                    )}
                  </div>

                  <div className="shop-card-actions">
                    <button
                      type="button"
                      className={isFollowed ? 'follow-shop-btn is-following' : 'follow-shop-btn'}
                      disabled={busy}
                      aria-pressed={isFollowed}
                      onClick={() => void onToggleFollow(shop)}
                    >
                      {isFollowed ? <Check size={15} /> : <Heart size={15} />}
                      <span>{busy ? 'Updating...' : isFollowed ? 'Following' : 'Follow shop'}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => onOpenShop(shop.id)}
                    >
                      Visit shop <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-box">
          <Store size={36} />
          <h3>
            {filterMode === 'following'
              ? 'You have not followed any shops yet'
              : 'No matching vendor shops found'}
          </h3>
          <p>
            {filterMode === 'following'
              ? 'Explore verified sellers and tap "Follow shop" on storefronts you want to keep in your favorites.'
              : 'Try clearing your search or specialty filter to view all verified shops.'}
          </p>
          {filterMode === 'following' ? (
            <button type="button" className="primary-btn" onClick={() => setFilterMode('all')}>
              Explore all shops <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => { setSearch(''); setSpecialty('All'); }}
            >
              Show all shops
            </button>
          )}
        </div>
      )}

      {followedProducts.length > 0 && (
        <section className="market-section followed-feed-section" aria-label="Products from shops you follow">
          <div className="section-head">
            <div>
              <span className="eyebrow">FROM YOUR FAVORITE SHOPS</span>
              <h2>Products from Shops You Follow</h2>
              <p>Listings curated from the {followedShopIds.length} verified vendor shop{followedShopIds.length === 1 ? '' : 's'} you follow.</p>
            </div>
          </div>
          <div className="product-grid">
            {followedProducts.slice(0, 12).map(renderProductCard)}
          </div>
        </section>
      )}
    </main>
  );
}

export function ShopStorefrontPage<T extends ShopProductLike>({
  shop,
  shopProducts,
  loading,
  isFollowed,
  followBusy,
  onBackToShops,
  onNavigateHome,
  onToggleFollow,
  onCopyShopLink,
  renderProductCard,
}: {
  shop: PublicShop | null;
  shopProducts: T[];
  loading: boolean;
  isFollowed: boolean;
  followBusy: boolean;
  onBackToShops: () => void;
  onNavigateHome: () => void;
  onToggleFollow: (shop: PublicShop) => Promise<void>;
  onCopyShopLink: (shop: PublicShop) => void;
  renderProductCard: (product: T) => ReactNode;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of shopProducts) {
      if (p.category) set.add(p.category);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [shopProducts]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shopProducts.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [shopProducts, search, categoryFilter]);

  if (loading && !shop) {
    return (
      <main className="ydh-container">
        <div className="panel centered">
          <Store size={36} />
          <p>Loading shop storefront...</p>
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="ydh-container">
        <button type="button" className="back-link" onClick={onBackToShops}>
          <ArrowLeft size={16} /> Back to Vendor Shops
        </button>
        <div className="panel centered">
          <Store size={38} />
          <h2>Vendor shop not found</h2>
          <p>This storefront may have been deactivated or is no longer available.</p>
          <button type="button" className="primary-btn" onClick={onBackToShops}>
            Browse all shops
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="ydh-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onNavigateHome}>Marketplace Home</button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={onBackToShops}>Vendor Shops</button>
        <span aria-hidden="true">/</span>
        <strong>{shop.shopName}</strong>
      </nav>

      <section className="shop-hero-card">
        <ShopCoverBanner shopName={shop.shopName} coverUrl={shop.coverUrl} height="hero" />

        <div className="shop-hero-body">
          <div className="shop-hero-top">
            <div className="shop-hero-identity">
              <div className="shop-hero-avatar-wrap">
                <ShopAvatar shopName={shop.shopName} iconUrl={shop.iconUrl} size="lg" />
              </div>
              <div className="shop-hero-copy">
                <div className="shop-hero-eyebrow">
                  {shop.isVerified ? (
                    <VerifiedShopBadge
                      verified
                      tierId={shop.verificationTier}
                      size="sm"
                      showLabel
                    />
                  ) : (
                    <>
                      <ShieldCheck size={14} /> Approved Independent Storefront
                    </>
                  )}
                </div>
                <h1 className="shop-title-verified-row">
                  <span>{shop.shopName}</span>
                  <VerifiedShopBadge
                    verified={shop.isVerified}
                    tierId={shop.verificationTier}
                    size="lg"
                  />
                </h1>
                {shop.tagline && <p className="shop-hero-tagline">{shop.tagline}</p>}
                <div className="shop-hero-meta tabular-nums">
                  <span>{shop.specialty || 'Marketplace Seller'}</span>
                  <span aria-hidden="true">·</span>
                  <span><MapPin size={13} /> {formatShopLocation(shop)}</span>
                  <span aria-hidden="true">·</span>
                  <span><Users size={13} /> {shop.followerCount.toLocaleString()} follower{shop.followerCount === 1 ? '' : 's'}</span>
                  <span aria-hidden="true">·</span>
                  <span><Package size={13} /> {shopProducts.length} product{shopProducts.length === 1 ? '' : 's'}</span>
                  {shop.averageRating > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="shop-rating-inline">
                        <Star size={13} fill="currentColor" /> {shop.averageRating.toFixed(1)} ({shop.reviewCount})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="shop-hero-actions">
              <button
                type="button"
                className={isFollowed ? 'follow-shop-btn is-following lg' : 'follow-shop-btn lg'}
                disabled={followBusy}
                aria-pressed={isFollowed}
                onClick={() => void onToggleFollow(shop)}
              >
                {isFollowed ? <CheckCircle2 size={16} /> : <Heart size={16} />}
                <span>{followBusy ? 'Updating...' : isFollowed ? 'Following shop' : 'Follow shop'}</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onCopyShopLink(shop)}
              >
                <Copy size={15} /> Share shop
              </button>
            </div>
          </div>

          <div className="shop-hero-details-grid">
            <div className="shop-hero-about">
              <h3>About {shop.shopName}</h3>
              <p>{shop.description || 'Verified merchant on Yakaji Digital Hub offering digital and physical listings.'}</p>
            </div>

            <div className="shop-hero-info-cards">
              {shop.isVerified && ['premium', 'pro_max'].includes(String(shop.verificationTier || '').toLowerCase()) && (
                <div className="shop-info-tile shop-trust-tile">
                  <small><ShieldCheck size={12} /> Verified Business Trust</small>
                  <b>
                    {shop.verificationTier === 'pro_max'
                      ? 'Pro Max Flagship · CAC & National ID Audited'
                      : 'Premium Merchant · CAC & National ID Audited'}
                  </b>
                  <span>
                    Active verification reviewed by Yakaji Marketplace Compliance
                    {shop.createdAt ? ` · Selling since ${new Date(shop.createdAt).getFullYear()}` : ''}
                  </span>
                </div>
              )}
              {shop.phone && (
                <div className="shop-info-tile">
                  <small><Phone size={12} /> Shop Contact</small>
                  <b>{shop.phone}</b>
                  {shop.whatsapp && shop.whatsapp !== shop.phone && (
                    <span>WhatsApp: {shop.whatsapp}</span>
                  )}
                </div>
              )}
              <div className="shop-info-tile">
                <small><CheckCircle2 size={12} /> Fulfilment &amp; Returns</small>
                <b>{shop.returnPolicy || 'Protected by Yakaji Buyer & Payment Protection'}</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="market-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">STOREFRONT CATALOGUE</span>
            <h2>Listings from {shop.shopName}</h2>
          </div>
          <span className="muted tabular-nums">
            Showing {visibleProducts.length} of {shopProducts.length} product{shopProducts.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="shop-storefront-toolbar">
          <label className="admin-inline-search">
            <Search size={15} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search inside ${shop.shopName}...`}
            />
          </label>

          {categories.length > 1 && (
            <div className="category-list" role="tablist" aria-label="Filter shop products by category">
              <button
                type="button"
                className={categoryFilter === 'All' ? 'selected' : ''}
                onClick={() => setCategoryFilter('All')}
              >
                All ({shopProducts.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={categoryFilter === cat ? 'selected' : ''}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {visibleProducts.length ? (
          <div className="product-grid">{visibleProducts.map(renderProductCard)}</div>
        ) : (
          <div className="empty-box">
            <Package size={36} />
            <h3>No products match your filter</h3>
            <p>
              {shopProducts.length
                ? 'Clear your search or category filter to view all items from this shop.'
                : 'This vendor has not published approved listings yet. Follow this shop to find out when new items arrive.'}
            </p>
            {shopProducts.length > 0 && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => { setSearch(''); setCategoryFilter('All'); }}
              >
                Show all shop products
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
