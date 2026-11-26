export interface PublicShop {
  id: string;
  shopName: string;
  ownerName: string;
  description: string;
  tagline: string;
  specialty: string;
  location: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  returnPolicy: string;
  iconPath: string;
  coverPath: string;
  iconUrl: string;
  coverUrl: string;
  followerCount: number;
  productCount: number;
  averageRating: number;
  reviewCount: number;
  isFollowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShopSortMode = 'popular' | 'products' | 'rating' | 'newest';
export type ShopFilterMode = 'all' | 'following';

export interface ShopFilterOptions {
  search?: string;
  filterMode?: ShopFilterMode;
  specialty?: string;
  sort?: ShopSortMode;
  followedIds?: ReadonlyArray<string>;
}

export function filterAndSortShops(
  shops: ReadonlyArray<PublicShop>,
  options: ShopFilterOptions = {}
): PublicShop[] {
  const {
    search = '',
    filterMode = 'all',
    specialty = 'All',
    sort = 'popular',
    followedIds,
  } = options;

  const q = search.trim().toLowerCase();
  const followedSet = followedIds ? new Set(followedIds) : null;

  const filtered = shops.filter((shop) => {
    const isFollowed = followedSet ? followedSet.has(shop.id) : Boolean(shop.isFollowed);
    if (filterMode === 'following' && !isFollowed) return false;
    if (specialty && specialty !== 'All' && (shop.specialty || 'General Marketplace') !== specialty) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      shop.shopName,
      shop.tagline,
      shop.description,
      shop.specialty,
      shop.location,
      shop.city,
      shop.state,
      shop.ownerName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return [...filtered].sort((a, b) => {
    if (sort === 'products') {
      if (b.productCount !== a.productCount) return b.productCount - a.productCount;
      return b.followerCount - a.followerCount;
    }
    if (sort === 'rating') {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.reviewCount - a.reviewCount;
    }
    if (sort === 'newest') {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    }
    if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    return a.shopName.localeCompare(b.shopName);
  });
}

export function collectShopSpecialties(shops: ReadonlyArray<PublicShop>): string[] {
  const set = new Set<string>();
  for (const shop of shops) {
    const spec = String(shop.specialty || '').trim();
    if (spec) set.add(spec);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getFollowedShopProducts<T extends { vendorId: string; status?: string }>(
  products: ReadonlyArray<T>,
  followedIds: ReadonlyArray<string>
): T[] {
  if (!followedIds.length) return [];
  const followedSet = new Set(followedIds);
  return products.filter(
    (product) =>
      followedSet.has(product.vendorId) &&
      (product.status === undefined || product.status === 'approved')
  );
}

export function formatShopLocation(shop: Partial<Pick<PublicShop, 'location' | 'city' | 'state'>>): string {
  const explicit = String(shop.location || '').trim();
  if (explicit) return explicit;
  const parts = [String(shop.city || '').trim(), String(shop.state || '').trim()].filter(Boolean);
  return parts.join(', ') || 'Nigeria';
}

export function getShopMonogram(shopName: string): string {
  const clean = String(shopName || '').trim();
  if (!clean) return 'Y';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
