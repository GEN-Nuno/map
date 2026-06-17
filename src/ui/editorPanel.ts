import { Store } from "../model/store";
import { button, clear, el, select, textInput } from "./dom";
import {
  ARROW_KINDS,
  Block,
  BLOCK_KINDS,
  Branch,
  Diagram,
  Item,
  Message,
  PARTICIPANT_KINDS,
  Participant,
} from "../model/types";
import {
  addBranch,
  addParticipant,
  insertItem,
  locateItem,
  makeBlock,
  makeMessage,
  moveItem,
  moveItemRelative,
  moveParticipant,
  removeBranch,
  removeItem,
  removeParticipant,
} from "../model/operations";

/** 中央のGUIエディタ: 縦線・横線・条件をボタンで追加/挟み込み。 */
export class EditorPanel {
  readonly root: HTMLElement;
  /** ドラッグ中の item id (横線/ブロックの並べ替え用)。 */
  private dragId: string | undefined;

  constructor(private store: Store) {
    this.root = el("section", { class: "editor" });
    store.subscribe(() => this.render());
    this.render();
  }

  private edit(fn: (d: Diagram) => void): void {
    const id = this.store.activeId;
    if (!id) {
      return;
    }
    this.store.mutate((s) => {
      const d = s.diagrams.find((x) => x.id === id);
      if (d) {
        fn(d);
      }
    });
  }

  private render(): void {
    clear(this.root);
    const d = this.store.active;
    if (!d) {
      this.root.appendChild(
        el("div", { class: "empty-hint" }, "図を選択すると、ここで編集できます。")
      );
      return;
    }
    this.root.appendChild(this.metaSection(d));
    this.root.appendChild(this.participantSection(d));
    this.root.appendChild(this.sequenceSection(d));
  }

