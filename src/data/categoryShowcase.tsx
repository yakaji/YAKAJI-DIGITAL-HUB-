import type { ReactNode } from 'react';
import catDigitalGoodsImg from '../assets/images/cat_digital_goods_1795440369144.jpg';
import catOnlineCoursesImg from '../assets/images/cat_online_courses_1795440369861.jpg';
import catSocialMediaImg from '../assets/images/cat_social_media_1795440370014.jpg';
import catDigitalServicesImg from '../assets/images/cat_digital_services_1795440369921.jpg';
import catElectronicsImg from '../assets/images/cat_electronics_1795440369553.jpg';
import catFashionImg from '../assets/images/cat_fashion_1795440371337.jpg';
import catHomeLivingImg from '../assets/images/cat_home_living_1795440371630.jpg';
import catSpecialOffersImg from '../assets/images/cat_special_offers_1795440371255.jpg';
import catBeautyCareImg from '../assets/images/cat_beauty_care_1795440370229.jpg';
import catFoodGroceriesImg from '../assets/images/cat_food_groceries_1795440370165.jpg';
import catOtherImg from '../assets/images/cat_marketplace_other_1795440371461.jpg';
import heroMarketImg from '../assets/images/hero_marketplace_hub_1795438758209.jpg';
import {
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Cloud,
  Code2,
  Coffee,
  Download,
  Droplets,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  Headphones,
  Home,
  KeyRound,
  Laptop,
  Layers,
  Megaphone,
  MonitorPlay,
  Package,
  Palette,
  Percent,
  PlayCircle,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Utensils,
  Watch,
  Zap
} from 'lucide-react';

export interface CategoryHighlightItem {
  title: string;
  subtitle: string;
  iconKey: string;
  accent: 'emerald' | 'blue' | 'amber' | 'slate';
}

export interface CategoryPageMeta {
  slug: string;
  name: string;
  title: string;
  eyebrow: string;
  description: string;
  hint: string;
  filterCategory: string;
  defaultSort?: string;
  image: string;
  visualTags: string[];
  highlights: CategoryHighlightItem[];
}

export const catalogBannerImage = heroMarketImg;

