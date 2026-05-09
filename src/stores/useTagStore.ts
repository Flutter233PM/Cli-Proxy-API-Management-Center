import { create } from 'zustand';

const STORAGE_KEY = 'cpa-manager-auth-tags';

type TagStore = {
  tags: Record<string, string[]>;
  setTags: (fileName: string, tags: string[]) => void;
  addTag: (fileName: string, tag: string) => void;
  removeTag: (fileName: string, tag: string) => void;
  getAllTags: () => string[];
};

const loadTags = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
};

const saveTags = (tags: Record<string, string[]>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // ignore
  }
};

export const useTagStore = create<TagStore>((set, get) => ({
  tags: loadTags(),

  setTags: (fileName, tags) => {
    const next = { ...get().tags };
    if (tags.length === 0) {
      delete next[fileName];
    } else {
      next[fileName] = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    }
    saveTags(next);
    set({ tags: next });
  },

  addTag: (fileName, tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const next = { ...get().tags };
    const existing = next[fileName] || [];
    if (existing.includes(trimmed)) return;
    next[fileName] = [...existing, trimmed];
    saveTags(next);
    set({ tags: next });
  },

  removeTag: (fileName, tag) => {
    const next = { ...get().tags };
    if (!next[fileName]) return;
    next[fileName] = next[fileName].filter((t) => t !== tag);
    if (next[fileName].length === 0) {
      delete next[fileName];
    }
    saveTags(next);
    set({ tags: next });
  },

  getAllTags: () => {
    const all = new Set<string>();
    Object.values(get().tags).forEach((ts) => ts.forEach((t) => all.add(t)));
    return [...all].sort();
  },
}));
