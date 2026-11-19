import React, { useEffect, useState } from 'react';

export const STUDIO_ANNOUNCEMENTS_URL = 'https://home.yesolve-studio.workers.dev/announcements.json';

export interface StudioAnnouncement {
  id: string;
  apps?: string[];
  enabled?: boolean;
  start_at?: string;
  end_at?: string;
  frequency?: 'once' | 'daily' | 'always' | string;
  dismissible?: boolean;
  tag?: string;
  title?: string;
  message?: string;
  cta_text?: string;
  cta_url?: string;
}

interface AnnouncementsPayload {
  announcements?: StudioAnnouncement[];
}

const KEY_SEEN_IDS = 'yesolve_announcements_seen_ids';
const KEY_DAILY_LAST = 'yesolve_announcements_daily_last';

function localDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseJsonSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isAllowedUrl(raw?: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}

function isEligible(appId: string, item: StudioAnnouncement): boolean {
  if (!item || !item.id || item.enabled === false) return false;
  if (!item.title?.trim() && !item.message?.trim()) return false;

  const targets = Array.isArray(item.apps)
    ? item.apps.map((a) => String(a).trim().toLowerCase())
    : [];
  if (targets.length > 0 && !targets.includes('all') && !targets.includes(appId.toLowerCase())) {
    return false;
  }

  const nowMs = Date.now();
  if (item.start_at?.trim()) {
    const startMs = Date.parse(item.start_at.trim());
    if (!Number.isFinite(startMs) || nowMs < startMs) return false;
  }
  if (item.end_at?.trim()) {
    const endMs = Date.parse(item.end_at.trim());
    if (!Number.isFinite(endMs) || nowMs > endMs) return false;
  }

  const freq = String(item.frequency || 'once').trim().toLowerCase();
  if (freq === 'always') return true;
  if (freq === 'daily') {
    const dailyMap = parseJsonSafe<Record<string, string>>(localStorage.getItem(KEY_DAILY_LAST), {});
    return dailyMap[item.id] !== localDateKey();
  }
  const seenIds = parseJsonSafe<string[]>(localStorage.getItem(KEY_SEEN_IDS), []);
  return !seenIds.includes(item.id);
}

function markDismissed(item: StudioAnnouncement): void {
  if (!item.id) return;
  try {
    const freq = String(item.frequency || 'once').trim().toLowerCase();
    if (freq === 'always') return;
    if (freq === 'daily') {
      const dailyMap = parseJsonSafe<Record<string, string>>(localStorage.getItem(KEY_DAILY_LAST), {});
      dailyMap[item.id] = localDateKey();
      localStorage.setItem(KEY_DAILY_LAST, JSON.stringify(dailyMap));
      return;
    }
    const seenIds = parseJsonSafe<string[]>(localStorage.getItem(KEY_SEEN_IDS), []);
    if (!seenIds.includes(item.id)) {
      seenIds.push(item.id);
      localStorage.setItem(KEY_SEEN_IDS, JSON.stringify(seenIds));
    }
  } catch {
    // ignore storage failures
  }
}

interface Props {
  appId: string;
  blocked: boolean;
  defaultTag?: string;
  okLabel?: string;
}

export const StudioAnnouncementOverlay: React.FC<Props> = ({
  appId,
  blocked,
  defaultTag = '官方公告',
  okLabel = '我知道了',
}) => {
  const [announcement, setAnnouncement] = useState<StudioAnnouncement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    fetch(STUDIO_ANNOUNCEMENTS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: AnnouncementsPayload | null) => {
        const list = Array.isArray(payload?.announcements) ? payload.announcements : [];
        const matched = list.find((item) => isEligible(appId, item)) || null;
        setAnnouncement(matched);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [appId]);

  if (blocked || !announcement) return null;

  const dismissible = announcement.dismissible !== false;
  const hasCta = Boolean(announcement.cta_text?.trim() && isAllowedUrl(announcement.cta_url));
  const tagText = announcement.tag?.trim() || defaultTag;

  const handleDismiss = () => {
    markDismissed(announcement);
    setAnnouncement(null);
  };

  const handleCta = () => {
    const url = announcement.cta_url?.trim();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    if (dismissible) handleDismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999990,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'var(--bg, #090a0d)',
        color: 'var(--text-primary, #f4f5f8)',
        padding:
          'calc(var(--sat, 0px) + 18px) max(20px, var(--sar, 0px)) calc(var(--sab, 0px) + 18px) max(20px, var(--sal, 0px))',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '5px 11px',
            borderRadius: 8,
            background: 'var(--surface-highlight, #1f222b)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            color: 'var(--text-primary, #f4f5f8)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {tagText}
        </span>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="關閉"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              background: 'var(--surface, #111318)',
              color: 'var(--text-secondary, #9ea3b2)',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 460,
          margin: '0 auto',
          background: 'var(--surface, #111318)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: 16,
          padding: 22,
          boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
        }}
      >
        {announcement.title && (
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, lineHeight: 1.35, color: 'var(--text-primary, #f4f5f8)' }}>
            {announcement.title}
          </h2>
        )}
        {announcement.message && (
          <div
            style={{
              marginTop: 12,
              maxHeight: '42vh',
              overflowY: 'auto',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'var(--text-secondary, #9ea3b2)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {announcement.message}
          </div>
        )}
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hasCta && (
            <button
              type="button"
              onClick={handleCta}
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: 0,
                background: 'var(--accent, #3b82f6)',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 16px',
              }}
            >
              {announcement.cta_text}
            </button>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                width: '100%',
                minHeight: 46,
                borderRadius: 12,
                border: hasCta ? '1px solid var(--border, rgba(255,255,255,0.08))' : 0,
                background: hasCta ? 'var(--surface-subtle, #16181f)' : 'var(--accent, #3b82f6)',
                color: hasCta ? 'var(--text-primary, #f4f5f8)' : '#ffffff',
                fontSize: hasCta ? 14 : 15,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 16px',
              }}
            >
              {okLabel}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          letterSpacing: '0.18em',
          color: 'var(--text-muted, #5e6475)',
        }}
      >
        yesolve studio
      </div>
    </div>
  );
};
