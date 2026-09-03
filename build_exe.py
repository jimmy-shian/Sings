#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - 本機 EXE 編譯建置腳本 (Windows Standalone Executable Builder)
使用 PyInstaller 將 server.py 與靜態資源 (index.html, css/, js/) 一鍵編譯為執行檔 dist/SingStudio/SingStudio.exe
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
    print("SingStudio - 開始編譯 Windows Standalone EXE")
    print("==================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")
    build_dir = os.path.join(base_dir, "build")

    # 確保虛擬環境中的 pyinstaller
    pyinstaller_cmd = "pyinstaller"
    venv_pyinstaller = os.path.join(os.path.dirname(sys.executable), "pyinstaller.exe")
    if os.path.exists(venv_pyinstaller):
        pyinstaller_cmd = venv_pyinstaller

    # 組合 PyInstaller 參數
    cmd = [
        pyinstaller_cmd,
        "--noconfirm",
        "--onedir",
        "--name", "SingStudio",
        "--add-data", f"index.html{os.pathsep}.",
        "--add-data", f"css{os.pathsep}css",
        "--add-data", f"js{os.pathsep}js",
        "server.py"
    ]

    print(f"執行指令: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=base_dir)

    if result.returncode == 0:
        exe_path = os.path.join(dist_dir, "SingStudio", "SingStudio.exe")
        print("\n==================================================")
        print("[OK] 編譯成功！")
        print(f"執行檔位置: {exe_path}")
        print("使用者可直接雙擊 SingStudio.exe 啟動工作站！")
        print("==================================================")
    else:
        print("\n[FAIL] 編譯失敗，請檢查錯誤輸出。")
        sys.exit(result.returncode)

if __name__ == "__main__":
    build()
