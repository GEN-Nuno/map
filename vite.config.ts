import { defineConfig } from "vite";

export default defineConfig({
  // 相対パスで出力し、file:// でもそのまま開けるようにする
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // CSS を 1 ファイルにまとめる
    cssCodeSplit: false,
    // すべてのアセットを base64 で JS に取り込む (外部リクエストを無くす)
    assetsInlineLimit: 1024 * 1024 * 1024,
    rollupOptions: {
      output: {
        // Mermaid の動的 import を 1 ファイルに畳み込み、追加チャンクを作らない
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
