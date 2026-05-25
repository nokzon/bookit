import "server-only";

const HARDCOVER_ENDPOINT = "https://api.hardcover.app/v1/graphql";

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

type UserBookRaw = {
  rating: number | null;
  review_raw: string | null;
  user: {
    username: string | null;
    image: { url: string | null } | null;
  } | null;
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
