export const RECENT_MODELS_KEY = 'tm-playground.recentModels';
export const MAX_RECENT_MODELS = 5;

/** The two Storage methods used, so tests can pass a plain object. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Reads the recent model URLs. Any failure (no storage, blocked storage,
 * corrupt JSON) yields an empty list; recents are a convenience, not state.
 */
export function loadRecentModels(storage: StorageLike | undefined): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_MODELS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT_MODELS);
  } catch {
    return [];
  }
}

/**
 * Puts `url` at the front of the list, removing duplicates and trimming to the
 * maximum. Returns the new list; persisting is best-effort.
 */
export function saveRecentModel(storage: StorageLike | undefined, url: string): string[] {
  const next = [url, ...loadRecentModels(storage).filter((u) => u !== url)].slice(0, MAX_RECENT_MODELS);
  if (storage) {
    try {
      storage.setItem(RECENT_MODELS_KEY, JSON.stringify(next));
    } catch {
      // Private mode or quota: keep the in-memory list and move on.
    }
  }
  return next;
}
