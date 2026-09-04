#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio React - 本機 EXE 編譯建置腳本 (Electron + React)
使用 electron-builder 將 React + Electron 應用程式打包為 Windows 執行檔
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
    print("SingStudio React - 開始編譯 Windows Standalone EXE")
    print("==================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    # 若在 singstudio-react 內執行，直接使用 base_dir；若在根目錄，使用 singstudio-react 子目錄
    if os.path.exists(os.path.join(base_dir, "package.json")):
        react_dir = base_dir
    elif os.path.exists(os.path.join(base_dir, "singstudio-react", "package.json")):
        react_dir = os.path.join(base_dir, "singstudio-react")
    else:
        print(f"[ERROR] 找不到 React 專案 package.json (搜尋目錄: {base_dir})")
        sys.exit(1)

    # 步驟 1: 安裝依賴
    print("\n[1/3] 安裝 npm 依賴...")
    result = subprocess.run(["npm", "install"], cwd=react_dir, shell=True)
    if result.returncode != 0:
        print("[FAIL] npm install 失敗")
        sys.exit(result.returncode)

    # 步驟 2: 建置 React + Electron
    print("\n[2/3] 建置 React + Electron...")
    result = subprocess.run(["npm", "run", "electron:build"], cwd=react_dir, shell=True)
    if result.returncode != 0:
        print("[FAIL] 建置失敗")
        sys.exit(result.returncode)

    # 步驟 3: 複製執行檔到上層目錄
    print("\n[3/3] 複製執行檔...")
    release_dir = os.path.join(react_dir, "release")
    dist_dir = os.path.join(base_dir, "dist")
    os.makedirs(dist_dir, exist_ok=True)

    # 尋找生成的 EXE
    exe_files = []
    for root, dirs, files in os.walk(release_dir):
        for f in files:
            if f.endswith('.exe') or f.endswith('.msi'):
                exe_files.append(os.path.join(root, f))

    if exe_files:
        for exe in exe_files:
            dest = os.path.join(dist_dir, os.path.basename(exe))
            shutil.copy2(exe, dest)
            print(f"  已複製: {os.path.basename(exe)} -> {dest}")
    else:
        # 檢查是否有 Setup 檔案
        setup_files = []
        for root, dirs, files in os.walk(release_dir):
            for f in files:
                setup_files.append(os.path.join(root, f))

        if setup_files:
            for f in setup_files:
                dest = os.path.join(dist_dir, os.path.basename(f))
                shutil.copy2(f, dest)
                print(f"  已複製: {os.path.basename(f)} -> {dest}")

    print("\n==================================================")
    print("[OK] 編譯成功！")
    print(f"輸出目錄: {dist_dir}")
    print("==================================================")

if __name__ == "__main__":
    build()
