import "server-only";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_REVALIDATE_SECONDS = 60 * 60;

type QueryParams = Record<string, string | number | boolean | undefined>;

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_TOKEN);
}

export async function tmdbFetch<T>(
  path: string,
  params: QueryParams = {},
): Promise<T> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    throw new Error("TMDB is not configured. Set TMDB_API_TOKEN in .env.local.");
  }

  const url = new URL(`${TMDB_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`TMDB request to ${path} failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}