export const shopShowcaseCategories: CategoryPageMeta[] = [
  {
    slug: 'digital-products',
    name: 'Digital Products',
    title: 'Digital Goods',
    eyebrow: 'DEPARTMENT · DIGITAL GOODS',
    description: 'Instant-access software utilities, web & UI templates, PDF guides, and digital licenses ready to download immediately after checkout.',
    hint: 'Software, UI kits & PDFs',
    filterCategory: 'Digital Products',
    image: catDigitalGoodsImg,
    visualTags: ['Apps & Scripts', 'UI Templates', 'PDF Guides', 'License Keys'],
    highlights: [
      { title: 'Software & Scripts', subtitle: 'Ready-to-deploy web & app utilities', iconKey: 'code', accent: 'slate' },
      { title: 'Instant Cloud Download', subtitle: 'Access files right after payment', iconKey: 'download', accent: 'emerald' },
      { title: 'PDF E-Books & Templates', subtitle: 'Editable business & Notion kits', iconKey: 'file', accent: 'blue' },
      { title: 'Verified Digital Keys', subtitle: 'Genuine activation & asset licenses', iconKey: 'key', accent: 'amber' }
    ]
  },
  {
    slug: 'digital-courses',
    name: 'Digital Courses',
    title: 'Online Courses',
    eyebrow: 'DEPARTMENT · ONLINE ACADEMY',
    description: 'Structured video masterclasses, AI productivity bootcamps, and practical skill-building programmes taught by verified creators.',
    hint: 'Video lessons & certificates',
    filterCategory: 'Digital Courses',
    image: catOnlineCoursesImg,
    visualTags: ['HD Video Modules', 'Workbooks', 'Certificates', 'Self-Paced'],
    highlights: [
      { title: 'HD Video Lessons', subtitle: 'Step-by-step screen & studio modules', iconKey: 'video', accent: 'emerald' },
      { title: 'Structured Curriculum', subtitle: 'Beginner to advanced study tracks', iconKey: 'book', accent: 'blue' },
      { title: 'Course Certificates', subtitle: 'Proof of skill on programme completion', iconKey: 'award', accent: 'amber' },
      { title: 'Learn On Any Device', subtitle: 'Desktop, tablet & mobile friendly', iconKey: 'graduation', accent: 'slate' }
    ]
  },
  {
    slug: 'social-media',
    name: 'Social Media',
    title: 'Social Media',
    eyebrow: 'DEPARTMENT · CHANNELS & GROUPS',
    description: 'Verified social channels, community groups, content creator toolkits, and audience growth solutions across WhatsApp, YouTube, Instagram, TikTok, Telegram & Facebook.',
    hint: 'WhatsApp, YouTube, IG, TikTok & TG',
    filterCategory: 'Social Media',
    image: catSocialMediaImg,
    visualTags: ['WhatsApp Groups', 'YouTube Channels', 'Instagram & TikTok', 'Telegram'],
    highlights: [
      { title: 'WhatsApp & Telegram Groups', subtitle: 'Community channels & broadcast hubs', iconKey: 'megaphone', accent: 'emerald' },
      { title: 'YouTube & Video Channels', subtitle: 'Creator channel setup & video packs', iconKey: 'play', accent: 'amber' },
      { title: 'Instagram, TikTok & Facebook', subtitle: 'Social page assets & content suites', iconKey: 'globe', accent: 'blue' },
      { title: 'Creator Verification Support', subtitle: 'Direct vendor onboarding & handover', iconKey: 'shield', accent: 'slate' }
    ]
  },
  {
    slug: 'digital-services',
    name: 'Digital Services',
    title: 'Digital Services',
    eyebrow: 'DEPARTMENT · PROFESSIONAL SERVICES',
    description: 'Vetted digital agency services including CAC business registration, brand identity, website builds, and growth marketing retainers.',
    hint: 'Branding, web & CAC setup',
    filterCategory: 'Digital Services',
    image: catDigitalServicesImg,
    visualTags: ['Brand Identity', 'Web & App Dev', 'CAC Setup', 'Marketing'],
    highlights: [
      { title: 'Business & CAC Setup', subtitle: 'Formal registration & compliance packs', iconKey: 'briefcase', accent: 'emerald' },
      { title: 'Brand & UI Design', subtitle: 'Logos, visual systems & product UI', iconKey: 'palette', accent: 'amber' },
      { title: 'Website & Storefront Builds', subtitle: 'Custom landing pages & commerce setups', iconKey: 'layers', accent: 'blue' },
      { title: 'Direct Vendor Collaboration', subtitle: 'Private order chat inside your account', iconKey: 'check', accent: 'slate' }
    ]
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    title: 'Electronics',
    eyebrow: 'DEPARTMENT · HARDWARE & TECH',
    description: 'Laptops, smartphones, wireless audio gear, smartwatches, and workstation accessories sourced from reviewed marketplace sellers.',
    hint: 'Phones, laptops & audio gear',
    filterCategory: 'Electronics',
    image: catElectronicsImg,
    visualTags: ['Laptops', 'Smartphones', 'Audio Gear', 'Accessories'],
    highlights: [
      { title: 'Computers & Workstations', subtitle: 'Laptops, docks & studio displays', iconKey: 'laptop', accent: 'slate' },
      { title: 'Smartphones & Tablets', subtitle: 'Flagship mobile devices & cases', iconKey: 'smartphone', accent: 'blue' },
      { title: 'Audio & Studio Gear', subtitle: 'Headphones, mics & wireless earbuds', iconKey: 'headphones', accent: 'emerald' },
      { title: 'Wearables & Chargers', subtitle: 'Smartwatches, cables & power hubs', iconKey: 'watch', accent: 'amber' }
    ]
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    title: 'Fashion',
    eyebrow: 'DEPARTMENT · APPAREL & STYLE',
    description: 'Tailored everyday apparel, leather bags, footwear, wristwatches, and fashion accessories curated from independent storefronts.',
    hint: 'Apparel, bags & footwear',
    filterCategory: 'Fashion',
    image: catFashionImg,
    visualTags: ['Apparel', 'Leather Bags', 'Footwear', 'Watches'],
    highlights: [
      { title: 'Tailored Apparel', subtitle: 'Everyday wear, blazers & outerwear', iconKey: 'shirt', accent: 'slate' },
      { title: 'Bags & Leather Goods', subtitle: 'Handbags, totes & travel pouches', iconKey: 'bag', accent: 'emerald' },
      { title: 'Footwear & Sneakers', subtitle: 'Classic trainers, loafers & sandals', iconKey: 'sparkles', accent: 'amber' },
      { title: 'Watches & Eyewear', subtitle: 'Timepieces & designer frames', iconKey: 'watch', accent: 'blue' }
    ]
  },
  {
    slug: 'home-living',
    name: 'Home & Living',
    title: 'Home & Living',
    eyebrow: 'DEPARTMENT · HOME & INTERIORS',
    description: 'Architectural lighting, kitchenware, home appliances, soft furnishings, and practical household essentials for modern spaces.',
    hint: 'Decor, kitchen & home gear',
    filterCategory: 'Home & Living',
    image: catHomeLivingImg,
    visualTags: ['Lighting', 'Kitchenware', 'Textiles', 'Home Gear'],
    highlights: [
      { title: 'Architectural Lighting', subtitle: 'Desk lamps & warm ambient fixtures', iconKey: 'zap', accent: 'amber' },
      { title: 'Kitchen & Coffee Ware', subtitle: 'Ceramics, pour-overs & utensils', iconKey: 'coffee', accent: 'emerald' },
      { title: 'Living Room Essentials', subtitle: 'Organizers, textiles & table accents', iconKey: 'home', accent: 'blue' },
      { title: 'Verified Storefront Quality', subtitle: 'Packaged cleanly for doorstep delivery', iconKey: 'package', accent: 'slate' }
    ]
  },
  {
    slug: 'special-offers',
    name: 'Special Offers',
    title: 'Best Deals',
    eyebrow: 'DEPARTMENT · CURATED OFFERS',
    description: 'Value-priced listings, active vendor discounts, and bundle deals across every department on Yakaji Digital Hub.',
    hint: 'Markdowns & coupon deals',
    filterCategory: 'All',
    defaultSort: 'price-low',
    image: catSpecialOffersImg,
    visualTags: ['Price Drops', 'Gift Bundles', 'Coupon Ready', 'Lowest Price'],
    highlights: [
      { title: 'Verified Price Drops', subtitle: 'Listings sorted by highest value first', iconKey: 'percent', accent: 'emerald' },
      { title: 'Gift-Ready Bundles', subtitle: 'Curated tech, print & lifestyle sets', iconKey: 'gift', accent: 'amber' },
      { title: 'Checkout Coupon Support', subtitle: 'Apply vendor & hub promo codes', iconKey: 'tag', accent: 'blue' },
      { title: 'Protected Payment Options', subtitle: 'Wallet, Paystack & verified transfer', iconKey: 'shield', accent: 'slate' }
    ]
  }
];

