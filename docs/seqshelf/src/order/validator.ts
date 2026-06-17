// SeqShelf デモ用のサンプル関数。
// docs/seqshelf を拡張デバッグ時のワークスペースとして開くと、
// この validateOrder 上に CodeLens「N 件の図」が表示される
// (L4-validateOrder / L4-validateOrder-timeout が targetSymbols で参照)。

export interface OrderItem {
  sku: string;
  qty: number;
}

export interface Order {
  items: OrderItem[];
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateOrder(order: Order): ValidationResult {
  if (order.items.length === 0) {
    throw new Error("空の注文");
  }
  const allAvailable = checkStock(order.items);
  return { ok: allAvailable };
}

function checkStock(items: OrderItem[]): boolean {
  return items.every((i) => i.qty > 0);
}
