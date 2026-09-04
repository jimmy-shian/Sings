#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - 本機 Android APK 編譯建置腳本 (Capacitor + Gradle Release)
一鍵將 React 前端編譯並透過 Capacitor 與 Android Gradle 打包為正式已簽名之 SingStudio-Android.apk
"""

import os
import sys
import subprocess
import shutil

# 支援 Windows 控制台 UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def build():
    print("==================================================")
    print("SingStudio - 開始本機編譯 Android Release APK")
    print("==================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    react_dir = os.path.join(base_dir, "singstudio-react")
    www_dir = os.path.join(base_dir, "www")
    android_dir = os.path.join(base_dir, "android")

    # 檢查 React 專案
    if not os.path.exists(os.path.join(react_dir, "package.json")):
        print(f"[ERROR] 找不到 React 專案目錄: {react_dir}")
        sys.exit(1)

    # 步驟 1: 編譯 React 前端網頁資產
    print("\n[1/5] 編譯 React 前端網頁資產 (npm run build:web)...")
    res = subprocess.run(["npm", "run", "build:web"], cwd=react_dir, shell=True)
    if res.returncode != 0:
        print("[FAIL] React 前端編譯失敗")
        sys.exit(res.returncode)

    # 步驟 2: 同步資產至 www/ 目錄供 Capacitor 使用
    print("\n[2/5] 同步靜態資源至 www/...")
    react_dist = os.path.join(react_dir, "dist")
    if not os.path.exists(react_dist):
        print(f"[ERROR] 找不到 React 建置產物: {react_dist}")
        sys.exit(1)

    shutil.rmtree(www_dir, ignore_errors=True)
    os.makedirs(www_dir, exist_ok=True)

    # 複製 dist 所有內容到 www
    for item in os.listdir(react_dist):
        s = os.path.join(react_dist, item)
        d = os.path.join(www_dir, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)

    # 確保 public/assets 的 icon 也同步
    public_assets = os.path.join(react_dir, "public", "assets")
    if os.path.exists(public_assets):
        shutil.copytree(public_assets, os.path.join(www_dir, "assets"), dirs_exist_ok=True)

    print(f"  已同步資源至: {www_dir}")

    # 步驟 3: 執行 Capacitor Sync
    print("\n[3/5] 執行 Capacitor 同步 (npx cap sync android)...")
    res = subprocess.run(["npx", "cap", "sync", "android"], cwd=base_dir, shell=True)
    if res.returncode != 0:
        print("[WARN] npx cap sync android 執行回傳非 0，嘗試繼續...")

    # 步驟 4: 執行 Android 依賴修補與密鑰注入
    print("\n[4/5] 套用 Android Gradle 修補與密鑰簽名 (patch_android_build.py)...")
    patch_script = os.path.join(base_dir, "scripts", "patch_android_build.py")
    if os.path.exists(patch_script):
        res = subprocess.run([sys.executable, patch_script], cwd=base_dir)
        if res.returncode != 0:
            print("[WARN] patch_android_build.py 執行失敗，嘗試繼續 Gradle 建置...")

    # 步驟 5: 執行 Gradle assembleRelease 編譯 APK
    print("\n[5/5] 執行 Gradle Release 建置 (assembleRelease)...")
    if not os.path.exists(android_dir):
        print(f"[ERROR] 找不到 android 目錄: {android_dir}")
        sys.exit(1)

    gradle_cmd = "gradlew.bat" if sys.platform == 'win32' else "./gradlew"
    gradle_path = os.path.join(android_dir, gradle_cmd)

    if not os.path.exists(gradle_path):
        print(f"[ERROR] 找不到 Gradle Wrapper: {gradle_path}")
        sys.exit(1)

    res = subprocess.run([gradle_cmd, "assembleRelease", "--no-daemon"], cwd=android_dir, shell=True)
    if res.returncode != 0:
        print("\n[FAIL] Gradle assembleRelease 編譯失敗。請確認已安裝 JDK 21 與 Android SDK。")
        sys.exit(res.returncode)

    # 複製輸出 APK 到 dist/
    dist_dir = os.path.join(base_dir, "dist")
    os.makedirs(dist_dir, exist_ok=True)

    apk_source = os.path.join(android_dir, "app", "build", "outputs", "apk", "release", "app-release.apk")
    apk_dest = os.path.join(dist_dir, "SingStudio-Android.apk")

    if os.path.exists(apk_source):
        shutil.copy2(apk_source, apk_dest)
        print("\n==================================================")
        print("[OK] Android APK 編譯成功！")
        print(f"APK 輸出位置: {apk_dest}")
        print(f"檔案大小: {os.path.getsize(apk_dest) / (1024*1024):.2f} MB")
        print("您可使用 adb install 或傳輸至 Android 手機/平板直接安裝！")
        print("==================================================")
    else:
        print(f"[WARN] 未找到編譯產物: {apk_source}")

if __name__ == "__main__":
    build()