export const extraCategoryPages: CategoryPageMeta[] = [
  {
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    title: 'Beauty & Personal Care',
    eyebrow: 'DEPARTMENT · BEAUTY & WELLNESS',
    description: 'Skincare serums, botanical soaps, grooming essentials, and self-care formulations from reviewed vendors.',
    hint: 'Skincare, serums & grooming',
    filterCategory: 'Beauty & Personal Care',
    image: catBeautyCareImg,
    visualTags: ['Skincare', 'Serums', 'Botanical Soap', 'Grooming'],
    highlights: [
      { title: 'Serums & Moisturizers', subtitle: 'Daily hydration & targeted skincare', iconKey: 'droplets', accent: 'emerald' },
      { title: 'Natural Soaps & Oils', subtitle: 'Cold-pressed & botanical care', iconKey: 'sparkles', accent: 'amber' },
      { title: 'Bath & Grooming Kits', subtitle: 'Clean personal care routines', iconKey: 'bag', accent: 'blue' },
      { title: 'Verified Seller Sourcing', subtitle: 'Sealed packaging & genuine batches', iconKey: 'shield', accent: 'slate' }
    ]
  },
  {
    slug: 'food-groceries',
    name: 'Food & Groceries',
    title: 'Food & Groceries',
    eyebrow: 'DEPARTMENT · PANTRY & PROVISIONS',
    description: 'Specialty coffee, cooking oils, raw honey, dry grains, and everyday pantry provisions from trusted suppliers.',
    hint: 'Pantry staples & provisions',
    filterCategory: 'Food & Groceries',
    image: catFoodGroceriesImg,
    visualTags: ['Specialty Coffee', 'Cooking Oils', 'Raw Honey', 'Dry Grains'],
    highlights: [
      { title: 'Pantry & Cooking Oils', subtitle: 'Olive oil, condiments & staples', iconKey: 'utensils', accent: 'emerald' },
      { title: 'Roasted Coffee & Teas', subtitle: 'Artisan blends & morning brews', iconKey: 'coffee', accent: 'amber' },
      { title: 'Honey, Grains & Produce', subtitle: 'Wholesome household provisions', iconKey: 'package', accent: 'blue' },
      { title: 'Fast Order Fulfilment', subtitle: 'Direct vendor dispatch & tracking', iconKey: 'check', accent: 'slate' }
    ]
  },
  {
    slug: 'other',
    name: 'Other',
    title: 'Other Products',
    eyebrow: 'DEPARTMENT · GENERAL CATALOGUE',
    description: 'Books, stationery, travel gear, and specialized goods from approved marketplace vendors.',
    hint: 'Books, stationery & gear',
    filterCategory: 'Other',
    image: catOtherImg,
    visualTags: ['Books', 'Stationery', 'Travel Gear', 'Organizers'],
    highlights: [
      { title: 'Books & Publications', subtitle: 'Print reads & reference editions', iconKey: 'book', accent: 'slate' },
      { title: 'Stationery & Desk Gear', subtitle: 'Notebooks, pens & organizers', iconKey: 'file', accent: 'blue' },
      { title: 'Travel & Carry Goods', subtitle: 'Bottles, pouches & accessories', iconKey: 'bag', accent: 'emerald' },
      { title: 'Specialty Listings', subtitle: 'Unique finds across verified shops', iconKey: 'package', accent: 'amber' }
    ]
  }
];

