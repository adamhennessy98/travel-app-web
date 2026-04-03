/**
 * Server-only Unsplash Search API helpers with in-memory caching and
 * deterministic photo selection per seed.
 */

export type PhotoAttribution = {
  photographerName: string;
  photographerUrl: string;
  unsplashPhotoPageUrl: string;
};

export type ResolvedPhoto = {
  url: string;
  thumbUrl: string;
  attribution: PhotoAttribution;
};

type UnsplashSearchResult = {
  results: Array<{
    id: string;
    urls: { regular: string; small: string };
    links: { html: string };
    user: { name: string; links: { html: string } };
  }>;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const searchCache = new Map<
  string,
  { results: UnsplashSearchResult["results"]; fetchedAt: number }
>();

export function buildPhotoSearchQuery(text: string): string {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  const base = words.length > 0 ? words.join(" ") : "travel";
  return `${base} travel landscape`;
}

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function normalizeCacheKey(apiQuery: string): string {
  return apiQuery.trim().toLowerCase();
}

async function fetchSearchResults(apiQuery: string): Promise<UnsplashSearchResult["results"]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error("UNSPLASH_ACCESS_KEY is not set");
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", apiQuery);
  url.searchParams.set("per_page", "30");
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Unsplash search failed: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as UnsplashSearchResult;
  return data.results ?? [];
}

async function getCachedResults(apiQuery: string): Promise<UnsplashSearchResult["results"]> {
  const cacheKey = normalizeCacheKey(apiQuery);
  const now = Date.now();
  const hit = searchCache.get(cacheKey);
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) {
    return hit.results;
  }

  let results = await fetchSearchResults(apiQuery);
  if (results.length === 0 && cacheKey !== "travel landscape") {
    results = await fetchSearchResults("travel landscape");
  }

  searchCache.set(cacheKey, { results, fetchedAt: now });
  return results;
}

function mapToResolved(
  hit: UnsplashSearchResult["results"][number],
): ResolvedPhoto {
  return {
    url: hit.urls.regular,
    thumbUrl: hit.urls.small,
    attribution: {
      photographerName: hit.user.name,
      photographerUrl: hit.user.links.html,
      unsplashPhotoPageUrl: hit.links.html,
    },
  };
}

/**
 * Returns one photo for a human-readable query and a stable seed (e.g. trip id).
 */
export async function resolvePhoto(
  userQuery: string,
  seed: string,
): Promise<ResolvedPhoto | null> {
  const apiQuery = buildPhotoSearchQuery(userQuery);
  const results = await getCachedResults(apiQuery);
  if (results.length === 0) {
    return null;
  }
  const idx = hashString(seed) % results.length;
  return mapToResolved(results[idx]);
}
