#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - 本機 EXE 編譯建置腳本 (React + Electron 桌面應用程式)
使用 electron-builder 將 React 19 + TypeScript + Electron 應用程式編譯為原生 Windows 執行檔
"""

import os
import sys
import subprocess
import shutil
import tempfile

# 支援 Windows 控制台 UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def build():
    print("==================================================")
    print("SingStudio - 開始編譯 Windows Standalone EXE (Electron)")
    print("==================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")

    # electron:build 內的 vite build 會清空 dist/；先備份既有 APK 實體，
    # 建置完成後再複製回去，確保 EXE/APK 可在 dist/ 共存。
    apk_backup_dir = tempfile.mkdtemp(prefix="singstudio_apk_backup_")
    preserved_apks = []
    if os.path.exists(dist_dir):
        for item in os.listdir(dist_dir):
            src = os.path.join(dist_dir, item)
            if item.lower().endswith('.apk') and os.path.isfile(src):
                try:
                    shutil.copy2(src, os.path.join(apk_backup_dir, item))
                    preserved_apks.append(item)
                except Exception as e:
                    print(f"  [WARN] 備份 {item} 失敗: {e}")
        if preserved_apks:
            print(f"  已備份既有 APK 至暫存區: {', '.join(preserved_apks)}")

    if not os.path.exists(os.path.join(base_dir, "package.json")):
        print(f"[ERROR] 找不到 package.json: {base_dir}")
        sys.exit(1)

    # 步驟 1: 檢查並安裝 npm 依賴
    node_modules_dir = os.path.join(base_dir, "node_modules")
    if not os.path.exists(node_modules_dir):
        print("\n[1/3] 正在安裝 npm 依賴...")
        result = subprocess.run(["npm", "install"], cwd=base_dir, shell=True)
        if result.returncode != 0:
            print("[FAIL] npm install 失敗")
            sys.exit(result.returncode)
    else:
        print("\n[1/3] npm 依賴已就緒。")

    # 步驟 2: 建置 React + Electron 桌面應用
    print("\n[2/3] 正在建置 React 前端並透過 electron-builder 打包...")
    result = subprocess.run(["npm", "run", "electron:build"], cwd=base_dir, shell=True)
    if result.returncode != 0:
        print("[FAIL] 建置失敗")
        sys.exit(result.returncode)

    # 步驟 3: 複製建置產物至根目錄 dist/
    print("\n[3/3] 正在整理發行執行檔...")
    release_dir = os.path.join(base_dir, "release")
    dist_dir = os.path.join(base_dir, "dist")
    os.makedirs(dist_dir, exist_ok=True)

    copied = []
    if os.path.exists(release_dir):
        for item in os.listdir(release_dir):
            item_path = os.path.join(release_dir, item)
            if os.path.isfile(item_path) and item.lower().endswith('.exe'):
                dest_path = os.path.join(dist_dir, item)
                shutil.copy2(item_path, dest_path)
                copied.append(item)
                print(f"  已導出: {item} -> {dest_path}")

    # 還原 vite build 前存在於 dist/ 的 APK（electron:build 會清空 dist/）。
    restored_apks = []
    for apk_name in preserved_apks:
        backup_apk = os.path.join(apk_backup_dir, apk_name)
        apk_dest = os.path.join(dist_dir, apk_name)
        if os.path.exists(backup_apk) and not os.path.exists(apk_dest):
            try:
                shutil.copy2(backup_apk, apk_dest)
                restored_apks.append(apk_name)
            except Exception as e:
                print(f"  [WARN] 還原 {apk_name} 失敗: {e}")
    try:
        shutil.rmtree(apk_backup_dir, ignore_errors=True)
    except Exception:
        pass

    # 如果有解包目錄，也提供捷徑資訊
    unpacked_dir = os.path.join(release_dir, "win-unpacked")
    unpacked_exe = os.path.join(unpacked_dir, "SingStudio.exe")

    print("\n==================================================")
    print("[OK] 編譯完成！")
    if copied:
        for f in copied:
            print(f"獨立安裝/可攜執行檔: {os.path.join(dist_dir, f)}")
    if restored_apks:
        print(f"已恢復 APK 至 dist/: {', '.join(restored_apks)}")
    if os.path.exists(unpacked_exe):
        print(f"免安裝綠色解壓版: {unpacked_exe}")
    print("使用者直接雙擊 EXE 即可啟動原生桌面視窗，無須啟動本地瀏覽器！")
    print("==================================================")

if __name__ == "__main__":
    build()
