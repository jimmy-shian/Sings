/**
 * SingStudio - youtubeHelper.ts
 * YouTube 網址解析、oEmbed 中繼資料查詢與原生跨來源請求模組
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * 解析 YouTube 影片 ID
 * 支援: 11 碼純 ID, watch?v=, youtu.be/, shorts/, live/, embed/, music.youtube.com
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // 直接 11 碼 ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // 匹配所有 YouTube 格式連結
  const match = trimmed.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+?&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

export interface OEmbedMetadata {
  title: string;
  author: string;
  thumbnail: string;
}

/**
 * 透過 YouTube 官方 oEmbed API (100% 免費、無呼叫限制、免 API 金鑰)
 * 取得影片正式曲名、頻道創作者與高畫質縮圖
 */
export async function fetchOEmbedMetadata(videoId: string): Promise<OEmbedMetadata> {
  const defaultMeta: OEmbedMetadata = {
    title: `YouTube 影片 (${videoId})`,
    author: 'YouTube',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    let data: any = null;

    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({ url: oembedUrl });
      data = res.data;
    } else {
      const res = await fetch(oembedUrl);
      if (res.ok) data = await res.json();
    }

    if (data) {
      return {
        title: data.title || defaultMeta.title,
        author: data.author_name || defaultMeta.author,
        thumbnail: data.thumbnail_url || defaultMeta.thumbnail,
      };
    }
  } catch (err) {
    console.warn('oEmbed 取得中繼資料異常，使用預設值:', err);
  }

  return defaultMeta;
}
