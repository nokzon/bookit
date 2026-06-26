import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isValidIsbn13, normalizeIsbn13 } from "@/lib/isbn";
import {
  lookupBookByIsbn,
  searchBooks,
  type HardcoverBook,
  type HardcoverReview,
  type HardcoverSearchHit,
} from "@/lib/hardcover";
import { upsertBook } from "@/lib/db/books";
import { recordRecent } from "@/lib/db/recents";
import { isSaved } from "@/lib/db/saved";
import { ExitButton } from "@/components/ExitButton";
import { SaveButton } from "./save-button";
import { SearchInput } from "./search-input";
import { SummaryText } from "./summary-text";

type SearchParams = Promise<{ isbn?: string; q?: string }>;

const PAGE_BG = "#F9FDF8";
const BUTTON_BG = "#F5F5F5";
const JOST_STACK = "var(--font-jost), system-ui, sans-serif";
const LIVVIC_STACK = "var(--font-livvic), system-ui, sans-serif";
const SF_PRO_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro", "SF Pro Text", system-ui, sans-serif';

const TAG_TEXT_STYLE = {
  textAlign: "center" as const,
  fontFamily: JOST_STACK,
  fontSize: "15.84px",
  fontWeight: 400,
  lineHeight: "21.12px",
  letterSpacing: "0.106px",
};

const TAG_LAYOUT_CLASS =
  "inline-flex items-center justify-center rounded-full";
const TAG_PADDING = { padding: "4.4px 17.6px", gap: "8.448px" };

const SECTION_HEADING_STYLE = {
  overflow: "hidden" as const,
  color: "#000",
  textOverflow: "ellipsis" as const,
  fontFamily: LIVVIC_STACK,
  fontSize: "20px",
  fontWeight: 500,
  lineHeight: "normal",
};

async function lookupAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("q") ?? "").trim();
  if (!raw) redirect("/lookup");
  // Always go through the results-list view so the user explicitly picks a
  // book before we record it as a recent. Direct `?isbn=` links from other
  // pages (scan, saved, etc.) still navigate straight to detail.
  redirect(`/lookup?q=${encodeURIComponent(raw)}`);
}

export default async function LookupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { isbn: rawInput, q: rawQuery } = await searchParams;
  const submitted = rawInput?.trim() ?? "";
  const query = rawQuery?.trim() ?? "";

  // Each variant fetches from the Hardcover API, which is the laggy part. We
  // wrap those in Suspense with a fallback that matches the *resolved* view, so
  // the book-detail flow shows a single-book skeleton (not a search list) and
  // the search flow shows result-card placeholders.
  if (submitted) {
    return (
      <Suspense fallback={<BookDetailSkeleton />}>
        <IsbnLookupResult submitted={submitted} />
      </Suspense>
    );
  }

  if (query) {
    return (
      <Suspense fallback={<SearchResultsSkeleton initialQuery={query} />}>
        <SearchResultsView query={query} />
      </Suspense>
    );
  }

  // No params → render the Search tab landing (manual paste form).
  return <SearchForm />;
}

async function IsbnLookupResult({ submitted }: { submitted: string }) {
  const normalized = normalizeIsbn13(submitted);

  if (!isValidIsbn13(normalized)) {
    return (
      <FullscreenShell>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>{submitted}</strong> is not a valid ISBN-13 (must be 13 digits
          with a valid checksum).
        </p>
        <p className="text-sm">
          <Link href="/lookup" className="underline text-gray-700">
            Try another search
          </Link>
        </p>
      </FullscreenShell>
    );
  }

  const result = await lookupBookByIsbn(normalized);
  if (!result.ok) {
    if (result.reason === "not-found") {
      return (
        <FullscreenShell>
          <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
            No edition found for ISBN <strong>{normalized}</strong> in Hardcover.
          </p>
          <p className="text-sm">
            <Link href="/lookup" className="underline text-gray-700">
              Try another ISBN
            </Link>
          </p>
        </FullscreenShell>
      );
    }
    return (
      <FullscreenShell>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {result.message ?? "Unknown API error"}
        </p>
      </FullscreenShell>
    );
  }

  const bookId = await upsertBook(result.book);
  await recordRecent(bookId);
  const saved = await isSaved(bookId);

  return <BookDetail book={result.book} bookId={bookId} saved={saved} />;
}

