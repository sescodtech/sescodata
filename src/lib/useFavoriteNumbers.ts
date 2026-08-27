import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shb_favorite_numbers';

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Favorite/saved numbers, persisted on-device via localStorage. There's no
 * beneficiaries API on the backend yet, so this is intentionally scoped to
 * "this browser" rather than pretending to sync across devices — still a
 * real, working feature, just not server-backed. Recent numbers themselves
 * come from real transaction history; this only tracks which ones a user
 * has pinned.
 */
export function useFavoriteNumbers() {
  const [favorites, setFavorites] = useState<string[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleFavorite = useCallback((number: string) => {
    setFavorites((prev) => {
      const next = prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable — favorite just won't persist */ }
      return next;
    });
  }, []);

  const isFavorite = useCallback((number: string) => favorites.includes(number), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
