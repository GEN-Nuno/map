import { Store } from "../model/store";
import { button, el } from "./dom";
import { sampleShelf } from "../model/sample";
import { selfShelf } from "../model/selfShelf";
import { emptyShelf } from "../model/types";
import {
  deleteShelfSnapshot,
  listSavedShelves,
  loadShelfSnapshot,
  saveShelfSnapshot,
} from "../model/shelfLibrary";
import {
  exportDiagramMermaid,
  exportDiagramSvg,
  exportShelfJson,
  importShelfJson,
} from "../io/exporters";

/** 上部ツールバー: サンプル/新規/保存(自動)/入出力。 */
export class Toolbar {
  readonly root: HTMLElement;
  private selectedSnapshotName = "";

  constructor(private store: Store) {
    this.root = el("header", { class: "toolbar" });
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    const snapshots = listSavedShelves();
    if (!snapshots.some((s) => s.name === this.selectedSnapshotName)) {
      this.selectedSnapshotName = snapshots[0]?.name ?? "";
    }

    this.root.replaceChildren(
      el("span", { class: "brand" }, "📚 SeqShelf"),
      el("span", { class: "tagline" }, "4階層シーケンス図の本棚 — 運用→システム→クラス→関数"),
      el("span", { class: "spacer" }),
      button("📖 サンプル", () => this.loadSample(), {
        class: "tb",
        title: "受注フローのサンプル本棚を読み込む",
      }),
      button("🏗 アプリ解説", () => this.loadSelf(), {
        class: "tb",
        title: "SeqShelf 自身の構造を4階層で解説した本棚を読み込む",
      }),
      button("💾 本棚保存", () => this.saveCurrentSnapshot(), {
        class: "tb",
        title: "現在の本棚を名前付きで保存",
      }),
      this.snapshotSelect(snapshots),
      button("📂 読込", () => this.loadSelectedSnapshot(), {
        class: `tb ${this.selectedSnapshotName ? "" : "disabled"}`,
        title: this.selectedSnapshotName
          ? `保存済み本棚「${this.selectedSnapshotName}」を読み込む`
          : "先に保存済み本棚を選択してください",
      }),
      button("🗑 保存削除", () => this.deleteSelectedSnapshot(), {
        class: `tb ${this.selectedSnapshotName ? "" : "disabled"}`,
        title: this.selectedSnapshotName
          ? `保存済み本棚「${this.selectedSnapshotName}」を削除`
          : "先に保存済み本棚を選択してください",
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

  private snapshotSelect(
    snapshots: { name: string; savedAt: string }[]
  ): HTMLSelectElement {
    const s = el("select", {
      class: "tb-select",
      title: "保存済み本棚を選択",
    }) as HTMLSelectElement;
    s.appendChild(el("option", { value: "" }, "保存済み本棚を選択"));
    for (const it of snapshots) {
      s.appendChild(el("option", { value: it.name }, `${it.name} (${fmtSavedAt(it.savedAt)})`));
    }
    s.value = this.selectedSnapshotName;
    s.addEventListener("change", () => {
      this.selectedSnapshotName = s.value;
      this.render();
    });
    return s;
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

  private loadSelf(): void {
    if (
      this.store.shelf.diagrams.length > 0 &&
      !confirm("現在の本棚を「SeqShelf アプリ解説」本棚で置き換えますか？")
    ) {
      return;
    }
    this.store.replaceShelf(selfShelf());
  }

  private saveCurrentSnapshot(): void {
    const def = this.store.active?.title
      ? `${this.store.active.title} 本棚`
      : `本棚 ${new Date().toLocaleString()}`;
    const name = prompt("保存名を入力してください", def);
    if (name === null) {
      return;
    }
    const normalized = name.trim();
    if (!normalized) {
      alert("保存名は空にできません。");
      return;
    }
    const saved = saveShelfSnapshot(normalized, this.store.shelf);
    if (!saved) {
      alert("保存に失敗しました。");
      return;
    }
    this.selectedSnapshotName = normalized;
    this.render();
  }

  private loadSelectedSnapshot(): void {
    if (!this.selectedSnapshotName) {
      return;
    }
    const shelf = loadShelfSnapshot(this.selectedSnapshotName);
    if (!shelf) {
      alert("選択した本棚が見つかりませんでした。");
      this.render();
      return;
    }
    if (!confirm(`保存済み本棚「${this.selectedSnapshotName}」を読み込みますか？`)) {
      return;
    }
    this.store.replaceShelf(shelf);
  }

  private deleteSelectedSnapshot(): void {
    if (!this.selectedSnapshotName) {
      return;
    }
    if (!confirm(`保存済み本棚「${this.selectedSnapshotName}」を削除しますか？`)) {
      return;
    }
    const ok = deleteShelfSnapshot(this.selectedSnapshotName);
    if (!ok) {
      alert("削除対象が見つかりませんでした。");
      this.render();
      return;
    }
    this.selectedSnapshotName = "";
    this.render();
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

function fmtSavedAt(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return iso;
  }
  return dt.toLocaleString();
}
