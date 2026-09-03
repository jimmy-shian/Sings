#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - 圖示生成腳本 (Icon & Keystore Generator)
生成網站 Favicon、512x512 App Icon，並生成 APK 簽名金鑰 (singstudio.keystore)
"""

import os
import sys
import subprocess
from PIL import Image, ImageDraw

def create_app_icon(output_path, size=512):
    # 建立 512x512 RGBA 圖檔
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. 繪製圓角矩形深色漸層背景
    corner_radius = int(size * 0.22)
    # 底色 #1e212b -> #14161d
    draw.rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=corner_radius,
        fill=(30, 33, 43, 255),
        outline=(74, 79, 97, 255),
        width=int(size * 0.02)
    )

    # 2. 繪製內部音訊光環
    center_x = size // 2
    center_y = size // 2
    radius = int(size * 0.36)

    draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=(24, 26, 35, 255),
        outline=(59, 130, 246, 180),
        width=int(size * 0.02)
    )

    # 3. 繪製動態聲波頻譜柱狀圖 (Waveform Bars)
    bars = [0.35, 0.55, 0.85, 1.0, 0.7, 0.9, 0.45, 0.25]
    num_bars = len(bars)
    bar_width = int(size * 0.045)
    gap = int(size * 0.03)
    total_width = num_bars * bar_width + (num_bars - 1) * gap
    start_x = (size - total_width) // 2

    for i, amp in enumerate(bars):
        bx = start_x + i * (bar_width + gap)
        max_h = int(size * 0.42)
        bh = int(amp * max_h)
        by1 = center_y - bh // 2
        by2 = center_y + bh // 2
        
        # 漸層配色：中央亮藍 (#3b82f6) / 綠光 (#10b981)
        if i in [2, 3, 4, 5]:
            bar_color = (59, 130, 246, 255) # 亮藍
        else:
            bar_color = (16, 185, 129, 230) # 翡翠綠

        draw.rounded_rectangle(
            [(bx, by1), (bx + bar_width, by2)],
            radius=int(bar_width * 0.5),
            fill=bar_color
        )

    # 4. 繪製頂部錄音光點 (REC Glow)
    rec_r = int(size * 0.04)
    rec_x = size - int(size * 0.2)
    rec_y = int(size * 0.2)
    draw.ellipse(
        [rec_x - rec_r, rec_y - rec_r, rec_x + rec_r, rec_y + rec_r],
        fill=(239, 68, 68, 255) # 紅色錄音燈
    )

    img.save(output_path, 'PNG')
    print(f"[OK] 生成圖示: {output_path} ({size}x{size})")

def generate_keystore(keystore_path):
    # 檢查 keytool 是否可用
    try:
        if os.path.exists(keystore_path):
            print(f"[INFO] Keystore 已存在: {keystore_path}")
            return True

        cmd = [
            "keytool",
            "-genkeypair",
            "-v",
            "-keystore", keystore_path,
            "-alias", "mykey",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-storepass", "123456",
            "-keypass", "123456",
            "-dname", "CN=SingStudio, OU=App, O=SingStudio, L=Taipei, ST=Taiwan, C=TW"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[OK] 成功生成固定簽名金鑰: {keystore_path} (alias: mykey, pass: 123456)")
            return True
        else:
            print(f"[WARN] keytool 執行失敗: {res.stderr}")
            return False
    except FileNotFoundError:
        print("[WARN] 系統未安裝 keytool (Java SDK)。將在 GitHub Actions 雲端建置時使用 Java 生成。")
        return False

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(base_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    # 生成 512x512 App Icon
    icon_512 = os.path.join(assets_dir, "icon.png")
    create_app_icon(icon_512, 512)

    # 生成 192x192 Icon
    icon_192 = os.path.join(assets_dir, "icon-192.png")
    create_app_icon(icon_192, 192)

    # 生成 64x64 favicon.png
    favicon_png = os.path.join(base_dir, "favicon.png")
    create_app_icon(favicon_png, 64)

    # 生成 favicon.ico
    img64 = Image.open(favicon_png)
    favicon_ico = os.path.join(base_dir, "favicon.ico")
    img64.save(favicon_ico, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"[OK] 生成 favicon.ico: {favicon_ico}")

    # 生成固定簽名 Keystore
    keystore_path = os.path.join(base_dir, "singstudio.keystore")
    generate_keystore(keystore_path)

if __name__ == "__main__":
    main()
