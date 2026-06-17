import { Store } from "../model/store";
import { button, el } from "./dom";
import { sampleShelf } from "../model/sample";
import { emptyShelf } from "../model/types";
import {
  exportDiagramMermaid,
  exportDiagramSvg,
  exportShelfJson,
  importShelfJson,
} from "../io/exporters";

/** 上部ツールバー: サンプル/新規/保存(自動)/入出力。 */
export class Toolbar {
  readonly root: HTMLElement;

  constructor(private store: Store) {
    this.root = el("header", { class: "toolbar" });
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    this.root.replaceChildren(
      el("span", { class: "brand" }, "📚 SeqShelf"),
      el("span", { class: "tagline" }, "4階層シーケンス図の本棚 — 運用→システム→クラス→関数"),
      el("span", { class: "spacer" }),
      button("📖 サンプル", () => this.loadSample(), {
        class: "tb",
        title: "受注フローのサンプル本棚を読み込む",
      }),
      button("🆕 空に", () => this.reset(), {
        class: "tb",
        title: "空の本棚で始める",
      }),
      button("⬇ JSON", () => exportShelfJson(this.store.shelf), {
        class: "tb",
        title: "本棚を JSON で書き出す",
      }),
      button("⬆ 読込", () => this.importJson(), {
        class: "tb",
        title: "JSON 本棚を読み込む",
      }),
      button("⬇ Mermaid", () => this.exportMermaid(), {
        class: "tb",
        title: "表示中の図を Mermaid で書き出す",
      }),
      button("⬇ SVG", () => this.exportSvg(), {
        class: "tb",
        title: "表示中の図を SVG で書き出す",
      }),
      el("span", { class: "saved", title: "変更は自動でブラウザに保存されます" }, "✓ 自動保存")
    );
  }

  private loadSample(): void {
    if (
      this.store.shelf.diagrams.length > 0 &&
      !confirm("現在の本棚をサンプルで置き換えますか？（現在の内容は失われます）")
    ) {
      return;
    }
    this.store.replaceShelf(sampleShelf());
  }

  private reset(): void {
    if (
      this.store.shelf.diagrams.length > 0 &&
      !confirm("本棚を空にしますか？（現在の内容は失われます）")
    ) {
      return;
    }
    this.store.replaceShelf(emptyShelf());
  }

  private async importJson(): Promise<void> {
    const shelf = await importShelfJson();
    if (shelf) {
      this.store.replaceShelf(shelf);
    }
  }

  private exportMermaid(): void {
    const d = this.store.active;
    if (!d) {
      alert("図を選択してください。");
      return;
    }
    exportDiagramMermaid(d);
  }

  private exportSvg(): void {
    const d = this.store.active;
    if (!d) {
      alert("図を選択してください。");
      return;
    }
    const holder = document.querySelector<HTMLElement>(".mermaid-holder");
    exportDiagramSvg(holder, d);
  }
}
