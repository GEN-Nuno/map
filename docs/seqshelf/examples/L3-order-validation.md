---
id: L3-order-validation
layer: L3
title: 受注バリデーション (クラス間)
parent: L2-order-system#validate
children: [L4-validateOrder, L4-validateOrder-timeout]
actors: [OrderController, OrderValidator, InventoryRepo]
links:
  正常系: L4-validateOrder
  タイムアウト系: L4-validateOrder-timeout
---

# 受注バリデーション (L3 クラス間)

L2 の `validate()` を、関与するクラス間のメッセージとして展開したもの。
各 `click` は対応する L4 関数図へリンクする。

```mermaid
sequenceDiagram
  participant OrderController
  participant OrderValidator
  participant InventoryRepo

  OrderController->>OrderValidator: validateOrder(order)
  OrderValidator->>InventoryRepo: checkStock(items)
  InventoryRepo-->>OrderValidator: stock status
  OrderValidator-->>OrderController: ValidationResult
  click OrderValidator href "L4-validateOrder.md"
  click InventoryRepo href "L4-validateOrder-timeout.md"
  Note over InventoryRepo: see L4-validateOrder-timeout
```
