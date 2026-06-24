// ビルド済み dist/ を 1 枚の自己完結 HTML に変換する (依存ゼロ)。
// JS と CSS をインライン化し、外部ファイル参照を無くす。
// 出力: dist/SeqShelf.html (file:// で直接ダブルクリックして開ける)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const htmlPath = join(dist, "index.html");

let html = readFileSync(htmlPath, "utf8");

// <script type="module" ... src="...js"> を中身インラインに置換
html = html.replace(
  /<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/g,
  (_m, src) => {
    const file = join(dist, src.replace(/^\.?\//, ""));
    const code = readFileSync(file, "utf8");
    return `<script type="module">\n${code}\n</script>`;
  }
);

// <link rel="stylesheet" href="...css"> を <style> に置換
html = html.replace(
  /<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/g,
  (_m, href) => {
    const file = join(dist, href.replace(/^\.?\//, ""));
    const css = readFileSync(file, "utf8");
    return `<style>\n${css}\n</style>`;
  }
);

// 念のため: 余分な modulepreload は不要なので除去
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");

const outPath = join(dist, "SeqShelf.html");
writeFileSync(outPath, html, "utf8");

// 検証: 外部 .js / .css 参照が残っていないか
const leftover = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
  (m) => m[1]
);
if (leftover.length > 0) {
  console.error("インライン化に失敗した参照が残っています:", leftover);
  process.exit(1);
}

// assets/ に残ったチャンク数を報告 (単一化できているかの目安)
const assetsDir = join(dist, "assets");
let chunkCount = 0;
try {
  chunkCount = readdirSync(assetsDir).filter((f) => f.endsWith(".js")).length;
} catch {
  // assets が無いなら問題なし
}

console.log(`自己完結 HTML を生成しました: ${outPath}`);
console.log(`残存 JS チャンク数 (assets/): ${chunkCount}`);
