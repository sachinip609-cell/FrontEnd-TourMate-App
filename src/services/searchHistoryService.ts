import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@tourmate:search_history';
const MAX_ITEMS = 50;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchHistoryItem {
  /** Unique identifier — usually the Google place_id */
  id: string;
  name: string;
  shortDescription: string;
  /** Human-readable category label e.g. 'Hospital', 'Hotel', 'Destination' */
  category: string;
  latitude: number;
  longitude: number;
  /** The query string the user typed */
  searchQuery: string;
  searchedAt: number; // Unix ms
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatSearchTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const saveSearchHistory = async (
  item: SearchHistoryItem,
): Promise<void> => {
  try {
    const existing = await getSearchHistory();
    // Remove any existing entry for the same place so the new one goes to front
    const filtered = existing.filter(e => e.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical — silently ignore
  }
};

/** Read saved search history, newest first. Returns [] on any error. */
export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchHistoryItem[];
  } catch {
    return [];
  }
};

/** Delete all saved search history. */
export const clearSearchHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silently ignore
  }
};
