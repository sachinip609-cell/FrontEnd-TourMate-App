import { AppConfig } from '../constants/AppConfig';

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source?: string;
  imageUrl?: string;
}

const API_KEY = 'pub_15677d78995047869939ae3828f5c5a6';
const BASE = 'https://newsdata.io/api/1/news';

// simple fetch with timeout using Promise.race to avoid relying on AbortController
async function fetchWithTimeout(input: RequestInfo, ms: number) {
  const timeout = new Promise((_, rej) =>
    setTimeout(() => rej(new Error('timeout')), ms),
  );
  return Promise.race([fetch(input), timeout]) as Promise<Response>;
}

export const fetchNewsPage = async (
  page = 1,
  pageSize = 10,
): Promise<{ articles: NewsArticle[]; nextPage: number | null }> => {
  try {
    const url = `${BASE}?apikey=${API_KEY}&language=en&page=${page}`;
    const res = await fetchWithTimeout(url, AppConfig.api.timeoutMs);
    const json = await res.json();

    // If API returned an error (common when `page` is not supported), try without `page` param
    if (json && json.status === 'error') {
      // try fallback without page
      const fallbackUrl = `${BASE}?apikey=${API_KEY}&language=en`;
      const fres = await fetchWithTimeout(fallbackUrl, AppConfig.api.timeoutMs);
      const fjson = await fres.json();
      if (fjson && fjson.status === 'error') {
        throw new Error(fjson.results?.message || JSON.stringify(fjson));
      }

      const rawF =
        (fjson && (fjson.results || fjson.data || fjson.articles)) || [];
      const articlesF = (Array.isArray(rawF) ? rawF : []).map(
        (r: any, idx: number) => ({
          id: String(
            r && (r.guid || r.link || r.title)
              ? r.guid || r.link || r.title
              : `f-${idx}`,
          ),
          title: (r && (r.title || r.headline)) || 'Untitled',
          description: r && (r.description || r.summary),
          link: r && (r.link || r.url),
          pubDate: (r && (r.pubDate || r.pubDate)) || undefined,
          source: (r && (r.source_id || r.source)) || undefined,
          imageUrl: normalizeImage(r),
        }),
      ) as NewsArticle[];

      const nextPageF = articlesF.length > 0 ? 2 : null;
      return { articles: articlesF, nextPage: nextPageF };
    }

    // defensive parsing: results may be in `results` or `data` or `articles`
    const raw = (json && (json.results || json.data || json.articles)) || [];

    const articles = (Array.isArray(raw) ? raw : []).map(
      (r: any, idx: number) => ({
        id: String(
          r && (r.guid || r.link || r.title)
            ? r.guid || r.link || r.title
            : `${page}-${idx}`,
        ),
        title: (r && (r.title || r.headline)) || 'Untitled',
        description: r && (r.description || r.summary),
        link: r && (r.link || r.url),
        pubDate: (r && (r.pubDate || r.pubDate)) || undefined,
        source: (r && (r.source_id || r.source)) || undefined,
        imageUrl: normalizeImage(r),
      }),
    ) as NewsArticle[];

    const nextPage = articles.length > 0 ? page + 1 : null;
    return { articles, nextPage };
  } catch (err: any) {
    throw new Error(err?.message ?? String(err));
  }
};

// Fetch first page and return first article id (or null)
export const fetchLatestFirstId = async (): Promise<string | null> => {
  try {
    const { articles } = await fetchNewsPage(1);
    return articles.length > 0 ? articles[0].id : null;
  } catch (e) {
    return null;
  }
};

// Return raw JSON from the upstream API for debugging
export const fetchNewsRaw = async (page = 1): Promise<any> => {
  const url = `${BASE}?apikey=${API_KEY}&language=en&page=${page}`;
  const res = await fetchWithTimeout(url, AppConfig.api.timeoutMs);
  try {
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
};

function normalizeImage(r: any): string | undefined {
  if (!r) return undefined;
  const candidates = [
    r.image_url,
    r.image,
    r.thumbnail,
    r.media && r.media[0] && r.media[0].url,
    r.enclosure &&
      (r.enclosure.url || r.enclosure.link || r.enclosure.contentUrl),
    r['media:content'] && r['media:content'][0] && r['media:content'][0].url,
    r.enclosure &&
      r.enclosure.thumbnails &&
      r.enclosure.thumbnails[0] &&
      r.enclosure.thumbnails[0].url,
    r.urlToImage,
  ];

  for (const c of candidates) {
    if (!c) continue;
    const s = String(c).trim();
    if (!s) continue;
    // ensure absolute URL
    if (s.startsWith('//')) return 'https:' + s;
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    // some feeds return relative paths — skip those
  }
  return undefined;
}
