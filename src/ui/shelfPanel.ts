import { Store } from "../model/store";
import { button, clear, el } from "./dom";
import {
  childrenOf,
  Diagram,
  Layer,
  LAYERS,
  LAYER_LABELS,
} from "../model/types";
import { createDiagram, deleteDiagram } from "../model/operations";

/** 左サイドバー: 本棚 (層ごとに図を一覧、クリックで選択)。 */
export class ShelfPanel {
  readonly root: HTMLElement;

  constructor(private store: Store) {
    this.root = el("aside", { class: "shelf" });
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    clear(this.root);
    const shelf = this.store.shelf;
    const active = this.store.active;
    const canAddChild = !!active && active.layer !== "L4";

    this.root.appendChild(
      el(
        "div",
        { class: "shelf-head" },
        el("span", { class: "shelf-title" }, "📚 本棚"),
        el(
          "span",
          { class: "shelf-head-actions" },
          button("＋新規L1", () => this.newDiagram("L1"), {
            class: "mini",
            title: "新しい運用フロー図を作成",
          }),
          button("＋同層", () => this.addSiblingOfActive(), {
            class: `mini ${active ? "" : "disabled"}`,
            title: active
              ? `選択中(${active.layer})と同じ層に図を追加`
              : "先に図を選択してください",
          }),
          button("＋子図", () => this.addChildOfActive(), {
            class: `mini ${canAddChild ? "" : "disabled"}`,
            title: !active
              ? "先に図を選択してください"
              : active.layer === "L4"
                ? "L4 は最下層です。子図は追加できません"
                : `選択中(${active.layer})の子図を追加`,
          })
        )
      )
    );

    for (const layer of LAYERS) {
      const diagrams = shelf.diagrams.filter((d) => d.layer === layer);
      const group = el("div", { class: "shelf-group" });
      group.appendChild(
        el(
          "div",
          { class: "shelf-group-head" },
          el("span", { class: `layer-badge layer-${layer}` }, layer),
          el("span", {}, LAYER_LABELS[layer]),
          el("span", { class: "count" }, `(${diagrams.length})`),
          button("＋", () => this.newDiagram(layer), {
            class: "icon",
            title: `${layer} に新規図を追加`,
          })
        )
      );
      if (diagrams.length === 0) {
        group.appendChild(el("div", { class: "shelf-empty" }, "—"));
      }
      for (const d of diagrams) {
        group.appendChild(this.bookRow(d));
      }
      this.root.appendChild(group);
    }
  }

  private bookRow(d: Diagram): HTMLElement {
    const active = this.store.activeId === d.id;
    const row = el(
      "div",
      { class: `book ${active ? "active" : ""}` },
      el("span", { class: "book-title" }, d.title),
      el(
        "span",
        { class: "book-actions" },
        button("＋子", () => this.addChild(d), {
          class: `icon ${d.layer === "L4" ? "disabled" : ""}`,
          title:
            d.layer === "L4"
              ? "L4 は最下層です。子図は追加できません"
              : "この図の下に子図を追加",
        }),
        button("🗑", () => this.delete(d), {
          class: "icon",
          title: "削除",
        })
      )
    );
    const childCount = childrenOf(this.store.shelf, d.id).length;
    if (childCount > 0) {
      row.appendChild(el("span", { class: "child-dot", title: `子図 ${childCount}` }, `▾${childCount}`));
    }
    row.addEventListener("click", () => this.store.setActive(d.id));
    return row;
  }

  private newDiagram(layer: Layer): void {
    const title = prompt(`新しい ${layer} 図のタイトル`, `新しい${LAYER_LABELS[layer]}`);
    if (title === null) {
      return;
    }
    const d = createDiagram(layer, title);
    this.store.mutate((s) => {
      s.diagrams.push(d);
      s.activeId = d.id;
    });
  }

  private addSiblingOfActive(): void {
    const base = this.store.active;
    if (!base) {
      return;
    }
    const title = prompt(
      `「${base.title}」と同じ層 (${base.layer}) の図タイトル`,
      `${base.title} の別パターン`
    );
    if (title === null) {
      return;
    }
    const d = createDiagram(base.layer, title, base.parentId);
    this.store.mutate((s) => {
      s.diagrams.push(d);
      s.activeId = d.id;
    });
  }

  private addChildOfActive(): void {
    const base = this.store.active;
    if (!base) {
      return;
    }
    this.addChild(base);
  }

  private addChild(parent: Diagram): void {
    if (parent.layer === "L4") {
      alert("L4 は最下層です。子図は追加できません。必要なら『＋同層』を使ってください。");
      return;
    }
    const idx = LAYERS.indexOf(parent.layer);
    const childLayer = LAYERS[Math.min(idx + 1, LAYERS.length - 1)];
    const title = prompt(
      `「${parent.title}」の子図 (${childLayer}) のタイトル`,
      `${parent.title} の詳細`
    );
    if (title === null) {
      return;
    }
    const d = createDiagram(childLayer, title, parent.id);
    this.store.mutate((s) => {
      s.diagrams.push(d);
      s.activeId = d.id;
    });
  }

  private delete(d: Diagram): void {
    const childCount = childrenOf(this.store.shelf, d.id).length;
    const warning =
      childCount > 0
        ? `\n\n子図 ${childCount} 件は削除されず、親なしの図として残ります。`
        : "";
    if (!confirm(`「${d.title}」を削除しますか？${warning}`)) {
      return;
    }
    this.store.mutate((s) => deleteDiagram(s, d.id));
  }
}
