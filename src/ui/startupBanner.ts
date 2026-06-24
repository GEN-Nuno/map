import { Store } from "../model/store";
import { sampleShelf } from "../model/sample";
import { button, el } from "./dom";
import { applyFullBackup, importFullBackup } from "../io/backup";

/**
 * 起動時にデータが空の場合に表示する案内バナー。
 * アプリ更新や別フォルダ配布で localStorage が空になったときに、
 * バックアップから復元する導線を分かりやすく出す。
 */
export class StartupBanner {
  readonly root: HTMLElement;
  private dismissed = false;

  constructor(private store: Store) {
    this.root = el("div", { class: "startup-banner hidden" });
    store.subscribe(() => this.update());
    this.update();
  }

  private update(): void {
    if (this.dismissed || this.store.shelf.diagrams.length > 0) {
      this.root.classList.add("hidden");
      this.root.replaceChildren();
      return;
    }
    this.root.classList.remove("hidden");
    this.root.replaceChildren(
      el("div", { class: "banner-title" }, "📚 本棚が空です"),
      el(
        "div",
        { class: "banner-body" },
        "アプリ更新・別フォルダ配布などで保存データが見つかりません。",
        el("br"),
        "以前の状態を引き継ぎたい場合は「📦 バックアップから復元」を選んでください。"
      ),
      el(
        "div",
        { class: "banner-actions" },
        button("📦 バックアップから復元", () => this.restore(), { class: "tb primary" }),
        button("📖 サンプルで始める", () => this.store.replaceShelf(sampleShelf()), { class: "tb" }),
        button("✖ 閉じる", () => this.dismiss(), { class: "tb" })
      )
    );
  }

  private dismiss(): void {
    this.dismissed = true;
    this.update();
  }

  private async restore(): Promise<void> {
    const backup = await importFullBackup();
    if (!backup) {
      return;
    }
    const result = applyFullBackup(backup, (s) => this.store.replaceShelf(s));
    const msgs: string[] = [];
    msgs.push(result.appliedCurrent ? "現在の本棚を復元しました。" : "現在の本棚は含まれていませんでした。");
    msgs.push(result.appliedLibrary ? "保存済みライブラリを復元しました。" : "保存済みライブラリは含まれていませんでした。");
    alert(msgs.join("\n"));
  }
}
