import type { VerificationTierId } from '../utils/vendorVerification';

const TIER_LABEL: Record<string, string> = {
  starter: 'Starter Verified',
  plus: 'Plus Verified',
  premium: 'Premium Verified',
  pro_max: 'Pro Max Verified',
};

export function VerifiedShopBadge({
  verified,
  tierId,
  size = 'sm',
  showLabel = false,
}: {
  verified?: boolean;
  tierId?: VerificationTierId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  if (!verified) return null;
  const tierText = (tierId && TIER_LABEL[String(tierId)]) || 'Verified Shop';
  const px = size === 'xs' ? 14 : size === 'sm' ? 16 : size === 'md' ? 19 : 22;

  return (
    <span
      className={`verified-shop-badge is-${size}`}
      title={`${tierText} · KYC & Business Verified`}
      aria-label={tierText}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="verified-shop-tick-svg"
      >
        <path
          d="M12 1.75L14.72 3.45L17.9 3.12L19.16 6.07L21.95 7.56L21.37 10.71L23 13.45L20.76 15.72L20.43 18.9L17.44 19.72L15.65 22.35L12.66 21.32L9.68 22.35L7.89 19.72L4.9 18.9L4.57 15.72L2.33 13.45L3.96 10.71L3.38 7.56L6.17 6.07L7.43 3.12L10.61 3.45L12 1.75Z"
          fill="#1D9BF0"
        />
        <path
          d="M8.75 12.25L10.95 14.45L15.55 9.65"
          stroke="#FFFFFF"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabel && <span className="verified-shop-label">{tierText}</span>}
    </span>
  );
}