export const allCategoryPages: CategoryPageMeta[] = [...shopShowcaseCategories, ...extraCategoryPages];

export function resolveCategoryMeta(input: string): CategoryPageMeta {
  const norm = input.trim().toLowerCase();
  return (
    allCategoryPages.find(c => c.slug === norm || c.name.toLowerCase() === norm || c.title.toLowerCase() === norm) ||
    allCategoryPages[0]
  );
}

type LogoSpec = {
  id: string;
  label: string;
  bg: string;
  color: string;
  svg: ReactNode;
};

const socialLogoSpecs: LogoSpec[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    bg: '#25D366',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12.04 2a9.92 9.92 0 0 0-8.46 15.1L2 22l5.06-1.52A9.93 9.93 0 1 0 12.04 2Zm5.75 14.08c-.24.68-1.4 1.3-1.93 1.38-.5.07-1.13.1-1.82-.12-.42-.14-.96-.31-1.65-.61-2.9-1.26-4.79-4.18-4.93-4.38-.14-.2-1.18-1.57-1.18-3s.75-2.12 1.02-2.41c.26-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.59.82 2.04.9 2.19.07.15.12.33.02.52-.1.2-.14.32-.29.49-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.29.77 1.27 1.65 2.05 1.13 1.01 2.08 1.32 2.38 1.47.3.15.47.12.64-.07.18-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.96.3.15.5.22.57.34.07.13.07.72-.17 1.4Z" />
      </svg>
    )
  },
  {
    id: 'youtube',
    label: 'YouTube',
    bg: '#FF0000',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.2V8.8l5.3 3.2-5.3 3.2Z" />
      </svg>
    )
  },
  {
    id: 'instagram',
    label: 'Instagram',
    bg: 'linear-gradient(135deg, #f58529 0%, #dd2a7b 55%, #8134af 100%)',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    bg: '#111827',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#25F4EE" d="M16.4 6.2a4.4 4.4 0 0 1-2-3.4h-2.5v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .5 0 .7.1V9.6a4.9 4.9 0 0 0-.7-.1 4.9 4.9 0 1 0 4.9 4.9V8.4a6.9 6.9 0 0 0 3.9 1.2V7.1c-.8 0-1.4-.3-2-.9Z" />
        <path fill="#FE2C55" d="M17.2 6.8a4.4 4.4 0 0 1-2-3.4h-2v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .5 0 .7.1v-2.6a4.9 4.9 0 0 0-.7-.1 4.9 4.9 0 1 0 4.9 4.9V9a6.9 6.9 0 0 0 3.9 1.2V7.7c-.9 0-1.9-.3-2.5-.9Z" opacity="0.88" />
        <path fill="currentColor" d="M16.8 6.5a4.4 4.4 0 0 1-2-3.4h-2.3v11.6a2.3 2.3 0 1 1-2.3-2.3c.2 0 .5 0 .7.1V9.9a4.9 4.9 0 0 0-.7-.1 4.9 4.9 0 1 0 4.9 4.9V8.7a6.9 6.9 0 0 0 3.9 1.2V7.4c-.8 0-1.6-.3-2.2-.9Z" />
      </svg>
    )
  },
  {
    id: 'telegram',
    label: 'Telegram',
    bg: '#229ED9',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M20.6 4.4 3.5 11c-.8.3-.8 1.4 0 1.7l4.3 1.4 1.7 5.2c.2.6 1 .8 1.5.3l2.4-2.3 4.6 3.4c.6.4 1.5.1 1.7-.7L22 5.7c.2-.9-.6-1.6-1.4-1.3ZM9.3 13.7l8-5.1-6.4 6.2-.3 3-1.3-4.1Z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    bg: '#1877F2',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.2H8v3h2.5V21h3Z" />
      </svg>
    )
  }
];

