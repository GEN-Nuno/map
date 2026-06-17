# SeqShelf 開発サーバ起動 (PowerShell)
# 使い方: このフォルダで  ./start.ps1  を実行 (または右クリック→PowerShellで実行)
# npm.ps1 の実行ポリシー問題を回避するため、node を直接呼び出します。

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$portable = Join-Path $PSScriptRoot ".node\node-v22.14.0-win-x64"
if (Test-Path (Join-Path $portable "node.exe")) {
  $env:Path = "$portable;$env:Path"
}

$node = (Get-Command node -ErrorAction SilentlyContinue)
if (-not $node) {
  Write-Host "[SeqShelf] Node.js が見つかりません。https://nodejs.org/ から LTS を入れるか、同梱の .node フォルダを残してください。" -ForegroundColor Yellow
  Read-Host "Enter キーで終了"
  exit 1
}

if (-not (Test-Path "node_modules\vite")) {
  Write-Host "[SeqShelf] 依存をインストールしています (初回のみ)..." -ForegroundColor Cyan
  & node "node_modules\npm\bin\npm-cli.js" install
}

Write-Host "[SeqShelf] 開発サーバを起動します -> http://localhost:5173/" -ForegroundColor Green
& node "node_modules\vite\bin\vite.js" --port 5173 --strictPort --open
