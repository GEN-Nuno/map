import mermaid from "mermaid";
import { Store } from "../model/store";
import { generateMermaid } from "../mermaid/generate";
import { button, clear, el } from "./dom";
import {
  childrenOf,
  Diagram,
  flattenMessages,
  LAYER_LABELS,
  parentOf,
} from "../model/types";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
  sequence: { useMaxWidth: false },
});

let renderSeq = 0;

/** 右側プレビュー: Mermaid 描画 + パンくず + 親子ナビ + リンク辿り。 */
export class PreviewPanel {
  readonly root: HTMLElement;
  private stage: HTMLElement;
  private crumbBar: HTMLElement;
  private navBar: HTMLElement;
  private zoom = 1;

  constructor(private store: Store) {
    this.root = el("section", { class: "preview" });
    this.navBar = el("div", { class: "preview-toolbar" });
    this.crumbBar = el("div", { class: "crumb" });
    this.stage = el("div", { class: "stage" });
    this.root.append(this.navBar, this.crumbBar, this.stage);
    store.subscribe(() => this.render());
    this.render();
  }

  private render(): void {
    const d = this.store.active;
    clear(this.navBar);
    clear(this.crumbBar);
    clear(this.stage);
    if (!d) {
      this.stage.appendChild(
        el("div", { class: "empty-hint" }, "左の本棚から図を選ぶか、新規作成してください。")
      );
      return;
    }
    this.renderToolbar(d);
    this.renderCrumb(d);
    void this.renderDiagram(d);
  }

  private renderToolbar(d: Diagram): void {
    const parent = parentOf(this.store.shelf, d);
    const kids = childrenOf(this.store.shelf, d.id);

    this.navBar.append(
      button("▲ 親へ", () => parent && this.store.setActive(parent.id), {
        class: `tb ${parent ? "primary" : "disabled"}`,
        title: parent ? `親図: ${parent.title}` : "親図なし",
      }),
      button("▼ 子へ", () => this.goChild(kids), {
        class: `tb ${kids.length ? "" : "disabled"}`,
        title: kids.length ? `子図 ${kids.length} 件` : "子図なし",
      }),
      el("span", { class: `layer-badge layer-${d.layer}` }, d.layer),
      this.jumpSelect(d),
      el("span", { class: "spacer" }),
      button("－", () => this.setZoom(this.zoom - 0.1), { class: "tb", title: "縮小" }),
      button("100%", () => this.setZoom(1), { class: "tb", title: "等倍" }),
      button("＋", () => this.setZoom(this.zoom + 0.1), { class: "tb", title: "拡大" })
    );
  }

  private jumpSelect(current: Diagram): HTMLElement {
    const s = el("select", { class: "jump", title: "図を選んで移動" });
    for (const layer of ["L1", "L2", "L3", "L4"] as const) {
      const ds = this.store.shelf.diagrams.filter((d) => d.layer === layer);
      if (ds.length === 0) {
        continue;
      }
      const group = el("optgroup", { label: `${layer} · ${LAYER_LABELS[layer]}` });
      for (const d of ds) {
        const opt = el("option", { value: d.id }, `${d.title}`);
        if (d.id === current.id) {
          opt.setAttribute("selected", "selected");
        }
        group.appendChild(opt);
      }
      s.appendChild(group);
    }
    s.value = current.id;
    s.addEventListener("change", () => this.store.setActive(s.value));
    return s;
  }

  private goChild(kids: Diagram[]): void {
    if (kids.length === 0) {
      return;
    }
    if (kids.length === 1) {
      this.store.setActive(kids[0].id);
      return;
    }
    // 複数: クルムバーに選択肢を出す（簡易）
    const choice = kids
      .map((k, i) => `${i + 1}. ${k.title}`)
      .join("\n");
    const ans = prompt(`降りる子図を番号で選択:\n${choice}`, "1");
    const idx = ans ? parseInt(ans, 10) - 1 : -1;
    if (idx >= 0 && idx < kids.length) {
      this.store.setActive(kids[idx].id);
    }
  }

  private renderCrumb(d: Diagram): void {
    const parent = parentOf(this.store.shelf, d);
    if (parent) {
      const a = el("a", { class: "crumb-link" }, parent.title);
      a.addEventListener("click", () => this.store.setActive(parent.id));
      this.crumbBar.append(a, el("span", { class: "sep" }, " › "));
    }
    this.crumbBar.appendChild(el("strong", {}, d.title));
    const kids = childrenOf(this.store.shelf, d.id);
    if (kids.length) {
      this.crumbBar.appendChild(el("span", { class: "sep" }, "  |  子: "));
      kids.forEach((k, i) => {
        const a = el("a", { class: "crumb-link" }, k.title);
        a.addEventListener("click", () => this.store.setActive(k.id));
        this.crumbBar.appendChild(a);
        if (i < kids.length - 1) {
          this.crumbBar.appendChild(el("span", { class: "sep" }, " · "));
        }
      });
    }
  }

  private async renderDiagram(d: Diagram): Promise<void> {
    const { text, messageOrder } = generateMermaid(d);
    const myseq = ++renderSeq;
    const holder = el("div", { class: "mermaid-holder" });
    holder.style.transform = `scale(${this.zoom})`;
    this.stage.appendChild(holder);

    try {
      const { svg } = await mermaid.render(`seqshelf-${myseq}`, text);
      if (myseq !== renderSeq) {
        return; // 古い描画は破棄
      }
      holder.innerHTML = svg;
      this.bindMessageLinks(d, holder, messageOrder);
    } catch (err) {
      holder.appendChild(
        el("pre", { class: "err" }, `Mermaid 描画エラー:\n${String(err)}\n\n${text}`)
      );
    }
  }

  /** 描画後、リンク付きメッセージの SVG ラベルにクリックを束ねる。 */
  private bindMessageLinks(
    d: Diagram,
    holder: HTMLElement,
    order: string[]
  ): void {
    const msgById = new Map(flattenMessages(d.items).map((m) => [m.id, m]));
    // Mermaid のメッセージラベルは出現順に並ぶ
    const labels = Array.from(
      holder.querySelectorAll<SVGTextElement>("text.messageText")
    );
    order.forEach((mid, i) => {
      const m = msgById.get(mid);
      const label = labels[i];
      if (!m || !label || !m.linkTargetId) {
        return;
      }
      const target = m.linkTargetId;
      label.style.cursor = "pointer";
      label.style.fill = "var(--link)";
      label.style.textDecoration = "underline";
      label.addEventListener("click", () => {
        if (this.store.shelf.diagrams.some((x) => x.id === target)) {
          this.store.setActive(target);
        }
      });
    });
  }

  private setZoom(z: number): void {
    this.zoom = Math.max(0.3, Math.min(3, z));
    const holder = this.stage.querySelector<HTMLElement>(".mermaid-holder");
    if (holder) {
      holder.style.transform = `scale(${this.zoom})`;
    }
  }
}
