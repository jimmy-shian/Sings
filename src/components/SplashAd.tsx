import adResetConfig from '../../ad-reset-config.json';
import React, { useState, useEffect, useRef } from 'react';
import { showNativeAdInSlot, hideNativeAdInSlot } from '../lib/startup-ad';
import { AdSenseSlot } from './AdSenseSlot';
import '../styles/ad.css';

interface SplashAdProps {
  onFinish: () => void;
  appName?: string;
}

/** 統一倒數長度（秒） */
const AD_DURATION = 5;
/** 後門略過：5 秒內累計 5 次點擊 */
const BACKDOOR_WINDOW = 5000;
const BACKDOOR_CLICKS = 5;

/**
 * 開場廣告：直接沿用 SingStudio 的「混音控制台」語言。
 * 面板 + 音軌 VU 錶 + 走帶列，倒數以時間軸（線性）呈現，
 * 全部樣式取自 App.css 的 CSS 變數，看起來就是錄音室裡的一塊面板。
 */
export const SplashAd: React.FC<SplashAdProps> = ({ onFinish, appName = 'SingStudio DAW' }) => {
  if (typeof window !== 'undefined' && adResetConfig.token && localStorage.getItem('yesolve_ad_bypass_reset_token') !== adResetConfig.token) {
    localStorage.setItem('yesolve_ad_bypass', 'false');
    localStorage.setItem('yesolve_ad_bypass_reset_token', adResetConfig.token);
  }
  const isBypassed = typeof window !== 'undefined' && localStorage.getItem('yesolve_ad_bypass') === 'true';

  const [countdown, setCountdown] = useState(AD_DURATION);
  const clickTimestampsRef = useRef<number[]>([]);
  /** 廣告槽：原生平台上由 StartupAdPlugin 在這個位置放真正的 AdMob 原生進階廣告 */
  const adSlotRef = useRef<HTMLDivElement | null>(null);

  // 原生平台：廣告槽位置由 StartupAdPlugin 放真正的 AdMob 原生進階廣告。
  // 只在略過狀態變更時掛載／卸載，不隨父層重繪重新請求廣告。
  useEffect(() => {
    if (isBypassed) return;
    showNativeAdInSlot(adSlotRef.current);
    return () => hideNativeAdInSlot();
  }, [isBypassed]);

  useEffect(() => {
    if (isBypassed) {
      onFinish();
      return;
    }

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
  }, [onFinish, isBypassed]);

  if (isBypassed) return null;

  // 後門略過：5 秒內累計 5 次點擊（面板標頭 / 走帶列）
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

  const elapsed = AD_DURATION - countdown;
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="sing-ad-root" onClick={(e) => e.stopPropagation()}>
      {/* 混音台面板 */}
      <div className="sing-ad-console">
        {/* 面板標頭（= .panel-header） */}
        <div className="sing-ad-console-head" onClick={handleBackdoorClick}>
          <div className="sing-ad-console-title">
            <span className="sing-ad-rec-dot" />
            <span className="sing-ad-track-name" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
              {appName}
            </span>
          </div>
          <span className="sing-ad-panel-tag">SPONSORED</span>
        </div>

        {/* 時間軸式倒數 */}
        <div className="sing-ad-timeline" aria-label={`剩餘 ${countdown} 秒`}>
          <div
            className="sing-ad-timeline-fill"
            style={{ width: `${(countdown / AD_DURATION) * 100}%` }}
          />
        </div>

        {/* 廣告槽 */}
        <div className="sing-ad-slot" ref={adSlotRef}>
          <AdSenseSlot slotKey="splash" />
        </div>

        {/* 雙軌 VU 電平錶（= .audio-metrics-bar） */}
        <div className="sing-ad-tracks">
          <div className="sing-ad-track">
            <span className="sing-ad-track-name">TRK 01 · VOCAL</span>
            <span className="sing-ad-vu">
              <span className="sing-ad-vu-fill" style={{ width: '78%' }} />
            </span>
            <span className="sing-ad-db">-12dB</span>
          </div>
          <div className="sing-ad-track">
            <span className="sing-ad-track-name">TRK 02 · BACKING</span>
            <span className="sing-ad-vu">
              <span className="sing-ad-vu-fill" style={{ width: '46%' }} />
            </span>
            <span className="sing-ad-db">-18dB</span>
          </div>
        </div>

        {/* 走帶控制列（= .live-audio-toolbar） */}
        <div className="sing-ad-transport" onClick={handleBackdoorClick}>
          <div className="sing-ad-time-group">
            <span className="sing-ad-time-lbl">ELAPSED</span>
            <span className="sing-ad-time">{`${mm}:${ss}`}</span>
            <span className="sing-ad-time-lbl">/ 剩餘 {countdown}s</span>
          </div>
          <span className="sing-ad-rec-btn">
            <span className="sing-ad-rec-dot-sm" />
            錄音就緒
          </span>
        </div>
      </div>

      <div className="sing-ad-foot">yesolve studio</div>
    </div>
  );
};
