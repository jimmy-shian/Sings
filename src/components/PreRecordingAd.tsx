import React, { useState, useEffect, useRef } from 'react';
import { AdSenseSlot } from './AdSenseSlot';
import { showNativeAdInSlot, hideNativeAdInSlot } from '../lib/startup-ad';
import '../styles/ad.css';

interface PreRecordingAdProps {
  visible: boolean;
  onFinish: () => void;
}

/** 統一倒數長度（秒） */
const AD_DURATION = 5;
/** 後門略過：5 秒內累計 5 次點擊 */
const BACKDOOR_WINDOW = 5000;
const BACKDOOR_CLICKS = 5;

/**
 * 開唱前預備廣告：沿用 App 的 .modal-overlay / .modal-card 語言，
 * 內容是錄音前的裝置檢查提示 + 混音台面板廣告槽。
 */
export const PreRecordingAd: React.FC<PreRecordingAdProps> = ({ visible, onFinish }) => {
  const isBypassed = typeof window !== 'undefined' && localStorage.getItem('yesolve_ad_bypass') === 'true';

  const [countdown, setCountdown] = useState(AD_DURATION);
  const clickTimestampsRef = useRef<number[]>([]);
  /** 廣告槽：原生平台上由 StartupAdPlugin 在這個位置放真正的 AdMob 原生進階廣告 */
  const adSlotRef = useRef<HTMLDivElement | null>(null);

  // 原生平台：廣告槽位置由 StartupAdPlugin 放真正的 AdMob 原生進階廣告；
  // 只在「開啟 / 關閉」時增減，不隨倒數或父層重繪重新請求。
  useEffect(() => {
    if (!visible || isBypassed) return;
    showNativeAdInSlot(adSlotRef.current, 'prerecording');
    return () => hideNativeAdInSlot();
  }, [visible, isBypassed]);

  useEffect(() => {
    if (!visible || isBypassed) {
      if (isBypassed && visible) onFinish();
      return;
    }
    setCountdown(AD_DURATION);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, onFinish, isBypassed]);

  if (!visible || isBypassed) return null;

  // 後門略過：5 秒內累計 5 次點擊（彈窗標題 / 走帶列）
  const handleBackdoorClick = () => {
    const now = Date.now();
    clickTimestampsRef.current = clickTimestampsRef.current.filter((t) => now - t <= BACKDOOR_WINDOW);
    clickTimestampsRef.current.push(now);

    if (clickTimestampsRef.current.length >= BACKDOOR_CLICKS) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('yesolve_ad_bypass', 'true');
      }
      onFinish();
    }
  };

  return (
    <div className="sing-ad-modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="sing-ad-modal-card">
        {/* 彈窗標頭（= .modal-header） */}
        <div className="sing-ad-modal-head">
          <div className="sing-ad-modal-title" onClick={handleBackdoorClick}>
            <span className="sing-ad-rec-dot" />
            <span>開唱前預備</span>
          </div>
          <span className="sing-ad-panel-tag">剩餘 {countdown}s</span>
        </div>

        {/* 時間軸式倒數 */}
        <div className="sing-ad-timeline" aria-label={`剩餘 ${countdown} 秒`}>
          <div
            className="sing-ad-timeline-fill"
            style={{ width: `${(countdown / AD_DURATION) * 100}%` }}
          />
        </div>

        <div className="sing-ad-modal-body">
          {/* 廣告槽（混音台面板語言） */}
          <div
            className="sing-ad-slot"
            ref={adSlotRef}
            style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <AdSenseSlot slotKey="prerecording" />
          </div>

          {/* 錄音前裝置檢查（= App 的提示列樣式） */}
          <div className="sing-ad-modal-hint">
            <div className="sing-ad-modal-hint-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </div>
            <div className="sing-ad-modal-hint-text">
              <div className="sing-ad-modal-hint-title">戴好耳機，校準監聽音量</div>
              <div className="sing-ad-modal-hint-sub">倒數結束後自動開啟麥克風與雙軌混音</div>
            </div>
          </div>
        </div>

        {/* 走帶控制列 */}
        <div className="sing-ad-transport" onClick={handleBackdoorClick}>
          <span className="sing-ad-time-lbl">Google 廣告託播</span>
          <span className="sing-ad-rec-btn">
            <span className="sing-ad-rec-dot-sm" />
            {countdown > 0 ? `${countdown}s 後開始錄音` : '開始錄音'}
          </span>
        </div>

        <div className="sing-ad-modal-foot">
          <span>yesolve studio · 聲學贊助</span>
        </div>
      </div>
    </div>
  );
};
