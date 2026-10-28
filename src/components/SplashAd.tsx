import adResetConfig from '../../ad-reset-config.json';
import React, { useState, useEffect, useRef } from 'react';
import { showStartupAppOpenAd } from '../lib/startup-ad';

interface SplashAdProps {
  onFinish: () => void;
  appName?: string;
}

export const SplashAd: React.FC<SplashAdProps> = ({ onFinish, appName = "SingStudio DAW" }) => {
  if (typeof window !== 'undefined' && adResetConfig.token && localStorage.getItem('yesolve_ad_bypass_reset_token') !== adResetConfig.token) {
    localStorage.setItem('yesolve_ad_bypass', 'false');
    localStorage.setItem('yesolve_ad_bypass_reset_token', adResetConfig.token);
  }
  const isBypassed = typeof window !== 'undefined' && localStorage.getItem('yesolve_ad_bypass') === 'true';

  const [countdown, setCountdown] = useState(5);
  const clickTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (isBypassed) {
      onFinish();
      return;
    }

    showStartupAppOpenAd();

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
      className="fixed inset-0 z-[999999] pointer-events-auto bg-[#07090E] text-slate-200 flex flex-col justify-between p-6 select-none font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top DAW Transport Bar */}
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        <div 
          onClick={handleBackdoorClick}
          className="flex items-center space-x-2.5 cursor-default select-none active:opacity-90"
        >
          <div className="w-7 h-7 rounded border border-cyan-800/40 bg-[#0F1420] flex items-center justify-center text-cyan-400">
            {/* Waveform glyph */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 12h3l3-8 4 16 3-8h5" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-100 font-mono tracking-tight">{appName}</div>
            <div className="text-[10px] text-slate-500 font-mono">DAW_SESSION_READY</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <div className="px-2 py-0.5 rounded bg-[#0F1420] border border-slate-800 text-[11px] font-mono text-slate-400">
            {countdown > 0 ? `REC 0${countdown}s` : 'MONITOR ›'}
          </div>
        </div>
      </div>

      {/* Center: Dual-Track Audio Wave & VU Peak Monitor */}
      <div 
        onClick={handleBackdoorClick}
        className="w-full max-w-md mx-auto my-auto bg-[#0D121B] border border-slate-800 rounded-lg p-5 cursor-default font-mono"
      >
        {/* Track Monitor Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3.5 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>MASTER_BUS_INPUT</span>
          </div>
          <span className="text-[10px] text-slate-500">SPONSORED</span>
        </div>

        {/* Ad Container */}
        <div className="w-full bg-[#07090E] rounded border border-slate-800/80 p-2 mb-3.5 overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '120px' }}
            data-ad-client="ca-pub-2415998114933157"
            data-ad-slot="(待補)"
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
        </div>

        {/* Audio Channel Tracks */}
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between p-2 rounded bg-[#07090E] border border-slate-800/60">
            <span className="text-slate-400">TRK 01 · VOCAL MIC</span>
            <div className="flex items-center space-x-1">
              <span className="w-12 h-1.5 rounded-sm bg-slate-800 overflow-hidden flex">
                <span className="w-3/4 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] text-slate-500">-12dB</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#07090E] border border-slate-800/60">
            <span className="text-slate-400">TRK 02 · BACKING TRACK</span>
            <div className="flex items-center space-x-1">
              <span className="w-12 h-1.5 rounded-sm bg-slate-800 overflow-hidden flex">
                <span className="w-1/2 bg-slate-600"></span>
              </span>
              <span className="text-[10px] text-slate-500">-18dB</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <span>LOW LATENCY PCM · 48KHZ</span>
          <span>AD · 5677764204</span>
        </div>
      </div>

      {/* Bottom Signature */}
      <div className="w-full max-w-md mx-auto text-center font-mono">
        <span className="text-[11px] text-slate-600">yesolve studio</span>
      </div>
    </div>
  );
};
