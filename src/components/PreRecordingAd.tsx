import React, { useState, useEffect, useRef } from 'react';

interface PreRecordingAdProps {
  visible: boolean;
  onFinish: () => void;
}

export const PreRecordingAd: React.FC<PreRecordingAdProps> = ({ visible, onFinish }) => {
  const isBypassed = typeof window !== 'undefined' && localStorage.getItem('yesolve_ad_bypass') === 'true';

  const [countdown, setCountdown] = useState(3);
  const clickTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!visible || isBypassed) {
      if (isBypassed && visible) onFinish();
      return;
    }
    setCountdown(3);
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

  // Secret 5-click backdoor within 3000ms
  const handleBackdoorClick = () => {
    const now = Date.now();
    clickTimestampsRef.current = clickTimestampsRef.current.filter((t) => now - t <= 3000);
    clickTimestampsRef.current.push(now);

    if (clickTimestampsRef.current.length >= 5) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('yesolve_ad_bypass', 'true');
      }
      onFinish();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        onClick={handleBackdoorClick}
        className="w-full max-w-sm bg-[#0D1522] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl text-center relative overflow-hidden cursor-default shadow-cyan-950/50"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#06B6D4]/15 rounded-full blur-xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-xs font-bold text-cyan-300">開唱前預備贊助</span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30 font-mono">
            {countdown > 0 ? `${countdown}s 後開始錄音` : '即將就緒'}
          </span>
        </div>

        {/* Ad Container & Headphone / Mic Calibration Graphic */}
        <div className="bg-[#060911]/90 rounded-xl p-4 border border-cyan-900/40 my-3 flex flex-col items-center justify-center min-h-[140px]">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '80px' }}
            data-ad-client="ca-pub-2415998114933157"
            data-ad-slot="(待補)"
            data-ad-format="auto"
          ></ins>

          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mb-2">
            {/* SVG Headphones */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </div>
          <div className="text-xs font-semibold text-slate-200">戴好耳機，校準監聽音量</div>
          <div className="text-[11px] text-cyan-400/90 font-mono mt-1">
            倒數結束後自動開啟麥克風與雙軌混音
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
          <span>Google 廣告託播</span>
          <span className="text-cyan-400 font-medium">yesolve studio · 聲學贊助</span>
        </div>
      </div>
    </div>
  );
};
