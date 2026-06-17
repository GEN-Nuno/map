import { uid } from "./id";
import {
  ArrowKind,
  Block,
  BlockKind,
  Branch,
  BLOCK_KINDS,
  Diagram,
  Item,
  Layer,
  Message,
  Participant,
  ParticipantKind,
  Shelf,
} from "./types";

/* ===================== 図の作成 ===================== */

export function createDiagram(
  layer: Layer,
  title: string,
  parentId?: string
): Diagram {
  return {
    id: uid(layer),
    layer,
    title: title || `新しい${layer}図`,
    parentId,
    participants: [],
    items: [],
  };
}

/* ===================== 参加者 (縦線) ===================== */

export function addParticipant(
  d: Diagram,
  name: string,
  kind: ParticipantKind
): Participant {
  const p: Participant = { id: uid("p"), name: name || "新規", kind };
  d.participants.push(p);
  return p;
}

export function removeParticipant(d: Diagram, pid: string): void {
  d.participants = d.participants.filter((p) => p.id !== pid);
  // 参照していたメッセージは残すが from/to が無効になる -> 描画側で無視/警告
}

export function moveParticipant(d: Diagram, pid: string, dir: -1 | 1): void {
  const i = d.participants.findIndex((p) => p.id === pid);
  const j = i + dir;
  if (i === -1 || j < 0 || j >= d.participants.length) {
    return;
  }
  const arr = d.participants;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

/* ===================== items ツリー操作 ===================== */

/**
 * items ツリー内の「リスト」を path で特定して返す。
 * path = [] はトップレベル items。
 * path = [blockId, branchId, blockId, branchId, ...] と続く。
 */
export function resolveList(d: Diagram, path: string[]): Item[] | undefined {
  let list: Item[] = d.items;
  for (let k = 0; k < path.length; k += 2) {
    const blockId = path[k];
    const branchId = path[k + 1];
    const block = list.find(
      (it): it is Block => it.kind === "block" && it.id === blockId
    );
    if (!block) {
      return undefined;
    }
    const branch = block.branches.find((b) => b.id === branchId);
    if (!branch) {
      return undefined;
    }
    list = branch.items;
  }
  return list;
}

export function makeMessage(
  fromId: string,
  toId: string,
  text: string,
  arrow: ArrowKind = "sync"
): Message {
  return { id: uid("m"), kind: "message", fromId, toId, text, arrow };
}

export function makeBlock(blockKind: BlockKind): Block {
  const def = BLOCK_KINDS.find((b) => b.kind === blockKind)!;
  const branches: Branch[] = [
    { id: uid("br"), label: defaultBranchLabel(blockKind, 0), items: [] },
  ];
  if (def.multiBranch) {
    branches.push({
      id: uid("br"),
      label: defaultBranchLabel(blockKind, 1),
      items: [],
    });
  }
  return { id: uid("b"), kind: "block", blockKind, branches };
}

function defaultBranchLabel(kind: BlockKind, index: number): string {
  switch (kind) {
    case "alt":
      return index === 0 ? "成功" : "失敗";
    case "par":
      return index === 0 ? "処理A" : "処理B";
    case "critical":
      return index === 0 ? "接続確立" : "ネットワーク断";
    case "opt":
      return "任意";
    case "loop":
      return "繰り返し";
    case "break":
      return "中断条件";
    default:
      return "";
  }
}

/** path で指定したリストの index 位置に item を挿入 (挟み込み)。index 省略で末尾。 */
export function insertItem(
  d: Diagram,
  path: string[],
  item: Item,
  index?: number
): boolean {
  const list = resolveList(d, path);
  if (!list) {
    return false;
  }
  const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
  list.splice(at, 0, item);
  return true;
}

/** ツリー全体から item を id で探し、その親リストと index を返す。 */
export function locateItem(
  d: Diagram,
  itemId: string
): { list: Item[]; index: number } | undefined {
  let found: { list: Item[]; index: number } | undefined;
  const walk = (list: Item[]) => {
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (it.id === itemId) {
        found = { list, index: i };
        return;
      }
      if (it.kind === "block") {
        for (const b of it.branches) {
          walk(b.items);
          if (found) {
            return;
          }
        }
      }
    }
  };
  walk(d.items);
  return found;
}

export function removeItem(d: Diagram, itemId: string): void {
  const loc = locateItem(d, itemId);
  if (loc) {
    loc.list.splice(loc.index, 1);
  }
}

/** 同じ親リスト内で item を上下に移動 (挟み込み順の調整)。 */
export function moveItem(d: Diagram, itemId: string, dir: -1 | 1): void {
  const loc = locateItem(d, itemId);
  if (!loc) {
    return;
  }
  const j = loc.index + dir;
  if (j < 0 || j >= loc.list.length) {
    return;
  }
  const arr = loc.list;
  [arr[loc.index], arr[j]] = [arr[j], arr[loc.index]];
}

/** item (またはその子孫) が targetId を含むか。 */
export function containsItem(item: Item, targetId: string): boolean {
  if (item.id === targetId) {
    return true;
  }
  if (item.kind === "block") {
    return item.branches.some((b) =>
      b.items.some((it) => containsItem(it, targetId))
    );
  }
  return false;
}

/**
 * ドラッグ&ドロップ用: dragId の item を targetId の item の直前/直後へ移動する。
 * 別のリスト (block の分岐内など) へまたいで移動できる。
 * ブロックを自分自身の子孫へは移動できない (無限ネスト防止)。
 * @returns 実際に移動したら true。
 */
export function moveItemRelative(
  d: Diagram,
  dragId: string,
  targetId: string,
  before: boolean
): boolean {
  if (dragId === targetId) {
    return false;
  }
  const dragLoc = locateItem(d, dragId);
  if (!dragLoc) {
    return false;
  }
  const dragItem = dragLoc.list[dragLoc.index];
  if (dragItem.kind === "block" && containsItem(dragItem, targetId)) {
    return false;
  }
  // 取り外す
  dragLoc.list.splice(dragLoc.index, 1);
  // 取り外した後に改めて挿入先を特定 (index がずれるため)
  const targetLoc = locateItem(d, targetId);
  if (!targetLoc) {
    // 失敗時は元に戻す
    dragLoc.list.splice(dragLoc.index, 0, dragItem);
    return false;
  }
  const insertAt = before ? targetLoc.index : targetLoc.index + 1;
  targetLoc.list.splice(insertAt, 0, dragItem);
  return true;
}


/** block にブランチ (else/and/option) を追加。 */
export function addBranch(block: Block): Branch {
  const def = BLOCK_KINDS.find((b) => b.kind === block.blockKind);
  const branch: Branch = {
    id: uid("br"),
    label: def?.branchWord ? `${def.branchWord} 条件` : "条件",
    items: [],
  };
  block.branches.push(branch);
  return branch;
}

export function removeBranch(block: Block, branchId: string): void {
  if (block.branches.length > 1) {
    block.branches = block.branches.filter((b) => b.id !== branchId);
  }
}

/** 図を本棚から削除し、子図の parentId を解除する。 */
export function deleteDiagram(shelf: Shelf, id: string): void {
  shelf.diagrams = shelf.diagrams.filter((d) => d.id !== id);
  for (const d of shelf.diagrams) {
    if (d.parentId === id) {
      d.parentId = undefined;
    }
  }
  if (shelf.activeId === id) {
    shelf.activeId = shelf.diagrams[0]?.id;
  }
}
