@echo off
REM SeqShelf 開発サーバ起動 (ダブルクリックでOK)
REM システムに Node が無くても、同梱のポータブル Node を使って起動します。
setlocal
cd /d "%~dp0"

set "PORTABLE=%~dp0.node\node-v22.14.0-win-x64"

if exist "%PORTABLE%\node.exe" (
  set "PATH=%PORTABLE%;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [SeqShelf] Node.js が見つかりません。
  echo   1^) https://nodejs.org/ から Node.js LTS をインストールするか、
  echo   2^) 同梱の .node フォルダを残してこのスクリプトを使ってください。
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

echo [SeqShelf] 開発サーバを起動します。ブラウザで http://localhost:5173/ を開いてください。
node node_modules\vite\bin\vite.js --port 5173 --strictPort --open
endlocal