  /* ---------- メタ ---------- */
  private metaSection(d: Diagram): HTMLElement {
    const sec = el("div", { class: "ed-section" });
    sec.appendChild(el("h3", {}, "図の情報"));
    sec.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", {}, "タイトル"),
        textInput(d.title, (v) => this.edit((x) => (x.title = v)), {
          class: "grow",
        })
      )
    );

    const parentLayer = upperLayerOf(d.layer);
    const parentOptions = [
      { value: "", label: "（親なし）" },
      ...this.store.shelf.diagrams
        .filter(
          (x) =>
            x.id !== d.id &&
            x.layer === parentLayer &&
            !isDescendantDiagram(this.store.shelf, d.id, x.id)
        )
        .map((x) => ({ value: x.id, label: `${x.layer}: ${x.title}` })),
    ];
    const parentValue = parentOptions.some((o) => o.value === (d.parentId ?? ""))
      ? (d.parentId ?? "")
      : "";
    sec.appendChild(
      el(
        "div",
        { class: "row" },
        el("label", {}, "親図"),
        select(
          parentOptions,
          parentValue,
          (v) => this.edit((x) => (x.parentId = v || undefined)),
          { class: "grow" }
        )
      )
    );
    sec.appendChild(
      el(
        "div",
        { class: "hint" },
        parentLayer
          ? `親図は 1 つ上の層 (${parentLayer}) から選択できます。`
          : "L1 は最上位のため親図を持ちません。"
      )
    );
    return sec;
  }

  /* ---------- 参加者 (縦線) ---------- */
  private participantSection(d: Diagram): HTMLElement {
    const sec = el("div", { class: "ed-section" });
    sec.appendChild(
      el(
        "div",
        { class: "sec-head" },
        el("h3", {}, "縦線 (参加者)"),
        button("＋ 縦線を追加", () => this.addParticipant(d), {
          class: "add",
          title: "アクター/システム/DB/クラス/関数の縦線を追加",
        })
      )
    );
    if (d.participants.length === 0) {
      sec.appendChild(el("div", { class: "hint" }, "まず縦線（参加者）を追加してください。"));
    }
    for (const p of d.participants) {
      sec.appendChild(this.participantRow(p));
    }
    return sec;
  }

  private participantRow(p: Participant): HTMLElement {
    return el(
      "div",
      { class: "row p-row" },
      select(
        PARTICIPANT_KINDS.map((k) => ({ value: k.kind, label: k.label })),
        p.kind,
        (v) => this.edit((x) => setKind(x, p.id, v)),
        { class: "kind" }
      ),
      textInput(p.name, (v) => this.edit((x) => setName(x, p.id, v)), {
        class: "grow",
      }),
      button("↑", () => this.edit((x) => moveParticipant(x, p.id, -1)), {
        class: "icon",
      }),
      button("↓", () => this.edit((x) => moveParticipant(x, p.id, 1)), {
        class: "icon",
      }),
      button("🗑", () => this.edit((x) => removeParticipant(x, p.id)), {
        class: "icon",
      })
    );
  }

  private addParticipant(d: Diagram): void {
    this.edit((x) => addParticipant(x, "新しい参加者", defaultKind(d)));
  }

  /* ---------- シーケンス (横線 + 条件) ---------- */
  private sequenceSection(d: Diagram): HTMLElement {
    const sec = el("div", { class: "ed-section" });
    sec.appendChild(
      el(
        "div",
        { class: "sec-head" },
        el("h3", {}, "シーケンス (横線・条件)"),
        el(
          "span",
          { class: "add-group" },
          button("＋ 横線", () => this.addMessage(d, []), {
            class: "add",
            title: "メッセージ(矢印)を末尾に追加",
          }),
          button("＋ 条件", () => this.addBlock(d, []), {
            class: "add",
            title: "alt/opt/par/break/critical を末尾に追加",
          })
        )
      )
    );
    if (d.participants.length < 1) {
      sec.appendChild(
        el("div", { class: "hint" }, "横線を引くには先に縦線(参加者)が必要です。")
      );
      return sec;
    }
    sec.appendChild(this.itemList(d, d.items, []));
    return sec;
  }

  /** items リストを描画。path はネスト位置 (block/branch 交互)。 */
  private itemList(d: Diagram, items: Item[], path: string[]): HTMLElement {
    const list = el("div", { class: "item-list" });
    for (const it of items) {
      if (it.kind === "message") {
        list.appendChild(this.messageRow(d, it));
      } else {
        list.appendChild(this.blockRow(d, it, path));
      }
    }
    return list;
  }

  private messageRow(d: Diagram, m: Message): HTMLElement {
    const pOpts = d.participants.map((p) => ({ value: p.id, label: p.name }));
    const linkOpts = [
      { value: "", label: "🔗 リンクなし" },
      ...this.store.shelf.diagrams
        .filter((x) => x.id !== d.id)
        .map((x) => ({ value: x.id, label: `→ ${x.layer}: ${x.title}` })),
    ];

    const handle = el("span", { class: "drag", title: "ドラッグで並べ替え" }, "⠿");

    const row = el(
      "div",
      { class: "row m-row" },
      handle,
      select(pOpts, m.fromId, (v) => this.edit((x) => setMsg(x, m.id, (mm) => (mm.fromId = v))), {
        class: "from",
      }),
      select(
        ARROW_KINDS.map((a) => ({ value: a.kind, label: a.label })),
        m.arrow,
        (v) => this.edit((x) => setMsg(x, m.id, (mm) => (mm.arrow = v))),
        { class: "arrow" }
      ),
      select(pOpts, m.toId, (v) => this.edit((x) => setMsg(x, m.id, (mm) => (mm.toId = v))), {
        class: "to",
      }),
      textInput(
        m.text,
        (v) => this.edit((x) => setMsg(x, m.id, (mm) => (mm.text = v))),
        { class: "grow", placeholder: "メッセージ内容" }
      ),
      select(
        linkOpts,
        m.linkTargetId ?? "",
        (v) =>
          this.edit((x) => setMsg(x, m.id, (mm) => (mm.linkTargetId = v || undefined))),
        { class: "link", title: "この横線の詳細を別の図にリンク" }
      ),
      button("↑", () => this.edit((x) => moveItem(x, m.id, -1)), { class: "icon" }),
      button("↓", () => this.edit((x) => moveItem(x, m.id, 1)), { class: "icon" }),
      button("＋下", () => this.insertAfter(d, m.id, "message"), {
        class: "icon",
        title: "この下に横線を挟み込む",
      }),
      button("🗑", () => this.edit((x) => removeItem(x, m.id)), { class: "icon" })
    );
    this.makeDraggable(row, handle, m.id);
    return row;
  }

  private blockRow(d: Diagram, b: Block, path: string[]): HTMLElement {
    const def = BLOCK_KINDS.find((x) => x.kind === b.blockKind)!;
    const wrap = el("div", { class: `block block-${b.blockKind}` });
    const handle = el("span", { class: "drag", title: "ドラッグで並べ替え" }, "⠿");
    wrap.appendChild(
      el(
        "div",
        { class: "block-head" },
        handle,
        select(
          BLOCK_KINDS.map((x) => ({ value: x.kind, label: x.label })),
          b.blockKind,
          (v) => this.edit((x) => setBlock(x, b.id, (bb) => (bb.blockKind = v))),
          { class: "block-kind" }
        ),
        el("span", { class: "spacer" }),
        button("↑", () => this.edit((x) => moveItem(x, b.id, -1)), { class: "icon" }),
        button("↓", () => this.edit((x) => moveItem(x, b.id, 1)), { class: "icon" }),
        button("＋下", () => this.insertAfter(d, b.id, "message"), {
          class: "icon",
          title: "このブロックの下に横線を挟み込む",
        }),
        button("🗑", () => this.edit((x) => removeItem(x, b.id)), { class: "icon" })
      )
    );

    b.branches.forEach((branch, i) => {
      wrap.appendChild(this.branchBlock(d, b, branch, i, def.branchWord, path));
    });

    if (def.multiBranch) {
      wrap.appendChild(
        button(`＋ ${def.branchWord || "分岐"}を追加`, () =>
          this.edit((x) => setBlock(x, b.id, (bb) => addBranch(bb))), {
          class: "add-branch",
        })
      );
    }
    this.makeDraggable(wrap, handle, b.id);
    return wrap;
  }

  private branchBlock(
    d: Diagram,
    b: Block,
    branch: Branch,
    index: number,
    branchWord: string,
    path: string[]
  ): HTMLElement {
    const head =
      index === 0 ? b.blockKind : branchWord || "else";
    const sec = el("div", { class: "branch" });
    sec.appendChild(
      el(
        "div",
        { class: "branch-head" },
        el("span", { class: "branch-key" }, head),
        textInput(
          branch.label,
          (v) =>
            this.edit((x) =>
              setBlock(x, b.id, (bb) => {
                const br = bb.branches.find((q) => q.id === branch.id);
                if (br) {
                  br.label = v;
                }
              })
            ),
          { class: "grow", placeholder: "条件ラベル" }
        ),
        el(
          "span",
          { class: "branch-add" },
          button("＋横線", () =>
            this.addMessage(d, [...path, b.id, branch.id]), {
            class: "icon",
            title: "この分岐内に横線を追加",
          }),
          button("＋条件", () => this.addBlock(d, [...path, b.id, branch.id]), {
            class: "icon",
            title: "この分岐内に条件を追加",
          }),
          index > 0
            ? button("🗑分岐", () =>
                this.edit((x) => setBlock(x, b.id, (bb) => removeBranch(bb, branch.id))), {
                class: "icon",
              })
            : null
        )
      )
    );
    sec.appendChild(
      this.itemList(d, branch.items, [...path, b.id, branch.id])
    );
    return sec;
  }

  /* ---------- 追加・挿入 ---------- */
  private defaultPair(d: Diagram): { from: string; to: string } {
    const p = d.participants;
    return {
      from: p[0]?.id ?? "",
      to: p[1]?.id ?? p[0]?.id ?? "",
    };
  }

  private addMessage(d: Diagram, path: string[]): void {
    const { from, to } = this.defaultPair(d);
    this.edit((x) => insertItem(x, path, makeMessage(from, to, "新しいメッセージ")));
  }

  private addBlock(_d: Diagram, path: string[]): void {
    this.edit((x) => insertItem(x, path, makeBlock("alt")));
  }

  /** item の直後に新しい横線を挟み込む。 */
  private insertAfter(d: Diagram, itemId: string, _kind: "message"): void {
    const { from, to } = this.defaultPair(d);
    this.edit((x) => {
      const loc = locateItem(x, itemId);
      if (!loc) {
        return;
      }
      loc.list.splice(loc.index + 1, 0, makeMessage(from, to, "新しいメッセージ"));
    });
  }

  /* ---------- ドラッグ&ドロップ並べ替え ---------- */
  /**
   * row を itemId の項目としてドラッグ可能にする。
   * - handle を掴んだ時だけ draggable を有効化 (入力欄の操作を邪魔しない)
   * - 別の row の上半分/下半分にドロップすると、その前/後ろへ移動
   */
  private makeDraggable(
    row: HTMLElement,
    handle: HTMLElement,
    itemId: string
  ): void {
    row.draggable = false;
    handle.style.cursor = "grab";

    handle.addEventListener("mousedown", () => {
      row.draggable = true;
    });
    handle.addEventListener("mouseup", () => {
      row.draggable = false;
    });

    row.addEventListener("dragstart", (e) => {
      this.dragId = itemId;
      row.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", itemId);
      }
    });

    row.addEventListener("dragend", () => {
      row.draggable = false;
      row.classList.remove("dragging");
      this.dragId = undefined;
      this.clearDropMarkers();
    });

    row.addEventListener("dragover", (e) => {
      if (!this.dragId || this.dragId === itemId) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      const before = this.isBeforeHalf(row, e);
      row.classList.toggle("drop-before", before);
      row.classList.toggle("drop-after", !before);
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drop-before", "drop-after");
    });

    row.addEventListener("drop", (e) => {
      if (!this.dragId || this.dragId === itemId) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const before = this.isBeforeHalf(row, e);
      const dragId = this.dragId;
      this.clearDropMarkers();
      this.edit((x) => moveItemRelative(x, dragId, itemId, before));
    });
  }

  private isBeforeHalf(row: HTMLElement, e: DragEvent): boolean {
    const rect = row.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  }

  private clearDropMarkers(): void {
    this.root
      .querySelectorAll(".drop-before, .drop-after")
      .forEach((n) => n.classList.remove("drop-before", "drop-after"));
  }
}

