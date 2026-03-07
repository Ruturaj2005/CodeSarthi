import type { Repository } from "./types";

const KEY = "codesarthi_repo";

export const repoStore = {
  save(repo: Repository) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(repo));
    } catch {
      // quota exceeded – silently ignore
    }
  },
  load(): Repository | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Repository) : null;
    } catch {
      return null;
    }
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  },
};
