---
id: L2-order-system
layer: L2
title: 受注システム構成
parent: L1-order-flow#注文確定
children: [L3-order-validation]
actors: [WebApp, OrderAPI, PostgreSQL, JobQueue, Worker]
links:
  バリデーション: L3-order-validation
---

# 受注システム構成 (L2 システム構成)

L1 の「注文確定」ステップを、実際のプロセス・DB・キューの観点で展開したもの。

```mermaid
sequenceDiagram
  participant WebApp
  participant OrderAPI
  participant PostgreSQL
  participant JobQueue
  participant Worker

  WebApp->>OrderAPI: POST /orders
  OrderAPI->>OrderAPI: validate() [→詳細](L3-order-validation.md)
  OrderAPI->>PostgreSQL: INSERT orders
  PostgreSQL-->>OrderAPI: order_id
  OrderAPI->>JobQueue: enqueue(shipOrder)
  OrderAPI-->>WebApp: 201 Created
  JobQueue->>Worker: shipOrder(order_id)
  Worker->>PostgreSQL: UPDATE orders SET shipped
  click OrderAPI href "L3-order-validation.md"
```
