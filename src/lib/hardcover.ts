import "server-only";

const HARDCOVER_ENDPOINT = "https://api.hardcover.app/v1/graphql";

// Hardcover's official typesense-backed search endpoint. The free-text /books
// query with _ilike is restricted on the public API tier (403), so we use this
// instead.
const SEARCH_QUERY = `
  query SearchBooks($q: String!) {
    search(query: $q, query_type: "books", per_page: 24, page: 1) {
      results
    }
  }
`;

const BOOK_BY_ISBN_QUERY = `
  query BookByIsbn($isbn: String!) {
    editions(where: { isbn_13: { _eq: $isbn } }, limit: 1) {
      id
      title
      pages
      release_date
      isbn_13
      publisher { name }
      book {
        title
        subtitle
        slug
        description
        rating
        users_count
        cached_image
        cached_tags
        contributions {
          author { name }
        }
        user_books(
          where: { review_raw: { _is_null: false, _neq: "" } }
          order_by: [
            { likes_count: desc_nulls_last }
            { rating: desc_nulls_last }
          ]
          limit: 5
        ) {
          rating
          review_raw
          user {
            username
            image { url }
          }
        }
      }
    }
  }
`;

const MAX_TAGS_PER_CATEGORY = 6;

type CachedTag = { tag: string; count?: number };
type CachedTagsByCategory = Record<string, CachedTag[]>;

function pickTopTags(tags: CachedTag[] | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return [...tags]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, MAX_TAGS_PER_CATEGORY)
    .map((t) => t.tag)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

export type HardcoverReview = {
  rating: number | null;
  text: string;
  username: string;
  avatarUrl: string | null;
};

export type HardcoverBook = {
  editionId: number;
  editionTitle: string | null;
  pages: number | null;
  releaseDate: string | null;
  isbn13: string;
  publisher: string | null;
  title: string | null;
  subtitle: string | null;
  slug: string | null;
  description: string | null;
  rating: number | null;
  usersCount: number | null;
  coverUrl: string | null;
  authors: string[];
  genres: string[];
  themes: string[];
  reviews: HardcoverReview[];
};

export type LookupResult =
  | { ok: true; book: HardcoverBook }
  | { ok: false; reason: "not-found" | "api-error"; message?: string };

export type HardcoverSearchHit = {
  bookId: number;
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn13: string;
  rating: number | null;
  usersCount: number | null;
};

export type SearchResult =
  | { ok: true; hits: HardcoverSearchHit[] }
  | { ok: false; reason: "api-error"; message?: string };

type UserBookRaw = {
  rating: number | null;
  review_raw: string | null;
  user: {
    username: string | null;
    image: { url: string | null } | null;
  } | null;
};

// Hardcover's `search.results` is Typesense JSON. Each hit's `document` shape
// can vary; we read fields defensively.
type SearchHitDocument = {
  id?: number | string;
  title?: string | null;
  image?: { url?: string | null } | null;
  rating?: number | null;
  users_count?: number | null;
  author_names?: string[];
  contributions?: Array<{ author?: { name?: string | null } | null }>;
  isbns?: Array<string | null>;
};

type SearchResultsJson = {
  hits?: Array<{ document?: SearchHitDocument | null } | null>;
};

type EditionRaw = {
  id: number;
  title: string | null;
  pages: number | null;
  release_date: string | null;
  isbn_13: string;
  publisher: { name: string } | null;
  book: {
    title: string | null;
    subtitle: string | null;
    slug: string | null;
    description: string | null;
    rating: number | null;
    users_count: number | null;
    cached_image: { url?: string } | null;
    cached_tags: CachedTagsByCategory | null;
    contributions: Array<{ author: { name: string } | null }>;
    user_books: UserBookRaw[];
  } | null;
};

function authHeader(): string {
  const token = process.env.HARDCOVER_API_TOKEN;
  if (!token) {
    throw new Error("HARDCOVER_API_TOKEN is not set");
  }
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

export async function lookupBookByIsbn(isbn13: string): Promise<LookupResult> {
  let response: Response;
  try {
    response = await fetch(HARDCOVER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        query: BOOK_BY_ISBN_QUERY,
        variables: { isbn: isbn13 },
      }),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: "api-error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "api-error",
      message: `Hardcover returned HTTP ${response.status}`,
    };
  }

  const payload = (await response.json()) as {
    data?: { editions?: EditionRaw[] };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    return {
      ok: false,
      reason: "api-error",
      message: payload.errors.map((e) => e.message).join("; "),
    };
  }

  const edition = payload.data?.editions?.[0];
  if (!edition) {
    return { ok: false, reason: "not-found" };
  }

  return { ok: true, book: mapEdition(edition) };
}

