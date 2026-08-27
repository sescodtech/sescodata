// Lightweight client-side "memory" for a faster repeat-purchase UX.
// No backend endpoint exists for this (and none is needed) — it's pure
// convenience state scoped to this browser, not part of the purchase flow's
// business logic. Safe to add without touching any API contract.

const RECENTS_KEY = 'shb_recent_numbers';
const FAVORITES_KEY = 'shb_favorite_plans';
const MAX_RECENTS = 5;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore quota errors — this is a non-critical convenience feature
  }
}

export const recentNumbers = {
  get: (): string[] => readList(RECENTS_KEY),
  add: (phone: string) => {
    const clean = phone.replace(/\s/g, '');
    if (!clean) return;
    const existing = readList(RECENTS_KEY).filter((n) => n !== clean);
    writeList(RECENTS_KEY, [clean, ...existing].slice(0, MAX_RECENTS));
  },
};

export const favoritePlans = {
  get: (): string[] => readList(FAVORITES_KEY),
  isFavorite: (planId: string) => readList(FAVORITES_KEY).includes(planId),
  toggle: (planId: string) => {
    const current = readList(FAVORITES_KEY);
    const next = current.includes(planId) ? current.filter((id) => id !== planId) : [planId, ...current];
    writeList(FAVORITES_KEY, next);
    return next;
  },
};
