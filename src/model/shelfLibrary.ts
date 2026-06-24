import { Shelf } from "./types";

const LIBRARY_KEY = "seqshelf.library.v1";

type SavedShelfEntry = {
  name: string;
  shelf: Shelf;
  savedAt: string;
};

type ShelfLibrary = {
  version: 1;
  items: SavedShelfEntry[];
};

function isValidShelf(shelf: unknown): shelf is Shelf {
  if (!shelf || typeof shelf !== "object") {
    return false;
  }
  const s = shelf as Partial<Shelf>;
  return s.version === 2 && Array.isArray(s.diagrams);
}

function cloneShelf(shelf: Shelf): Shelf {
  return JSON.parse(JSON.stringify(shelf)) as Shelf;
}

function readLibrary(): ShelfLibrary {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) {
      return { version: 1, items: [] };
    }
    const parsed = JSON.parse(raw) as Partial<ShelfLibrary>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
      return { version: 1, items: [] };
    }
    const items = parsed.items.filter(
      (it): it is SavedShelfEntry =>
        !!it &&
        typeof it.name === "string" &&
        typeof it.savedAt === "string" &&
        isValidShelf(it.shelf)
    );
    return { version: 1, items };
  } catch {
    return { version: 1, items: [] };
  }
}

function writeLibrary(lib: ShelfLibrary): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch {
    // ストレージ不可環境では無視
  }
}

export function listSavedShelves(): { name: string; savedAt: string }[] {
  const lib = readLibrary();
  return [...lib.items]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .map((it) => ({ name: it.name, savedAt: it.savedAt }));
}

export function saveShelfSnapshot(name: string, shelf: Shelf): boolean {
  const normalized = name.trim();
  if (!normalized) {
    return false;
  }
  const lib = readLibrary();
  const now = new Date().toISOString();
  const entry: SavedShelfEntry = {
    name: normalized,
    shelf: cloneShelf(shelf),
    savedAt: now,
  };
  const idx = lib.items.findIndex((it) => it.name === normalized);
  if (idx >= 0) {
    lib.items[idx] = entry;
  } else {
    lib.items.push(entry);
  }
  writeLibrary(lib);
  return true;
}

export function loadShelfSnapshot(name: string): Shelf | undefined {
  const normalized = name.trim();
  if (!normalized) {
    return undefined;
  }
  const lib = readLibrary();
  const entry = lib.items.find((it) => it.name === normalized);
  return entry ? cloneShelf(entry.shelf) : undefined;
}

export function deleteShelfSnapshot(name: string): boolean {
  const normalized = name.trim();
  if (!normalized) {
    return false;
  }
  const lib = readLibrary();
  const before = lib.items.length;
  lib.items = lib.items.filter((it) => it.name !== normalized);
  if (lib.items.length === before) {
    return false;
  }
  writeLibrary(lib);
  return true;
}
