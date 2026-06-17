import {
  Diagram,
  Shelf,
  emptyShelf,
  diagramById,
} from "./types";

const STORAGE_KEY = "seqshelf.shelf.v2";

type Listener = () => void;

/**
 * アプリ全体の状態ストア。
 * - shelf を保持し、変更のたびに localStorage へ保存して購読者へ通知。
 * - mutate() でモデルを書き換えると自動で save + emit。
 */
export class Store {
  private _shelf: Shelf;
  private listeners = new Set<Listener>();

  constructor(initial?: Shelf) {
    this._shelf = initial ?? Store.load() ?? emptyShelf();
  }

  get shelf(): Shelf {
    return this._shelf;
  }

  get activeId(): string | undefined {
    return this._shelf.activeId;
  }

  get active(): Diagram | undefined {
    return this._shelf.activeId
      ? diagramById(this._shelf, this._shelf.activeId)
      : undefined;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }

  /** モデルを書き換える。fn 内で this.shelf を直接変更してよい。 */
  mutate(fn: (shelf: Shelf) => void): void {
    fn(this._shelf);
    this.save();
    this.emit();
  }

  setActive(id: string | undefined): void {
    this.mutate((s) => {
      s.activeId = id;
    });
  }

  replaceShelf(shelf: Shelf): void {
    this._shelf = shelf;
    this.save();
    this.emit();
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._shelf));
    } catch {
      // ストレージ不可環境では無視
    }
  }

  static load(): Shelf | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw) as Shelf;
      if (parsed && parsed.version === 2 && Array.isArray(parsed.diagrams)) {
        return parsed;
      }
    } catch {
      // 破損時は無視
    }
    return undefined;
  }

  static clearStorage(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 無視
    }
  }
}
