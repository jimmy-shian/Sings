@echo off
chcp 65001 >nul
setlocal
title SingStudio - 一鍵啟動與建置選單

set "PYTHON_EXE=C:\Users\Administrator\venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

:MENU
cls
echo ======================================================================
echo    SingStudio DAW PRO - 一鍵啟動與建置選單
echo ======================================================================
echo.
echo    [1] 本機啟動開發 (Electron + React 熱重載)  ^<- 預設
echo    [2] 編譯 Windows EXE - Setup 安裝檔 + Portable 免安裝
echo    [3] 編譯 Android APK - Capacitor + Gradle Release
echo    [4] 全部建置 - Windows EXE + Android APK
echo    [5] 僅建置網頁版 - Vite 靜態輸出 dist/
echo    [6] 結束離開
echo.
set "CHOICE=1"
set /p "CHOICE=請輸入數字選擇模式，直接按 Enter 預設啟動本機開發: "

if "%CHOICE%"=="1" goto DEV
if "%CHOICE%"=="2" goto EXE
if "%CHOICE%"=="3" goto APK
if "%CHOICE%"=="4" goto ALL
if "%CHOICE%"=="5" goto WEB
if "%CHOICE%"=="6" goto END
echo.
echo [錯誤] 無效的選項 "%CHOICE%"，請重新輸入。
timeout /t 2 >nul
goto MENU

:DEV
echo.
echo ======================================================================
echo    啟動桌面即時熱重載開發視窗 (Electron + React)
echo ======================================================================
echo.
cd /d "%~dp0"
if not exist "node_modules" call npm install
call npm run electron:dev
echo.
echo 開發視窗已關閉，按任意鍵返回選單...
pause >nul
goto MENU

:EXE
echo.
echo ======================================================================
echo    一鍵編譯 Windows 桌面原生執行檔
echo    包含 Setup 安裝檔與 Portable 免安裝綠色版
echo ======================================================================
echo.
"%PYTHON_EXE%" build_exe.py
echo.
echo 建置作業完成，請查看 dist/ 目錄產物。按任意鍵返回選單...
pause >nul
goto MENU

:APK
echo.
echo ======================================================================
echo    一鍵編譯 Android 簽名 Release APK
echo    自動同步 React 網頁資源至 Capacitor 並呼叫 Gradle 打包
echo ======================================================================
echo.
"%PYTHON_EXE%" build_apk.py
echo.
echo 建置作業完成，請查看 dist/SingStudio-Android.apk。按任意鍵返回選單...
pause >nul
goto MENU

:ALL
echo.
echo ======================================================================
echo    全部建置：Windows EXE + Android APK
echo ======================================================================
echo.
echo -------- [1/2] Windows EXE --------
"%PYTHON_EXE%" build_exe.py
if errorlevel 1 (
    echo [WARN] Windows EXE 建置失敗，繼續下一步。
) else (
    echo [OK] Windows EXE 建置完成。
)
echo.
echo -------- [2/2] Android APK --------
"%PYTHON_EXE%" build_apk.py
if errorlevel 1 (
    echo [WARN] Android APK 建置失敗。
) else (
    echo [OK] Android APK 建置完成。
)
echo.
echo 全部建置流程結束，請查看 dist/ 目錄產物。按任意鍵返回選單...
pause >nul
goto MENU

:WEB
echo.
echo ======================================================================
echo    僅建置網頁版 (React + Vite 靜態輸出)
echo ======================================================================
echo.
cd /d "%~dp0"
if not exist "node_modules" call npm install
call npm run build:web
echo.
echo 網頁版建置完成，產物位於 dist/。按任意鍵返回選單...
pause >nul
goto MENU

:END
endlocal
exit /b 0