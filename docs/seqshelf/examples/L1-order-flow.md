---
id: L1-order-flow
layer: L1
title: 受注フロー (顧客 → EC → 倉庫)
children: [L2-order-system]
actors: [顧客, ECサイト, 倉庫]
links:
  注文確定: L2-order-system
---

# 受注フロー (L1 運用フロー)

顧客が商品を注文してから倉庫が出荷するまでの業務フロー。各横線（メッセージ）は
下階層でシステム構成・クラス・関数へと掘り下げられる。

```mermaid
sequenceDiagram
  actor 顧客
  participant ECサイト
  participant 倉庫

  顧客->>ECサイト: カートを確定して注文 [→詳細](L2-order-system.md)
  ECサイト->>ECサイト: 在庫・与信チェック
  ECサイト->>倉庫: 出荷指示
  倉庫-->>ECサイト: 出荷完了通知
  ECサイト-->>顧客: 注文確定メール
  Note over ECサイト: see L2-order-system
```