function mapEdition(edition: EditionRaw): HardcoverBook {
  const book = edition.book;
  const authors = (book?.contributions ?? [])
    .map((c) => c.author?.name)
    .filter((n): n is string => Boolean(n));

  const tagsByCategory = book?.cached_tags ?? {};
  const genres = pickTopTags(tagsByCategory.Genre);
  // Hardcover's "Mood" category corresponds to what the Figma calls "Themes"
  // (sad / dark / emotional / challenging / reflective).
  const themes = pickTopTags(tagsByCategory.Mood);

  const reviews: HardcoverReview[] = (book?.user_books ?? [])
    .map((ub) => ({
      rating: ub.rating,
      text: (ub.review_raw ?? "").trim(),
      username: ub.user?.username ?? "anonymous",
      avatarUrl: ub.user?.image?.url ?? null,
    }))
    .filter((r) => r.text.length > 0);

  return {
    editionId: edition.id,
    editionTitle: edition.title,
    pages: edition.pages,
    releaseDate: edition.release_date,
    isbn13: edition.isbn_13,
    publisher: edition.publisher?.name ?? null,
    title: book?.title ?? edition.title ?? null,
    subtitle: book?.subtitle ?? null,
    slug: book?.slug ?? null,
    description: book?.description ?? null,
    rating: book?.rating ?? null,
    usersCount: book?.users_count ?? null,
    coverUrl: book?.cached_image?.url ?? null,
    authors,
    genres,
    themes,
    reviews,
  };
}

export async function searchBooks(query: string): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, hits: [] };

  // If the query is a 13-digit number, treat as an ISBN-13 lookup and surface
  // it as a single-hit list. Hardcover's typesense search isn't reliable for
  // ISBNs, and we have a direct lookup path already.
  const cleaned = trimmed.replace(/[\s-]/g, "");
  if (/^\d{13}$/.test(cleaned)) {
    const result = await lookupBookByIsbn(cleaned);
    if (!result.ok) {
      if (result.reason === "not-found") return { ok: true, hits: [] };
      return { ok: false, reason: "api-error", message: result.message };
    }
    const b = result.book;
    return {
      ok: true,
      hits: [
        {
          bookId: b.editionId,
          title: b.title ?? b.editionTitle ?? cleaned,
          authors: b.authors,
          coverUrl: b.coverUrl,
          isbn13: b.isbn13,
          rating: b.rating,
          usersCount: b.usersCount,
        },
      ],
    };
  }

  let response: Response;
  try {
    response = await fetch(HARDCOVER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { q: trimmed },
      }),
      cache: "no-store",
    });
  } catch (err) {
    return {
      ok: false,
      reason: "api-error",
      message: err instanceof Error ? err.message : "Network error",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "api-error",
      message: `Hardcover returned HTTP ${response.status}`,
    };
  }

  const payload = (await response.json()) as {
    data?: { search?: { results?: SearchResultsJson | string | null } | null };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    return {
      ok: false,
      reason: "api-error",
      message: payload.errors.map((e) => e.message).join("; "),
    };
  }

  // `results` is jsonb — usually returned as an object, but be defensive in
  // case the API hands back a JSON string.
  const raw = payload.data?.search?.results;
  const results: SearchResultsJson | null =
    typeof raw === "string" ? safeParse(raw) : (raw ?? null);

  const hits: HardcoverSearchHit[] = [];
  for (const hit of results?.hits ?? []) {
    const doc = hit?.document;
    if (!doc || !doc.title) continue;
    const bookId = typeof doc.id === "string" ? Number(doc.id) : doc.id;
    if (!Number.isFinite(bookId)) continue;
    const isbn13 = pickIsbn13(doc.isbns);
    if (!isbn13) continue;
    hits.push({
      bookId: bookId as number,
      title: doc.title,
      authors: extractAuthors(doc),
      coverUrl: doc.image?.url ?? null,
      isbn13,
      rating: doc.rating ?? null,
      usersCount: doc.users_count ?? null,
    });
  }

  return { ok: true, hits };
}

function safeParse(s: string): SearchResultsJson | null {
  try {
    return JSON.parse(s) as SearchResultsJson;
  } catch {
    return null;
  }
}

function pickIsbn13(isbns: Array<string | null> | undefined): string | null {
  if (!Array.isArray(isbns)) return null;
  for (const candidate of isbns) {
    if (typeof candidate !== "string") continue;
    const cleaned = candidate.replace(/[\s-]/g, "");
    if (/^\d{13}$/.test(cleaned)) return cleaned;
  }
  return null;
}

function extractAuthors(doc: SearchHitDocument): string[] {
  if (Array.isArray(doc.author_names) && doc.author_names.length > 0) {
    return doc.author_names.filter(
      (n): n is string => typeof n === "string" && n.length > 0,
    );
  }
  return (doc.contributions ?? [])
    .map((c) => c?.author?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}
