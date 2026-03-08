import type { Repository } from "./types";

const KEY = "codesarthi_repo";

export const repoStore = {
  /**
   * Persist a repository analysis.
   * 1. Writes immediately to localStorage (instant reads on the same browser).
   * 2. Background-syncs to Amazon DynamoDB via /api/repo (fire-and-forget).
   */
  save(repo: Repository) {
    // ── localStorage (primary, synchronous) ──
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(KEY, JSON.stringify(repo));
      } catch {
        // quota exceeded – silently ignore
      }
    }
    // ── Amazon DynamoDB (background, non-blocking) ──
    fetch("/api/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repo),
    }).catch(() => {
      // DynamoDB unavailable — localStorage is still the source of truth
    });
  },

  /** Load from localStorage (fast, synchronous). */
  load(): Repository | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Repository) : null;
    } catch {
      return null;
    }
  },

  /**
   * Load from Amazon DynamoDB by repo ID.
   * Useful when localStorage has been cleared (e.g. new device / incognito).
   */
  async loadFromCloud(repoId: string): Promise<Repository | null> {
    try {
      const res = await fetch(`/api/repo?id=${encodeURIComponent(repoId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.repo) {
        // Warm the local cache so subsequent load() calls are instant
        try { localStorage.setItem(KEY, JSON.stringify(data.repo)); } catch { }
      }
      return data.repo ?? null;
    } catch {
      return null;
    }
  },

  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  },
};
