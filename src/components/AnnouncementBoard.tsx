import { useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, RotateCcw, Store, X } from 'lucide-react';
import {
  formatAnnouncementAudienceLabel,
  normalizeAnnouncementAudience,
  type MarketplaceAnnouncement,
} from '../utils/announcements';

type AnnouncementBoardProps = {
  announcements: MarketplaceAnnouncement[];
  onDismiss: (id: string) => void;
  dismissBusyId?: string;
  surface?: 'market' | 'vendor' | 'affiliate';
  previewMode?: boolean;
  headingEyebrow?: string;
  headingSummary?: string;
};

export function AnnouncementBoard({
  announcements,
  onDismiss,
  dismissBusyId = '',
  surface = 'market',
  previewMode = false,
  headingEyebrow,
  headingSummary,
}: AnnouncementBoardProps) {
  const [expanded, setExpanded] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);

  if (!announcements.length) return null;

  const visibleList = expanded ? announcements : announcements.slice(0, 2);
  const hiddenCount = Math.max(0, announcements.length - visibleList.length);

  const resolvedEyebrow =
    headingEyebrow || (previewMode ? 'FOLLOWER ANNOUNCEMENT BOARD PREVIEW' : 'MARKETPLACE ANNOUNCEMENT BOARD');
  const resolvedSummary =
    headingSummary ||
    (announcements.length === 1
      ? '1 active announcement for your account'
      : `${announcements.length} active announcements for your account`);

  if (previewMode && previewDismissed) {
    return (
      <section
        className={`announcement-board surface-${surface} is-preview-dismissed`}
        aria-label="Follower Announcement Board Preview"
        data-testid="announcement-board-preview"
      >
        <div className="announcement-board-head">
          <div className="announcement-board-title">
            <span className="announcement-board-icon" aria-hidden="true">
              <Megaphone size={16} />
            </span>
            <div>
              <span className="eyebrow">{resolvedEyebrow}</span>
              <strong>Dismissed by follower (hidden from their board)</strong>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn announcement-board-toggle"
            onClick={() => setPreviewDismissed(false)}
          >
            <RotateCcw size={14} /> Restore preview
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`announcement-board surface-${surface}`}
      aria-label={previewMode ? 'Follower Announcement Board Preview' : 'Marketplace Announcement Board'}
      data-testid={previewMode ? 'announcement-board-preview' : 'announcement-board'}
    >
      <div className="announcement-board-head">
        <div className="announcement-board-title">
          <span className="announcement-board-icon" aria-hidden="true">
            <Megaphone size={16} />
          </span>
          <div>
            <span className="eyebrow">{resolvedEyebrow}</span>
            <strong>{resolvedSummary}</strong>
          </div>
        </div>
        {announcements.length > 2 && (
          <button
            type="button"
            className="secondary-btn announcement-board-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Show fewer
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show all ({hiddenCount} more)
              </>
            )}
          </button>
        )}
      </div>

      <div className="announcement-board-list">
        {visibleList.map((item) => {
          const audience = normalizeAnnouncementAudience(item.audience) || 'all';
          const isDismissing = dismissBusyId === item.id;
          return (
            <article
              key={item.id}
              className={`announcement-board-card audience-${audience}`}
              data-testid={previewMode ? `announcement-preview-card-${item.id}` : `announcement-card-${item.id}`}
            >
              <div className="announcement-board-card-body">
                <div className="announcement-board-meta">
                  <span className={`announcement-audience-tag audience-${audience}`}>
                    {audience === 'shop_followers' && <Store size={12} aria-hidden="true" />}
                    <span>{formatAnnouncementAudienceLabel(audience, item.vendorShopName)}</span>
                  </span>
                  {item.createdAt && (
                    <>
                      <span className="announcement-meta-sep" aria-hidden="true">·</span>
                      <time dateTime={item.createdAt}>
                        {previewMode ? 'Just now' : new Date(item.createdAt).toLocaleString()}
                      </time>
                    </>
                  )}
                </div>
                <h3>{item.title}</h3>
                <p>{item.message}</p>
              </div>
              <div className="announcement-board-card-actions">
                <button
                  type="button"
                  className="announcement-dismiss-btn"
                  disabled={isDismissing}
                  aria-label={
                    previewMode
                      ? `Test dismiss on preview "${item.title}"`
                      : `Cancel announcement "${item.title}" from board`
                  }
                  onClick={() => {
                    if (previewMode) {
                      setPreviewDismissed(true);
                    } else {
                      onDismiss(item.id);
                    }
                  }}
                >
                  <X size={14} />
                  <span>{isDismissing ? 'Removing...' : 'Dismiss'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
