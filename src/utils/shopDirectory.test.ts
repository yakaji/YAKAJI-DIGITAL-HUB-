import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectShopSpecialties,
  filterAndSortShops,
  formatShopLocation,
  getFollowedShopProducts,
  getShopMonogram,
  type PublicShop,
} from './shopDirectory.ts';

const SHOPS: PublicShop[] = [
  {
    id: 'v1',
    shopName: 'Kano Tech Studio',
    ownerName: 'Musa',
    description: 'Laptops and software tools',
    tagline: 'Trusted hardware & workflows',
    specialty: 'Electronics',
    location: 'Kano, Nigeria',
    city: 'Kano',
    state: 'Kano',
    phone: '+234800000001',
    whatsapp: '',
    returnPolicy: '7-day replacement guarantee',
    iconPath: '',
    coverPath: '',
    iconUrl: '',
    coverUrl: '',
    followerCount: 12,
    productCount: 4,
    averageRating: 4.5,
    reviewCount: 8,
    isFollowed: false,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'v2',
    shopName: 'Arewa Creative Academy',
    ownerName: 'Zainab',
    description: 'Design templates and creator courses',
    tagline: 'Master design faster',
    specialty: 'Digital Courses',
    location: '',
    city: 'Abuja',
    state: 'FCT',
    phone: '+234800000002',
    whatsapp: '',
    returnPolicy: 'Instant digital download support',
    iconPath: 'shop-icons/v2/logo.png',
    coverPath: 'shop-covers/v2/banner.jpg',
    iconUrl: '/_storage/logo.png',
    coverUrl: '/_storage/banner.jpg',
    followerCount: 34,
    productCount: 9,
    averageRating: 4.9,
    reviewCount: 22,
    isFollowed: true,
    createdAt: '2026-02-15T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'v3',
    shopName: 'Lagos Digital Mart',
    ownerName: 'Tunde',
    description: 'SaaS kits and social growth',
    tagline: 'Growth templates',
    specialty: 'Digital Products',
    location: 'Lagos',
    city: 'Lagos',
    state: 'Lagos',
    phone: '+234800000003',
    whatsapp: '',
    returnPolicy: '',
    iconPath: '',
    coverPath: '',
    iconUrl: '',
    coverUrl: '',
    followerCount: 5,
    productCount: 14,
    averageRating: 4.2,
    reviewCount: 3,
    isFollowed: false,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
  },
];

test('filterAndSortShops filters by following state, search query, and specialty', () => {
  const followedOnly = filterAndSortShops(SHOPS, { filterMode: 'following', followedIds: ['v2'] });
  assert.deepEqual(followedOnly.map((s) => s.id), ['v2']);

  const searched = filterAndSortShops(SHOPS, { search: 'abuja' });
  assert.deepEqual(searched.map((s) => s.id), ['v2']);

  const bySpecialty = filterAndSortShops(SHOPS, { specialty: 'Electronics' });
  assert.deepEqual(bySpecialty.map((s) => s.id), ['v1']);
});

test('filterAndSortShops sorts by popular, products, rating, and newest', () => {
  assert.deepEqual(
    filterAndSortShops(SHOPS, { sort: 'popular' }).map((s) => s.id),
    ['v2', 'v1', 'v3']
  );
  assert.deepEqual(
    filterAndSortShops(SHOPS, { sort: 'products' }).map((s) => s.id),
    ['v3', 'v2', 'v1']
  );
  assert.deepEqual(
    filterAndSortShops(SHOPS, { sort: 'rating' }).map((s) => s.id),
    ['v2', 'v1', 'v3']
  );
  assert.deepEqual(
    filterAndSortShops(SHOPS, { sort: 'newest' }).map((s) => s.id),
    ['v3', 'v2', 'v1']
  );
});

test('collectShopSpecialties, formatShopLocation, getShopMonogram, and getFollowedShopProducts work cleanly', () => {
  assert.deepEqual(collectShopSpecialties(SHOPS), ['Digital Courses', 'Digital Products', 'Electronics']);
  assert.equal(formatShopLocation(SHOPS[1]), 'Abuja, FCT');
  assert.equal(formatShopLocation({}), 'Nigeria');
  assert.equal(getShopMonogram('Kano Tech Studio'), 'KT');
  assert.equal(getShopMonogram('Yakaji'), 'YA');

  const prods = [
    { id: 'p1', vendorId: 'v2', status: 'approved' },
    { id: 'p2', vendorId: 'v2', status: 'pending' },
    { id: 'p3', vendorId: 'v1', status: 'approved' },
  ];
  assert.deepEqual(
    getFollowedShopProducts(prods, ['v2']).map((p) => p.id),
    ['p1']
  );
});