/* ---------- ヘルパ (純粋な書き換え) ---------- */
function setName(d: Diagram, pid: string, name: string): void {
  const p = d.participants.find((x) => x.id === pid);
  if (p) {
    p.name = name;
  }
}
function setKind(d: Diagram, pid: string, kind: Participant["kind"]): void {
  const p = d.participants.find((x) => x.id === pid);
  if (p) {
    p.kind = kind;
  }
}
function setMsg(d: Diagram, mid: string, fn: (m: Message) => void): void {
  const loc = locateItem(d, mid);
  if (loc && loc.list[loc.index].kind === "message") {
    fn(loc.list[loc.index] as Message);
  }
}
function setBlock(d: Diagram, bid: string, fn: (b: Block) => void): void {
  const loc = locateItem(d, bid);
  if (loc && loc.list[loc.index].kind === "block") {
    fn(loc.list[loc.index] as Block);
  }
}
function defaultKind(d: Diagram): Participant["kind"] {
  switch (d.layer) {
    case "L1":
      return "actor";
    case "L2":
      return "process";
    case "L3":
      return "class";
    case "L4":
      return "function";
  }
}

function upperLayerOf(layer: Diagram["layer"]): Diagram["layer"] | undefined {
  switch (layer) {
    case "L1":
      return undefined;
    case "L2":
      return "L1";
    case "L3":
      return "L2";
    case "L4":
      return "L3";
  }
}

function isDescendantDiagram(
  shelf: Store["shelf"],
  rootId: string,
  candidateId: string
): boolean {
  let cur = shelf.diagrams.find((d) => d.id === candidateId);
  const visited = new Set<string>();
  while (cur?.parentId) {
    if (visited.has(cur.id)) {
      break;
    }
    visited.add(cur.id);
    if (cur.parentId === rootId) {
      return true;
    }
    cur = shelf.diagrams.find((d) => d.id === cur?.parentId);
  }
  return false;
}
