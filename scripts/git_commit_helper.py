#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - Git 精確分段暫存與 Commit 輔助腳本
遵循專案規範：一目的依 commit、精確暫存、每次 commit 前 diff --cached 驗證
"""

import os
import sys
import subprocess

# 支援 Windows 控制台 UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

COMMITS = [
    {
        "title": "【重構】升級為 React 19 與 Electron 原生桌面架構並還原完整 DAW 功能",
        "description": [
            "新增 singstudio-react 子專案，採用 React 19、TypeScript、Vite 8 與 Electron 44",
            "完整還原 56 秒 Canon in C 和弦合成、16-bit PCM WAV 無損匯出與即時耳返濾波",
            "實作雙軌 Canvas 時間軸、50ms 磁吸、Takes 分段重錄與防覆蓋機制",
            "實作 YouTube 25 FPS 雙向連動、LRCLIB 雲端動態歌詞與右鍵選單",
            "整合獨立後製混音視窗、雙軌音量調節、殘響空間與人聲延遲校準"
        ],
        "files": ["singstudio-react"]
    },
    {
        "title": "【調整】重構本機 Windows EXE 與 Android APK 打包腳本",
        "description": [
            "重構 build_exe.py 改由 electron-builder 建置 Windows 原生桌面執行檔",
            "新增 build_apk.py 提供本機一鍵編譯正式簽名之 Android Release APK",
            "新增 scripts/git_commit_helper.py 輔助精確分段暫存與提交",
            "更新 .gitignore 避免誤追蹤 React 建置產物、暫存檔案與依賴庫"
        ],
        "files": ["build_exe.py", "build_apk.py", "scripts/git_commit_helper.py", ".gitignore"]
    },
    {
        "title": "【修復】GitHub Actions CI/CD 支援 Electron 桌面端與 React Android APK 編譯",
        "description": [
            "更新 build-windows 作業改採 Node.js 20 並執行 npm run electron:build",
            "更新 build-android 作業編譯 React 前端資產並同步至 Capacitor 產出 APK",
            "優化 scripts/patch_android_build.py 自動由 package.json 同步版本號至 Gradle",
            "更新 Release 工作流程自動上傳免安裝執行檔、安裝導引程式與 Android 安裝包"
        ],
        "files": [".github/workflows/build.yml", "scripts/patch_android_build.py"]
    },
    {
        "title": "【調整】統一以 package.json 為全專案單一版本來源並升級為 1.0.0",
        "description": [
            "升級根目錄 package.json 與 singstudio-react 版本號至 1.0.0",
            "移除獨立之 version.json，所有模組全面對齊直接讀取 package.json",
            "調整 server.py 與 js/version.js 改由 package.json 取得版本資訊",
            "納入 capacitor.config.json 確保 Android 與桌面端打包版本完全對齊"
        ],
        "files": ["package.json", "version.json", "capacitor.config.json", "server.py", "js/version.js"]
    },
    {
        "title": "【文件】補充本機 EXE 與 APK 編譯操作手冊",
        "description": [
            "更新 README.md 詳列本機一鍵腳本與手動指令建置 Windows EXE 與 Android APK 之完整步驟",
            "更新 singstudio-react/README.md 記載架構設計、開發模式與打包產物說明"
        ],
        "files": ["README.md"]
    }
]

def run_cmd(args):
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return result.returncode, result.stdout, result.stderr

def show_plan():
    print("==================================================")
    print("SingStudio - 待提交 Commit 規劃清單")
    print("==================================================")
    for i, c in enumerate(COMMITS, 1):
        print(f"\n[Commit {i}] {c['title']}")
        for line in c['description']:
            print(f"  -{line}")
        print(f"  變更檔案: {', '.join(c['files'])}")

def execute_commits():
    print("==================================================")
    print("開始執行精確 Commit 流程...")
    print("==================================================")

    for i, c in enumerate(COMMITS, 1):
        print(f"\n>>> 正在處理 Commit {i}/{len(COMMITS)}: {c['title']}")

        # 1. 暫存指定檔案
        for f in c['files']:
            print(f"  暫存: {f}")
            code, out, err = run_cmd(["git", "add", f])
            if code != 0:
                print(f"  [ERROR] git add {f} 失敗: {err}")
                return

        # 2. 檢查暫存區 diff
        code, out, err = run_cmd(["git", "--no-pager", "diff", "--cached", "--stat"])
        print("  暫存區狀態:")
        for line in out.strip().split("\n"):
            print(f"    {line}")

        # 3. 組合 Commit Message
        msg = c['title'] + "\n" + "\n".join(f"-{d}" for d in c['description'])

        # 4. 執行 Commit
        code, out, err = run_cmd(["git", "commit", "-m", msg])
        if code != 0:
            print(f"  [ERROR] git commit 失敗: {err}")
            return
        else:
            print(f"  [OK] Commit {i} 成功！")

    print("\n==================================================")
    print("[OK] 所有 Commit 均已依照規範順利完成！")
    print("==================================================")

if __name__ == "__main__":
    if "--run" in sys.argv:
        execute_commits()
    else:
        show_plan()
