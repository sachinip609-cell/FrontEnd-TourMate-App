import { AppConfig } from '../constants/AppConfig';
import { getToken } from './authService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlaceCategory =
  | 'all'
  | 'hotels'
  | 'restaurants'
  | 'villas'
  | 'hospitals';

export interface GooglePlace {
  id: string;
  name: string;
  shortDescription: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingsTotal: number | null;
  priceLevel: number | null;
  openNow: boolean | null;
  types: string[];
  photoRef: string | null;
  /** Resolved category from the fetch call. */
  category: PlaceCategory;
}

// ─── Category → Google type mapping ─────────────────────────────────────────

type GooglePlaceParams = { type: string; keyword?: string };

const REQUEST_CACHE_TTL_MS = 30_000;
const requestCache = new Map<
  string,
  { expiresAt: number; data: GooglePlace[] }
>();
const inFlightRequests = new Map<string, Promise<GooglePlace[]>>();

const CATEGORY_MAP: Record<Exclude<PlaceCategory, 'all'>, GooglePlaceParams> = {
  hotels: { type: 'lodging' },
  restaurants: { type: 'restaurant' },
  villas: { type: 'lodging', keyword: 'villa' },
  hospitals: { type: 'hospital' },
};

// ─── Infer category from Google place types ───────────────────────────────────

export function categoryFromTypes(types: string[]): PlaceCategory {
  if (
    types.some(t =>
      [
        'hospital',
        'health',
        'doctor',
        'dentist',
        'pharmacy',
        'physiotherapist',
      ].includes(t),
    )
  )
    return 'hospitals';
  if (types.includes('lodging')) return 'hotels';
  if (
    types.some(t =>
      [
        'restaurant',
        'food',
        'cafe',
        'bakery',
        'meal_takeaway',
        'meal_delivery',
      ].includes(t),
    )
  )
    return 'restaurants';
  return 'all';
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchForCategory(
  baseUrl: string,
  headers: Record<string, string>,
  lat: number,
  lng: number,
  radius: number,
  cat: Exclude<PlaceCategory, 'all'>,
): Promise<GooglePlace[]> {
  const { type, keyword } = CATEGORY_MAP[cat];
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
    type,
    ...(keyword ? { keyword } : {}),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AppConfig.api.timeoutMs,
  );

  try {
    const res = await fetch(`${baseUrl}?${params}`, {
      headers,
      signal: controller.signal,
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message ?? 'Failed to fetch places.');
    return (json.data.places as Omit<GooglePlace, 'category'>[]).map(p => ({
      ...p,
      category: cat,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const fetchAccommodations = async (
  lat: number,
  lng: number,
  category: PlaceCategory,
  radius = 1500,
): Promise<GooglePlace[]> => {
  const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${category}:${radius}`;
  const cached = requestCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const activeRequest = inFlightRequests.get(cacheKey);
  if (activeRequest) {
    return activeRequest;
  }

  const token = await getToken();
  if (!token) throw new Error('Not authenticated.');

  const baseUrl = `${AppConfig.api.baseUrl}/places/google-nearby`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const requestPromise = (async () => {
    if (category === 'all') {
      // Parallel fetch for all sub-categories
      const [hotels, restaurants, villas] = await Promise.all([
        fetchForCategory(baseUrl, headers, lat, lng, radius, 'hotels'),
        fetchForCategory(baseUrl, headers, lat, lng, radius, 'restaurants'),
        fetchForCategory(baseUrl, headers, lat, lng, radius, 'villas'),
      ]);

      // De-duplicate by place id; first-seen category wins
      const seen = new Set<string>();
      return [...hotels, ...restaurants, ...villas].filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }

    return fetchForCategory(baseUrl, headers, lat, lng, radius, category);
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  try {
    const data = await requestPromise;
    requestCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + REQUEST_CACHE_TTL_MS,
    });
    return data;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
};

/**
 * Free-text place search via the backend Google Places Text Search proxy.
 * Returns up to 10 results. Category is inferred from each place's type array.
 */
export const searchPlaces = async (
  query: string,
  lat?: number,
  lng?: number,
): Promise<GooglePlace[]> => {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated.');

  const params = new URLSearchParams({ query: query.trim() });
  if (lat !== undefined && lng !== undefined) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    AppConfig.api.timeoutMs,
  );

  try {
    const res = await fetch(
      `${AppConfig.api.baseUrl}/places/google-search?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message ?? 'Search failed.');
    return (json.data.places as Omit<GooglePlace, 'category'>[]).map(p => ({
      ...p,
      category: categoryFromTypes(p.types),
    }));
  } finally {
    clearTimeout(timeoutId);
  }
};
