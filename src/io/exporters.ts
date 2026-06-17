import { Shelf, Diagram } from "../model/types";
import { generateMermaid } from "../mermaid/generate";

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportShelfJson(shelf: Shelf): void {
  download("seqshelf.json", JSON.stringify(shelf, null, 2), "application/json");
}

export function exportDiagramMermaid(d: Diagram): void {
  const { text } = generateMermaid(d);
  download(`${d.id}.mmd`, text, "text/plain");
}

export function exportDiagramSvg(holder: HTMLElement | null, d: Diagram): void {
  const svg = holder?.querySelector("svg");
  if (!svg) {
    alert("SVG が見つかりません。図を表示してから実行してください。");
    return;
  }
  const xml = new XMLSerializer().serializeToString(svg);
  download(`${d.id}.svg`, xml, "image/svg+xml");
}

/** JSON ファイルを読み込み、Shelf として返す (検証付き)。 */
export function importShelfJson(): Promise<Shelf | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result)) as Shelf;
          if (parsed && parsed.version === 2 && Array.isArray(parsed.diagrams)) {
            resolve(parsed);
          } else {
            alert("SeqShelf の JSON 形式 (version 2) ではありません。");
            resolve(undefined);
          }
        } catch (e) {
          alert("JSON の解析に失敗しました: " + (e as Error).message);
          resolve(undefined);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}
