import React, { useEffect } from 'react';
import { requestAdFill, useAdSenseSlot, type AdSlotKey } from '../lib/adsense';

interface AdSenseSlotProps {
  slotKey: AdSlotKey;
}

/**
 * 廣告舞台（Ad Shell ②）的實際載體。
 *
 * - 網頁版且 slot id 已設定、且 AdSense script 載入完成 → 渲染 <ins> 並 push() 填充
 * - 原生平台 / slot 未設定 / script 載入失敗或逾時 → 渲染品牌佔位板
 *
 * 兩者都不會出現「永遠空白的死 <ins> 框」，也不會曝露 ad unit id。
 */
export const AdSenseSlot: React.FC<AdSenseSlotProps> = ({ slotKey }) => {
  const { client, slot, renderable } = useAdSenseSlot(slotKey);

  // <ins> 動態掛載後再 push 一次，確保它進入 AdSense 的填充佇列
  useEffect(() => {
    if (renderable) requestAdFill();
  }, [renderable]);

  if (!renderable) {
    return (
      <div className="sing-ad-placeholder">
        <div className="sing-ad-placeholder-bar" />
        <div className="sing-ad-placeholder-text">廣告載位 · 贊助支持</div>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};
