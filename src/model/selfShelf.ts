import { Shelf } from "./types";

/**
 * SeqShelf 自己解説本棚。
 * このアプリ自体の構造を L1→L4 で表現したデモ本棚。
 *
 * L1: ユーザー視点の操作フロー
 * L2: コンポーネント間の相互作用（システム構成）
 * L3: クラス/モジュール間のメソッド呼び出し (Store ↔ EditorPanel 編集サイクル)
 * L4a: Store.mutate() の内部処理
 * L4b: generateMermaid() の内部処理
 */
export function selfShelf(): Shelf {
  return {
    version: 2,
    activeId: "ss-L1-usage",
    diagrams: [
      // ===================== L1: 運用フロー =====================
      {
        id: "ss-L1-usage",
        layer: "L1",
        title: "SeqShelf 操作フロー",
        participants: [
          { id: "user", name: "ユーザー", kind: "actor" },
          { id: "browser", name: "ブラウザ", kind: "system" },
          { id: "ls", name: "localStorage", kind: "database" },
        ],
        items: [
          {
            id: "l1m1",
            kind: "message",
            fromId: "user",
            toId: "browser",
            text: "http://localhost:5173/ を開く",
            arrow: "sync",
          },
          {
            id: "l1m2",
            kind: "message",
            fromId: "browser",
            toId: "ls",
            text: "保存済み本棚を読み込む",
            arrow: "sync",
            linkTargetId: "ss-L4-store-mutate",
          },
          {
            id: "l1m3",
            kind: "message",
            fromId: "ls",
            toId: "browser",
            text: "Shelf JSON / 初回はサンプル自動投入",
            arrow: "reply",
          },
          {
            id: "l1m4",
            kind: "message",
            fromId: "user",
            toId: "browser",
            text: "本棚から図を選択",
            arrow: "sync",
            linkTargetId: "ss-L2-system",
          },
          {
            id: "l1m5",
            kind: "message",
            fromId: "browser",
            toId: "browser",
            text: "Mermaid でプレビューを描画",
            arrow: "sync",
            linkTargetId: "ss-L4-generate",
          },
          {
            id: "l1m6",
            kind: "message",
            fromId: "user",
            toId: "browser",
            text: "参加者・横線・条件を追加・編集",
            arrow: "sync",
            linkTargetId: "ss-L3-editor",
          },
          {
            id: "l1m7",
            kind: "message",
            fromId: "browser",
            toId: "ls",
            text: "自動保存 (mutate 後に即時)",
            arrow: "async",
          },
          {
            id: "l1b1",
            kind: "block",
            blockKind: "opt",
            branches: [
              {
                id: "l1br1",
                label: "エクスポートしたい場合",
                items: [
                  {
                    id: "l1m8",
                    kind: "message",
                    fromId: "user",
                    toId: "browser",
                    text: "⬇ JSON / Mermaid / SVG をクリック",
                    arrow: "sync",
                  },
                  {
                    id: "l1m9",
                    kind: "message",
                    fromId: "browser",
                    toId: "user",
                    text: "ファイルダウンロード",
                    arrow: "reply",
                  },
                ],
              },
            ],
          },
        ],
      },

      // ===================== L2: システム構成 =====================
      {
        id: "ss-L2-system",
        layer: "L2",
        title: "SeqShelf コンポーネント構成",
        parentId: "ss-L1-usage",
        participants: [
          { id: "toolbar", name: "Toolbar", kind: "process" },
          { id: "shelf", name: "ShelfPanel", kind: "process" },
          { id: "editor", name: "EditorPanel", kind: "process" },
          { id: "preview", name: "PreviewPanel", kind: "process" },
          { id: "store", name: "Store", kind: "process" },
          { id: "ls2", name: "localStorage", kind: "database" },
        ],
        items: [
          {
            id: "l2m1",
            kind: "message",
            fromId: "store",
            toId: "ls2",
            text: "loadShelf() — 起動時",
            arrow: "sync",
          },
          {
            id: "l2m2",
            kind: "message",
            fromId: "ls2",
            toId: "store",
            text: "Shelf JSON",
            arrow: "reply",
          },
          {
            id: "l2m3",
            kind: "message",
            fromId: "store",
            toId: "toolbar",
            text: "subscribe 通知",
            arrow: "async",
          },
          {
            id: "l2m4",
            kind: "message",
            fromId: "store",
            toId: "shelf",
            text: "subscribe 通知",
            arrow: "async",
          },
          {
            id: "l2m5",
            kind: "message",
            fromId: "store",
            toId: "editor",
            text: "subscribe 通知",
            arrow: "async",
          },
          {
            id: "l2m6",
            kind: "message",
            fromId: "store",
            toId: "preview",
            text: "subscribe 通知",
            arrow: "async",
          },
          {
            id: "l2m7",
            kind: "message",
            fromId: "shelf",
            toId: "store",
            text: "setActive(diagId)",
            arrow: "sync",
          },
          {
            id: "l2m8",
            kind: "message",
            fromId: "editor",
            toId: "store",
            text: "mutate(fn)",
            arrow: "sync",
            linkTargetId: "ss-L3-editor",
          },
          {
            id: "l2m9",
            kind: "message",
            fromId: "store",
            toId: "ls2",
            text: "saveShelf() — mutate のたびに",
            arrow: "async",
          },
          {
            id: "l2m10",
            kind: "message",
            fromId: "preview",
            toId: "preview",
            text: "mermaid.render(text)",
            arrow: "sync",
            linkTargetId: "ss-L4-generate",
          },
          {
            id: "l2m11",
            kind: "message",
            fromId: "toolbar",
            toId: "store",
            text: "replaceShelf(newShelf) — 読込/サンプル時",
            arrow: "sync",
          },
        ],
      },

      // ===================== L3: クラス間 (エディタ編集サイクル) =====================
      {
        id: "ss-L3-editor",
        layer: "L3",
        title: "エディタ編集サイクル (クラス間)",
        parentId: "ss-L2-system",
        participants: [
          { id: "edpanel", name: "EditorPanel", kind: "class" },
          { id: "st", name: "Store", kind: "class" },
          { id: "ops", name: "operations.ts", kind: "class" },
          { id: "prevpanel", name: "PreviewPanel", kind: "class" },
          { id: "gen", name: "generateMermaid", kind: "function" },
        ],
        items: [
          {
            id: "l3m1",
            kind: "message",
            fromId: "edpanel",
            toId: "edpanel",
            text: "ユーザーがボタンをクリック (＋横線など)",
            arrow: "sync",
          },
          {
            id: "l3m2",
            kind: "message",
            fromId: "edpanel",
            toId: "ops",
            text: "makeMessage(from, to, text)",
            arrow: "sync",
          },
          {
            id: "l3m3",
            kind: "message",
            fromId: "ops",
            toId: "edpanel",
            text: "Message オブジェクト",
            arrow: "reply",
          },
          {
            id: "l3m4",
            kind: "message",
            fromId: "edpanel",
            toId: "st",
            text: "mutate(fn: insertItem(d, path, message))",
            arrow: "sync",
            linkTargetId: "ss-L4-store-mutate",
          },
          {
            id: "l3m5",
            kind: "message",
            fromId: "st",
            toId: "st",
            text: "fn(shelf) 実行 → localStorage 保存",
            arrow: "sync",
          },
          {
            id: "l3m6",
            kind: "message",
            fromId: "st",
            toId: "edpanel",
            text: "subscriber callback — 再レンダリング",
            arrow: "reply",
          },
          {
            id: "l3m7",
            kind: "message",
            fromId: "st",
            toId: "prevpanel",
            text: "subscriber callback — プレビュー更新",
            arrow: "async",
          },
          {
            id: "l3m8",
            kind: "message",
            fromId: "prevpanel",
            toId: "gen",
            text: "generateMermaid(diagram)",
            arrow: "sync",
            linkTargetId: "ss-L4-generate",
          },
          {
            id: "l3m9",
            kind: "message",
            fromId: "gen",
            toId: "prevpanel",
            text: "{ text, messageOrder }",
            arrow: "reply",
          },
          {
            id: "l3m10",
            kind: "message",
            fromId: "prevpanel",
            toId: "prevpanel",
            text: "mermaid.render(text) → SVG を stage に挿入",
            arrow: "async",
          },
        ],
      },

      // ===================== L4a: Store.mutate() 内部 =====================
      {
        id: "ss-L4-store-mutate",
        layer: "L4",
        title: "Store.mutate() 内部処理",
        parentId: "ss-L3-editor",
        participants: [
          { id: "caller", name: "呼び出し元", kind: "class" },
          { id: "mutate", name: "Store.mutate", kind: "function" },
          { id: "sls", name: "localStorage", kind: "database" },
          { id: "subs", name: "subscribers[]", kind: "function" },
        ],
        items: [
          {
            id: "l4am1",
            kind: "message",
            fromId: "caller",
            toId: "mutate",
            text: "mutate(fn)",
            arrow: "sync",
          },
          {
            id: "l4ab1",
            kind: "block",
            blockKind: "critical",
            branches: [
              {
                id: "l4abr1",
                label: "fn(shelf) 実行",
                items: [
                  {
                    id: "l4am2",
                    kind: "message",
                    fromId: "mutate",
                    toId: "mutate",
                    text: "fn(this._shelf) — Diagram ツリーを直接変更",
                    arrow: "sync",
                  },
                ],
              },
              {
                id: "l4abr2",
                label: "例外発生",
                items: [
                  {
                    id: "l4am3",
                    kind: "message",
                    fromId: "mutate",
                    toId: "mutate",
                    text: "console.warn(err) — 状態変更はなし",
                    arrow: "lost",
                  },
                ],
              },
            ],
          },
          {
            id: "l4am4",
            kind: "message",
            fromId: "mutate",
            toId: "sls",
            text: 'localStorage.setItem("seqshelf.shelf.v2", JSON.stringify(shelf))',
            arrow: "async",
          },
          {
            id: "l4am5",
            kind: "message",
            fromId: "mutate",
            toId: "subs",
            text: "forEach(cb => cb()) — 全購読者へ通知",
            arrow: "async",
          },
          {
            id: "l4am6",
            kind: "message",
            fromId: "subs",
            toId: "caller",
            text: "UI 再レンダリング (EditorPanel / PreviewPanel / ShelfPanel)",
            arrow: "reply",
          },
        ],
      },

      // ===================== L4b: generateMermaid() 内部 =====================
      {
        id: "ss-L4-generate",
        layer: "L4",
        title: "generateMermaid() 内部処理",
        parentId: "ss-L3-editor",
        participants: [
          { id: "fn", name: "generateMermaid", kind: "function" },
          { id: "diag", name: "Diagram", kind: "class" },
          { id: "mermaid", name: "mermaid.render", kind: "process" },
        ],
        items: [
          {
            id: "l4bm1",
            kind: "message",
            fromId: "fn",
            toId: "diag",
            text: "participants を読み取る",
            arrow: "sync",
          },
          {
            id: "l4bm2",
            kind: "message",
            fromId: "fn",
            toId: "fn",
            text: "participant 宣言行を生成 (actor/participant/database...)",
            arrow: "sync",
          },
          {
            id: "l4bb1",
            kind: "block",
            blockKind: "loop",
            branches: [
              {
                id: "l4bbr1",
                label: "items ツリーを深さ優先で走査",
                items: [
                  {
                    id: "l4bb2",
                    kind: "block",
                    blockKind: "alt",
                    branches: [
                      {
                        id: "l4bbr2",
                        label: "item が message",
                        items: [
                          {
                            id: "l4bm3",
                            kind: "message",
                            fromId: "fn",
                            toId: "fn",
                            text: "from -arrow-> to : text (🔗 あればラベルに付加)",
                            arrow: "sync",
                          },
                        ],
                      },
                      {
                        id: "l4bbr3",
                        label: "item が block",
                        items: [
                          {
                            id: "l4bm4",
                            kind: "message",
                            fromId: "fn",
                            toId: "fn",
                            text: "alt/opt/par/loop/break/critical ... end を生成",
                            arrow: "sync",
                          },
                          {
                            id: "l4bm5",
                            kind: "message",
                            fromId: "fn",
                            toId: "fn",
                            text: "branches を再帰処理 (else/and/option ラベル)",
                            arrow: "sync",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: "l4bm6",
            kind: "message",
            fromId: "fn",
            toId: "mermaid",
            text: "sequenceDiagram テキスト + messageOrder[] を返す",
            arrow: "reply",
          },
          {
            id: "l4bm7",
            kind: "message",
            fromId: "mermaid",
            toId: "mermaid",
            text: "SVG 生成 → PreviewPanel の stage に挿入",
            arrow: "async",
          },
        ],
      },
    ],
  };
}