const digitalGoodsSpecs: LogoSpec[] = [
  {
    id: 'cloud-dl',
    label: 'Instant File',
    bg: '#0B6B47',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.5 19a4.5 4.5 0 0 1-.4-8.98 6 6 0 0 1 11.6-1.37A4 4 0 0 1 18 19H6.5Z" />
        <path d="M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" />
      </svg>
    )
  },
  {
    id: 'software-code',
    label: 'Apps & Code',
    bg: '#1E293B',
    color: '#38BDF8',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" stroke="#ffffff" />
        <path d="m9 10-2 2 2 2M15 10l2 2-2 2M13 9l-2 6" />
      </svg>
    )
  },
  {
    id: 'pdf-kit',
    label: 'PDF & UI Kits',
    bg: '#DC2626',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5M8 13h8M8 17h5" />
      </svg>
    )
  },
  {
    id: 'license-key',
    label: 'License Key',
    bg: '#B78313',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="8" cy="14" r="3.5" />
        <path d="M10.7 11.7 19 4l2 2-2.2 2.2M15.5 7.5 17.5 9.5" />
      </svg>
    )
  }
];

const onlineCourseSpecs: LogoSpec[] = [
  {
    id: 'video-player',
    label: 'Video Class',
    bg: '#0B6B47',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="12" rx="2.5" />
        <path d="m10 9 5 2-5 2V9Z" fill="currentColor" />
        <path d="M7 20h10" />
      </svg>
    )
  },
  {
    id: 'academy-cap',
    label: 'Academy',
    bg: '#1D4ED8',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m2 10 10-5 10 5-10 5-10-5Z" />
        <path d="M6 12.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M21 10v5" />
      </svg>
    )
  },
  {
    id: 'certificate',
    label: 'Certificate',
    bg: '#B78313',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="9" r="5" />
        <path d="M9.5 13.5 8 21l4-2 4 2-1.5-7.5" />
      </svg>
    )
  },
  {
    id: 'workbook',
    label: 'Modules',
    bg: '#0F766E',
    color: '#ffffff',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M9 8h7M9 12h5" />
      </svg>
    )
  }
];

function iconSpec(id: string, label: string, bg: string, color: string, icon: ReactNode): LogoSpec {
  return { id, label, bg, color, svg: icon };
}

