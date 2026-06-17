import {
  ARROW_KINDS,
  Block,
  Diagram,
  Item,
  Message,
  Participant,
} from "../model/types";

/** Mermaid のラベルで問題になる文字を緩く除去/置換する。 */
function safe(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/;/g, "；").trim();
}

/** participant 名は Mermaid 識別子として安全な別名にし、表示名は as で付ける。 */
function alias(p: Participant): string {
  return p.id.replace(/[^A-Za-z0-9_]/g, "_");
}

const KIND_KEYWORD: Record<Participant["kind"], string> = {
  actor: "actor",
  system: "participant",
  process: "participant",
  database: "participant",
  queue: "participant",
  class: "participant",
  function: "participant",
};

const KIND_ICON: Record<Participant["kind"], string> = {
  actor: "🧑",
  system: "🌐",
  process: "⚙️",
  database: "🗄️",
  queue: "📨",
  class: "🧩",
  function: "🔧",
};

function arrowMermaid(message: Message): string {
  return ARROW_KINDS.find((a) => a.kind === message.arrow)?.mermaid ?? "->>";
}

export interface GenerateResult {
  text: string;
  /** 描画後にクリックを束ねるための、出現順メッセージ id 配列。 */
  messageOrder: string[];
}

/**
 * 図モデルから Mermaid sequenceDiagram のテキストを生成する。
 * messageOrder は Mermaid が描画する順序と一致するメッセージ id 並び
 * (プレビューでリンク用クリックを SVG 要素に紐付けるのに使う)。
 */
export function generateMermaid(d: Diagram): GenerateResult {
  const lines: string[] = ["sequenceDiagram"];
  const order: string[] = [];

  const nameById = new Map<string, Participant>();
  for (const p of d.participants) {
    nameById.set(p.id, p);
    const kw = KIND_KEYWORD[p.kind];
    lines.push(`  ${kw} ${alias(p)} as ${KIND_ICON[p.kind]} ${safe(p.name)}`);
  }

  const emit = (items: Item[], indent: string) => {
    for (const it of items) {
      if (it.kind === "message") {
        const from = nameById.get(it.fromId);
        const to = nameById.get(it.toId);
        if (!from || !to) {
          continue; // 参加者が削除済みならスキップ
        }
        const label = it.linkTargetId
          ? `${safe(it.text)} 🔗`
          : safe(it.text);
        lines.push(
          `${indent}${alias(from)}${arrowMermaid(it)}${alias(to)}: ${label || "(無題)"}`
        );
        order.push(it.id);
        if (it.note) {
          lines.push(`${indent}Note over ${alias(to)}: ${safe(it.note)}`);
        }
      } else {
        emitBlock(it, indent);
      }
    }
  };

  const emitBlock = (block: Block, indent: string) => {
    const kw = block.blockKind;
    block.branches.forEach((branch, i) => {
      if (i === 0) {
        lines.push(`${indent}${kw} ${safe(branch.label)}`);
      } else {
        const word = branchWord(block);
        lines.push(`${indent}${word} ${safe(branch.label)}`);
      }
      emit(branch.items, indent + "  ");
    });
    lines.push(`${indent}end`);
  };

  emit(d.items, "  ");

  return { text: lines.join("\n"), messageOrder: order };
}

function branchWord(block: Block): string {
  switch (block.blockKind) {
    case "alt":
      return "else";
    case "par":
      return "and";
    case "critical":
      return "option";
    default:
      return "else";
  }
}
