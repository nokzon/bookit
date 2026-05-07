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
        description
        rating
        users_count
        cached_image
        contributions {
          author { name }
        }
      }
    }
  }
`;

export type HardcoverBook = {
  editionId: number;
  editionTitle: string | null;
  pages: number | null;
  releaseDate: string | null;
  isbn13: string;
  publisher: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  rating: number | null;
  usersCount: number | null;
  coverUrl: string | null;
  authors: string[];
};

export type LookupResult =
  | { ok: true; book: HardcoverBook }
  | { ok: false; reason: "not-found" | "api-error"; message?: string };

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
    description: string | null;
    rating: number | null;
    users_count: number | null;
    cached_image: { url?: string } | null;
    contributions: Array<{ author: { name: string } | null }>;
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

  return {
    editionId: edition.id,
    editionTitle: edition.title,
    pages: edition.pages,
    releaseDate: edition.release_date,
    isbn13: edition.isbn_13,
    publisher: edition.publisher?.name ?? null,
    title: book?.title ?? edition.title ?? null,
    subtitle: book?.subtitle ?? null,
    description: book?.description ?? null,
    rating: book?.rating ?? null,
    usersCount: book?.users_count ?? null,
    coverUrl: book?.cached_image?.url ?? null,
    authors,
  };
}
