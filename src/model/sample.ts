import { Shelf } from "./types";

/**
 * サンプル本棚: 受注フロー (L1 → L2 → L3 → L4×2)。
 * 元の examples/*.md を JSON モデルに移植したもの。
 */
export function sampleShelf(): Shelf {
  return {
    version: 2,
    activeId: "L1-order",
    diagrams: [
      // ---------- L1 運用フロー ----------
      {
        id: "L1-order",
        layer: "L1",
        title: "受注フロー (顧客→EC→倉庫)",
        participants: [
          { id: "cust", name: "顧客", kind: "actor" },
          { id: "ec", name: "ECサイト", kind: "system" },
          { id: "wh", name: "倉庫", kind: "system" },
        ],
        items: [
          {
            id: "m1",
            kind: "message",
            fromId: "cust",
            toId: "ec",
            text: "カートを確定して注文",
            arrow: "sync",
            linkTargetId: "L2-order",
          },
          {
            id: "m2",
            kind: "message",
            fromId: "ec",
            toId: "ec",
            text: "在庫・与信チェック",
            arrow: "sync",
            linkTargetId: "L3-validate",
          },
          {
            id: "m3",
            kind: "message",
            fromId: "ec",
            toId: "wh",
            text: "出荷指示",
            arrow: "sync",
          },
          {
            id: "m4",
            kind: "message",
            fromId: "wh",
            toId: "ec",
            text: "出荷完了通知",
            arrow: "reply",
          },
          {
            id: "m5",
            kind: "message",
            fromId: "ec",
            toId: "cust",
            text: "注文確定メール",
            arrow: "reply",
          },
        ],
      },
      // ---------- L2 システム構成 ----------
      {
        id: "L2-order",
        layer: "L2",
        title: "受注システム構成",
        parentId: "L1-order",
        participants: [
          { id: "web", name: "WebApp", kind: "process" },
          { id: "api", name: "OrderAPI", kind: "process" },
          { id: "db", name: "PostgreSQL", kind: "database" },
          { id: "q", name: "JobQueue", kind: "queue" },
          { id: "worker", name: "Worker", kind: "process" },
        ],
        items: [
          {
            id: "m1",
            kind: "message",
            fromId: "web",
            toId: "api",
            text: "POST /orders",
            arrow: "sync",
          },
          {
            id: "m2",
            kind: "message",
            fromId: "api",
            toId: "api",
            text: "validate()",
            arrow: "sync",
            linkTargetId: "L3-validate",
          },
          {
            id: "m3",
            kind: "message",
            fromId: "api",
            toId: "db",
            text: "INSERT orders",
            arrow: "sync",
          },
          {
            id: "m4",
            kind: "message",
            fromId: "db",
            toId: "api",
            text: "order_id",
            arrow: "reply",
          },
          {
            id: "m5",
            kind: "message",
            fromId: "api",
            toId: "q",
            text: "enqueue(shipOrder)",
            arrow: "async",
          },
          {
            id: "m6",
            kind: "message",
            fromId: "api",
            toId: "web",
            text: "201 Created",
            arrow: "reply",
          },
          {
            id: "m7",
            kind: "message",
            fromId: "q",
            toId: "worker",
            text: "shipOrder(order_id)",
            arrow: "async",
          },
        ],
      },
      // ---------- L3 クラス間 ----------
      {
        id: "L3-validate",
        layer: "L3",
        title: "受注バリデーション (クラス間)",
        parentId: "L2-order",
        participants: [
          { id: "ctrl", name: "OrderController", kind: "class" },
          { id: "val", name: "OrderValidator", kind: "class" },
          { id: "repo", name: "InventoryRepo", kind: "class" },
        ],
        items: [
          {
            id: "m1",
            kind: "message",
            fromId: "ctrl",
            toId: "val",
            text: "validateOrder(order)",
            arrow: "sync",
            linkTargetId: "L4-validate-ok",
          },
          {
            id: "m2",
            kind: "message",
            fromId: "val",
            toId: "repo",
            text: "checkStock(items)",
            arrow: "sync",
            linkTargetId: "L4-validate-timeout",
          },
          {
            id: "m3",
            kind: "message",
            fromId: "repo",
            toId: "val",
            text: "stock status",
            arrow: "reply",
          },
          {
            id: "m4",
            kind: "message",
            fromId: "val",
            toId: "ctrl",
            text: "ValidationResult",
            arrow: "reply",
          },
        ],
      },
      // ---------- L4 正常系 ----------
      {
        id: "L4-validate-ok",
        layer: "L4",
        title: "validateOrder() 正常系",
        parentId: "L3-validate",
        participants: [
          { id: "ctrl", name: "OrderController", kind: "class" },
          { id: "self", name: "OrderValidator", kind: "function" },
          { id: "repo", name: "InventoryRepo", kind: "class" },
        ],
        items: [
          {
            id: "m1",
            kind: "message",
            fromId: "ctrl",
            toId: "self",
            text: "validateOrder(order)",
            arrow: "sync",
          },
          {
            id: "m2",
            kind: "message",
            fromId: "self",
            toId: "self",
            text: "assertNotEmpty(order.items)",
            arrow: "sync",
          },
          {
            id: "b1",
            kind: "block",
            blockKind: "alt",
            branches: [
              {
                id: "br1",
                label: "items が空",
                items: [
                  {
                    id: "m3",
                    kind: "message",
                    fromId: "self",
                    toId: "ctrl",
                    text: "throw ValidationError",
                    arrow: "lost",
                  },
                ],
              },
              {
                id: "br2",
                label: "正常",
                items: [
                  {
                    id: "m4",
                    kind: "message",
                    fromId: "self",
                    toId: "repo",
                    text: "checkStock(items)",
                    arrow: "sync",
                  },
                  {
                    id: "m5",
                    kind: "message",
                    fromId: "repo",
                    toId: "self",
                    text: "{ allAvailable: true }",
                    arrow: "reply",
                  },
                  {
                    id: "m6",
                    kind: "message",
                    fromId: "self",
                    toId: "ctrl",
                    text: "ValidationResult(ok)",
                    arrow: "reply",
                  },
                ],
              },
            ],
          },
        ],
      },
      // ---------- L4 タイムアウト/異常系 ----------
      {
        id: "L4-validate-timeout",
        layer: "L4",
        title: "validateOrder() タイムアウト系",
        parentId: "L3-validate",
        participants: [
          { id: "self", name: "OrderValidator", kind: "function" },
          { id: "repo", name: "InventoryRepo", kind: "class" },
        ],
        items: [
          {
            id: "m1",
            kind: "message",
            fromId: "self",
            toId: "self",
            text: "startTimer(2000ms)",
            arrow: "sync",
          },
          {
            id: "b1",
            kind: "block",
            blockKind: "critical",
            branches: [
              {
                id: "br1",
                label: "在庫サービスへ接続",
                items: [
                  {
                    id: "m2",
                    kind: "message",
                    fromId: "self",
                    toId: "repo",
                    text: "checkStock(items)",
                    arrow: "sync",
                  },
                ],
              },
              {
                id: "br2",
                label: "ネットワーク断",
                items: [
                  {
                    id: "m3",
                    kind: "message",
                    fromId: "self",
                    toId: "self",
                    text: "フォールバック(キャッシュ参照)",
                    arrow: "sync",
                  },
                ],
              },
            ],
          },
          {
            id: "b2",
            kind: "block",
            blockKind: "alt",
            branches: [
              {
                id: "br3",
                label: "タイムアウト",
                items: [
                  {
                    id: "m4",
                    kind: "message",
                    fromId: "repo",
                    toId: "self",
                    text: "2秒で応答なし",
                    arrow: "lost",
                  },
                  {
                    id: "b3",
                    kind: "block",
                    blockKind: "opt",
                    branches: [
                      {
                        id: "br5",
                        label: "リトライ可能",
                        items: [
                          {
                            id: "m5",
                            kind: "message",
                            fromId: "self",
                            toId: "repo",
                            text: "checkStock(items) リトライ",
                            arrow: "sync",
                          },
                          {
                            id: "m6",
                            kind: "message",
                            fromId: "repo",
                            toId: "self",
                            text: "stock status",
                            arrow: "reply",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                id: "br4",
                label: "成功",
                items: [
                  {
                    id: "m7",
                    kind: "message",
                    fromId: "repo",
                    toId: "self",
                    text: "stock status",
                    arrow: "reply",
                  },
                ],
              },
            ],
          },
          {
            id: "b4",
            kind: "block",
            blockKind: "break",
            branches: [
              {
                id: "br6",
                label: "リトライ上限超過",
                items: [
                  {
                    id: "m8",
                    kind: "message",
                    fromId: "self",
                    toId: "self",
                    text: "throw TimeoutError",
                    arrow: "lost",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
