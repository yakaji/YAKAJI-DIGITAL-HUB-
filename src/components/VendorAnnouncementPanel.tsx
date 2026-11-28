import { useMemo, useState, type FormEvent } from 'react';
import { Eye, Megaphone, RefreshCw, RotateCcw, Send, Store, Users } from 'lucide-react';
import { AnnouncementBoard } from './AnnouncementBoard';
import {
  VENDOR_ANNOUNCEMENT_MESSAGE_MAX,
  VENDOR_ANNOUNCEMENT_MESSAGE_MIN,
  VENDOR_ANNOUNCEMENT_PRESETS,
  VENDOR_ANNOUNCEMENT_TITLE_MAX,
  VENDOR_ANNOUNCEMENT_TITLE_MIN,
  buildVendorAnnouncementPreview,
  isAnnouncementActive,
  summarizeVendorAnnouncements,
  validateVendorAnnouncementDraft,
  type MarketplaceAnnouncement,
} from '../utils/announcements';

type HistoryFilter = 'all' | 'active' | 'cancelled';

export interface VendorAnnouncementPanelProps {
  vendorId: string;
  shopName: string;
  followerCount: number;
  announcements: MarketplaceAnnouncement[];
  form: { title: string; message: string };
  setForm: (next: { title: string; message: string }) => void;
  busy: boolean;
  cancellingId: string;
  onPublish: (e: FormEvent) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onOpenPublicShop?: () => void;
}

