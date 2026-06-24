@echo off
REM SeqShelf 単一HTML(オフライン版)を生成して開く (ダブルクリックでOK)
REM ネットワーク/プロキシ制限に関係なく、生成された dist\SeqShelf.html を
REM ブラウザでそのまま開くだけで動作します (サーバ不要・file:// で完結)。
setlocal
cd /d "%~dp0"

set "PORTABLE=%~dp0.node\node-v22.14.0-win-x64"
if exist "%PORTABLE%\node.exe" (
  set "PATH=%PORTABLE%;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [SeqShelf] Node.js が見つかりません。.node フォルダを残すか Node.js を導入してください。
  pause
  exit /b 1
)

if not exist "node_modules\vite" (
  echo [SeqShelf] 依存をインストールしています ^(初回のみ^)...
  call npm install
  if errorlevel 1 (
    echo [SeqShelf] npm install に失敗しました。
    pause
    exit /b 1
  )
)

echo [SeqShelf] オフライン単一HTML を生成しています...
node node_modules\typescript\bin\tsc --noEmit
if errorlevel 1 ( echo [SeqShelf] 型チェックに失敗しました。 & pause & exit /b 1 )
node node_modules\vite\bin\vite.js build
if errorlevel 1 ( echo [SeqShelf] ビルドに失敗しました。 & pause & exit /b 1 )
node scripts\inline.mjs
if errorlevel 1 ( echo [SeqShelf] インライン化に失敗しました。 & pause & exit /b 1 )

echo [SeqShelf] dist\SeqShelf.html を開きます (サーバ不要・オフライン動作)。
start "" "dist\SeqShelf.html"
endlocal