export function getCategoryLogos(slug: string): LogoSpec[] {
  switch (slug) {
    case 'digital-products':
      return digitalGoodsSpecs;
    case 'social-media':
      return socialLogoSpecs;
    case 'digital-courses':
      return onlineCourseSpecs;
    case 'digital-services':
      return [
        iconSpec('cac', 'Business CAC', '#0B6B47', '#ffffff', <Briefcase size={15} />),
        iconSpec('design', 'Brand UI', '#7C3AED', '#ffffff', <Palette size={15} />),
        iconSpec('web', 'Web Builds', '#0284C7', '#ffffff', <Globe size={15} />),
        iconSpec('growth', 'Marketing', '#EA580C', '#ffffff', <Megaphone size={15} />)
      ];
    case 'electronics':
      return [
        iconSpec('laptop', 'Laptops', '#1E293B', '#ffffff', <Laptop size={15} />),
        iconSpec('phone', 'Phones', '#0F766E', '#ffffff', <Smartphone size={15} />),
        iconSpec('audio', 'Audio', '#0B6B47', '#ffffff', <Headphones size={15} />),
        iconSpec('watch', 'Smartgear', '#B78313', '#ffffff', <Watch size={15} />)
      ];
    case 'fashion':
      return [
        iconSpec('apparel', 'Apparel', '#1E293B', '#ffffff', <Shirt size={15} />),
        iconSpec('bags', 'Bags', '#0B6B47', '#ffffff', <ShoppingBag size={15} />),
        iconSpec('watches', 'Watches', '#B78313', '#ffffff', <Watch size={15} />),
        iconSpec('style', 'Style', '#9F1239', '#ffffff', <Sparkles size={15} />)
      ];
    case 'home-living':
      return [
        iconSpec('home', 'Homeware', '#0B6B47', '#ffffff', <Home size={15} />),
        iconSpec('coffee', 'Kitchen', '#92400E', '#ffffff', <Coffee size={15} />),
        iconSpec('lighting', 'Lighting', '#B78313', '#ffffff', <Zap size={15} />),
        iconSpec('living', 'Decor', '#334155', '#ffffff', <Package size={15} />)
      ];
    case 'special-offers':
      return [
        iconSpec('percent', 'Price Drops', '#DC2626', '#ffffff', <Percent size={15} />),
        iconSpec('gift', 'Bundles', '#0B6B47', '#ffffff', <Gift size={15} />),
        iconSpec('coupon', 'Coupons', '#B78313', '#ffffff', <Tag size={15} />),
        iconSpec('verified', 'Protected', '#1E293B', '#ffffff', <ShieldCheck size={15} />)
      ];
    case 'beauty-personal-care':
      return [
        iconSpec('serums', 'Serums', '#0B6B47', '#ffffff', <Droplets size={15} />),
        iconSpec('care', 'Skincare', '#B78313', '#ffffff', <Sparkles size={15} />),
        iconSpec('groom', 'Bath Kits', '#334155', '#ffffff', <ShoppingBag size={15} />)
      ];
    case 'food-groceries':
      return [
        iconSpec('pantry', 'Pantry', '#0B6B47', '#ffffff', <Utensils size={15} />),
        iconSpec('coffee', 'Roasts', '#78350F', '#ffffff', <Coffee size={15} />),
        iconSpec('fresh', 'Provisions', '#15803D', '#ffffff', <Package size={15} />)
      ];
    default:
      return [
        iconSpec('books', 'Books', '#1E293B', '#ffffff', <BookOpen size={15} />),
        iconSpec('stationery', 'Desk Goods', '#0284C7', '#ffffff', <FileText size={15} />),
        iconSpec('lifestyle', 'Essentials', '#0B6B47', '#ffffff', <Package size={15} />)
      ];
  }
}

export function CategoryLogoCluster({
  slug,
  size = 'sm',
  showLabels = false
}: {
  slug: string;
  size?: 'sm' | 'lg';
  showLabels?: boolean;
}) {
  const logos = getCategoryLogos(slug);
  return (
    <div className={size === 'lg' ? 'cat-logo-cluster is-lg' : 'cat-logo-cluster'}>
      {logos.map(item => (
        <span className="cat-logo-item" key={item.id} title={item.label} aria-label={item.label}>
          <span
            className="cat-logo-badge"
            style={{ background: item.bg, color: item.color }}
          >
            {item.svg}
          </span>
          {showLabels && <span className="cat-logo-label">{item.label}</span>}
        </span>
      ))}
    </div>
  );
}

export function CategoryHighlightIcon({ iconKey, size = 18 }: { iconKey: string; size?: number }) {
  switch (iconKey) {
    case 'code': return <Code2 size={size} />;
    case 'download': return <Download size={size} />;
    case 'file': return <FileText size={size} />;
    case 'key': return <KeyRound size={size} />;
    case 'video': return <MonitorPlay size={size} />;
    case 'book': return <BookOpen size={size} />;
    case 'award': return <Award size={size} />;
    case 'graduation': return <GraduationCap size={size} />;
    case 'megaphone': return <Megaphone size={size} />;
    case 'play': return <PlayCircle size={size} />;
    case 'globe': return <Globe size={size} />;
    case 'shield': return <ShieldCheck size={size} />;
    case 'briefcase': return <Briefcase size={size} />;
    case 'palette': return <Palette size={size} />;
    case 'layers': return <Layers size={size} />;
    case 'check': return <CheckCircle2 size={size} />;
    case 'laptop': return <Laptop size={size} />;
    case 'smartphone': return <Smartphone size={size} />;
    case 'headphones': return <Headphones size={size} />;
    case 'watch': return <Watch size={size} />;
    case 'shirt': return <Shirt size={size} />;
    case 'bag': return <ShoppingBag size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'coffee': return <Coffee size={size} />;
    case 'home': return <Home size={size} />;
    case 'percent': return <Percent size={size} />;
    case 'gift': return <Gift size={size} />;
    case 'tag': return <Tag size={size} />;
    case 'droplets': return <Droplets size={size} />;
    case 'utensils': return <Utensils size={size} />;
    default: return <Cloud size={size} />;
  }
}