export function VendorAnnouncementPanel({
  vendorId,
  shopName,
  followerCount,
  announcements,
  form,
  setForm,
  busy,
  cancellingId,
  onPublish,
  onCancel,
  onRefresh,
  onOpenPublicShop,
}: VendorAnnouncementPanelProps) {
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const safeFollowerCount = Math.max(0, Number(followerCount || 0));
  const validation = useMemo(() => validateVendorAnnouncementDraft(form), [form]);
  const summary = useMemo(() => summarizeVendorAnnouncements(announcements), [announcements]);

  const previewAnnouncement = useMemo(
    () =>
      buildVendorAnnouncementPreview({
        vendorId,
        shopName,
        title: form.title,
        message: form.message,
      }),
    [vendorId, shopName, form.title, form.message]
  );

  const filteredAnnouncements = useMemo(() => {
    if (historyFilter === 'active') {
      return announcements.filter((item) => isAnnouncementActive(item));
    }
    if (historyFilter === 'cancelled') {
      return announcements.filter((item) => !isAnnouncementActive(item));
    }
    return announcements;
  }, [announcements, historyFilter]);

  const hasDraft = form.title.length > 0 || form.message.length > 0;

  return (
    <section
      className="panel vendor-ann-panel"
      id="vendor-follower-announcements"
      aria-label="Shop follower announcements"
      data-testid="vendor-announcement-panel"
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">SHOP FOLLOWERS · DIRECT BROADCAST</span>
          <h2>Announce to {shopName} followers</h2>
          <p>
            Broadcasts published here appear on the Marketplace Announcement Board strictly for customers following{' '}
            <b>{shopName}</b> and deliver directly to their Alerts inbox.
          </p>
        </div>
        <div className="vendor-ann-header-actions">
          {onOpenPublicShop && (
            <button type="button" className="secondary-btn" onClick={onOpenPublicShop}>
              <Store size={15} /> View Public Shop
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => void onRefresh()}
            disabled={busy}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="stats-row vendor-ann-stats tabular-nums" aria-label="Follower broadcast summary">
        <div>
          <small>Shop followers</small>
          <b>{safeFollowerCount.toLocaleString()}</b>
        </div>
        <div>
          <small>Active on board</small>
          <b>{summary.activeCount.toLocaleString()}</b>
        </div>
        <div>
          <small>Total delivered alerts</small>
          <b>{summary.totalDelivered.toLocaleString()}</b>
        </div>
      </div>

      <div className="vendor-ann-presets" role="group" aria-label="Announcement templates">
        <span className="vendor-ann-presets-label">Announcement templates:</span>
        {VENDOR_ANNOUNCEMENT_PRESETS.map((preset) => {
          const presetValues = preset.build(shopName);
          const isSelected = form.title === presetValues.title && form.message === presetValues.message;
          return (
            <button
              key={preset.id}
              type="button"
              className={`filter-chip${isSelected ? ' active' : ''}`}
              aria-pressed={isSelected}
              disabled={busy}
              onClick={() => setForm(presetValues)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="vendor-ann-workspace">
        <form
          className="product-form vendor-ann-form"
          onSubmit={(e) => void onPublish(e)}
          aria-label="Compose follower announcement"
        >
          <div className="full-field vendor-ann-field-group">
            <div className="vendor-ann-field-head">
              <label htmlFor="vendor-ann-title-input">Announcement title</label>
              <span
                className={`vendor-ann-charcount tabular-nums${validation.titleRemaining < 15 ? ' is-near-limit' : ''}`}
              >
                {form.title.length} / {VENDOR_ANNOUNCEMENT_TITLE_MAX}
              </span>
            </div>
            <input
              id="vendor-ann-title-input"
              required
              minLength={VENDOR_ANNOUNCEMENT_TITLE_MIN}
              maxLength={VENDOR_ANNOUNCEMENT_TITLE_MAX}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. New product drop, weekend restock, or flash promo for followers"
            />
          </div>

          <div className="full-field vendor-ann-field-group">
            <div className="vendor-ann-field-head">
              <label htmlFor="vendor-ann-message-input">Message to shop followers</label>
              <span
                className={`vendor-ann-charcount tabular-nums${validation.messageRemaining < 60 ? ' is-near-limit' : ''}`}
              >
                {form.message.length} / {VENDOR_ANNOUNCEMENT_MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="vendor-ann-message-input"
              required
              minLength={VENDOR_ANNOUNCEMENT_MESSAGE_MIN}
              maxLength={VENDOR_ANNOUNCEMENT_MESSAGE_MAX}
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write an update exclusively for customers who follow your shop..."
            />
          </div>

          <div className="full-field vendor-ann-form-footer">
            <div className="vendor-ann-reach-note">
              <Users size={14} aria-hidden="true" />
              <span>
                {safeFollowerCount > 0
                  ? `Will notify ${safeFollowerCount.toLocaleString()} shop follower${safeFollowerCount === 1 ? '' : 's'} immediately and pin to their Announcement Board.`
                  : 'Publishes to your Follower Announcement Board immediately; future shop followers will see active broadcasts while live.'}
              </span>
            </div>

            <div className="vendor-ann-submit-row">
              {hasDraft && (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy}
                  onClick={() => setForm({ title: '', message: '' })}
                >
                  <RotateCcw size={14} /> Clear draft
                </button>
              )}
              <button
                type="submit"
                className="primary-btn"
                disabled={busy || !validation.valid}
                data-testid="publish-vendor-announcement-btn"
              >
                <Send size={15} />{' '}
                {busy ? 'Publishing to followers...' : 'Send & Publish to Shop Followers'}
              </button>
            </div>
          </div>
        </form>

        <div className="vendor-ann-preview-col">
          <div className="vendor-ann-preview-label">
            <Eye size={14} aria-hidden="true" />
            <span>How followers see this on the Announcement Board</span>
          </div>
          <AnnouncementBoard
            announcements={[previewAnnouncement]}
            onDismiss={() => {}}
            surface="vendor"
            previewMode
            headingSummary={`Visible only to signed-in followers of ${shopName}`}
          />
        </div>
      </div>

      <div className="vendor-ann-history-head">
        <h3>Published follower announcements ({announcements.length})</h3>
        <div className="vendor-ann-filter-tabs" role="tablist" aria-label="Filter follower broadcasts">
          <button
            type="button"
            role="tab"
            aria-selected={historyFilter === 'all'}
            className={historyFilter === 'all' ? 'active' : ''}
            onClick={() => setHistoryFilter('all')}
          >
            All ({summary.total})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={historyFilter === 'active'}
            className={historyFilter === 'active' ? 'active' : ''}
            onClick={() => setHistoryFilter('active')}
          >
            Active on board ({summary.activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={historyFilter === 'cancelled'}
            className={historyFilter === 'cancelled' ? 'active' : ''}
            onClick={() => setHistoryFilter('cancelled')}
          >
            Cancelled ({summary.cancelledCount})
          </button>
        </div>
      </div>

      <div className="admin-scroll-list" data-testid="vendor-announcement-history">
        {filteredAnnouncements.length ? (
          filteredAnnouncements.map((item) => {
            const activeOnBoard = isAnnouncementActive(item);
            const delivered = Number(item.deliveredCount ?? item.sentCount ?? 0);
            return (
              <div className="manage-row" key={item.id} data-testid={`vendor-ann-row-${item.id}`}>
                <div className="manage-main">
                  <b>{item.title}</b>
                  <p className="muted vendor-announcement-msg">{item.message}</p>
                  <small className="tabular-nums">
                    Audience: Shop Followers ({shopName}) · {new Date(item.createdAt).toLocaleString()} · Reached{' '}
                    {delivered.toLocaleString()} follower{delivered === 1 ? '' : 's'}
                  </small>
                </div>
                <span className={'status ' + (activeOnBoard ? 'approved' : 'cancelled')}>
                  {activeOnBoard ? 'Active on board' : 'Cancelled'}
                </span>
                {activeOnBoard && (
                  <button
                    type="button"
                    className="secondary-btn"
                    aria-label={`Cancel follower broadcast "${item.title}" from board`}
                    disabled={cancellingId === item.id}
                    onClick={() => void onCancel(item.id)}
                  >
                    {cancellingId === item.id ? 'Cancelling...' : 'Cancel from board'}
                  </button>
                )}
              </div>
            );
          })
        ) : announcements.length > 0 ? (
          <div className="chart-empty compact">
            <Megaphone size={22} />
            <b>No {historyFilter} follower announcements</b>
            <small>Switch filters above to view all published follower updates.</small>
          </div>
        ) : (
          <div className="chart-empty compact">
            <Megaphone size={22} />
            <b>No follower announcements published yet</b>
            <small>
              Use a quick template or compose a custom message above to notify everyone following {shopName}.
            </small>
          </div>
        )}
      </div>
    </section>
  );
}
