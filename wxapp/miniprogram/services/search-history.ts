const SEARCH_HISTORY_KEY = 'farm_search_history';
const MAX_SEARCH_HISTORY = 10;

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function loadSearchHistory(): string[] {
  try {
    const raw = wx.getStorageSync(SEARCH_HISTORY_KEY);
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => (typeof item === 'string' ? normalizeKeyword(item) : ''))
      .filter(Boolean)
      .slice(0, MAX_SEARCH_HISTORY);
  } catch {
    return [];
  }
}

function persistSearchHistory(items: string[]) {
  wx.setStorageSync(SEARCH_HISTORY_KEY, items.slice(0, MAX_SEARCH_HISTORY));
}

export function addSearchHistory(keyword: string): string[] {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) {
    return loadSearchHistory();
  }

  const current = loadSearchHistory().filter((item) => item !== normalized);
  const next = [normalized, ...current].slice(0, MAX_SEARCH_HISTORY);
  persistSearchHistory(next);
  return next;
}

export function removeSearchHistory(keyword: string): string[] {
  const normalized = normalizeKeyword(keyword);
  const next = loadSearchHistory().filter((item) => item !== normalized);
  persistSearchHistory(next);
  return next;
}

export function clearSearchHistory(): string[] {
  persistSearchHistory([]);
  return [];
}
