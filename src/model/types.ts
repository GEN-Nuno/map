/**
 * SeqShelf データモデル (Web アプリ版)。
 *
 * 本棚 (Shelf) = 全シーケンス図の集合。
 * 本 (Diagram) = 1 つのシーケンス図。L1 運用 / L2 システム / L3 クラス / L4 関数 の階層を持つ。
 *
 * 図は「参加者 (縦線)」と「項目の並び (items)」で構成される。
 * items はメッセージ (横線) と 制御ブロック (alt/opt/...) の順序付きツリー。
 * これにより GUI から:
 *   - 縦線を追加 = participants に 1 件追加
 *   - 横線を追加 = items に message を 1 件追加
 *   - 挟み込み   = items の任意の index に挿入
 *   - 条件追加   = items に block を挿入し、中に message を入れ子
 * が自然に表現できる。
 */

export type Layer = "L1" | "L2" | "L3" | "L4";

export const LAYERS: Layer[] = ["L1", "L2", "L3", "L4"];

export const LAYER_LABELS: Record<Layer, string> = {
  L1: "運用フロー",
  L2: "システム構成",
  L3: "クラス間",
  L4: "関数内部",
};

export const LAYER_HINTS: Record<Layer, string> = {
  L1: "アクター・外部システム視点の業務フロー",
  L2: "プロセス・DB・API・キュー視点の構成",
  L3: "クラス・モジュール間のメソッド呼び出し",
  L4: "関数内部の処理・分岐・例外・タイムアウト",
};

/** 参加者 (縦線)。kind で見た目と意味を分ける。 */
export type ParticipantKind =
  | "actor" // 人
  | "system" // 外部システム
  | "process" // プロセス/サービス
  | "database" // DB
  | "queue" // キュー
  | "class" // クラス
  | "function"; // 関数/自身

export const PARTICIPANT_KINDS: { kind: ParticipantKind; label: string }[] = [
  { kind: "actor", label: "アクター (人)" },
  { kind: "system", label: "外部システム" },
  { kind: "process", label: "プロセス/サービス" },
  { kind: "database", label: "DB" },
  { kind: "queue", label: "キュー" },
  { kind: "class", label: "クラス" },
  { kind: "function", label: "関数/自身" },
];

export interface Participant {
  id: string;
  name: string;
  kind: ParticipantKind;
}

/** メッセージ (横線) の矢印種別。Mermaid の矢印に対応。 */
export type ArrowKind =
  | "sync" // ->>  同期呼び出し
  | "async" // -)   非同期
  | "reply" // -->> 戻り
  | "lost"; // --x  消失(タイムアウト/失敗)

export const ARROW_KINDS: { kind: ArrowKind; label: string; mermaid: string }[] =
  [
    { kind: "sync", label: "同期 →", mermaid: "->>" },
    { kind: "reply", label: "戻り ⇠", mermaid: "-->>" },
    { kind: "async", label: "非同期 ⇢", mermaid: "-)" },
    { kind: "lost", label: "消失/失敗 ×", mermaid: "--x" },
  ];

export interface Message {
  id: string;
  kind: "message";
  fromId: string;
  toId: string;
  text: string;
  arrow: ArrowKind;
  /** この横線の詳細を表す下階層図の id (リンク)。 */
  linkTargetId?: string;
  /** メモ (Note) を併記したい場合。 */
  note?: string;
}

/** 制御ブロック種別。 */
export type BlockKind = "alt" | "opt" | "par" | "loop" | "break" | "critical";

export const BLOCK_KINDS: {
  kind: BlockKind;
  label: string;
  /** 既定で複数ブランチ (else/and/option) を持つか。 */
  multiBranch: boolean;
  branchWord: string; // else / and / option
}[] = [
  { kind: "alt", label: "alt 条件分岐", multiBranch: true, branchWord: "else" },
  { kind: "opt", label: "opt 任意", multiBranch: false, branchWord: "" },
  { kind: "par", label: "par 並列", multiBranch: true, branchWord: "and" },
  { kind: "loop", label: "loop 繰り返し", multiBranch: false, branchWord: "" },
  { kind: "break", label: "break 中断", multiBranch: false, branchWord: "" },
  {
    kind: "critical",
    label: "critical 後始末",
    multiBranch: true,
    branchWord: "option",
  },
];

export interface Branch {
  id: string;
  label: string;
  items: Item[];
}

export interface Block {
  id: string;
  kind: "block";
  blockKind: BlockKind;
  branches: Branch[];
}

export type Item = Message | Block;

export interface Diagram {
  id: string;
  layer: Layer;
  title: string;
  /** 上位図の id。L1 は通常無し。 */
  parentId?: string;
  participants: Participant[];
  items: Item[];
}

export interface Shelf {
  version: 2;
  /** 最後に開いていた図の id。 */
  activeId?: string;
  diagrams: Diagram[];
}

export function emptyShelf(): Shelf {
  return { version: 2, diagrams: [] };
}

/** 図に属する子図 (parentId が一致するもの)。 */
export function childrenOf(shelf: Shelf, id: string): Diagram[] {
  return shelf.diagrams.filter((d) => d.parentId === id);
}

/** 図の親図。 */
export function parentOf(shelf: Shelf, d: Diagram): Diagram | undefined {
  return d.parentId
    ? shelf.diagrams.find((x) => x.id === d.parentId)
    : undefined;
}

export function diagramById(shelf: Shelf, id: string): Diagram | undefined {
  return shelf.diagrams.find((d) => d.id === id);
}

/** items ツリーを深さ優先で平坦化し、メッセージだけを順に返す。 */
export function flattenMessages(items: Item[]): Message[] {
  const out: Message[] = [];
  const walk = (list: Item[]) => {
    for (const it of list) {
      if (it.kind === "message") {
        out.push(it);
      } else {
        for (const b of it.branches) {
          walk(b.items);
        }
      }
    }
  };
  walk(items);
  return out;
}