async function SearchResultsView({ query }: { query: string }) {
  const result = await searchBooks(query);

  if (!result.ok) {
    return (
      <SearchForm initialQuery={query}>
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {result.message ?? "Search failed"}
        </p>
      </SearchForm>
    );
  }

  return (
    <SearchForm initialQuery={query}>
      {result.hits.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          No matches for <strong>{query}</strong>.
        </p>
      ) : (
        <ul className="space-y-4">
          {result.hits.map((hit) => (
            <SearchResultRow key={hit.bookId} hit={hit} />
          ))}
        </ul>
      )}
    </SearchForm>
  );
}

function SearchForm({
  initialQuery = "",
  children,
}: {
  initialQuery?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-gray-600">
          Type a book title, or paste a 13-digit ISBN. (Or tap{" "}
          <Link href="/scan" className="underline">
            Bookit
          </Link>{" "}
          to scan instead.)
        </p>
      </header>

      <form action={lookupAction} className="flex gap-2">
        <SearchInput initialValue={initialQuery} />
        <button
          type="submit"
          className="rounded-md bg-[#333] hover:bg-[#4a4a4a] active:bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          Search
        </button>
      </form>

      {children}
    </main>
  );
}

function SearchResultRow({ hit }: { hit: HardcoverSearchHit }) {
  return (
    <li className="rounded-lg border border-gray-200 p-4 flex gap-4">
      {hit.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hit.coverUrl}
          alt=""
          className="w-16 h-auto rounded shadow-sm flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-24 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">
          no cover
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Link
          href={`/lookup?isbn=${hit.isbn13}`}
          className="text-base font-semibold leading-tight hover:underline"
        >
          {hit.title}
        </Link>
        {hit.authors.length > 0 && (
          <p className="text-sm text-gray-600 truncate">
            {hit.authors.join(", ")}
          </p>
        )}
        {hit.rating !== null && (
          <p className="text-xs text-gray-500 mt-1">
            ★ {hit.rating.toFixed(1)}
            {hit.usersCount !== null && (
              <> · {hit.usersCount.toLocaleString()} readers</>
            )}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Fullscreen overlay used for the book detail view and its error states.
 * The main is fixed inset-0 z-50 so the (app) layout's sticky header + bottom
 * nav are visually hidden behind it. The Save/Exit buttons live in a SEPARATE
 * fixed container at z-60 so they float over the scrolling content (rather
 * than sitting in a full-width sticky bar).
 */
function FullscreenShell({
  children,
  actionRow,
}: {
  children: React.ReactNode;
  actionRow?: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed right-3 z-[60] flex gap-2"
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {actionRow ?? <ExitButton />}
      </div>
      <main
        className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: PAGE_BG }}
      >
        <div
          className="px-6 pb-12 space-y-8"
          style={{
            paddingTop: "calc(60px + env(safe-area-inset-top))",
          }}
        >
          {children}
        </div>
      </main>
    </>
  );
}

/**
 * Loading state for the ?isbn book-detail flow (e.g. tapping "View Book
 * Details" after a scan). Mirrors the real BookDetail layout — single cover +
 * meta column, genre pills, summary lines, Compare button — inside the same
 * FullscreenShell, so it reads as "loading this book" rather than a search.
 */
function BookDetailSkeleton() {
  return (
    <FullscreenShell>
      {/* Header row: cover + meta */}
      <section className="flex gap-5">
        <div
          className="flex-shrink-0 bg-black/5 animate-pulse"
          style={{ width: "120px", height: "182px", borderRadius: "2px" }}
        />
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="h-6 w-4/5 rounded bg-black/5 animate-pulse" />
          <div className="h-4 w-2/5 rounded bg-black/5 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-black/5 animate-pulse" />
          <div className="h-4 w-1/4 rounded bg-black/5 animate-pulse" />
        </div>
      </section>

      {/* Genre */}
      <section className="space-y-3">
        <div className="h-5 w-24 rounded bg-black/5 animate-pulse" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-black/5 animate-pulse"
            />
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="space-y-3">
        <div className="h-5 w-28 rounded bg-black/5 animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-black/5 animate-pulse" />
          <div className="h-3 w-full rounded bg-black/5 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-black/5 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-black/5 animate-pulse" />
        </div>
      </section>

      {/* Compare CTA */}
      <div
        className="bg-black/5 animate-pulse"
        style={{ height: "50px", borderRadius: "12px" }}
      />
    </FullscreenShell>
  );
}

/** Loading state for the ?q search-results flow: real form + card placeholders. */
function SearchResultsSkeleton({ initialQuery }: { initialQuery: string }) {
  return (
    <SearchForm initialQuery={initialQuery}>
      <ul className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-lg border border-gray-200 p-4 flex gap-4"
          >
            <div className="w-16 h-24 rounded bg-black/5 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2 pt-1">
              <div className="h-4 w-4/5 rounded bg-black/5 animate-pulse" />
              <div className="h-3 w-2/5 rounded bg-black/5 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-black/5 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </SearchForm>
  );
}

function BookDetail({
  book,
  bookId,
  saved,
}: {
  book: HardcoverBook;
  bookId: number;
  saved: boolean;
}) {
  return (
    <FullscreenShell
      actionRow={
        <>
          <SaveButton bookId={bookId} isbn={book.isbn13} initialSaved={saved} />
          <ExitButton />
        </>
      }
    >
      {/* Header row: cover + meta */}
      <section className="flex gap-5">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt=""
            className="flex-shrink-0"
            style={{
              width: "120px",
              height: "182px",
              aspectRatio: "60/91",
              borderRadius: "2px",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            className="flex-shrink-0 bg-gray-100 flex items-center justify-center text-[10px] text-gray-400"
            style={{ width: "120px", height: "182px", borderRadius: "2px" }}
          >
            no cover
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-[10px]">
          <h1
            style={{
              overflow: "hidden",
              color: "#000",
              textOverflow: "ellipsis",
              fontFamily: JOST_STACK,
              fontSize: "24px",
              fontWeight: 500,
              lineHeight: "normal",
            }}
          >
            {book.title ?? "Untitled"}
          </h1>
          {book.authors.length > 0 && (
            <p
              className="text-gray-500"
              style={{ fontFamily: JOST_STACK }}
            >
              {book.authors.join(", ")}
            </p>
          )}
          {(book.rating !== null || book.usersCount !== null) && (
            <p
              className="text-sm flex items-center gap-1.5 text-gray-700 pt-1"
              style={{ fontFamily: JOST_STACK }}
            >
              {book.rating !== null && (
                <span className="inline-flex items-center gap-1 font-semibold text-black">
                  {book.rating.toFixed(1)}
                  <span aria-hidden="true">★</span>
                </span>
              )}
              {book.usersCount !== null && (
                <span className="text-gray-500">
                  ({book.usersCount.toLocaleString()} reviews)
                </span>
              )}
            </p>
          )}
          {book.pages !== null && (
            <p
              className="text-sm text-gray-700 flex items-center gap-1.5"
              style={{ fontFamily: JOST_STACK }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book-details/book-icon.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              {book.pages} pages
            </p>
          )}
          {book.releaseDate && (
            <p
              className="text-sm text-gray-700 flex items-center gap-1.5"
              style={{ fontFamily: JOST_STACK }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/book-details/calendar-icon.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              {formatReleaseDate(book.releaseDate)}
            </p>
          )}
        </div>
      </section>

      {/* Genre */}
      {book.genres.length > 0 && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Genre</h2>
          <ul className="flex flex-wrap gap-2">
            {book.genres.map((g) => (
              <li
                key={g}
                className={TAG_LAYOUT_CLASS}
                style={{
                  ...TAG_PADDING,
                  ...TAG_TEXT_STYLE,
                  backgroundColor: "#DDE7CE",
                  color: "#4A6B3A",
                }}
              >
                {g}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Themes */}
      {book.themes.length > 0 && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Themes</h2>
          <ul className="flex flex-wrap gap-2">
            {book.themes.map((t) => (
              <li
                key={t}
                className={TAG_LAYOUT_CLASS}
                style={{
                  ...TAG_PADDING,
                  ...TAG_TEXT_STYLE,
                  backgroundColor: "#DBEAFE",
                  color: "#1E3A8A",
                }}
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Summary */}
      {book.description && (
        <section className="space-y-2">
          <h2 style={SECTION_HEADING_STYLE}>Summary</h2>
          <SummaryText text={book.description} />
        </section>
      )}

      {/* Compare CTA */}
      <Link
        href={`/compare?a=${bookId}`}
        className="flex items-center justify-center self-stretch transition-colors bg-[#E9F5DB] hover:bg-[#D9E8CC] active:bg-[#C8D7BB]"
        style={{
          padding: "14px 20px",
          gap: "4px",
          borderRadius: "12px",
          color: "#33A45D",
          fontFamily: SF_PRO_STACK,
          fontSize: "17px",
          fontWeight: 400,
          lineHeight: "22px",
          letterSpacing: "-0.43px",
          fontFeatureSettings: '"liga" off, "clig" off',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/book-details/compare-icon.svg"
          alt=""
          width={20}
          height={16}
          aria-hidden="true"
        />
        Compare
      </Link>

      {/* Popular Reviews from Hardcover */}
      {book.reviews.length > 0 && (
        <section className="space-y-3">
          <h2 style={SECTION_HEADING_STYLE}>Popular Reviews</h2>
          {book.slug && (
            <a
              href={`https://hardcover.app/books/${book.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white/80 hover:bg-white/60 active:bg-white/40 transition-colors"
              style={{
                padding: "4px 12px",
                gap: "6.712px",
                borderRadius: "100px",
                border: "1px solid rgba(84, 84, 84, 0.10)",
                fontFamily: JOST_STACK,
                fontSize: "16px",
                color: "#1E1E1E",
              }}
            >
              <span>View in</span>
              <span
                className="inline-flex items-center"
                style={{ gap: "4px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/book-details/hardcover-logo.png"
                  alt=""
                  width={18}
                  height={22}
                  aria-hidden="true"
                />
                <span style={{ fontWeight: 700 }}>Hardcover</span>
              </span>
            </a>
          )}
          <ul className="space-y-3">
            {book.reviews.map((r, i) => (
              <li key={i}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </FullscreenShell>
  );
}

function ReviewCard({ review }: { review: HardcoverReview }) {
  return (
    <article
      className="rounded-2xl bg-white p-4 space-y-2"
      style={{ fontFamily: JOST_STACK }}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {review.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
              {review.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm text-[#1E1E1E] truncate">
            {review.username}
          </span>
        </div>
        <StarRating rating={review.rating} />
      </header>
      <p
        className="text-gray-700 line-clamp-3 whitespace-pre-line"
        style={{
          fontFamily: JOST_STACK,
          fontSize: "16px",
          fontWeight: 400,
          lineHeight: "normal",
        }}
      >
        {review.text}
      </p>
    </article>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const full = Math.round(rating);
  return (
    <div className="flex flex-shrink-0 text-base" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={n <= full ? "text-amber-400" : "text-gray-300"}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatReleaseDate(d: string): string {
  const parts = d.split("-");
  if (parts.length < 2) return d;
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (monthIdx < 0 || monthIdx > 11) return d;
  return `${months[monthIdx]} ${year}`;
}
