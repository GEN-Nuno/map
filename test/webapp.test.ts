import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleShelf } from "../src/model/sample.ts";
import { generateMermaid } from "../src/mermaid/generate.ts";
import {
  addParticipant,
  insertItem,
  locateItem,
  makeBlock,
  makeMessage,
  moveItem,
  moveItemRelative,
  removeItem,
} from "../src/model/operations.ts";
import { createDiagram } from "../src/model/operations.ts";
import { flattenMessages } from "../src/model/types.ts";

test("sample: 5図がそろっている", () => {
  const s = sampleShelf();
  assert.equal(s.diagrams.length, 5);
  assert.ok(s.diagrams.find((d) => d.id === "L1-order"));
  assert.ok(s.diagrams.find((d) => d.id === "L4-validate-timeout"));
});

test("generate: 全図が例外なく Mermaid を生成する", () => {
  for (const d of sampleShelf().diagrams) {
    const { text, messageOrder } = generateMermaid(d);
    assert.ok(text.startsWith("sequenceDiagram"));
    // 平坦化したメッセージ数と描画順が一致
    assert.equal(messageOrder.length, flattenMessages(d.items).length);
  }
});

test("generate: alt/critical/break が出力される", () => {
  const d = sampleShelf().diagrams.find((x) => x.id === "L4-validate-timeout")!;
  const { text } = generateMermaid(d);
  assert.match(text, /\n\s*critical /);
  assert.match(text, /\n\s*alt /);
  assert.match(text, /\n\s*break /);
  assert.match(text, /\n\s*else /);
  assert.match(text, /\n\s*end/);
});

test("generate: リンク付きメッセージに 🔗 が付く", () => {
  const d = sampleShelf().diagrams.find((x) => x.id === "L1-order")!;
  const { text } = generateMermaid(d);
  assert.match(text, /🔗/);
});

test("operations: 参加者と横線の追加・挟み込み", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const b = addParticipant(d, "B", "class");
  insertItem(d, [], makeMessage(a.id, b.id, "first"));
  insertItem(d, [], makeMessage(a.id, b.id, "third"));
  // 間に挟み込み (index 1)
  insertItem(d, [], makeMessage(a.id, b.id, "second"), 1);
  const texts = flattenMessages(d.items).map((m) => m.text);
  assert.deepEqual(texts, ["first", "second", "third"]);
});

test("operations: ブロック内へのネスト挿入と locate", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const block = makeBlock("alt");
  insertItem(d, [], block);
  const branch0 = block.branches[0];
  insertItem(d, [block.id, branch0.id], makeMessage(a.id, a.id, "inside"));
  const msgs = flattenMessages(d.items);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].text, "inside");
  const loc = locateItem(d, msgs[0].id);
  assert.ok(loc);
});

test("operations: move と remove", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const m1 = makeMessage(a.id, a.id, "one");
  const m2 = makeMessage(a.id, a.id, "two");
  insertItem(d, [], m1);
  insertItem(d, [], m2);
  moveItem(d, m2.id, -1);
  assert.deepEqual(flattenMessages(d.items).map((m) => m.text), ["two", "one"]);
  removeItem(d, m1.id);
  assert.deepEqual(flattenMessages(d.items).map((m) => m.text), ["two"]);
});

test("operations: moveItemRelative で横線をドラッグ並べ替え", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const m1 = makeMessage(a.id, a.id, "one");
  const m2 = makeMessage(a.id, a.id, "two");
  const m3 = makeMessage(a.id, a.id, "three");
  insertItem(d, [], m1);
  insertItem(d, [], m2);
  insertItem(d, [], m3);
  // three を one の前へ
  moveItemRelative(d, m3.id, m1.id, true);
  assert.deepEqual(
    flattenMessages(d.items).map((m) => m.text),
    ["three", "one", "two"]
  );
  // three を two の後ろへ
  moveItemRelative(d, m3.id, m2.id, false);
  assert.deepEqual(
    flattenMessages(d.items).map((m) => m.text),
    ["one", "two", "three"]
  );
});

test("operations: moveItemRelative はブロック内外をまたげる", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const m1 = makeMessage(a.id, a.id, "outside");
  const block = makeBlock("alt");
  insertItem(d, [], m1);
  insertItem(d, [], block);
  const inner = makeMessage(a.id, a.id, "inner");
  insertItem(d, [block.id, block.branches[0].id], inner);
  // outside のメッセージを ブロック内の inner の前へ移動
  const ok = moveItemRelative(d, m1.id, inner.id, true);
  assert.equal(ok, true);
  // ブロック分岐内に 2 件
  assert.deepEqual(
    block.branches[0].items.map((it) => (it.kind === "message" ? it.text : "?")),
    ["outside", "inner"]
  );
});

test("operations: ブロックを自分の子孫へは移動しない", () => {
  const d = createDiagram("L4", "test");
  const a = addParticipant(d, "A", "function");
  const block = makeBlock("alt");
  insertItem(d, [], block);
  const inner = makeMessage(a.id, a.id, "inner");
  insertItem(d, [block.id, block.branches[0].id], inner);
  const ok = moveItemRelative(d, block.id, inner.id, true);
  assert.equal(ok, false);
});
