// 「現在の本棚 + 名前付き保存ライブラリ + メタ情報」を 1 つの JSON にまとめて
// 書き出し/読み込みするためのバックアップ I/O。
// アプリ更新・PC 移行・別フォルダ配布をまたいでも、このファイルさえ取っておけば
// 完全に状態を引き継げる。
import { Shelf } from "../model/types";

const BACKUP_KIND = "seqshelf.backup";
const BACKUP_VERSION = 1;
const LIBRARY_KEY = "seqshelf.library.v1";
const CURRENT_KEY = "seqshelf.shelf.v2";

export interface SeqShelfBackup {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  /** 編集中の本棚 (省略可)。 */
  current?: Shelf;
  /** 名前付き保存ライブラリの生 JSON (省略可)。 */
  library?: unknown;
  /** 補足メモ (アプリのバージョン名など)。 */
  note?: string;
}

function isShelf(s: unknown): s is Shelf {
  if (!s || typeof s !== "object") return false;
  const v = s as Partial<Shelf>;
  return v.version === 2 && Array.isArray(v.diagrams);
}

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** localStorage の全 SeqShelf データ + 現在の本棚を 1 つの JSON で書き出す。 */
export function exportFullBackup(current: Shelf, note?: string): void {
  let library: unknown;
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    library = raw ? JSON.parse(raw) : undefined;
  } catch {
    library = undefined;
  }
  const backup: SeqShelfBackup = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    current,
    library,
    note,
  };
  const fname = `seqshelf-backup-${new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .slice(0, 19)}.json`;
  download(fname, JSON.stringify(backup, null, 2));
}

/** ファイルピッカーでバックアップ JSON を選択させて読み込む。 */
export function importFullBackup(): Promise<SeqShelfBackup | undefined> {
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
          const parsed = JSON.parse(String(reader.result));
          if (
            !parsed ||
            parsed.kind !== BACKUP_KIND ||
            parsed.version !== BACKUP_VERSION
          ) {
            // 旧来の単独 Shelf JSON もそのまま current として受け入れる
            if (isShelf(parsed)) {
              resolve({
                kind: BACKUP_KIND,
                version: BACKUP_VERSION,
                exportedAt: new Date().toISOString(),
                current: parsed,
              });
              return;
            }
            alert("このファイルは SeqShelf のバックアップ形式ではありません。");
            resolve(undefined);
            return;
          }
          resolve(parsed as SeqShelfBackup);
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

/** バックアップ JSON を localStorage と現在の本棚へ適用する。 */
export function applyFullBackup(
  backup: SeqShelfBackup,
  setCurrent: (shelf: Shelf) => void
): { appliedCurrent: boolean; appliedLibrary: boolean } {
  let appliedLibrary = false;
  if (backup.library !== undefined && backup.library !== null) {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(backup.library));
      appliedLibrary = true;
    } catch {
      // 容量制限などで失敗してもクラッシュさせない
    }
  }
  let appliedCurrent = false;
  if (backup.current && isShelf(backup.current)) {
    setCurrent(backup.current);
    appliedCurrent = true;
  }
  return { appliedCurrent, appliedLibrary };
}

/** 起動時の判定用: localStorage に SeqShelf データが 1 件もあるか。 */
export function hasAnyStoredData(): boolean {
  try {
    return (
      !!localStorage.getItem(CURRENT_KEY) ||
      !!localStorage.getItem(LIBRARY_KEY)
    );
  } catch {
    return false;
  }
}

/** 保存場所の人間向け要約 (情報ダイアログ用)。 */
export function describeStorage(): {
  origin: string;
  currentKey: string;
  libraryKey: string;
  currentBytes: number;
  libraryBytes: number;
} {
  const cur = safeGet(CURRENT_KEY);
  const lib = safeGet(LIBRARY_KEY);
  return {
    origin: location.protocol === "file:" ? location.href : location.origin,
    currentKey: CURRENT_KEY,
    libraryKey: LIBRARY_KEY,
    currentBytes: cur?.length ?? 0,
    libraryBytes: lib?.length ?? 0,
  };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
